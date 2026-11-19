import type { TaskCategory, TaskStatus } from '@shared/types'
import { TASK_STATUSES } from '@shared/taskStatusCounts'

export type FilterCategory = TaskCategory | 'all'
export type FilterStatus = TaskStatus | 'all'
export type SortMode = 'updated' | 'due_date' | 'status_changed'

export const STALE_DAYS_OPTIONS = [7, 14, 30] as const

export interface TaskFiltersValue {
  category: FilterCategory
  contextId: number | null
  projectId: number | null
  tagId: number | null
  blockedOnly: boolean
  overdue: boolean
  staleDays: number | null
  sort: SortMode
}

export const EMPTY_TASK_FILTERS: TaskFiltersValue = {
  category: 'all',
  contextId: null,
  projectId: null,
  tagId: null,
  blockedOnly: false,
  overdue: false,
  staleDays: null,
  sort: 'updated'
}

export function activeFilterCount(value: TaskFiltersValue): number {
  return (
    (value.category !== 'all' ? 1 : 0) +
    (value.contextId !== null ? 1 : 0) +
    (value.projectId !== null ? 1 : 0) +
    (value.tagId !== null ? 1 : 0) +
    (value.blockedOnly ? 1 : 0) +
    (value.overdue ? 1 : 0) +
    (value.staleDays !== null ? 1 : 0) +
    (value.sort !== 'updated' ? 1 : 0)
  )
}

function idParam(params: URLSearchParams, key: string): number | null {
  const id = Number(params.get(key))
  return Number.isInteger(id) && id > 0 ? id : null
}

const SORT_PARAMS: Record<string, SortMode> = { parada: 'status_changed', prazo: 'due_date' }

export interface ListIntent {
  status: FilterStatus
  filters: TaskFiltersValue
}

export function listIntentFromSearch(search: string): ListIntent | null {
  const params = new URLSearchParams(search)
  const contextId = idParam(params, 'context')
  const tagId = idParam(params, 'tag')
  const statusParam = params.get('status')
  const status = TASK_STATUSES.find((s) => s === statusParam)
  const overdue = params.get('prazo') === 'vencido'
  const staleParam = idParam(params, 'parada')
  const staleDays = STALE_DAYS_OPTIONS.find((days) => days === staleParam) ?? null
  const sort = SORT_PARAMS[params.get('ordem') ?? '']
  if (contextId === null && tagId === null && !status && !overdue && staleDays === null && !sort) {
    return null
  }
  return {
    status: status ?? 'all',
    filters: {
      ...EMPTY_TASK_FILTERS,
      contextId,
      tagId,
      overdue,
      staleDays,
      sort: sort ?? EMPTY_TASK_FILTERS.sort
    }
  }
}
