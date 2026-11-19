import type { TimeBlock } from '@shared/types'
import { localDateString } from '@shared/dueState'

export const JOURNEY_MIN = 8 * 60

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

export function weekDays(today: Date): WeekDay[] {
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
    return { date: localDateString(day), label: WEEKDAY_SHORT[day.getDay()] }
  })
}

export function formatPlannedHours(minutes: number): string {
  const hours = Math.round(minutes / 6) / 10
  return `${String(hours).replace('.', ',')}h`
}

export function loadPercent(minutes: number, journey = JOURNEY_MIN): number {
  return Math.min(100, Math.round((minutes / journey) * 100))
}

export function planTitle(today: Date): string {
  const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' })
    .format(today)
    .replace('-feira', '')
  const date = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' }).format(today)
  return `Plano de ${weekday}, ${date}`
}
