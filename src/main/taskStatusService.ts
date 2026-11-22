import type { Task, TaskStatus } from '@shared/types'

export const BLOCKED_TASK_MESSAGE = 'Tarefa bloqueada por dependências não concluídas'
export const BLOCKED_PARENT_MESSAGE = 'A tarefa pai possui dependências não concluídas'

type StatusTask = Pick<
  Task,
  'id' | 'name' | 'status' | 'is_blocked' | 'is_running' | 'parent_task_id' | 'recurrence_rule'
>

export interface StatusChangeDeps {
  getTask: (id: number) => StatusTask | undefined
  updateTaskStatus: (id: number, status: TaskStatus) => void
  stopTimer: (id: number) => void
  createNextRecurrence: (id: number) => { id: number } | null
  getNextRecurrenceIds: (id: number) => number[]
  deleteNextRecurrence: (id: number) => void
  completeSubtasksCheck: (parentId: number) => boolean
  getTaskDependents: (id: number) => number[]
  filterGcalSyncedIds: (ids: number[]) => number[]
  syncCalendar: (ids: number[]) => void
  pushCalendar: (ids: number[]) => void
  autoSync: (id: number) => void
  notifyUnblocked: (id: number, name: string) => void
}

export function statusChangeRefusal(
  deps: Pick<StatusChangeDeps, 'getTask'>,
  task: StatusTask,
  status: TaskStatus
): string | null {
  if (status === 'executando' && task.is_blocked) return BLOCKED_TASK_MESSAGE
  if (status === 'finalizada' && task.parent_task_id) {
    if (deps.getTask(task.parent_task_id)?.is_blocked) return BLOCKED_PARENT_MESSAGE
  }
  return null
}

function stopTimerIfRunning(deps: StatusChangeDeps, task: StatusTask): void {
  if (task.is_running) deps.stopTimer(task.id)
}

export function applyStatusChange(deps: StatusChangeDeps, id: number, status: TaskStatus): void {
  const task = deps.getTask(id)
  if (!task) return

  const refusal = statusChangeRefusal(deps, task, status)
  if (refusal) throw new Error(refusal)

  const previousStatus = task.status
  if (status === 'finalizada') stopTimerIfRunning(deps, task)
  deps.updateTaskStatus(id, status)

  const recurs = Boolean(task.recurrence_rule) && !task.parent_task_id
  if (status === 'finalizada' && previousStatus !== 'finalizada') {
    if (recurs) {
      const next = deps.createNextRecurrence(id)
      if (next) deps.syncCalendar([next.id])
    }
    if (task.parent_task_id && deps.completeSubtasksCheck(task.parent_task_id)) {
      const parent = deps.getTask(task.parent_task_id)
      if (parent) stopTimerIfRunning(deps, parent)
      deps.syncCalendar([task.parent_task_id])
    }
    for (const dependentId of deps.getTaskDependents(id)) {
      const dependent = deps.getTask(dependentId)
      if (dependent && !dependent.is_blocked) deps.notifyUnblocked(dependentId, dependent.name)
    }
  } else if (status !== 'finalizada' && previousStatus === 'finalizada' && recurs) {
    const calendarIds = deps.filterGcalSyncedIds(deps.getNextRecurrenceIds(id))
    deps.deleteNextRecurrence(id)
    deps.pushCalendar(calendarIds)
  }

  deps.autoSync(id)
}
