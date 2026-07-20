import { useCallback, useEffect, useRef, useState } from 'react'
import { isSupabaseConfigured } from './lib/supabase'
import { isValidRoutineBlock, normalizeTime, sortRoutineItems } from './lib/routineTime'
import { fetchRoutine, saveRoutine } from './lib/routineSync'
import type { RoutineItem } from './types'

const LEGACY_ROUTINE_KEY = 'study-calendar-routine'

export type RoutineSyncStatus =
  | 'loading'
  | 'synced'
  | 'syncing'
  | 'error'
  | 'offline'

function routineKey(userId: string) {
  return `study-calendar-routine-${userId}`
}

function routineUpdatedKey(userId: string) {
  return `study-calendar-routine-updated-at-${userId}`
}

function loadLocal(userId: string): RoutineItem[] {
  try {
    let raw = localStorage.getItem(routineKey(userId))
    if (!raw) raw = localStorage.getItem(LEGACY_ROUTINE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RoutineItem[]
    return Array.isArray(parsed) ? sortRoutine(parsed) : []
  } catch {
    return []
  }
}

function saveLocal(userId: string, items: RoutineItem[]) {
  localStorage.setItem(routineKey(userId), JSON.stringify(items))
}

function setLocalUpdatedAt(userId: string, iso: string) {
  localStorage.setItem(routineUpdatedKey(userId), iso)
}

function sortRoutine(items: RoutineItem[]): RoutineItem[] {
  return sortRoutineItems(items)
}

export function useDailyRoutine(userId: string) {
  const [items, setItems] = useState<RoutineItem[]>([])
  const [syncStatus, setSyncStatus] = useState<RoutineSyncStatus>(() =>
    isSupabaseConfigured() ? 'loading' : 'offline',
  )
  const hydrated = useRef(false)
  const saveTimer = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false
    hydrated.current = false
    setSyncStatus(isSupabaseConfigured() ? 'loading' : 'offline')

    async function hydrate() {
      const localItems = loadLocal(userId)
      setItems(localItems)

      if (!isSupabaseConfigured()) {
        hydrated.current = true
        setSyncStatus('offline')
        return
      }

      try {
        const cloudItems = await fetchRoutine(userId)
        if (cancelled) return

        if (cloudItems === null) {
          hydrated.current = true
          setSyncStatus('offline')
          return
        }

        const localHasData = localItems.length > 0

        if (cloudItems.length > 0 && (!localHasData || cloudItems.length >= localItems.length)) {
          setItems(cloudItems)
          saveLocal(userId, cloudItems)
        } else if (localHasData) {
          const updatedAt = await saveRoutine(userId, localItems)
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

    saveLocal(userId, items)
    const updatedAt = new Date().toISOString()
    setLocalUpdatedAt(userId, updatedAt)

    if (!isSupabaseConfigured()) return

    setSyncStatus((s) => (s === 'error' ? 'error' : 'syncing'))
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      void saveRoutine(userId, items)
        .then((cloudUpdatedAt) => {
          setLocalUpdatedAt(userId, cloudUpdatedAt)
          setSyncStatus('synced')
        })
        .catch(() => setSyncStatus('error'))
    }, 600)

    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
    }
  }, [items, userId])

  const addItem = useCallback(
    (label: string, startTime: string, endTime: string) => {
      if (!isValidRoutineBlock(label, startTime, endTime)) return false
      const item: RoutineItem = {
        id: crypto.randomUUID(),
        label: label.trim(),
        startTime: normalizeTime(startTime),
        endTime: normalizeTime(endTime),
      }
      setItems((prev) => sortRoutine([...prev, item]))
      return true
    },
    [],
  )

  const updateItem = useCallback(
    (id: string, label: string, startTime: string, endTime: string) => {
      if (!isValidRoutineBlock(label, startTime, endTime)) return false
      setItems((prev) =>
        sortRoutine(
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  label: label.trim(),
                  startTime: normalizeTime(startTime),
                  endTime: normalizeTime(endTime),
                }
              : item,
          ),
        ),
      )
      return true
    },
    [],
  )

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  return {
    items,
    syncStatus,
    addItem,
    updateItem,
    removeItem,
  }
}
