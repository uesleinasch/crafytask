import { DatabaseSync } from 'node:sqlite'
import { beforeEach, describe, expect, it } from 'vitest'
import type { SqliteLike } from './tagQueries'
import {
  deleteTimeEntry,
  listTimeEntriesInRange,
  sessionDuration,
  updateTimeEntry
} from './timeEntryQueries'

// Mesmo adaptador de tagQueries.test.ts: o better-sqlite3 não carrega sob o Node do vitest.
function adapt(raw: DatabaseSync): SqliteLike {
  return {
    prepare: (sql) => raw.prepare(sql),
    transaction: (fn) => () => {
      raw.exec('BEGIN')
      try {
        fn()
        raw.exec('COMMIT')
      } catch (error) {
        raw.exec('ROLLBACK')
        throw error
      }
    }
  }
}

let raw: DatabaseSync
let db: SqliteLike

const total = (): number =>
  (raw.prepare('SELECT total_seconds FROM tasks WHERE id = 1').get() as { total_seconds: number })
    .total_seconds

beforeEach(() => {
  raw = new DatabaseSync(':memory:')
  raw.exec(`
    CREATE TABLE tasks (id INTEGER PRIMARY KEY, total_seconds INTEGER, updated_at TEXT);
    CREATE TABLE time_entries (
      id INTEGER PRIMARY KEY, task_id INTEGER, start_time TEXT, end_time TEXT,
      duration_seconds INTEGER, jira_worklog_id TEXT
    );
    INSERT INTO tasks (id, total_seconds) VALUES (1, 5400);
    INSERT INTO time_entries VALUES
      (10, 1, '2026-11-18T13:00:00.000Z', '2026-11-18T14:00:00.000Z', 3600, 'w-10'),
      (11, 1, '2026-11-18T15:00:00.000Z', '2026-11-18T15:30:00.000Z', 1800, NULL),
      (12, 1, '2026-11-18T16:00:00.000Z', NULL, NULL, NULL);
  `)
  db = adapt(raw)
})

describe('sessionDuration', () => {
  it('conta os segundos entre início e fim', () => {
    expect(sessionDuration('2026-11-18T13:00:00Z', '2026-11-18T13:45:00Z')).toBe(2700)
  })

  it('recusa fim igual ou antes do início', () => {
    expect(() => sessionDuration('2026-11-18T13:00:00Z', '2026-11-18T13:00:00Z')).toThrow(
      'O fim precisa ser depois do início.'
    )
  })

  it('recusa data inválida', () => {
    expect(() => sessionDuration('x', '2026-11-18T13:00:00Z')).toThrow('Data inválida')
  })
})

describe('updateTimeEntry', () => {
  it('troca início e fim, recalcula a duração e ajusta o total pela diferença', () => {
    const change = updateTimeEntry(db, 10, '2026-11-18T13:00:00.000Z', '2026-11-18T13:30:00.000Z')
    expect(change).toEqual({ taskId: 1, worklogId: 'w-10' })
    const row = raw.prepare('SELECT * FROM time_entries WHERE id = 10').get() as {
      duration_seconds: number
      end_time: string
    }
    expect(row.duration_seconds).toBe(1800)
    expect(row.end_time).toBe('2026-11-18T13:30:00.000Z')
    expect(total()).toBe(3600)
  })

  it('não mexe na sessão em andamento', () => {
    expect(() =>
      updateTimeEntry(db, 12, '2026-11-18T16:00:00.000Z', '2026-11-18T16:10:00.000Z')
    ).toThrow('Pare o timer')
    expect(total()).toBe(5400)
  })

  it('falha com sessão inexistente', () => {
    expect(() =>
      updateTimeEntry(db, 99, '2026-11-18T16:00:00.000Z', '2026-11-18T16:10:00.000Z')
    ).toThrow('Sessão não encontrada.')
  })
})

describe('deleteTimeEntry', () => {
  it('apaga a sessão, tira a duração do total e devolve o worklog', () => {
    expect(deleteTimeEntry(db, 10)).toEqual({ taskId: 1, worklogId: 'w-10' })
    expect(raw.prepare('SELECT COUNT(*) AS n FROM time_entries').get()).toEqual({ n: 2 })
    expect(total()).toBe(1800)
  })

  it('o total nunca fica negativo', () => {
    raw.exec('UPDATE tasks SET total_seconds = 100 WHERE id = 1')
    deleteTimeEntry(db, 11)
    expect(total()).toBe(0)
  })

  it('não apaga a sessão em andamento', () => {
    expect(() => deleteTimeEntry(db, 12)).toThrow('Pare o timer')
  })
})

describe('listTimeEntriesInRange', () => {
  beforeEach(() => {
    raw.exec(`
      ALTER TABLE tasks ADD COLUMN name TEXT;
      ALTER TABLE tasks ADD COLUMN category TEXT;
      ALTER TABLE tasks ADD COLUMN project_id INTEGER;
      CREATE TABLE projects (id INTEGER PRIMARY KEY, color TEXT);
      INSERT INTO projects VALUES (3, '#2A62D6');
      UPDATE tasks SET name = 'Relatório', category = 'normal', project_id = 3 WHERE id = 1;
      INSERT INTO time_entries VALUES
        (13, 1, '2026-11-17T23:30:00.000Z', '2026-11-18T00:30:00.000Z', 3600, NULL),
        (14, 1, '2026-11-18T18:00:00.000Z', '2026-11-18T18:00:00.000Z', 900, NULL),
        (15, 1, '2026-11-18 19:00:00', '2026-11-18 19:20:00', 1200, NULL),
        (16, 1, '2026-11-19T10:00:00.000Z', '2026-11-19T11:00:00.000Z', 3600, NULL);
    `)
  })

  const ids = (from: string, to: string, now = '2026-11-18T17:00:00.000Z'): number[] =>
    listTimeEntriesInRange(db, from, to, now).map((e) => e.id)

  it('traz as sessões que cruzam o intervalo, com a tarefa e o projeto', () => {
    const [first] = listTimeEntriesInRange(
      db,
      '2026-11-18T00:00:00.000Z',
      '2026-11-19T00:00:00.000Z',
      '2026-11-18T17:00:00.000Z'
    )
    expect(first).toMatchObject({
      id: 13,
      task_name: 'Relatório',
      task_category: 'normal',
      project_color: '#2A62D6'
    })
    expect(ids('2026-11-18T00:00:00.000Z', '2026-11-19T00:00:00.000Z')).toEqual([
      13, 10, 11, 12, 15
    ])
  })

  it('devolve as datas em ISO UTC, inclusive as gravadas no formato antigo', () => {
    const spans = listTimeEntriesInRange(
      db,
      '2026-11-18T00:00:00.000Z',
      '2026-11-19T00:00:00.000Z',
      '2026-11-18T17:00:00.000Z'
    )
    const old = spans.find((e) => e.id === 15)
    expect(old?.start_time).toBe('2026-11-18T19:00:00.000Z')
    expect(old?.end_time).toBe('2026-11-18T19:20:00.000Z')
    expect(spans.find((e) => e.id === 12)?.end_time).toBeNull()
  })

  it('a sessão em andamento vai até agora', () => {
    expect(ids('2026-11-18T16:30:00.000Z', '2026-11-18T16:45:00.000Z')).toEqual([12])
    expect(
      ids('2026-11-18T16:30:00.000Z', '2026-11-18T16:45:00.000Z', '2026-11-18T16:10:00.000Z')
    ).toEqual([])
  })

  it('ignora o ajuste manual sem duração na grade', () => {
    expect(ids('2026-11-18T17:30:00.000Z', '2026-11-18T18:30:00.000Z')).not.toContain(14)
  })

  it('recusa intervalo inválido', () => {
    expect(() => ids('x', '2026-11-19T00:00:00.000Z')).toThrow('Intervalo inválido')
    expect(() => ids('2026-11-19T00:00:00.000Z', '2026-11-18T00:00:00.000Z')).toThrow(
      'precisa ser depois'
    )
  })
})
