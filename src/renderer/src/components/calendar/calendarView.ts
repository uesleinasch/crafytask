import type { Task, TimeBlock, TimeEntrySpan } from '@shared/types'
import { addDays, weekStartOf, type WeekStart } from '@shared/calendarPrefs'
import { localDateString } from '@shared/dueState'

export type CalendarView = 'day' | '3days' | 'week' | 'month'
export type GridView = Exclude<CalendarView, 'month'>

export const DRAG_TYPE = 'application/x-crafytask-calendar'

export type ShowKey = 'block' | 'event' | 'scheduled' | 'due' | 'sessions' | 'weekend'
export const SHOW_KEYS: ShowKey[] = ['block', 'event', 'scheduled', 'due', 'sessions', 'weekend']

export const VIEW_OPTIONS: { value: CalendarView; label: string }[] = [
  { value: 'day', label: 'Dia' },
  { value: '3days', label: '3 dias' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mês' }
]

export function toMin(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function fromMin(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const rest = minutes % 60
  return `${Math.floor(minutes / 60)}h${rest ? String(rest).padStart(2, '0') : ''}`
}

export function defaultView(screens: { lg?: boolean; md?: boolean }): GridView {
  if (screens.lg) return 'week'
  if (screens.md) return '3days'
  return 'day'
}

export function viewDays(view: GridView, cursor: string, weekStart: WeekStart): string[] {
  if (view === 'day') return [cursor]
  if (view === '3days') return [0, 1, 2].map((i) => addDays(cursor, i))
  const first = weekStartOf(new Date(`${cursor}T12:00:00`), weekStart)
  return Array.from({ length: 7 }, (_, i) => addDays(first, i))
}

export function isWeekend(date: string): boolean {
  const day = new Date(`${date}T12:00:00`).getDay()
  return day === 0 || day === 6
}

export function stepCursor(view: CalendarView, cursor: string, direction: 1 | -1): string {
  if (view === 'month') {
    const [y, m] = cursor.split('-').map(Number)
    return localDateString(new Date(y, m - 1 + direction, 1))
  }
  const days = view === 'week' ? 7 : view === '3days' ? 3 : 1
  return addDays(cursor, days * direction)
}

const fmt = (date: string, options: Intl.DateTimeFormatOptions): string =>
  new Intl.DateTimeFormat('pt-BR', options).format(new Date(`${date}T12:00:00`))

export function periodLabel(view: CalendarView, cursor: string, days: string[]): string {
  if (view === 'month') return fmt(cursor, { month: 'long', year: 'numeric' })
  if (view === 'day') return fmt(cursor, { weekday: 'long', day: 'numeric', month: 'long' })
  const first = days[0]
  const last = days[days.length - 1]
  if (first.slice(0, 7) === last.slice(0, 7)) {
    return `${Number(first.slice(8))}–${fmt(last, { day: 'numeric', month: 'long', year: 'numeric' })}`
  }
  const short = (d: string): string =>
    fmt(d, { day: 'numeric', month: 'short' }).replace(' de ', ' ').replace('.', '')
  return `${short(first)} – ${short(last)} ${last.slice(0, 4)}`
}

export interface GridItem {
  key: string
  kind: 'block' | 'event'
  taskId: number
  start: string
  end: string
  block?: TimeBlock
  task?: Task
}

export interface PlacedItem extends GridItem {
  col: number
  cols: number
}

export function layoutDay(items: GridItem[]): PlacedItem[] {
  const sorted = [...items].sort(
    (a, b) => toMin(a.start) - toMin(b.start) || toMin(b.end) - toMin(a.end)
  )
  const out: PlacedItem[] = []
  let cluster: PlacedItem[] = []
  let clusterEnd = -1
  const flush = (): void => {
    const ends: number[] = []
    for (const item of cluster) {
      let col = ends.findIndex((end) => end <= toMin(item.start))
      if (col < 0) {
        col = ends.length
        ends.push(0)
      }
      ends[col] = toMin(item.end)
      item.col = col
    }
    for (const item of cluster) out.push({ ...item, cols: ends.length })
    cluster = []
  }
  for (const item of sorted) {
    if (cluster.length && toMin(item.start) >= clusterEnd) flush()
    cluster.push({ ...item, col: 0, cols: 1 })
    clusterEnd = Math.max(clusterEnd, toMin(item.end))
  }
  flush()
  return out
}

export function eventsOfDay(tasks: Task[], date: string): GridItem[] {
  return tasks
    .filter((t) => t.scheduled_date === date && t.scheduled_time)
    .map((t) => {
      const start = t.scheduled_time as string
      const end =
        t.scheduled_end_time && t.scheduled_end_time > start
          ? t.scheduled_end_time
          : fromMin(Math.min(24 * 60 - 1, toMin(start) + 60))
      return { key: `e${t.id}`, kind: 'event', taskId: t.id, start, end, task: t }
    })
}

export function blocksOfDay(blocks: TimeBlock[], date: string): GridItem[] {
  return blocks
    .filter((b) => b.date === date)
    .map((b) => ({
      key: `b${b.id}`,
      kind: 'block',
      taskId: b.task_id,
      start: b.start_time,
      end: b.end_time,
      block: b
    }))
}

export function plannedMinutes(blocks: TimeBlock[], date: string): number {
  return blocks
    .filter((b) => b.date === date)
    .reduce((sum, b) => sum + Math.max(0, toMin(b.end_time) - toMin(b.start_time)), 0)
}

export interface AllDayItem {
  key: string
  kind: 'scheduled' | 'due'
  task: Task
}

export function allDayOf(tasks: Task[], date: string, show: Set<ShowKey>): AllDayItem[] {
  const scheduled = show.has('scheduled')
    ? tasks
        .filter((t) => t.scheduled_date === date && !t.scheduled_time)
        .map((task) => ({ key: `s${task.id}`, kind: 'scheduled' as const, task }))
    : []
  const due = show.has('due')
    ? tasks
        .filter((t) => t.due_date?.slice(0, 10) === date && t.status !== 'finalizada')
        .map((task) => ({ key: `d${task.id}`, kind: 'due' as const, task }))
    : []
  return [...scheduled, ...due]
}

export interface SessionSegment {
  key: string
  start: number
  end: number
  running: boolean
  span: TimeEntrySpan
}

export function sessionsOfDay(spans: TimeEntrySpan[], date: string, now: Date): SessionSegment[] {
  const [y, m, d] = date.split('-').map(Number)
  const dayStart = new Date(y, m - 1, d).getTime()
  const dayEnd = new Date(y, m - 1, d + 1).getTime()
  const out: SessionSegment[] = []
  for (const span of spans) {
    const start = Date.parse(span.start_time)
    const end = span.end_time ? Date.parse(span.end_time) : now.getTime()
    const from = Math.max(start, dayStart)
    const to = Math.min(end, dayEnd)
    if (to <= from) continue
    out.push({
      key: `${span.id}-${date}`,
      start: Math.round((from - dayStart) / 60000),
      end: Math.round((to - dayStart) / 60000),
      running: span.end_time === null,
      span
    })
  }
  return out
}

export function clampToGrid(
  start: number,
  end: number,
  startHour: number,
  endHour: number
): { top: number; length: number } | null {
  const from = Math.max(start, startHour * 60)
  const to = Math.min(end, endHour * 60)
  if (to <= from) return null
  return { top: from - startHour * 60, length: to - from }
}

export function snapSlot(minutes: number, startHour: number, endHour: number): number {
  const snapped = Math.round(minutes / 15) * 15
  return Math.min(Math.max(startHour * 60, snapped), endHour * 60 - 60)
}

const LAST_MINUTE = 24 * 60 - 1

export function snapDelta(minutes: number): number {
  return Math.round(minutes / 15) * 15
}

export function movedTimes(
  start: string,
  end: string,
  deltaMin: number,
  startHour: number,
  endHour: number
): { start_time: string; end_time: string } {
  const length = toMin(end) - toMin(start)
  const last = Math.min(endHour * 60, LAST_MINUTE)
  const from = Math.min(last - length, Math.max(startHour * 60, toMin(start) + snapDelta(deltaMin)))
  return { start_time: fromMin(from), end_time: fromMin(from + length) }
}

export function resizedEnd(start: string, end: string, deltaMin: number, endHour: number): string {
  const last = Math.min(endHour * 60, LAST_MINUTE)
  return fromMin(Math.min(last, Math.max(toMin(start) + 15, toMin(end) + snapDelta(deltaMin))))
}

export function dropStart(minutes: number, startHour: number, endHour: number): number {
  return Math.min(
    Math.max(startHour * 60, snapDelta(minutes)),
    Math.min(endHour * 60, LAST_MINUTE) - 60
  )
}
