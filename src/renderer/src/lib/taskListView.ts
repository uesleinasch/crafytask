import type { TaskStatus } from '@shared/types'
import type { GroupBy } from './taskGrouping'

export type ListView = 'table' | 'cards' | 'kanban'
export type ListGroup = 'none' | GroupBy

export const LIST_VIEW_KEY = 'ticktask:taskListView'
export const LIST_GROUP_KEY = 'ticktask:taskListGroup'

const GROUPS: readonly GroupBy[] = ['project', 'context', 'jira_space', 'jira_parent']

export function effectiveListView(
  view: ListView,
  status: TaskStatus | 'all',
  narrow = false
): ListView {
  const byStatus = view === 'kanban' && status !== 'executando' ? 'table' : view
  return narrow && byStatus === 'table' ? 'cards' : byStatus
}

export function kanbanGroup(group: ListGroup): GroupBy {
  return group === 'none' ? 'project' : group
}

function parse(raw: string | null): unknown {
  if (raw === null) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function asGroup(value: unknown): GroupBy | null {
  return GROUPS.includes(value as GroupBy) ? (value as GroupBy) : null
}

export function legacyListPrefs(read: (key: string) => string | null): {
  view: ListView
  group: ListGroup
} {
  const viewMode = parse(read('ticktask:taskListViewMode'))
  const grouping = parse(read('ticktask:taskListGrouping'))
  const groupBy = asGroup(parse(read('ticktask:taskListGroupBy')))
  const kanban = parse(read('ticktask:executandoKanban'))
  const kanbanGroupBy = asGroup(parse(read('ticktask:executandoKanbanGroupBy')))

  const view: ListView = kanban === true ? 'kanban' : viewMode === 'cards' ? 'cards' : 'table'
  const group: ListGroup =
    kanban === true
      ? (kanbanGroupBy ?? groupBy ?? 'project')
      : grouping === true
        ? (groupBy ?? 'project')
        : 'none'
  return { view, group }
}
