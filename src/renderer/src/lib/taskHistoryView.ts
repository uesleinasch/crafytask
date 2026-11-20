import type { TaskHistoryItem } from '@shared/types'

export type HistoryFilter = 'all' | 'checkpoints' | 'status'

export function filterHistory(items: TaskHistoryItem[], filter: HistoryFilter): TaskHistoryItem[] {
  if (filter === 'all') return items
  return items.filter((item) =>
    filter === 'checkpoints' ? item.kind === 'checkpoint' : item.kind === 'status'
  )
}

export function historyItemKey(item: TaskHistoryItem): string {
  return `${item.kind === 'status' ? 'status' : 'entry'}-${item.id}`
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function formatHistoryTime(createdAt: string, now: Date): string {
  const date = new Date(`${createdAt.replace(' ', 'T')}Z`)
  if (Number.isNaN(date.getTime())) return createdAt
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (sameDay(date, now)) return `hoje ${time}`
  const day = date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    ...(date.getFullYear() === now.getFullYear() ? null : { year: 'numeric' })
  })
  return `${day} ${time}`
}
