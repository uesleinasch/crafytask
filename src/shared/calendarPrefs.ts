import { localDateString } from './dueState'

export type WeekStart = 'monday' | 'sunday'

export interface CalendarPrefs {
  journeyMinutes: number
  dayStartHour: number
  dayEndHour: number
  weekStart: WeekStart
}

function parseLocalDate(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(date: string, days: number): string {
  const day = parseLocalDate(date)
  day.setDate(day.getDate() + days)
  return localDateString(day)
}

export function weekStartOf(date: Date, weekStart: WeekStart): string {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const offset = weekStart === 'monday' ? (day.getDay() + 6) % 7 : day.getDay()
  day.setDate(day.getDate() - offset)
  return localDateString(day)
}

export function localDaysToIsoRange(
  firstDate: string,
  lastDate: string
): { fromIso: string; toIso: string } {
  return {
    fromIso: parseLocalDate(firstDate).toISOString(),
    toIso: parseLocalDate(addDays(lastDate, 1)).toISOString()
  }
}
