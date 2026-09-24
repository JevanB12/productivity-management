import type {
  TutoringItem,
  TutoringByWeekday,
  WorkoutWeekday,
} from '../types'
import { getSupabase } from './supabase'

export const TUTORING_WEEKDAYS: WorkoutWeekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

export const TUTORING_WEEKDAY_LABELS: Record<WorkoutWeekday, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}

const WEEKDAY_SET = new Set<string>(TUTORING_WEEKDAYS)

type RawTutoring = Partial<TutoringItem> & { id?: unknown }

function normalizeTutoring(item: RawTutoring): TutoringItem {
  return {
    id: String(item.id),
    student: typeof item.student === 'string' ? item.student.trim() : '',
    subject: typeof item.subject === 'string' ? item.subject.trim() : '',
    startTime: typeof item.startTime === 'string' ? item.startTime : '',
    endTime: typeof item.endTime === 'string' ? item.endTime : '',
    location: typeof item.location === 'string' ? item.location.trim() : '',
  }
}

export function normalizeTutoringByWeekday(raw: unknown): TutoringByWeekday {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}

  const result: TutoringByWeekday = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!WEEKDAY_SET.has(key) || !Array.isArray(value)) continue
    const items = value
      .filter(
        (item): item is RawTutoring =>
          item &&
          typeof item === 'object' &&
          typeof (item as RawTutoring).id === 'string' &&
          typeof (item as RawTutoring).student === 'string' &&
          typeof (item as RawTutoring).subject === 'string',
      )
      .map(normalizeTutoring)
      .filter((item) => item.student && item.subject)
    if (items.length > 0) result[key as WorkoutWeekday] = items
  }
  return result
}

export function hasAnyTutoring(byWeekday: TutoringByWeekday): boolean {
  return Object.values(byWeekday).some((list) => (list?.length ?? 0) > 0)
}

export function todayTutoringWeekday(): WorkoutWeekday {
  const map: WorkoutWeekday[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ]
  return map[new Date().getDay()]
}

export async function fetchTutoring(
  userId: string,
): Promise<{ byWeekday: TutoringByWeekday; updatedAt: string | null } | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('study_calendars')
    .select('weekly_tutoring, updated_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    if (error.message.toLowerCase().includes('weekly_tutoring')) return null
    throw error
  }
  if (!data) return null

  const row = data as { weekly_tutoring?: unknown; updated_at?: string }
  return {
    byWeekday: normalizeTutoringByWeekday(row.weekly_tutoring),
    updatedAt: row.updated_at ?? null,
  }
}

export async function saveTutoring(
  userId: string,
  byWeekday: TutoringByWeekday,
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
      .update({ weekly_tutoring: byWeekday, updated_at: updatedAt })
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
      weekly_tutoring: byWeekday,
      updated_at: updatedAt,
    })
    .select('updated_at')
    .single()
  if (error) throw error
  return (data as { updated_at: string }).updated_at ?? updatedAt
}
