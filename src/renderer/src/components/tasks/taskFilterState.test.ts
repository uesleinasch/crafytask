import { describe, expect, it } from 'vitest'
import { EMPTY_TASK_FILTERS, activeFilterCount, labelFilterFromSearch } from './taskFilterState'

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

describe('labelFilterFromSearch', () => {
  it('lê contexto e tag da query', () => {
    expect(labelFilterFromSearch('?context=3')).toEqual({ ...EMPTY_TASK_FILTERS, contextId: 3 })
    expect(labelFilterFromSearch('?tag=7')).toEqual({ ...EMPTY_TASK_FILTERS, tagId: 7 })
  })

  it('ignora query sem rótulo ou com id inválido', () => {
    expect(labelFilterFromSearch('')).toBeNull()
    expect(labelFilterFromSearch('?context=abc&tag=-1')).toBeNull()
  })
})
