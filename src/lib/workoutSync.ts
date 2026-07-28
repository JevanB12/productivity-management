import type {
  WorkoutItem,
  WorkoutWeekday,
  WorkoutsByWeekday,
} from '../types'
import { getSupabase } from './supabase'

export const WORKOUT_WEEKDAYS: WorkoutWeekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

export const WORKOUT_WEEKDAY_LABELS: Record<WorkoutWeekday, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}

const WEEKDAY_SET = new Set<string>(WORKOUT_WEEKDAYS)

type RawWorkout = {
  id: string
  name: string
  sets?: string
  reps?: string
  weight?: string
  notes?: string
}

function normalizeWorkout(item: RawWorkout): WorkoutItem {
  return {
    id: item.id,
    name: item.name.trim(),
    sets: typeof item.sets === 'string' ? item.sets : '',
    reps: typeof item.reps === 'string' ? item.reps : '',
    weight: typeof item.weight === 'string' ? item.weight : '',
    notes: typeof item.notes === 'string' ? item.notes : '',
  }
}

export function normalizeWorkoutsByWeekday(raw: unknown): WorkoutsByWeekday {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}

  const result: WorkoutsByWeekday = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!WEEKDAY_SET.has(key) || !Array.isArray(value)) continue
    const day = key as WorkoutWeekday
    const items = value
      .filter(
        (item): item is RawWorkout =>
          item &&
          typeof item === 'object' &&
          typeof (item as RawWorkout).id === 'string' &&
          typeof (item as RawWorkout).name === 'string' &&
          (item as RawWorkout).name.trim().length > 0,
      )
      .map(normalizeWorkout)
    if (items.length > 0) result[day] = items
  }
  return result
}

export function hasAnyWorkouts(byWeekday: WorkoutsByWeekday): boolean {
  return Object.values(byWeekday).some((list) => (list?.length ?? 0) > 0)
}

export function todayWeekday(): WorkoutWeekday {
  // getDay(): 0 = Sunday … 6 = Saturday
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

export async function fetchWorkouts(
  userId: string,
): Promise<{ byWeekday: WorkoutsByWeekday; updatedAt: string | null } | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('study_calendars')
    .select('weekly_workouts, updated_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    if (error.message.toLowerCase().includes('weekly_workouts')) return null
    throw error
  }
  if (!data) return null

  const row = data as {
    weekly_workouts?: unknown
    updated_at?: string
  }
  return {
    byWeekday: normalizeWorkoutsByWeekday(row.weekly_workouts),
    updatedAt: row.updated_at ?? null,
  }
}

export async function saveWorkouts(
  userId: string,
  byWeekday: WorkoutsByWeekday,
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
      .update({ weekly_workouts: byWeekday, updated_at: updatedAt })
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
      weekly_workouts: byWeekday,
      updated_at: updatedAt,
    })
    .select('updated_at')
    .single()

  if (error) throw error
  return (data as { updated_at: string }).updated_at ?? updatedAt
}
