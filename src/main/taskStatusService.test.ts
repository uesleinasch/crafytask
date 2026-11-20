import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TaskStatus } from '@shared/types'
import {
  BLOCKED_PARENT_MESSAGE,
  BLOCKED_TASK_MESSAGE,
  applyStatusChange,
  type StatusChangeDeps
} from './taskStatusService'

interface FakeTask {
  id: number
  name: string
  status: TaskStatus
  is_blocked: boolean
  parent_task_id: number | null
  recurrence_rule: string | null
}

let tasks: Map<number, FakeTask>
let deps: StatusChangeDeps
let calls: string[]

function add(task: Partial<FakeTask> & { id: number }): void {
  tasks.set(task.id, {
    name: `task ${task.id}`,
    status: 'proximas',
    is_blocked: false,
    parent_task_id: null,
    recurrence_rule: null,
    ...task
  })
}

beforeEach(() => {
  tasks = new Map()
  calls = []
  deps = {
    getTask: (id) => tasks.get(id),
    updateTaskStatus: (id, status) => {
      tasks.get(id)!.status = status
    },
    createNextRecurrence: vi.fn((id: number) => {
      calls.push(`recurrence:${id}`)
      return { id: 100 }
    }),
    getNextRecurrenceIds: () => [100, 101],
    deleteNextRecurrence: (id) => calls.push(`deleteRecurrence:${id}`),
    completeSubtasksCheck: vi.fn(() => false),
    getTaskDependents: () => [],
    filterGcalSyncedIds: (ids) => ids.filter((id) => id === 100),
    syncCalendar: (ids) => calls.push(`sync:${ids.join(',')}`),
    pushCalendar: (ids) => calls.push(`push:${ids.join(',')}`),
    autoSync: (id) => calls.push(`autoSync:${id}`),
    notifyUnblocked: (id, name) => calls.push(`unblocked:${id}:${name}`)
  }
})

describe('applyStatusChange', () => {
  it('ignora task inexistente', () => {
    expect(() => applyStatusChange(deps, 9, 'executando')).not.toThrow()
    expect(calls).toEqual([])
  })

  it('barra executando em task bloqueada e não grava nada', () => {
    add({ id: 1, is_blocked: true })
    expect(() => applyStatusChange(deps, 1, 'executando')).toThrow(BLOCKED_TASK_MESSAGE)
    expect(tasks.get(1)!.status).toBe('proximas')
    expect(calls).toEqual([])
  })

  it('barra concluir subtarefa de pai bloqueado', () => {
    add({ id: 1, is_blocked: true })
    add({ id: 2, parent_task_id: 1 })
    expect(() => applyStatusChange(deps, 2, 'finalizada')).toThrow(BLOCKED_PARENT_MESSAGE)
    expect(tasks.get(2)!.status).toBe('proximas')
  })

  it('cria a próxima recorrência ao finalizar, uma vez só', () => {
    add({ id: 1, recurrence_rule: '{"type":"daily"}' })
    applyStatusChange(deps, 1, 'finalizada')
    applyStatusChange(deps, 1, 'finalizada')
    expect(calls).toEqual(['recurrence:1', 'sync:100', 'autoSync:1', 'autoSync:1'])
  })

  it('não cria recorrência para subtarefa', () => {
    add({ id: 1 })
    add({ id: 2, parent_task_id: 1, recurrence_rule: '{"type":"daily"}' })
    applyStatusChange(deps, 2, 'finalizada')
    expect(deps.createNextRecurrence).not.toHaveBeenCalled()
  })

  it('desfaz a recorrência ao reabrir, avisando a agenda só das sincronizadas', () => {
    add({ id: 1, status: 'finalizada', recurrence_rule: '{"type":"daily"}' })
    applyStatusChange(deps, 1, 'proximas')
    expect(calls).toEqual(['deleteRecurrence:1', 'push:100', 'autoSync:1'])
  })

  it('fecha o pai quando a última subtarefa termina', () => {
    add({ id: 1 })
    add({ id: 2, parent_task_id: 1 })
    deps.completeSubtasksCheck = vi.fn(() => true)
    applyStatusChange(deps, 2, 'finalizada')
    expect(deps.completeSubtasksCheck).toHaveBeenCalledWith(1)
    expect(calls).toEqual(['sync:1', 'autoSync:2'])
  })

  it('avisa só os dependentes que ficaram livres', () => {
    add({ id: 1 })
    add({ id: 2, name: 'livre' })
    add({ id: 3, name: 'ainda presa', is_blocked: true })
    deps.getTaskDependents = () => [2, 3, 99]
    applyStatusChange(deps, 1, 'finalizada')
    expect(calls).toEqual(['unblocked:2:livre', 'autoSync:1'])
  })
})
