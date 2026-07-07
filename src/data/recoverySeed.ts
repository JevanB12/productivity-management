import type { StudyTask, TasksByDate } from '../types'

function task(text: string, category: 'work' | 'other' = 'other'): StudyTask {
  return { id: crypto.randomUUID(), text, done: false, category }
}

/** Recovery data — Jun 2026 */
export function buildRecoverySeed(todayKey: string): {
  byDate: TasksByDate
  backlog: StudyTask[]
} {
  const byDate: TasksByDate = {}

  function add(dateKey: string, ...texts: string[]) {
    byDate[dateKey] = [...(byDate[dateKey] ?? []), ...texts.map((text) => task(text))]
  }

  // Today
  add(
    todayKey,
    'Jack work',
    'Part time job',
    'Flok',
    'Buy jacket',
    'Get metronome',
    'Career plan',
    'Deen and etti bday — 1st step',
    'Amazon returns',
    'Calculator fix',
    'NDST setup finish',
    'MC final check',
  )

  // Part time job — next 10 days (today + 9)
  const [y, m, d] = todayKey.split('-').map(Number)
  for (let i = 1; i < 10; i++) {
    const dt = new Date(y, m - 1, d + i)
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
    add(key, 'Part time job')
  }

  add('2026-06-01', 'Call family')
  add('2026-06-09', 'AC revision')
  add('2026-06-10', 'AC')
  add('2026-06-18', 'Go out with Riyadh')
  add('2026-07-01', 'Visit family plan')
  add('2026-09-01', 'Etti and Deen birthday')

  const backlog: StudyTask[] = [
    task('Buy shoes'),
    task('Plan: part time job then projects and work experience'),
  ]

  return { byDate, backlog }
}

export function mergeSeed(
  existingByDate: TasksByDate,
  existingBacklog: StudyTask[],
  seed: { byDate: TasksByDate; backlog: StudyTask[] },
): { byDate: TasksByDate; backlog: StudyTask[] } {
  const byDate: TasksByDate = { ...existingByDate }
  for (const [key, tasks] of Object.entries(seed.byDate)) {
    byDate[key] = [...(byDate[key] ?? []), ...tasks]
  }
  return {
    byDate,
    backlog: [...existingBacklog, ...seed.backlog],
  }
}
