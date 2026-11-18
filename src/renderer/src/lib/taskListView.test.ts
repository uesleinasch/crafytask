import { describe, expect, it } from 'vitest'
import { effectiveListView, kanbanGroup, legacyListPrefs } from './taskListView'

const storage = (values: Record<string, unknown>) => (key: string) =>
  key in values ? JSON.stringify(values[key]) : null

describe('visão da lista', () => {
  it('Kanban só vale na aba Executando', () => {
    expect(effectiveListView('kanban', 'executando')).toBe('kanban')
    expect(effectiveListView('kanban', 'inbox')).toBe('table')
    expect(effectiveListView('cards', 'all')).toBe('cards')
  })

  it('Kanban sem agrupamento usa projeto como coluna', () => {
    expect(kanbanGroup('none')).toBe('project')
    expect(kanbanGroup('context')).toBe('context')
  })
})

describe('migração das preferências antigas', () => {
  it('sem nada salvo, tabela sem agrupamento', () => {
    expect(legacyListPrefs(storage({}))).toEqual({ view: 'table', group: 'none' })
  })

  it('agrupamento ligado vira a chave de agrupamento', () => {
    expect(
      legacyListPrefs(
        storage({
          'ticktask:taskListViewMode': 'cards',
          'ticktask:taskListGrouping': true,
          'ticktask:taskListGroupBy': 'context'
        })
      )
    ).toEqual({ view: 'cards', group: 'context' })
  })

  it('agrupamento desligado ignora a chave antiga', () => {
    expect(
      legacyListPrefs(
        storage({ 'ticktask:taskListGrouping': false, 'ticktask:taskListGroupBy': 'context' })
      )
    ).toEqual({ view: 'table', group: 'none' })
  })

  it('Kanban ligado vence e leva o agrupamento dele', () => {
    expect(
      legacyListPrefs(
        storage({
          'ticktask:executandoKanban': true,
          'ticktask:executandoKanbanGroupBy': 'jira_space',
          'ticktask:taskListGroupBy': 'context'
        })
      )
    ).toEqual({ view: 'kanban', group: 'jira_space' })
  })

  it('valor inválido cai no padrão', () => {
    const read = (key: string) => (key === 'ticktask:taskListGroupBy' ? '{quebrado' : 'true')
    expect(legacyListPrefs(read).group).toBe('project')
  })
})
