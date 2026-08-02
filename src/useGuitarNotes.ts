import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchGuitarNotes,
  normalizeGuitarNotes,
  saveGuitarNotes,
} from './lib/guitarNotesSync'
import { isSupabaseConfigured } from './lib/supabase'
import type { GuitarNote } from './types'

export type GuitarNotesSyncStatus =
  | 'loading'
  | 'synced'
  | 'syncing'
  | 'error'
  | 'offline'

function notesKey(userId: string) {
  return `study-calendar-guitar-notes-${userId}`
}

function notesUpdatedKey(userId: string) {
  return `study-calendar-guitar-notes-updated-at-${userId}`
}

function loadLocal(userId: string): GuitarNote[] {
  try {
    const raw = localStorage.getItem(notesKey(userId))
    if (!raw) return []
    return normalizeGuitarNotes(JSON.parse(raw))
  } catch {
    return []
  }
}

function saveLocal(userId: string, items: GuitarNote[]) {
  localStorage.setItem(notesKey(userId), JSON.stringify(items))
}

function getLocalUpdatedAt(userId: string): string | null {
  return localStorage.getItem(notesUpdatedKey(userId))
}

function setLocalUpdatedAt(userId: string, iso: string) {
  localStorage.setItem(notesUpdatedKey(userId), iso)
}

export type GuitarNoteDraft = {
  title: string
  body: string
}

function isValidDraft(draft: GuitarNoteDraft): boolean {
  return draft.title.trim().length > 0
}

function sortNotes(items: GuitarNote[]): GuitarNote[] {
  return [...items].sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  )
}

export function useGuitarNotes(userId: string) {
  const [items, setItems] = useState<GuitarNote[]>([])
  const [syncStatus, setSyncStatus] = useState<GuitarNotesSyncStatus>(() =>
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
        const cloud = await fetchGuitarNotes(userId)
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
          const updatedAt = await saveGuitarNotes(userId, local)
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
      void saveGuitarNotes(userId, items)
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

  const addNote = useCallback((draft: GuitarNoteDraft) => {
    if (!isValidDraft(draft)) return false
    const now = new Date().toISOString()
    const item: GuitarNote = {
      id: crypto.randomUUID(),
      title: draft.title.trim(),
      body: draft.body.trim(),
      updatedAt: now,
    }
    setItems((prev) => sortNotes([item, ...prev]))
    return true
  }, [])

  const updateNote = useCallback((id: string, draft: GuitarNoteDraft) => {
    if (!isValidDraft(draft)) return false
    const now = new Date().toISOString()
    setItems((prev) =>
      sortNotes(
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                title: draft.title.trim(),
                body: draft.body.trim(),
                updatedAt: now,
              }
            : item,
        ),
      ),
    )
    return true
  }, [])

  const removeNote = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  return {
    items,
    syncStatus,
    addNote,
    updateNote,
    removeNote,
  }
}
