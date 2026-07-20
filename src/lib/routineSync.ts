import type { RoutineItem } from '../types'
import { normalizeTime, sortRoutineItems } from './routineTime'
import { getSupabase } from './supabase'

function isTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

type RawRoutineItem = {
  id: string
  label: string
  startTime: string
  endTime: string
}

export function normalizeRoutineItems(raw: unknown): RoutineItem[] {
  if (!Array.isArray(raw)) return []
  const items = raw
    .filter(
      (item): item is RawRoutineItem =>
        item &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.label === 'string' &&
        typeof item.startTime === 'string' &&
        typeof item.endTime === 'string' &&
        isTime(normalizeTime(item.startTime)) &&
        isTime(normalizeTime(item.endTime)),
    )
    .map(({ id, label, startTime, endTime }) => ({
      id,
      label,
      startTime: normalizeTime(startTime),
      endTime: normalizeTime(endTime),
    }))

  return sortRoutineItems(items)
}

export async function fetchRoutine(userId: string): Promise<RoutineItem[] | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('study_calendars')
    .select('daily_routine')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    if (error.message.toLowerCase().includes('daily_routine')) return null
    throw error
  }
  if (!data) return null
  return normalizeRoutineItems(
    (data as { daily_routine?: unknown }).daily_routine,
  )
}

export async function saveRoutine(
  userId: string,
  items: RoutineItem[],
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
      .update({ daily_routine: items, updated_at: updatedAt })
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
      daily_routine: items,
      updated_at: updatedAt,
    })
    .select('updated_at')
    .single()

  if (error) throw error
  return (data as { updated_at: string }).updated_at ?? updatedAt
}
