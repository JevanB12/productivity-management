export type TaskCategory = 'work' | 'other'

export type StudyTask = {
  id: string
  text: string
  done: boolean
  category: TaskCategory
}

export type TasksByDate = Record<string, StudyTask[]>

export type StudyCalendarData = {
  byDate: TasksByDate
  backlog: StudyTask[]
  updatedAt: string | null
}
