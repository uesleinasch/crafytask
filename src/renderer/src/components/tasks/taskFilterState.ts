import type { TaskCategory } from '@shared/types'

export type FilterCategory = TaskCategory | 'all'
export type SortMode = 'updated' | 'due_date'

export interface TaskFiltersValue {
  category: FilterCategory
  contextId: number | null
  projectId: number | null
  tagId: number | null
  blockedOnly: boolean
  sort: SortMode
}

export const EMPTY_TASK_FILTERS: TaskFiltersValue = {
  category: 'all',
  contextId: null,
  projectId: null,
  tagId: null,
  blockedOnly: false,
  sort: 'updated'
}

export function activeFilterCount(value: TaskFiltersValue): number {
  return (
    (value.category !== 'all' ? 1 : 0) +
    (value.contextId !== null ? 1 : 0) +
    (value.projectId !== null ? 1 : 0) +
    (value.tagId !== null ? 1 : 0) +
    (value.blockedOnly ? 1 : 0) +
    (value.sort !== 'updated' ? 1 : 0)
  )
}
