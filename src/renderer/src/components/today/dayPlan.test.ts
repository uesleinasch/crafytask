import { describe, expect, it } from 'vitest'
import {
  blockMinutes,
  formatPlannedHours,
  loadPercent,
  planTitle,
  plannedMinByDate,
  weekDays
} from './dayPlan'

describe('carga planejada', () => {
  it('soma os blocos de tempo por dia', () => {
    const totals = plannedMinByDate([
      { date: '2026-11-17', start_time: '09:00', end_time: '10:30' },
      { date: '2026-11-17', start_time: '14:00', end_time: '19:00' },
      { date: '2026-11-18', start_time: '08:00', end_time: '12:00' }
    ])
    expect(totals.get('2026-11-17')).toBe(390)
    expect(totals.get('2026-11-18')).toBe(240)
    expect(totals.get('2026-11-19')).toBeUndefined()
  })

  it('ignora bloco com fim antes do início', () => {
    expect(blockMinutes({ start_time: '10:00', end_time: '09:00' })).toBe(0)
  })

  it('formata em horas com vírgula', () => {
    expect(formatPlannedHours(390)).toBe('6,5h')
    expect(formatPlannedHours(480)).toBe('8h')
    expect(formatPlannedHours(440)).toBe('7,3h')
    expect(formatPlannedHours(0)).toBe('0h')
  })

  it('limita a barra em 100%', () => {
    expect(loadPercent(240)).toBe(50)
    expect(loadPercent(570)).toBe(100)
  })
})

describe('semana', () => {
  it('vai de segunda a domingo', () => {
    const days = weekDays(new Date(2026, 10, 17, 15))
    expect(days.map((d) => d.label)).toEqual(['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'])
    expect(days[0].date).toBe('2026-11-16')
    expect(days[6].date).toBe('2026-11-22')
  })

  it('começa no domingo quando a preferência pede', () => {
    const days = weekDays(new Date(2026, 10, 17, 15), 'sunday')
    expect(days.map((d) => d.label)).toEqual(['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'])
    expect(days[0].date).toBe('2026-11-15')
  })

  it('domingo fecha a semana que começou na segunda', () => {
    const days = weekDays(new Date(2026, 10, 22, 9))
    expect(days[0].date).toBe('2026-11-16')
  })
})

it('monta o título do card', () => {
  expect(planTitle(new Date(2026, 10, 17))).toBe('Plano de terça, 17 de novembro')
  expect(planTitle(new Date(2026, 10, 22))).toBe('Plano de domingo, 22 de novembro')
})
