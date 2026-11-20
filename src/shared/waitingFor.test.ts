import { describe, expect, it } from 'vitest'
import { WAITING_FOR_MAX, normalizeWaitingFor } from './waitingFor'

describe('normalizeWaitingFor', () => {
  it('guarda o texto sem espaços sobrando', () => {
    expect(normalizeWaitingFor('  Revisor   externo ')).toBe('Revisor externo')
  })

  it('vazio vira null', () => {
    expect(normalizeWaitingFor('')).toBeNull()
    expect(normalizeWaitingFor('   ')).toBeNull()
    expect(normalizeWaitingFor(null)).toBeNull()
    expect(normalizeWaitingFor(undefined)).toBeNull()
  })

  it('corta no limite', () => {
    expect(normalizeWaitingFor('a'.repeat(200))).toHaveLength(WAITING_FOR_MAX)
  })
})
