import { describe, expect, it } from 'vitest'
import type { TaskHistoryItem } from '@shared/types'
import { filterHistory, formatHistoryTime, historyItemKey } from './taskHistoryView'

function item(patch: Partial<TaskHistoryItem>): TaskHistoryItem {
  return {
    id: 1,
    task_id: 1,
    task_name: 'Task',
    kind: 'note',
    origin: 'app',
    summary: 'x',
    done: null,
    remaining: null,
    from_status: null,
    to_status: 'executando',
    created_at: '2026-11-20 12:00:00',
    ...patch
  }
}

describe('filterHistory', () => {
  const items = [
    item({ id: 1, kind: 'checkpoint' }),
    item({ id: 2, kind: 'status' }),
    item({ id: 3, kind: 'note' }),
    item({ id: 4, kind: 'operation' })
  ]

  it('mantém tudo no filtro geral', () => {
    expect(filterHistory(items, 'all')).toHaveLength(4)
  })

  it('separa checkpoints e movimentações', () => {
    expect(filterHistory(items, 'checkpoints').map((entry) => entry.id)).toEqual([1])
    expect(filterHistory(items, 'status').map((entry) => entry.id)).toEqual([2])
  })
})

describe('historyItemKey', () => {
  it('não confunde evento de status com entrada de mesmo id', () => {
    expect(historyItemKey(item({ id: 7, kind: 'status' }))).not.toBe(
      historyItemKey(item({ id: 7, kind: 'checkpoint' }))
    )
  })
})

describe('formatHistoryTime', () => {
  const now = new Date(2026, 10, 20, 18, 0, 0)
  const utc = (date: Date): string => date.toISOString().slice(0, 19).replace('T', ' ')

  it('lê o horário do banco como UTC e mostra "hoje"', () => {
    expect(formatHistoryTime(utc(new Date(2026, 10, 20, 9, 5, 0)), now)).toBe('hoje 09:05')
  })

  it('mostra o dia quando não é hoje e o ano quando é outro', () => {
    expect(formatHistoryTime(utc(new Date(2026, 10, 18, 9, 5, 0)), now)).toMatch(
      /^18 de nov\.? 09:05$/
    )
    expect(formatHistoryTime(utc(new Date(2025, 10, 18, 9, 5, 0)), now)).toContain('2025')
  })

  it('devolve o texto original quando a data é inválida', () => {
    expect(formatHistoryTime('ontem', now)).toBe('ontem')
  })
})
