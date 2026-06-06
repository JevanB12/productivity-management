import type { StudyCalendarData, StudyTask, TasksByDate } from '../types'
import { getSupabase } from './supabase'

type StudyCalendarRow = {
  user_id: string
  by_date: TasksByDate
  backlog: StudyTask[]
  updated_at: string
}

function normalizeByDate(raw: unknown): TasksByDate {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return raw as TasksByDate
}

function normalizeBacklog(raw: unknown): StudyTask[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (t): t is StudyTask =>
      t &&
      typeof t === 'object' &&
      typeof t.id === 'string' &&
      typeof t.text === 'string' &&
      typeof t.done === 'boolean',
  )
}

export async function fetchStudyData(
  userId: string,
): Promise<StudyCalendarData | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('study_calendars')
    .select('by_date, backlog, updated_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const row = data as StudyCalendarRow
  return {
    byDate: normalizeByDate(row.by_date),
    backlog: normalizeBacklog(row.backlog),
    updatedAt: row.updated_at,
  }
}

export async function saveStudyData(
  userId: string,
  byDate: TasksByDate,
  backlog: StudyTask[],
): Promise<string> {
  const supabase = getSupabase()
  const updatedAt = new Date().toISOString()
  const { data, error } = await supabase
    .from('study_calendars')
    .upsert(
      {
        user_id: userId,
        by_date: byDate,
        backlog,
        updated_at: updatedAt,
      },
      { onConflict: 'user_id' },
    )
    .select('updated_at')
    .single()

  if (error) throw error
  return (data as { updated_at: string }).updated_at ?? updatedAt
}
