import type { TimeBlock } from '@shared/types'
import { addDays, weekStartOf, type WeekStart } from '@shared/calendarPrefs'
import { DEFAULT_WORKFLOW_PREFS } from '@shared/workflowPrefs'

const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function blockMinutes(block: Pick<TimeBlock, 'start_time' | 'end_time'>): number {
  return Math.max(0, minutesOf(block.end_time) - minutesOf(block.start_time))
}

export function plannedMinByDate(
  blocks: Pick<TimeBlock, 'date' | 'start_time' | 'end_time'>[]
): Map<string, number> {
  const totals = new Map<string, number>()
  for (const block of blocks) {
    totals.set(block.date, (totals.get(block.date) ?? 0) + blockMinutes(block))
  }
  return totals
}

export interface WeekDay {
  date: string
  label: string
}

export function weekDays(
  today: Date,
  weekStart: WeekStart = DEFAULT_WORKFLOW_PREFS.weekStart
): WeekDay[] {
  const first = weekStartOf(today, weekStart)
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(first, i)
    return { date, label: WEEKDAY_SHORT[new Date(`${date}T12:00:00`).getDay()] }
  })
}

export function formatPlannedHours(minutes: number): string {
  const hours = Math.round(minutes / 6) / 10
  return `${String(hours).replace('.', ',')}h`
}

export function loadPercent(minutes: number, journey: number): number {
  return Math.min(100, Math.round((minutes / journey) * 100))
}

export function planTitle(today: Date): string {
  const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' })
    .format(today)
    .replace('-feira', '')
  const date = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' }).format(today)
  return `Plano de ${weekday}, ${date}`
}
