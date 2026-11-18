import { describe, expect, it } from 'vitest'
import { applySyncEvent, describeIntegration, describeMcp, relativeTime } from './integrationStatus'

const now = Date.parse('2026-11-18T12:00:00.000Z')
const minutesAgo = (n: number): number => now - n * 60_000

describe('tempo relativo', () => {
  it('fala em minutos, horas e dias', () => {
    expect(relativeTime(now, now)).toBe('agora')
    expect(relativeTime(minutesAgo(2), now)).toBe('há 2 min')
    expect(relativeTime(minutesAgo(125), now)).toBe('há 2 h')
    expect(relativeTime(minutesAgo(60 * 24), now)).toBe('há 1 dia')
    expect(relativeTime(minutesAgo(60 * 72), now)).toBe('há 3 dias')
  })
})

describe('estado da integração', () => {
  it('mostra desconectado, conectado e sincronizado', () => {
    expect(describeIntegration('Jira', { configured: false, phase: 'idle' }, now)).toEqual({
      tone: 'off',
      text: 'Jira não conectado'
    })
    expect(describeIntegration('Jira', { configured: true, phase: 'idle' }, now).text).toBe(
      'Jira conectado'
    )
    expect(
      describeIntegration('Notion', { configured: true, phase: 'success', at: minutesAgo(2) }, now)
        .text
    ).toBe('Notion sincronizado há 2 min')
  })

  it('erro vira ponto com explicação e caminho para Configurações', () => {
    const view = describeIntegration(
      'Notion',
      { configured: true, phase: 'error', detail: 'Token inválido' },
      now
    )
    expect(view.tone).toBe('error')
    expect(view.tooltip).toContain('Token inválido')
    expect(view.tooltip).toContain('Configurações')
  })

  it('aplica os eventos de sincronização', () => {
    const start = applySyncEvent({ configured: true, phase: 'idle' }, 'syncing', 'Tarefa', now)
    expect(start.phase).toBe('syncing')
    const done = applySyncEvent(start, 'success', 'Tarefa', now)
    expect(done).toEqual({ configured: true, phase: 'success', detail: 'Tarefa', at: now })
    expect(applySyncEvent(done, 'error', 'falhou', now)).toMatchObject({
      phase: 'error',
      at: now,
      detail: 'falhou'
    })
  })
})

describe('MCP', () => {
  it('mostra desligado, parado e a porta', () => {
    expect(describeMcp(null).tone).toBe('off')
    expect(describeMcp({ enabled: true, running: false, port: 7432 }).tone).toBe('error')
    expect(describeMcp({ enabled: true, running: true, port: 7432 }).text).toBe(
      'MCP em 127.0.0.1:7432'
    )
  })
})
