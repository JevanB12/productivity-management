import { useCallback, useEffect, useState } from 'react'
import type { StudyTask } from './types'

const STORAGE_KEY = 'study-calendar-tasks'
const BACKLOG_STORAGE_KEY = 'study-calendar-backlog'

export type TasksByDate = Record<string, StudyTask[]>

function load(): TasksByDate {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as TasksByDate
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function save(data: TasksByDate) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function loadBacklog(): StudyTask[] {
  try {
    const raw = localStorage.getItem(BACKLOG_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StudyTask[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveBacklog(items: StudyTask[]) {
  localStorage.setItem(BACKLOG_STORAGE_KEY, JSON.stringify(items))
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

export function useStudyTasks() {
  const [byDate, setByDate] = useState<TasksByDate>(load)
  const [backlog, setBacklog] = useState<StudyTask[]>(loadBacklog)

  useEffect(() => {
    save(byDate)
  }, [byDate])

  useEffect(() => {
    saveBacklog(backlog)
  }, [backlog])

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

  return {
    byDate,
    backlog,
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
