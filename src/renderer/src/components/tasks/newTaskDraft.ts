import type { CreateTaskInput, EnergyLevel, TaskCategory } from '@shared/types'
import { isSafeHttpUrl } from '@shared/externalUrl'

export interface NewTaskDraft {
  name: string
  description: string
  category: TaskCategory
  projectId: number | null
  contextIds: number[]
  dueDate: string | null
  dueTime: string | null
  energy: EnergyLevel | null
  scheduledDate: string | null
  scheduledTime: string | null
  scheduledEndTime: string | null
  recurrence: string | null
  tags: string[]
  externalUrl: string
  timeLimit: string
}

export const EMPTY_DRAFT: NewTaskDraft = {
  name: '',
  description: '',
  category: 'normal',
  projectId: null,
  contextIds: [],
  dueDate: null,
  dueTime: null,
  energy: null,
  scheduledDate: null,
  scheduledTime: null,
  scheduledEndTime: null,
  recurrence: null,
  tags: [],
  externalUrl: '',
  timeLimit: ''
}

const TIME_LIMIT = /^\d{1,3}(:\d{1,2}){0,2}$/

export function parseTimeLimit(text: string): number | null | undefined {
  const value = text.trim()
  if (!value) return undefined
  if (!TIME_LIMIT.test(value)) return null
  const parts = value.split(':').map(Number)
  if (parts.slice(1).some((part) => part >= 60)) return null
  const [h, m, s] =
    parts.length === 3 ? parts : parts.length === 2 ? [0, parts[0], parts[1]] : [0, parts[0], 0]
  const seconds = h * 3600 + m * 60 + s
  return seconds > 0 ? seconds : null
}

export function draftProblem(draft: NewTaskDraft): string | null {
  if (!draft.name.trim()) return 'Dê um nome à tarefa.'
  if (parseTimeLimit(draft.timeLimit) === null) {
    return 'Limite de tempo em HH:MM:SS, MM:SS ou só os minutos.'
  }
  const url = draft.externalUrl.trim()
  if (url && !isSafeHttpUrl(url)) return 'O link precisa começar com http:// ou https://.'
  return null
}

export function draftToCreateInput(draft: NewTaskDraft): CreateTaskInput | null {
  if (draftProblem(draft)) return null
  const description = draft.description.trim()
  const url = draft.externalUrl.trim()
  return {
    name: draft.name.trim(),
    description: description || undefined,
    category: draft.category,
    project_id: draft.projectId ?? undefined,
    contextIds: draft.contextIds.length ? draft.contextIds : undefined,
    due_date: draft.dueDate ?? undefined,
    due_time: draft.dueDate ? draft.dueTime : null,
    energy_level: draft.energy ?? undefined,
    scheduled_date: draft.scheduledDate ?? undefined,
    scheduled_time: draft.scheduledDate ? draft.scheduledTime : null,
    scheduled_end_time: draft.scheduledDate && draft.scheduledTime ? draft.scheduledEndTime : null,
    recurrence_rule: draft.recurrence ?? undefined,
    tagNames: draft.tags.length ? draft.tags : undefined,
    external_url: url || null,
    time_limit_seconds: parseTimeLimit(draft.timeLimit) ?? undefined
  }
}

export function draftForAnother(draft: NewTaskDraft): NewTaskDraft {
  return {
    ...EMPTY_DRAFT,
    category: draft.category,
    projectId: draft.projectId,
    contextIds: draft.contextIds
  }
}
