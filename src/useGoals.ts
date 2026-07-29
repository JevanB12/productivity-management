import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchGoals, normalizeGoals, saveGoals } from './lib/goalSync'
import { isSupabaseConfigured } from './lib/supabase'
import type { GoalItem } from './types'

export type GoalSyncStatus =
  | 'loading'
  | 'synced'
  | 'syncing'
  | 'error'
  | 'offline'

function goalsKey(userId: string) {
  return `study-calendar-goals-${userId}`
}

function goalsUpdatedKey(userId: string) {
  return `study-calendar-goals-updated-at-${userId}`
}

function loadLocal(userId: string): GoalItem[] {
  try {
    const raw = localStorage.getItem(goalsKey(userId))
    if (!raw) return []
    return normalizeGoals(JSON.parse(raw))
  } catch {
    return []
  }
}

function saveLocal(userId: string, items: GoalItem[]) {
  localStorage.setItem(goalsKey(userId), JSON.stringify(items))
}

function getLocalUpdatedAt(userId: string): string | null {
  return localStorage.getItem(goalsUpdatedKey(userId))
}

function setLocalUpdatedAt(userId: string, iso: string) {
  localStorage.setItem(goalsUpdatedKey(userId), iso)
}

export type GoalDraft = {
  topic: string
  text: string
  notes: string
}

function isValidDraft(draft: GoalDraft): boolean {
  return draft.topic.trim().length > 0 && draft.text.trim().length > 0
}

function sortGoals(items: GoalItem[]): GoalItem[] {
  return [...items].sort((a, b) => {
    const topicCmp = a.topic.localeCompare(b.topic, undefined, {
      sensitivity: 'base',
    })
    if (topicCmp !== 0) return topicCmp
    if (a.done !== b.done) return a.done ? 1 : -1
    return a.text.localeCompare(b.text, undefined, { sensitivity: 'base' })
  })
}

export function useGoals(userId: string) {
  const [items, setItems] = useState<GoalItem[]>([])
  const [syncStatus, setSyncStatus] = useState<GoalSyncStatus>(() =>
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
      setItems(local)

      if (!isSupabaseConfigured()) {
        hydrated.current = true
        setSyncStatus('offline')
        return
      }

      try {
        const cloud = await fetchGoals(userId)
        if (cancelled) return

        if (cloud === null) {
          hydrated.current = true
          setSyncStatus('offline')
          return
        }

        const localUpdated = getLocalUpdatedAt(userId)
        const localTime = localUpdated ? Date.parse(localUpdated) : 0
        const cloudTime = cloud.updatedAt ? Date.parse(cloud.updatedAt) : 0
        const localHasData = local.length > 0
        const cloudHasData = cloud.items.length > 0

        if (cloudHasData && (!localHasData || cloudTime >= localTime)) {
          setItems(cloud.items)
          saveLocal(userId, cloud.items)
          if (cloud.updatedAt) setLocalUpdatedAt(userId, cloud.updatedAt)
        } else if (localHasData) {
          const updatedAt = await saveGoals(userId, local)
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
      void saveGoals(userId, items)
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

  const addGoal = useCallback((draft: GoalDraft) => {
    if (!isValidDraft(draft)) return false
    const item: GoalItem = {
      id: crypto.randomUUID(),
      topic: draft.topic.trim(),
      text: draft.text.trim(),
      notes: draft.notes.trim(),
      done: false,
    }
    setItems((prev) => sortGoals([...prev, item]))
    return true
  }, [])

  const updateGoal = useCallback((id: string, draft: GoalDraft) => {
    if (!isValidDraft(draft)) return false
    setItems((prev) =>
      sortGoals(
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                topic: draft.topic.trim(),
                text: draft.text.trim(),
                notes: draft.notes.trim(),
              }
            : item,
        ),
      ),
    )
    return true
  }, [])

  const toggleGoal = useCallback((id: string) => {
    setItems((prev) =>
      sortGoals(
        prev.map((item) =>
          item.id === id ? { ...item, done: !item.done } : item,
        ),
      ),
    )
  }, [])

  const removeGoal = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  return {
    items,
    syncStatus,
    addGoal,
    updateGoal,
    toggleGoal,
    removeGoal,
  }
}
