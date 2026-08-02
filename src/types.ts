export type TaskCategory = 'work' | 'other'

export type StudyTask = {
  id: string
  text: string
  done: boolean
  category: TaskCategory
}

export type TasksByDate = Record<string, StudyTask[]>

export type RoutineItem = {
  id: string
  label: string
  startTime: string
  endTime: string
}

export type StudyCalendarData = {
  byDate: TasksByDate
  backlog: StudyTask[]
  updatedAt: string | null
}

export type WorkoutWeekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export type WorkoutItem = {
  id: string
  name: string
  sets: string
  reps: string
  weight: string
  notes: string
}

export type WorkoutsByWeekday = Partial<Record<WorkoutWeekday, WorkoutItem[]>>

export type GoalItem = {
  id: string
  topic: string
  text: string
  notes: string
  done: boolean
}

export type GuitarNote = {
  id: string
  title: string
  body: string
  updatedAt: string
}
