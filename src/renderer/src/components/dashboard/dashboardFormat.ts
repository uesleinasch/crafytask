import type { StatsBucket, StatsGranularity, StatsHourCell } from '@shared/types'
import { localDateString } from '@shared/dueState'

export const PERIOD_PRESETS = [
  { value: 7, label: '7 dias' },
  { value: 30, label: '30 dias' },
  { value: 90, label: '90 dias' },
  { value: 365, label: '12 meses' }
] as const

export const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const
export const HEAT_HOURS = Array.from({ length: 18 }, (_, i) => i + 6)

export function percent(value: number, total: number): string {
  return total > 0 ? `${Math.round((value / total) * 100)}%` : '—'
}

export function formatCount(value: number): string {
  return value.toLocaleString('pt-BR')
}

export function formatHM(seconds: number): string {
  const total = Math.round(seconds / 60)
  if (total <= 0) return '0 min'
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  if (!hours) return `${minutes} min`
  return `${formatCount(hours)}h${minutes ? ` ${String(minutes).padStart(2, '0')}min` : ''}`
}

function parseDay(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function presetRange(days: number, today: Date): { start: string; end: string } {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - (days - 1))
  return { start: localDateString(start), end: localDateString(end) }
}

export function rangeDays(start: string, end: string): number {
  return Math.round((parseDay(end).getTime() - parseDay(start).getTime()) / 86_400_000) + 1
}

export function periodName(start: string, end: string): string {
  const days = rangeDays(start, end)
  return PERIOD_PRESETS.find((p) => p.value === days)?.label ?? `${days} dias`
}

export const UNIT_LABEL: Record<StatsGranularity, string> = {
  day: 'dia',
  week: 'semana',
  month: 'mês'
}

export const CURRENT_LABEL: Record<StatsGranularity, string> = {
  day: 'hoje',
  week: 'esta semana',
  month: 'este mês'
}

export interface BucketView extends StatsBucket {
  label: string
  title: string
  showLabel: boolean
}

const dayMonth = (date: Date): string =>
  date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

export function bucketViews(
  buckets: StatsBucket[],
  granularity: StatsGranularity,
  days: number
): BucketView[] {
  const last = buckets.length - 1
  return buckets.map((bucket, i) => {
    if (granularity === 'month') {
      const date = parseDay(`${bucket.key}-01`)
      return {
        ...bucket,
        label: date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
        title: date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
        showLabel: true
      }
    }
    const date = parseDay(bucket.key)
    if (granularity === 'week') {
      return {
        ...bucket,
        label: dayMonth(date),
        title: `Semana de ${dayMonth(date)}`,
        showLabel: i % 2 === last % 2
      }
    }
    const weekday = WEEKDAYS[date.getDay()]
    return {
      ...bucket,
      label: days <= 7 ? weekday.toLowerCase() : dayMonth(date),
      title: `${weekday.toLowerCase()}, ${dayMonth(date)}`,
      showLabel: days <= 7 || i % 5 === last % 5
    }
  })
}

export function niceMaxHours(maxSeconds: number): number {
  const hours = Math.max(1, maxSeconds / 3600)
  const step = [1, 2, 5, 10, 20, 50, 100, 200].find((s) => hours / s <= 4) ?? 500
  return Math.ceil(hours / step) * step
}

export function heatLevel(value: number, max: number): number {
  if (!value || !max) return 0
  return Math.min(5, Math.max(1, Math.ceil((value / max) * 5)))
}

export interface Delta {
  direction: 'up' | 'down' | 'same'
  text: string
}

export function delta(
  current: number,
  previous: number,
  format: (value: number) => string
): Delta | null {
  if (!current && !previous) return null
  const diff = current - previous
  if (diff === 0) return { direction: 'same', text: format(0) }
  return {
    direction: diff > 0 ? 'up' : 'down',
    text: `${diff > 0 ? '+' : '−'}${format(Math.abs(diff))}`
  }
}

export function hourGrid(cells: StatsHourCell[]): number[][] {
  const grid = WEEK_ORDER.map(() => HEAT_HOURS.map(() => 0))
  for (const cell of cells) {
    const row = WEEK_ORDER.indexOf(cell.weekday as (typeof WEEK_ORDER)[number])
    const col = HEAT_HOURS.indexOf(cell.hour)
    if (row >= 0 && col >= 0) grid[row][col] += cell.seconds
  }
  return grid
}

export interface CalendarCell {
  date: string
  seconds: number
}

export interface CalendarWeek {
  month: string
  days: (CalendarCell | null)[]
}

export function calendarWeeks(
  start: string,
  end: string,
  daily: { date: string; seconds: number }[]
): CalendarWeek[] {
  const seconds = new Map(daily.map((d) => [d.date, d.seconds]))
  const first = parseDay(start)
  const last = parseDay(end)
  const cells: (CalendarCell | null)[] = Array.from(
    { length: (first.getDay() + 6) % 7 },
    () => null
  )
  for (
    let day = first;
    day <= last;
    day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)
  ) {
    const key = localDateString(day)
    cells.push({ date: key, seconds: seconds.get(key) ?? 0 })
  }
  const weeks: CalendarWeek[] = []
  let previousMonth = ''
  for (let i = 0; i < cells.length; i += 7) {
    const days = cells.slice(i, i + 7)
    while (days.length < 7) days.push(null)
    const firstDay = days.find((d) => d !== null)
    const month = firstDay ? firstDay.date.slice(0, 7) : ''
    weeks.push({
      month:
        month && month !== previousMonth
          ? parseDay(`${month}-01`).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
          : '',
      days
    })
    if (month) previousMonth = month
  }
  return weeks
}
