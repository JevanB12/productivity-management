export type StudyTask = {
  id: string
  text: string
  done: boolean
}

export type TasksByDate = Record<string, StudyTask[]>

export type StudyCalendarData = {
  byDate: TasksByDate
  backlog: StudyTask[]
  updatedAt: string | null
}
