import { useCallback, useEffect, useRef, useState } from 'react'
import { buildRecoverySeed, mergeSeed } from './data/recoverySeed'
import { fetchStudyData, saveStudyData } from './lib/studyCloudSync'
import { isSupabaseConfigured } from './lib/supabase'
import type { StudyTask } from './types'

const LEGACY_TASKS_KEY = 'study-calendar-tasks'
const LEGACY_BACKLOG_KEY = 'study-calendar-backlog'
const LEGACY_UPDATED_KEY = 'study-calendar-updated-at'

export type TasksByDate = Record<string, StudyTask[]>
export type SyncStatus = 'loading' | 'synced' | 'syncing' | 'error' | 'offline'

function tasksKey(userId: string) {
  return `study-calendar-tasks-${userId}`
}

function backlogKey(userId: string) {
  return `study-calendar-backlog-${userId}`
}

function updatedKey(userId: string) {
  return `study-calendar-updated-at-${userId}`
}

function load(userId: string): TasksByDate {
  try {
    let raw = localStorage.getItem(tasksKey(userId))
    if (!raw) raw = localStorage.getItem(LEGACY_TASKS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as TasksByDate
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function save(userId: string, data: TasksByDate) {
  localStorage.setItem(tasksKey(userId), JSON.stringify(data))
}

function loadBacklog(userId: string): StudyTask[] {
  try {
    let raw = localStorage.getItem(backlogKey(userId))
    if (!raw) raw = localStorage.getItem(LEGACY_BACKLOG_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StudyTask[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveBacklog(userId: string, items: StudyTask[]) {
  localStorage.setItem(backlogKey(userId), JSON.stringify(items))
}

function getLocalUpdatedAt(userId: string): string | null {
  return (
    localStorage.getItem(updatedKey(userId)) ??
    localStorage.getItem(LEGACY_UPDATED_KEY)
  )
}

function setLocalUpdatedAt(userId: string, iso: string) {
  localStorage.setItem(updatedKey(userId), iso)
}

function hasAnyTasks(byDate: TasksByDate, backlog: StudyTask[]): boolean {
  if (backlog.length > 0) return true
  return Object.values(byDate).some((list) => (list?.length ?? 0) > 0)
}

export function dateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseDateKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const day = Number(m[3])
  const d = new Date(y, mo, day)
  if (
    d.getFullYear() !== y ||
    d.getMonth() !== mo ||
    d.getDate() !== day
  ) {
    return null
  }
  return d
}

/** Move every day's task list forward (+) or backward (−) by whole days. */
function shiftAllTasks(prev: TasksByDate, deltaDays: number): TasksByDate {
  if (deltaDays === 0) return prev
  const next: TasksByDate = {}
  for (const [key, tasks] of Object.entries(prev)) {
    if (!tasks?.length) continue
    const d = parseDateKey(key)
    if (!d) continue
    d.setDate(d.getDate() + deltaDays)
    const nk = dateKey(d)
    next[nk] = [...(next[nk] ?? []), ...tasks]
  }
  return next
}

export function useStudyTasks(userId: string) {
  const [byDate, setByDate] = useState<TasksByDate>({})
  const [backlog, setBacklog] = useState<StudyTask[]>([])
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() =>
    isSupabaseConfigured() ? 'loading' : 'offline',
  )
  const hydrated = useRef(false)
  const saveTimer = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false
    hydrated.current = false
    setSyncStatus(isSupabaseConfigured() ? 'loading' : 'offline')

    async function hydrate() {
      const localByDate = load(userId)
      const localBacklog = loadBacklog(userId)
      setByDate(localByDate)
      setBacklog(localBacklog)

      if (!isSupabaseConfigured()) {
        hydrated.current = true
        setSyncStatus('offline')
        return
      }

      try {
        const cloud = await fetchStudyData(userId)
        if (cancelled) return

        const localUpdated = getLocalUpdatedAt(userId)
        const localTime = localUpdated ? Date.parse(localUpdated) : 0
        const cloudTime = cloud?.updatedAt ? Date.parse(cloud.updatedAt) : 0
        const localHasData = hasAnyTasks(localByDate, localBacklog)

        if (cloud && cloudTime >= localTime) {
          setByDate(cloud.byDate)
          setBacklog(cloud.backlog)
          save(userId, cloud.byDate)
          saveBacklog(userId, cloud.backlog)
          if (cloud.updatedAt) setLocalUpdatedAt(userId, cloud.updatedAt)
        } else if (localHasData) {
          const updatedAt = await saveStudyData(userId, localByDate, localBacklog)
          if (cancelled) return
          setLocalUpdatedAt(userId, updatedAt)
        }

        setSyncStatus('synced')
      } catch {
        if (!cancelled) setSyncStatus('error')
      } finally {
        if (!cancelled) hydrated.current = true
      }
    }

    void hydrate()
    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    if (!hydrated.current) return

    save(userId, byDate)
    saveBacklog(userId, backlog)
    const updatedAt = new Date().toISOString()
    setLocalUpdatedAt(userId, updatedAt)

    if (!isSupabaseConfigured()) return

    setSyncStatus((s) => (s === 'error' ? 'error' : 'syncing'))
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      void saveStudyData(userId, byDate, backlog)
        .then((cloudUpdatedAt) => {
          setLocalUpdatedAt(userId, cloudUpdatedAt)
          setSyncStatus('synced')
        })
        .catch(() => setSyncStatus('error'))
    }, 600)

    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
    }
  }, [byDate, backlog, userId])

  const addTask = useCallback((key: string, text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const task: StudyTask = {
      id: crypto.randomUUID(),
      text: trimmed,
      done: false,
    }
    setByDate((prev) => ({
      ...prev,
      [key]: [...(prev[key] ?? []), task],
    }))
  }, [])

  const toggleTask = useCallback((key: string, taskId: string) => {
    setByDate((prev) => {
      const list = prev[key]
      if (!list) return prev
      return {
        ...prev,
        [key]: list.map((t) =>
          t.id === taskId ? { ...t, done: !t.done } : t,
        ),
      }
    })
  }, [])

  const removeTask = useCallback((key: string, taskId: string) => {
    setByDate((prev) => {
      const list = prev[key]
      if (!list) return prev
      const next = list.filter((t) => t.id !== taskId)
      if (next.length === 0) {
        const { [key]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [key]: next }
    })
  }, [])

  const renameTask = useCallback((key: string, taskId: string, text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setByDate((prev) => {
      const list = prev[key]
      if (!list) return prev
      return {
        ...prev,
        [key]: list.map((t) =>
          t.id === taskId ? { ...t, text: trimmed } : t,
        ),
      }
    })
  }, [])

  const shiftAllByDays = useCallback((deltaDays: number) => {
    const n = Math.trunc(deltaDays)
    if (n === 0 || !Number.isFinite(n)) return
    setByDate((prev) => shiftAllTasks(prev, n))
  }, [])

  const addBacklog = useCallback((text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const task: StudyTask = {
      id: crypto.randomUUID(),
      text: trimmed,
      done: false,
    }
    setBacklog((prev) => [...prev, task])
  }, [])

  const toggleBacklog = useCallback((taskId: string) => {
    setBacklog((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)),
    )
  }, [])

  const removeBacklog = useCallback((taskId: string) => {
    setBacklog((prev) => prev.filter((t) => t.id !== taskId))
  }, [])

  const renameBacklog = useCallback((taskId: string, text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setBacklog((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, text: trimmed } : t)),
    )
  }, [])

  const importRecoverySeed = useCallback(async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayKey = dateKey(today)
    const seed = buildRecoverySeed(todayKey)
    let mergedByDate = { ...byDate }
    let mergedBacklog = [...backlog]

    if (isSupabaseConfigured()) {
      try {
        const cloud = await fetchStudyData(userId)
        if (cloud) {
          mergedByDate = cloud.byDate
          mergedBacklog = cloud.backlog
        }
      } catch {
        /* use local state */
      }
    }

    const merged = mergeSeed(mergedByDate, mergedBacklog, seed)
    setByDate(merged.byDate)
    setBacklog(merged.backlog)
    save(userId, merged.byDate)
    saveBacklog(userId, merged.backlog)

    if (isSupabaseConfigured()) {
      const updatedAt = await saveStudyData(userId, merged.byDate, merged.backlog)
      setLocalUpdatedAt(userId, updatedAt)
      setSyncStatus('synced')
    }

    return true
  }, [userId, byDate, backlog])

  return {
    byDate,
    backlog,
    syncStatus,
    importRecoverySeed,
    addTask,
    toggleTask,
    removeTask,
    renameTask,
    shiftAllByDays,
    addBacklog,
    toggleBacklog,
    removeBacklog,
    renameBacklog,
  }
}
