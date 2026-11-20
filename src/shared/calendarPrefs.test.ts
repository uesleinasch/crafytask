import { describe, expect, it } from 'vitest'
import { addDays, localDaysToIsoRange, weekStartOf } from './calendarPrefs'

describe('calendarPrefs', () => {
  it('acha o início da semana na segunda ou no domingo', () => {
    const tuesday = new Date(2026, 10, 17, 15)
    const sunday = new Date(2026, 10, 22, 9)
    expect(weekStartOf(tuesday, 'monday')).toBe('2026-11-16')
    expect(weekStartOf(sunday, 'monday')).toBe('2026-11-16')
    expect(weekStartOf(tuesday, 'sunday')).toBe('2026-11-15')
    expect(weekStartOf(sunday, 'sunday')).toBe('2026-11-22')
  })

  it('soma dias atravessando o mês', () => {
    expect(addDays('2026-11-29', 3)).toBe('2026-12-02')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('converte dias locais em intervalo ISO de meia-noite a meia-noite', () => {
    const { fromIso, toIso } = localDaysToIsoRange('2026-11-16', '2026-11-22')
    expect(fromIso).toBe(new Date(2026, 10, 16).toISOString())
    expect(toIso).toBe(new Date(2026, 10, 23).toISOString())
  })
})
