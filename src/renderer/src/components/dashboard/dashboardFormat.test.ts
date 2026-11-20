import { describe, expect, it } from 'vitest'
import {
  bucketViews,
  calendarWeeks,
  delta,
  formatHM,
  heatLevel,
  hourGrid,
  niceMaxHours,
  percent,
  periodName,
  presetRange,
  rangeDays
} from './dashboardFormat'

describe('formatos', () => {
  it('horas e minutos', () => {
    expect(formatHM(0)).toBe('0 min')
    expect(formatHM(45 * 60)).toBe('45 min')
    expect(formatHM(2 * 3600)).toBe('2h')
    expect(formatHM(2 * 3600 + 5 * 60)).toBe('2h 05min')
    expect(formatHM(1200 * 3600)).toBe('1.200h')
  })

  it('porcentagem sem total vira traço', () => {
    expect(percent(1, 4)).toBe('25%')
    expect(percent(0, 0)).toBe('—')
  })

  it('diferença neutra com sinal', () => {
    expect(delta(0, 0, formatHM)).toBeNull()
    expect(delta(3600, 1800, formatHM)).toEqual({ direction: 'up', text: '+30 min' })
    expect(delta(10, 12, String)).toEqual({ direction: 'down', text: '−2' })
    expect(delta(5, 5, String)).toEqual({ direction: 'same', text: '0' })
  })
})

describe('período', () => {
  it('atalhos terminam hoje e contam o dia de hoje', () => {
    expect(presetRange(7, new Date(2026, 10, 19, 15))).toEqual({
      start: '2026-11-13',
      end: '2026-11-19'
    })
    expect(rangeDays('2026-11-13', '2026-11-19')).toBe(7)
    expect(periodName('2026-11-13', '2026-11-19')).toBe('7 dias')
    expect(periodName('2026-11-01', '2026-11-19')).toBe('19 dias')
  })

  it('colunas por dia, semana e mês com rótulos espaçados', () => {
    const days = bucketViews(
      [
        { key: '2026-11-18', seconds: 1, current: false },
        { key: '2026-11-19', seconds: 2, current: true }
      ],
      'day',
      7
    )
    expect(days.map((b) => b.label)).toEqual(['qua', 'qui'])
    expect(days[1].title).toBe('qui, 19/11')
    const weeks = bucketViews([{ key: '2026-11-16', seconds: 0, current: true }], 'week', 90)
    expect(weeks[0]).toMatchObject({ label: '16/11', title: 'Semana de 16/11', showLabel: true })
    const months = bucketViews([{ key: '2026-11', seconds: 0, current: true }], 'month', 365)
    expect(months[0].title).toContain('2026')
  })

  it('escala do eixo e níveis do heatmap', () => {
    expect(niceMaxHours(0)).toBe(1)
    expect(niceMaxHours(7 * 3600)).toBe(8)
    expect(heatLevel(0, 10)).toBe(0)
    expect(heatLevel(1, 10)).toBe(1)
    expect(heatLevel(10, 10)).toBe(5)
  })
})

describe('grades dos heatmaps', () => {
  it('dia × hora começa na segunda e vai das 6h às 23h', () => {
    const grid = hourGrid([
      { weekday: 1, hour: 9, seconds: 600 },
      { weekday: 0, hour: 23, seconds: 60 },
      { weekday: 3, hour: 2, seconds: 999 }
    ])
    expect(grid).toHaveLength(7)
    expect(grid[0][3]).toBe(600)
    expect(grid[6][17]).toBe(60)
    expect(grid.flat().reduce((a, b) => a + b, 0)).toBe(660)
  })

  it('constância alinha a primeira semana na segunda e marca o mês', () => {
    const weeks = calendarWeeks('2026-11-19', '2026-11-24', [{ date: '2026-11-20', seconds: 30 }])
    expect(weeks).toHaveLength(2)
    expect(weeks[0].days.slice(0, 3)).toEqual([null, null, null])
    expect(weeks[0].days[4]).toEqual({ date: '2026-11-20', seconds: 30 })
    expect(weeks[0].month).not.toBe('')
    expect(weeks[1].month).toBe('')
  })
})
