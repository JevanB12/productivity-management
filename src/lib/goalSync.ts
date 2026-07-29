import type { GoalItem } from '../types'
import { getSupabase } from './supabase'

type RawGoal = {
  id: string
  topic: string
  text: string
  notes?: string
  done?: boolean
}

function normalizeGoal(item: RawGoal): GoalItem {
  return {
    id: item.id,
    topic: item.topic.trim(),
    text: item.text.trim(),
    notes: typeof item.notes === 'string' ? item.notes : '',
    done: Boolean(item.done),
  }
}

export function normalizeGoals(raw: unknown): GoalItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(
      (item): item is RawGoal =>
        item &&
        typeof item === 'object' &&
        typeof (item as RawGoal).id === 'string' &&
        typeof (item as RawGoal).topic === 'string' &&
        typeof (item as RawGoal).text === 'string' &&
        (item as RawGoal).topic.trim().length > 0 &&
        (item as RawGoal).text.trim().length > 0,
    )
    .map(normalizeGoal)
}

export async function fetchGoals(
  userId: string,
): Promise<{ items: GoalItem[]; updatedAt: string | null } | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('study_calendars')
    .select('goals, updated_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    if (error.message.toLowerCase().includes('goals')) return null
    throw error
  }
  if (!data) return null

  const row = data as { goals?: unknown; updated_at?: string }
  return {
    items: normalizeGoals(row.goals),
    updatedAt: row.updated_at ?? null,
  }
}

export async function saveGoals(
  userId: string,
  items: GoalItem[],
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
      .update({ goals: items, updated_at: updatedAt })
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
      goals: items,
      updated_at: updatedAt,
    })
    .select('updated_at')
    .single()

  if (error) throw error
  return (data as { updated_at: string }).updated_at ?? updatedAt
}
