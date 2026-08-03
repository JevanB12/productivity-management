import type { FreeNote } from '../types'
import { getSupabase } from './supabase'

type RawNote = {
  id: string
  title: string
  body?: string
  updatedAt?: string
}

function normalizeNote(item: RawNote): FreeNote {
  return {
    id: item.id,
    title: item.title.trim(),
    body: typeof item.body === 'string' ? item.body : '',
    updatedAt:
      typeof item.updatedAt === 'string' && item.updatedAt
        ? item.updatedAt
        : new Date().toISOString(),
  }
}

export function normalizeFreeNotes(raw: unknown): FreeNote[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(
      (item): item is RawNote =>
        item &&
        typeof item === 'object' &&
        typeof (item as RawNote).id === 'string' &&
        typeof (item as RawNote).title === 'string' &&
        (item as RawNote).title.trim().length > 0,
    )
    .map(normalizeNote)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
}

export async function fetchFreeNotes(
  userId: string,
): Promise<{ items: FreeNote[]; updatedAt: string | null } | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('study_calendars')
    .select('free_notes, updated_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    if (error.message.toLowerCase().includes('free_notes')) return null
    throw error
  }
  if (!data) return null

  const row = data as { free_notes?: unknown; updated_at?: string }
  return {
    items: normalizeFreeNotes(row.free_notes),
    updatedAt: row.updated_at ?? null,
  }
}

export async function saveFreeNotes(
  userId: string,
  items: FreeNote[],
): Promise<string> {
  const supabase = getSupabase()
  const updatedAt = new Date().toISOString()

  const { data: existing, error: readError } = await supabase
    .from('study_calendars')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (readError) throw readError

  if (existing) {
    const { data, error } = await supabase
      .from('study_calendars')
      .update({ free_notes: items, updated_at: updatedAt })
      .eq('user_id', userId)
      .select('updated_at')
      .single()

    if (error) throw error
    return (data as { updated_at: string }).updated_at ?? updatedAt
  }

  const { data, error } = await supabase
    .from('study_calendars')
    .insert({
      user_id: userId,
      by_date: {},
      backlog: [],
      free_notes: items,
      updated_at: updatedAt,
    })
    .select('updated_at')
    .single()

  if (error) throw error
  return (data as { updated_at: string }).updated_at ?? updatedAt
}
