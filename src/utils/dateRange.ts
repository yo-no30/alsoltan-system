export type DatePreset = 'today' | 'week' | 'month' | 'custom'

export interface DateRangeBounds {
  start: Date
  end: Date
  preset: DatePreset
}

function startOfDay(date: Date): Date {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function endOfDay(date: Date): Date {
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next
}

function startOfWeek(date: Date): Date {
  const next = startOfDay(date)
  // Saturday-start week common in KSA; use Monday ISO for consistency → Sunday=0
  // Use Saturday as week start (locale ar-SA style): day 6
  const day = next.getDay()
  const diff = (day + 1) % 7 // days since Saturday
  next.setDate(next.getDate() - diff)
  return next
}

function startOfMonth(date: Date): Date {
  return startOfDay(new Date(date.getFullYear(), date.getMonth(), 1))
}

export function resolveDateRange(
  preset: DatePreset,
  customStart?: string,
  customEnd?: string,
): DateRangeBounds {
  const now = new Date()

  if (preset === 'today') {
    return { preset, start: startOfDay(now), end: endOfDay(now) }
  }

  if (preset === 'week') {
    const start = startOfWeek(now)
    return { preset, start, end: endOfDay(now) }
  }

  if (preset === 'month') {
    return { preset, start: startOfMonth(now), end: endOfDay(now) }
  }

  const startSource = customStart ? new Date(customStart) : startOfDay(now)
  const endSource = customEnd ? new Date(customEnd) : endOfDay(now)
  const startCandidate = startOfDay(startSource)
  const endCandidate = endOfDay(endSource)

  if (startCandidate.getTime() <= endCandidate.getTime()) {
    return { preset: 'custom', start: startCandidate, end: endCandidate }
  }

  return {
    preset: 'custom',
    start: startOfDay(endSource),
    end: endOfDay(startSource),
  }
}

export function toIsoBounds(range: DateRangeBounds): { startIso: string; endIso: string } {
  return {
    startIso: range.start.toISOString(),
    endIso: range.end.toISOString(),
  }
}

export function formatDayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatHourKey(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:00`
}

export function toDateInputValue(date: Date): string {
  return formatDayKey(date)
}
