import { describe, expect, it } from 'vitest'
import { EMPTY_TASK_FILTERS, activeFilterCount } from './taskFilterState'

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
