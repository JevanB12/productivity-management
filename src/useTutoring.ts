import { useCallback, useEffect, useRef, useState } from 'react'
import { isSupabaseConfigured } from './lib/supabase'
import {
  fetchTutoring,
  hasAnyTutoring,
  normalizeTutoringByWeekday,
  saveTutoring,
} from './lib/tutoringSync'
import type { TutoringByWeekday, TutoringItem, WorkoutWeekday } from './types'

export type TutoringSyncStatus =
  | 'loading'
  | 'synced'
  | 'syncing'
  | 'error'
  | 'offline'

export type TutoringDraft = {
  student: string
  subject: string
  startTime: string
  endTime: string
  location: string
}

function localKey(userId: string) {
  return `study-calendar-weekly-tutoring-${userId}`
}

function updatedKey(userId: string) {
  return `study-calendar-weekly-tutoring-updated-at-${userId}`
}

function loadLocal(userId: string): TutoringByWeekday {
  try {
    const raw = localStorage.getItem(localKey(userId))
    return raw ? normalizeTutoringByWeekday(JSON.parse(raw)) : {}
  } catch {
    return {}
  }
}

function isValidDraft(draft: TutoringDraft) {
  return draft.student.trim().length > 0 && draft.subject.trim().length > 0
}

export function useTutoring(userId: string) {
  const [byWeekday, setByWeekday] = useState<TutoringByWeekday>({})
  const [syncStatus, setSyncStatus] = useState<TutoringSyncStatus>(() =>
    isSupabaseConfigured() ? 'loading' : 'offline',
  )
  const hydrated = useRef(false)
  const saveTimer = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false
    hydrated.current = false
    setSyncStatus(isSupabaseConfigured() ? 'loading' : 'offline')

    async function hydrate() {
      const local = loadLocal(userId)
      setByWeekday(local)
      if (!isSupabaseConfigured()) {
        hydrated.current = true
        setSyncStatus('offline')
        return
      }

      try {
        const cloud = await fetchTutoring(userId)
        if (cancelled) return
        if (cloud === null) {
          hydrated.current = true
          setSyncStatus('offline')
          return
        }

        const localUpdated = localStorage.getItem(updatedKey(userId))
        const localTime = localUpdated ? Date.parse(localUpdated) : 0
        const cloudTime = cloud.updatedAt ? Date.parse(cloud.updatedAt) : 0
        const localHasData = hasAnyTutoring(local)
        const cloudHasData = hasAnyTutoring(cloud.byWeekday)

        if (cloudHasData && (!localHasData || cloudTime >= localTime)) {
          setByWeekday(cloud.byWeekday)
          localStorage.setItem(localKey(userId), JSON.stringify(cloud.byWeekday))
          if (cloud.updatedAt) localStorage.setItem(updatedKey(userId), cloud.updatedAt)
        } else if (localHasData) {
          const updatedAt = await saveTutoring(userId, local)
          if (cancelled) return
          localStorage.setItem(updatedKey(userId), updatedAt)
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
    localStorage.setItem(localKey(userId), JSON.stringify(byWeekday))
    localStorage.setItem(updatedKey(userId), new Date().toISOString())
    if (!isSupabaseConfigured()) return

    setSyncStatus((status) => (status === 'error' ? 'error' : 'syncing'))
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      void saveTutoring(userId, byWeekday)
        .then((updatedAt) => {
          localStorage.setItem(updatedKey(userId), updatedAt)
          setSyncStatus('synced')
        })
        .catch(() => setSyncStatus('error'))
    }, 600)
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
    }
  }, [byWeekday, userId])

  const addTutoring = useCallback((day: WorkoutWeekday, draft: TutoringDraft) => {
    if (!isValidDraft(draft)) return false
    const item: TutoringItem = {
      id: crypto.randomUUID(),
      student: draft.student.trim(),
      subject: draft.subject.trim(),
      startTime: draft.startTime,
      endTime: draft.endTime,
      location: draft.location.trim(),
    }
    setByWeekday((prev) => ({ ...prev, [day]: [...(prev[day] ?? []), item] }))
    return true
  }, [])

  const updateTutoring = useCallback(
    (day: WorkoutWeekday, id: string, draft: TutoringDraft) => {
      if (!isValidDraft(draft)) return false
      setByWeekday((prev) => ({
        ...prev,
        [day]: (prev[day] ?? []).map((item) =>
          item.id === id
            ? {
                ...item,
                student: draft.student.trim(),
                subject: draft.subject.trim(),
                startTime: draft.startTime,
                endTime: draft.endTime,
                location: draft.location.trim(),
              }
            : item,
        ),
      }))
      return true
    },
    [],
  )

  const removeTutoring = useCallback((day: WorkoutWeekday, id: string) => {
    setByWeekday((prev) => {
      const next = { ...prev }
      const list = (next[day] ?? []).filter((item) => item.id !== id)
      if (list.length === 0) delete next[day]
      else next[day] = list
      return next
    })
  }, [])

  return { byWeekday, syncStatus, addTutoring, updateTutoring, removeTutoring }
}
