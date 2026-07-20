import type { RoutineItem } from '../types'

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/** Always store/compare as HH:mm (time inputs can omit leading zero). */
export function normalizeTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return time
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Duration in minutes; supports blocks that cross midnight (e.g. 22:00 → 06:00). */
export function routineDurationMinutes(
  startTime: string,
  endTime: string,
): number {
  const start = timeToMinutes(normalizeTime(startTime))
  const end = timeToMinutes(normalizeTime(endTime))
  if (end > start) return end - start
  if (end < start) return 24 * 60 - start + end
  return 0
}

export function isValidRoutineBlock(
  label: string,
  startTime: string,
  endTime: string,
): boolean {
  const trimmed = label.trim()
  if (!trimmed) return false
  const start = normalizeTime(startTime)
  const end = normalizeTime(endTime)
  if (
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(start) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(end)
  ) {
    return false
  }
  return start !== end
}

export function routineCrossesMidnight(
  startTime: string,
  endTime: string,
): boolean {
  return (
    timeToMinutes(normalizeTime(endTime)) <=
    timeToMinutes(normalizeTime(startTime))
  )
}

/**
 * Order blocks through the day: overnight first (by wake/end time), then
 * everything else by start time.
 */
export function sortRoutineItems(items: RoutineItem[]): RoutineItem[] {
  const normalized = items.map((item) => ({
    ...item,
    startTime: normalizeTime(item.startTime),
    endTime: normalizeTime(item.endTime),
  }))

  const overnight = normalized.filter((item) =>
    routineCrossesMidnight(item.startTime, item.endTime),
  )
  const daytime = normalized.filter(
    (item) => !routineCrossesMidnight(item.startTime, item.endTime),
  )

  overnight.sort(
    (a, b) => timeToMinutes(a.endTime) - timeToMinutes(b.endTime),
  )
  daytime.sort(
    (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime),
  )

  return [...overnight, ...daytime]
}
