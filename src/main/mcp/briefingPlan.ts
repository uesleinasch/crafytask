import type { Task, TaskHistoryItem, TimeBlock } from '@shared/types'
import { compactTask, type CompactTask } from './taskView'

export const BRIEFING_SECTION_LIMIT = 10
const TEXT_LIMIT = 200
const STALE_MS = 24 * 60 * 60 * 1000

export interface BriefingInput {
  date: string
  now: Date
  running: Task[]
  executando: Task[]
  checkpoints: Map<number, TaskHistoryItem>
  today: Task[]
  timeBlocks: TimeBlock[]
  overdue: { total: number; sample: Task[] }
  waiting: Task[]
  inboxCount: number
  here?: { directory: string; project: { id: number; name: string } | null; tasks: Task[] }
}

interface Section<T> {
  total: number
  items: T[]
}

type InProgress = CompactTask & {
  checkpoint?: { summary: string; remaining?: string; at: string }
}
type Waiting = CompactTask & { waiting_days?: number }

export interface Briefing {
  date: string
  running: Section<CompactTask>
  executando: Section<InProgress>
  today: Section<CompactTask> & {
    time_blocks: { id: number; task_id: number; task: string; start: string; end: string }[]
  }
  overdue: Section<CompactTask>
  waiting: Section<Waiting>
  inbox_count: number
  here?: { directory: string; project: { id: number; name: string } | null } & Section<CompactTask>
  warnings: string[]
}

function section<T, R>(items: T[], map: (item: T) => R, total = items.length): Section<R> {
  return { total, items: items.slice(0, BRIEFING_SECTION_LIMIT).map(map) }
}

function short(text: string | null | undefined): string | undefined {
  if (!text) return undefined
  return text.length > TEXT_LIMIT ? `${text.slice(0, TEXT_LIMIT - 1)}…` : text
}

// O SQLite grava CURRENT_TIMESTAMP em UTC, sem fuso: "AAAA-MM-DD HH:MM:SS".
export function sqliteUtcMs(value: string | null | undefined): number | null {
  if (!value) return null
  const ms = Date.parse(/[zZ]|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value.replace(' ', 'T')}Z`)
  return Number.isNaN(ms) ? null : ms
}

function inProgress(task: Task, checkpoint: TaskHistoryItem | undefined): InProgress {
  const view: InProgress = compactTask(task)
  if (checkpoint?.summary) {
    view.checkpoint = {
      summary: short(checkpoint.summary)!,
      at: checkpoint.created_at,
      ...(checkpoint.remaining && { remaining: short(checkpoint.remaining) })
    }
  }
  return view
}

function waiting(task: Task, now: Date): Waiting {
  const since = sqliteUtcMs(task.status_changed_at)
  const view: Waiting = compactTask(task)
  if (since !== null)
    view.waiting_days = Math.max(0, Math.floor((now.getTime() - since) / STALE_MS))
  return view
}

function label(task: Task): string {
  return `#${task.id} (${task.name})`
}

export function briefingWarnings(input: BriefingInput): string[] {
  const warnings: string[] = []
  for (const task of input.running) {
    if (task.status !== 'executando') {
      warnings.push(`Timer ligado na task ${label(task)}, que está em ${task.status}.`)
    }
  }
  const runningIds = new Set(input.running.map((task) => task.id))
  const parentIds = new Set(input.executando.map((task) => task.parent_task_id).filter(Boolean))
  for (const task of input.executando) {
    if (runningIds.has(task.id) || parentIds.has(task.id)) continue
    const last =
      sqliteUtcMs(input.checkpoints.get(task.id)?.created_at) ?? sqliteUtcMs(task.status_changed_at)
    if (last !== null && input.now.getTime() - last > STALE_MS) {
      warnings.push(
        `Task ${label(task)} em executando sem timer e sem checkpoint há mais de 1 dia: retome ou pause.`
      )
    }
  }
  return warnings
}

export function buildBriefing(input: BriefingInput): Briefing {
  const briefing: Briefing = {
    date: input.date,
    running: section(input.running, compactTask),
    executando: section(input.executando, (task) =>
      inProgress(task, input.checkpoints.get(task.id))
    ),
    today: {
      ...section(input.today, compactTask),
      time_blocks: input.timeBlocks
        .slice()
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
        .slice(0, BRIEFING_SECTION_LIMIT * 2)
        .map((block) => ({
          id: block.id,
          task_id: block.task_id,
          task: block.task_name ?? '',
          start: block.start_time,
          end: block.end_time
        }))
    },
    overdue: section(input.overdue.sample, compactTask, input.overdue.total),
    waiting: section(input.waiting, (task) => waiting(task, input.now)),
    inbox_count: input.inboxCount,
    warnings: briefingWarnings(input)
  }
  if (input.here) {
    briefing.here = {
      directory: input.here.directory,
      project: input.here.project,
      ...section(input.here.tasks, compactTask)
    }
  }
  return briefing
}
