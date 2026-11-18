import { describe, expect, it } from 'vitest'
import { sessionClock, sessionRange } from './sessionEdit'

const day = new Date(2026, 10, 18, 13, 5).toISOString()

describe('sessionClock', () => {
  it('mostra a hora local em HH:MM', () => {
    expect(sessionClock(day)).toBe('13:05')
  })
})

describe('sessionRange', () => {
  it('monta início e fim no dia da sessão', () => {
    const result = sessionRange(day, '9:15', '10:40')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(sessionClock(result.startIso)).toBe('09:15')
    expect(sessionClock(result.endIso)).toBe('10:40')
    expect(new Date(result.startIso).getDate()).toBe(18)
  })

  it('recusa fim igual ou antes do início', () => {
    expect(sessionRange(day, '10:00', '10:00')).toEqual({
      ok: false,
      error: 'O fim precisa ser depois do início (HH:MM).'
    })
  })

  it('recusa hora fora do formato', () => {
    expect(sessionRange(day, '25:00', '26:00').ok).toBe(false)
    expect(sessionRange(day, '9h', '10:00').ok).toBe(false)
  })
})
