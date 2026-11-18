import { describe, expect, it } from 'vitest'
import { blockedLabel, dueTone, formatDueShort, formatShortDuration } from './taskTableFormat'

describe('formatShortDuration', () => {
  it('mostra traço sem tempo', () => {
    expect(formatShortDuration(0)).toBe('—')
  })

  it('mostra minutos abaixo de uma hora, nunca zero', () => {
    expect(formatShortDuration(10)).toBe('1 min')
    expect(formatShortDuration(25 * 60)).toBe('25 min')
  })

  it('mostra horas e minutos com dois dígitos', () => {
    expect(formatShortDuration(3600)).toBe('1h00')
    expect(formatShortDuration(2 * 3600 + 5 * 60 + 40)).toBe('2h05')
  })
})

describe('formatDueShort', () => {
  it('mostra dia/mês e a hora quando houver', () => {
    expect(formatDueShort('2026-11-18')).toBe('18/11')
    expect(formatDueShort('2026-11-18', '14:30')).toBe('18/11 14:30')
  })
})

describe('dueTone', () => {
  const now = new Date(2026, 10, 18, 10, 0)

  it('vermelho só para prazo vencido, aviso para hoje', () => {
    expect(dueTone('2026-11-17', now)).toBe('danger')
    expect(dueTone('2026-11-18', now)).toBe('warning')
    expect(dueTone('2026-11-19', now)).toBeUndefined()
    expect(dueTone(null, now)).toBeUndefined()
  })
})

describe('blockedLabel', () => {
  it('cita de quem a tarefa depende', () => {
    expect(blockedLabel([702])).toBe('Bloqueada: depende de #702')
    expect(blockedLabel([702, 705])).toBe('Bloqueada: depende de #702 e #705')
    expect(blockedLabel([1, 2, 3])).toBe('Bloqueada: depende de #1, #2 e #3')
    expect(blockedLabel([1, 2, 3, 4, 5])).toBe('Bloqueada: depende de #1, #2, #3 e mais 2')
  })

  it('cai no texto genérico sem ids', () => {
    expect(blockedLabel([])).toBe('Bloqueada por dependências')
    expect(blockedLabel(undefined)).toBe('Bloqueada por dependências')
  })
})
