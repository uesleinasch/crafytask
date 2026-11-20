import { describe, expect, it } from 'vitest'
import type { Task } from '@shared/types'
import { compactTask, fullTask, viewTask } from './taskView'

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 7,
    name: 'Escrever relatório',
    total_seconds: 120,
    status: 'proximas',
    category: 'normal',
    is_running: false,
    is_archived: false,
    created_at: '2026-11-20 10:00:00',
    updated_at: '2026-11-20 10:00:00',
    ...overrides
  }
}

describe('compactTask', () => {
  it('devolve só o essencial quando o resto está vazio', () => {
    const row = {
      ...task(),
      description: 'texto longo',
      due_date: null,
      due_time: null,
      waiting_for: null,
      jira_key: null,
      jira_status: null,
      tags: [],
      contexts: [],
      is_blocked: false,
      subtask_count: 0,
      completed_subtask_count: 0
    } as unknown as Task

    expect(compactTask(row)).toEqual({
      id: 7,
      name: 'Escrever relatório',
      status: 'proximas',
      category: 'normal'
    })
  })

  it('troca tags, contextos e projeto pelos nomes', () => {
    const view = compactTask(
      task({
        project_id: 3,
        project_name: 'CrafyTask',
        project_color: '#fff',
        tags: [
          { id: 1, name: 'mcp', color: '#000', created_at: '' },
          { id: 2, name: 'feature', color: '#111', created_at: '' }
        ],
        contexts: [{ id: 4, name: '@computador' } as never]
      })
    )

    expect(view.project).toBe('CrafyTask')
    expect(view.tags).toEqual(['mcp', 'feature'])
    expect(view.contexts).toEqual(['@computador'])
    expect(view).not.toHaveProperty('project_color')
  })

  it('mostra as subtarefas como feitas/total', () => {
    expect(compactTask(task({ subtask_count: 5, completed_subtask_count: 2 })).subtasks).toBe('2/5')
    expect(compactTask(task({ subtask_count: 3 })).subtasks).toBe('0/3')
  })

  it('mantém datas, horas, energia, espera, bloqueio, timer e chave do Jira', () => {
    expect(
      compactTask(
        task({
          energy_level: 'alto',
          due_date: '2026-11-25',
          due_time: '18:00',
          scheduled_date: '2026-11-21',
          scheduled_time: '09:00',
          waiting_for: 'Revisor',
          is_blocked: true,
          is_running: true,
          jira_key: 'ABC-1'
        })
      )
    ).toEqual({
      id: 7,
      name: 'Escrever relatório',
      status: 'proximas',
      category: 'normal',
      energy: 'alto',
      due_date: '2026-11-25',
      due_time: '18:00',
      scheduled_date: '2026-11-21',
      scheduled_time: '09:00',
      waiting_for: 'Revisor',
      is_blocked: true,
      is_running: true,
      jira_key: 'ABC-1'
    })
  })

  it('cabe em 15 KB com 50 tasks típicas', () => {
    const rows = Array.from({ length: 50 }, (_, index) =>
      task({
        id: index + 1,
        name: `Task número ${index + 1} com um nome de tamanho comum`,
        project_name: 'CrafyTask',
        energy_level: 'medio',
        due_date: '2026-11-25',
        tags: [{ id: 1, name: 'mcp', color: '#000', created_at: '' }]
      })
    )
    expect(JSON.stringify(rows.map(compactTask)).length).toBeLessThan(15_000)
  })
})

describe('fullTask', () => {
  it('tira só o corpo das notas', () => {
    const row = task({ notes: '{"type":"doc"}', description: 'd', jira_key: 'ABC-1' })
    const view = fullTask(row)
    expect(view).not.toHaveProperty('notes')
    expect(view).toEqual({ ...row, notes: undefined })
    expect(row.notes).toBe('{"type":"doc"}')
  })
})

describe('viewTask', () => {
  it('é compacto por padrão e completo com detail=full', () => {
    const row = task({ description: 'd' })
    expect(viewTask(row)).not.toHaveProperty('description')
    expect(viewTask(row, 'full')).toHaveProperty('description', 'd')
  })
})
