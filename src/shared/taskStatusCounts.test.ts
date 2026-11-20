import { describe, expect, it } from 'vitest'
import { toStatusCounts } from './taskStatusCounts'

describe('toStatusCounts', () => {
  it('preenche os status sem tarefa com zero e soma o total', () => {
    expect(
      toStatusCounts([
        { status: 'inbox', total: 3 },
        { status: 'executando', total: 2 }
      ])
    ).toEqual({
      inbox: 3,
      aguardando: 0,
      proximas: 0,
      executando: 2,
      finalizada: 0,
      someday: 0,
      all: 5
    })
  })

  it('ignora status desconhecido', () => {
    expect(toStatusCounts([{ status: 'outro', total: 9 }]).all).toBe(0)
  })
})
