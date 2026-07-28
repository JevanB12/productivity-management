import { useCallback, useEffect, useRef, useState } from 'react'
import { isSupabaseConfigured } from './lib/supabase'
import {
  fetchWorkouts,
  hasAnyWorkouts,
  normalizeWorkoutsByWeekday,
  saveWorkouts,
} from './lib/workoutSync'
import type {
  WorkoutItem,
  WorkoutWeekday,
  WorkoutsByWeekday,
} from './types'

export type WorkoutSyncStatus =
  | 'loading'
  | 'synced'
  | 'syncing'
  | 'error'
  | 'offline'

function workoutsKey(userId: string) {
  return `study-calendar-weekly-workouts-${userId}`
}

function workoutsUpdatedKey(userId: string) {
  return `study-calendar-weekly-workouts-updated-at-${userId}`
}

function loadLocal(userId: string): WorkoutsByWeekday {
  try {
    const raw = localStorage.getItem(workoutsKey(userId))
    if (!raw) return {}
    return normalizeWorkoutsByWeekday(JSON.parse(raw))
  } catch {
    return {}
  }
}

function saveLocal(userId: string, byWeekday: WorkoutsByWeekday) {
  localStorage.setItem(workoutsKey(userId), JSON.stringify(byWeekday))
}

function getLocalUpdatedAt(userId: string): string | null {
  return localStorage.getItem(workoutsUpdatedKey(userId))
}

function setLocalUpdatedAt(userId: string, iso: string) {
  localStorage.setItem(workoutsUpdatedKey(userId), iso)
}

export type WorkoutDraft = {
  name: string
  sets: string
  reps: string
  weight: string
  notes: string
}

function isValidDraft(draft: WorkoutDraft): boolean {
  return draft.name.trim().length > 0
}

export function useWorkouts(userId: string) {
  const [byWeekday, setByWeekday] = useState<WorkoutsByWeekday>({})
  const [syncStatus, setSyncStatus] = useState<WorkoutSyncStatus>(() =>
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
        const cloud = await fetchWorkouts(userId)
        if (cancelled) return

        if (cloud === null) {
          hydrated.current = true
          setSyncStatus('offline')
          return
        }

        const localUpdated = getLocalUpdatedAt(userId)
        const localTime = localUpdated ? Date.parse(localUpdated) : 0
        const cloudTime = cloud.updatedAt ? Date.parse(cloud.updatedAt) : 0
        const localHasData = hasAnyWorkouts(local)
        const cloudHasData = hasAnyWorkouts(cloud.byWeekday)

        if (cloudHasData && (!localHasData || cloudTime >= localTime)) {
          setByWeekday(cloud.byWeekday)
          saveLocal(userId, cloud.byWeekday)
          if (cloud.updatedAt) setLocalUpdatedAt(userId, cloud.updatedAt)
        } else if (localHasData) {
          const updatedAt = await saveWorkouts(userId, local)
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

    saveLocal(userId, byWeekday)
    const updatedAt = new Date().toISOString()
    setLocalUpdatedAt(userId, updatedAt)

    if (!isSupabaseConfigured()) return

    setSyncStatus((s) => (s === 'error' ? 'error' : 'syncing'))
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      void saveWorkouts(userId, byWeekday)
        .then((cloudUpdatedAt) => {
          setLocalUpdatedAt(userId, cloudUpdatedAt)
          setSyncStatus('synced')
        })
        .catch(() => setSyncStatus('error'))
    }, 600)

    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
    }
  }, [byWeekday, userId])

  const addWorkout = useCallback(
    (day: WorkoutWeekday, draft: WorkoutDraft) => {
      if (!isValidDraft(draft)) return false
      const item: WorkoutItem = {
        id: crypto.randomUUID(),
        name: draft.name.trim(),
        sets: draft.sets.trim(),
        reps: draft.reps.trim(),
        weight: draft.weight.trim(),
        notes: draft.notes.trim(),
      }
      setByWeekday((prev) => ({
        ...prev,
        [day]: [...(prev[day] ?? []), item],
      }))
      return true
    },
    [],
  )

  const updateWorkout = useCallback(
    (day: WorkoutWeekday, id: string, draft: WorkoutDraft) => {
      if (!isValidDraft(draft)) return false
      setByWeekday((prev) => ({
        ...prev,
        [day]: (prev[day] ?? []).map((item) =>
          item.id === id
            ? {
                ...item,
                name: draft.name.trim(),
                sets: draft.sets.trim(),
                reps: draft.reps.trim(),
                weight: draft.weight.trim(),
                notes: draft.notes.trim(),
              }
            : item,
        ),
      }))
      return true
    },
    [],
  )

  const removeWorkout = useCallback((day: WorkoutWeekday, id: string) => {
    setByWeekday((prev) => {
      const next = { ...prev }
      const list = (next[day] ?? []).filter((item) => item.id !== id)
      if (list.length === 0) delete next[day]
      else next[day] = list
      return next
    })
  }, [])

  return {
    byWeekday,
    syncStatus,
    addWorkout,
    updateWorkout,
    removeWorkout,
  }
}
