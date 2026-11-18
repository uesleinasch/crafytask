import type { Task } from '@shared/types'
import { archiveCutoff, daysAgo } from '@shared/archiveAge'

export type ArchiveGroupBy = 'month' | 'project' | 'none'
export type ArchiveAge = 'all' | '30' | '90' | '365'

export interface ArchiveGroup {
  key: string
  label: string
  color: string | null
  kind: 'month' | 'project'
  tasks: Task[]
}

export function parseArchivedAt(value: string | null | undefined): Date | null {
  if (!value) return null
  const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(value)
    ? `${value.replace(' ', 'T')}Z`
    : value
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date
}

const pad = (n: number): string => String(n).padStart(2, '0')

export function archiveMonthKey(value: string | null | undefined): string {
  const date = parseArchivedAt(value)
  return date ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}` : 'sem-data'
}

export function monthLabel(key: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(key)
  if (!match) return 'Sem data'
  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1)
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date)
}

export function formatArchivedShort(value: string | null | undefined): string {
  const date = parseArchivedAt(value)
  if (!date) return '—'
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${String(date.getFullYear()).slice(2)}`
}

export function formatArchivedDate(value: string | null | undefined): string | null {
  const date = parseArchivedAt(value)
  if (!date) return null
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`
}

export function formatArchivedLong(value: string | null | undefined): string {
  const date = parseArchivedAt(value)
  if (!date) return 'Sem data de arquivamento'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(date)
}

export function formatHoursMinutes(seconds: number): string {
  const total = Math.round(seconds / 60)
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  if (hours === 0) return `${minutes} min`
  return minutes ? `${hours}h ${pad(minutes)}min` : `${hours}h`
}

export function archivedAfterFor(age: ArchiveAge, today: Date): string | undefined {
  if (age === '30') return daysAgo(30, today)
  if (age === '90') return daysAgo(90, today)
  if (age === '365') return archiveCutoff(12, today)
  return undefined
}

export function groupArchive(tasks: Task[], by: ArchiveGroupBy): ArchiveGroup[] | null {
  if (by === 'none') return null
  const groups = new Map<string, ArchiveGroup>()
  for (const task of tasks) {
    const key =
      by === 'month' ? `m:${archiveMonthKey(task.archived_at)}` : `p:${task.project_id ?? 0}`
    let group = groups.get(key)
    if (!group) {
      group =
        by === 'month'
          ? {
              key,
              kind: 'month',
              label: monthLabel(key.slice(2)),
              color: null,
              tasks: []
            }
          : {
              key,
              kind: 'project',
              label: task.project_name ?? 'Sem projeto',
              color: task.project_id ? (task.project_color ?? null) : null,
              tasks: []
            }
      groups.set(key, group)
    }
    group.tasks.push(task)
  }
  return [...groups.values()]
}
