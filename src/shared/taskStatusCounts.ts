import type { TaskStatus } from './types'

export const TASK_STATUSES: readonly TaskStatus[] = [
  'inbox',
  'aguardando',
  'proximas',
  'executando',
  'finalizada',
  'someday'
]

export type TaskStatusCounts = Record<TaskStatus | 'all', number>

export function toStatusCounts(
  rows: readonly { status: string; total: number }[]
): TaskStatusCounts {
  const counts = Object.fromEntries(
    [...TASK_STATUSES, 'all'].map((key) => [key, 0])
  ) as TaskStatusCounts
  for (const row of rows) {
    if (!(TASK_STATUSES as readonly string[]).includes(row.status)) continue
    counts[row.status as TaskStatus] = row.total
    counts.all += row.total
  }
  return counts
}
