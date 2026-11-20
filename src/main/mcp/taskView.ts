import type { Task, TaskCategory, TaskStatus, EnergyLevel } from '@shared/types'

export type TaskDetail = 'compact' | 'full'

export interface CompactTask {
  id: number
  name: string
  status: TaskStatus
  category: TaskCategory
  energy?: EnergyLevel
  project?: string
  due_date?: string
  due_time?: string
  scheduled_date?: string
  scheduled_time?: string
  tags?: string[]
  contexts?: string[]
  is_blocked?: true
  is_running?: true
  waiting_for?: string
  subtasks?: string
  jira_key?: string
}

function filled(value: string | null | undefined): string | undefined {
  return value ? value : undefined
}

function names(items: { name: string }[] | undefined): string[] | undefined {
  return items && items.length > 0 ? items.map((item) => item.name) : undefined
}

export function compactTask(task: Task): CompactTask {
  const total = task.subtask_count ?? 0
  const view: CompactTask = {
    id: task.id,
    name: task.name,
    status: task.status,
    category: task.category,
    energy: task.energy_level ?? undefined,
    project: filled(task.project_name),
    due_date: filled(task.due_date),
    due_time: filled(task.due_time),
    scheduled_date: filled(task.scheduled_date),
    scheduled_time: filled(task.scheduled_time),
    tags: names(task.tags),
    contexts: names(task.contexts),
    is_blocked: task.is_blocked ? true : undefined,
    is_running: task.is_running ? true : undefined,
    waiting_for: filled(task.waiting_for),
    subtasks: total > 0 ? `${task.completed_subtask_count ?? 0}/${total}` : undefined,
    jira_key: filled(task.jira_key)
  }
  return JSON.parse(JSON.stringify(view)) as CompactTask
}

export function fullTask(task: Task): Task {
  const clean: Task = { ...task }
  delete clean.notes
  return clean
}

export function viewTask(task: Task, detail: TaskDetail = 'compact'): CompactTask | Task {
  return detail === 'full' ? fullTask(task) : compactTask(task)
}
