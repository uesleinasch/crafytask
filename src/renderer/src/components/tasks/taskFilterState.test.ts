import { describe, expect, it } from 'vitest'
import { EMPTY_TASK_FILTERS, activeFilterCount, listIntentFromSearch } from './taskFilterState'

describe('contagem de filtros ativos', () => {
  it('zero sem filtro e um por filtro ligado', () => {
    expect(activeFilterCount(EMPTY_TASK_FILTERS)).toBe(0)
    expect(
      activeFilterCount({
        ...EMPTY_TASK_FILTERS,
        category: 'urgente',
        projectId: -1,
        sort: 'due_date'
      })
    ).toBe(3)
  })
})

describe('listIntentFromSearch', () => {
  it('lê contexto e tag da query e abre em Todas', () => {
    expect(listIntentFromSearch('?context=3')).toEqual({
      status: 'all',
      filters: { ...EMPTY_TASK_FILTERS, contextId: 3 }
    })
    expect(listIntentFromSearch('?tag=7')?.filters.tagId).toBe(7)
  })

  it('lê status, parada há N dias e ordem pela mais parada', () => {
    expect(listIntentFromSearch('?status=aguardando&parada=7&ordem=parada')).toEqual({
      status: 'aguardando',
      filters: { ...EMPTY_TASK_FILTERS, staleDays: 7, sort: 'status_changed' }
    })
  })

  it('prazo vencido abre em Todas', () => {
    expect(listIntentFromSearch('?prazo=vencido')).toEqual({
      status: 'all',
      filters: { ...EMPTY_TASK_FILTERS, overdue: true }
    })
  })

  it('ignora query vazia ou inválida', () => {
    expect(listIntentFromSearch('')).toBeNull()
    expect(listIntentFromSearch('?context=abc&tag=-1&status=xyz&parada=0')).toBeNull()
  })

  it('conta prazo vencido e parada como filtros ativos', () => {
    expect(activeFilterCount({ ...EMPTY_TASK_FILTERS, overdue: true, staleDays: 14 })).toBe(2)
  })
})
