import type { StudyTask, TasksByDate } from '../types'

export type TaskCategory = 'work' | 'other'
export type CalendarFilter = 'all' | TaskCategory

export const CALENDAR_FILTERS: { id: CalendarFilter; label: string }[] = [
  { id: 'all', label: 'Everything' },
  { id: 'work', label: 'Work' },
  { id: 'other', label: 'Other' },
]

export function normalizeTask(task: StudyTask): StudyTask {
  return {
    ...task,
    category: task.category === 'work' ? 'work' : 'other',
  }
}

export function normalizeTasks(tasks: StudyTask[]): StudyTask[] {
  return tasks.map(normalizeTask)
}

export function normalizeByDate(byDate: TasksByDate): TasksByDate {
  const next: TasksByDate = {}
  for (const [key, tasks] of Object.entries(byDate)) {
    if (!tasks?.length) continue
    next[key] = normalizeTasks(tasks)
  }
  return next
}

export function matchesFilter(task: StudyTask, filter: CalendarFilter): boolean {
  if (filter === 'all') return true
  return normalizeTask(task).category === filter
}

export function filterTasks(tasks: StudyTask[], filter: CalendarFilter): StudyTask[] {
  return tasks.filter((t) => matchesFilter(t, filter))
}

export function filterByDate(byDate: TasksByDate, filter: CalendarFilter): TasksByDate {
  if (filter === 'all') return byDate
  const next: TasksByDate = {}
  for (const [key, tasks] of Object.entries(byDate)) {
    const filtered = filterTasks(tasks ?? [], filter)
    if (filtered.length > 0) next[key] = filtered
  }
  return next
}

export function categoryLabel(category: TaskCategory): string {
  return category === 'work' ? 'Work' : 'Other'
}

export function defaultCategoryForFilter(filter: CalendarFilter): TaskCategory {
  return filter === 'other' ? 'other' : 'work'
}

export function filterScopeLabel(filter: CalendarFilter): string {
  switch (filter) {
    case 'work':
      return 'Work only'
    case 'other':
      return 'Other only'
    default:
      return 'Everything'
  }
}

export function countVisibleAndHidden(
  tasks: StudyTask[],
  filter: CalendarFilter,
): { visible: number; hidden: number; pending: number } {
  const all = tasks ?? []
  const visibleList = filterTasks(all, filter)
  return {
    visible: visibleList.length,
    hidden: filter === 'all' ? 0 : all.length - visibleList.length,
    pending: visibleList.filter((t) => !t.done).length,
  }
}
