import { DatabaseSync } from 'node:sqlite'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  assertContextNameFree,
  listContextsWithUsage,
  listTaskIdsWithContext,
  mergeContexts
} from './contextQueries'
import type { SqliteLike } from './tagQueries'

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

let db: SqliteLike

function seedContext(name: string): number {
  return Number(db.prepare('INSERT INTO contexts (name) VALUES (?)').run(name).lastInsertRowid)
}

function seedTask(status = 'inbox', archived = 0): number {
  return Number(
    db
      .prepare('INSERT INTO tasks (name, status, is_archived) VALUES (?, ?, ?)')
      .run('t', status, archived).lastInsertRowid
  )
}

function link(taskId: number, contextId: number): void {
  db.prepare('INSERT INTO task_contexts (task_id, context_id) VALUES (?, ?)').run(taskId, contextId)
}

function contextIdsOf(taskId: number): number[] {
  const rows = db
    .prepare('SELECT context_id FROM task_contexts WHERE task_id = ? ORDER BY context_id')
    .all(taskId) as { context_id: number }[]
  return rows.map((row) => row.context_id)
}

beforeEach(() => {
  const raw = new DatabaseSync(':memory:')
  db = adapt(raw)
  raw.exec('PRAGMA foreign_keys = ON')
  raw.exec(`
    CREATE TABLE tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'inbox',
      is_archived INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE contexts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      icon TEXT DEFAULT '📋',
      color TEXT DEFAULT '#6366f1',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE task_contexts (
      task_id INTEGER NOT NULL,
      context_id INTEGER NOT NULL,
      PRIMARY KEY (task_id, context_id),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (context_id) REFERENCES contexts(id) ON DELETE CASCADE
    );
  `)
})

describe('listContextsWithUsage', () => {
  it('conta uso e abertas, inclusive contexto sem uso', () => {
    const pc = seedContext('@computador')
    const casa = seedContext('@casa')
    for (const [status, archived] of [
      ['inbox', 0],
      ['finalizada', 0],
      ['proximas', 1]
    ] as const) {
      link(seedTask(status, archived), pc)
    }

    expect(listContextsWithUsage(db)).toEqual([
      expect.objectContaining({ id: casa, task_count: 0, open_count: 0 }),
      expect.objectContaining({ id: pc, task_count: 3, open_count: 1 })
    ])
  })
})

describe('assertContextNameFree', () => {
  it('recusa nome que difere só por maiúsculas', () => {
    seedContext('@casa')
    expect(() => assertContextNameFree(db, ' @Casa ')).toThrow(/mesclar/)
  })

  it('aceita o próprio nome ao editar', () => {
    const id = seedContext('@casa')
    expect(() => assertContextNameFree(db, '@casa', id)).not.toThrow()
  })
})

describe('mergeContexts', () => {
  it('move as tarefas para o destino, sem duplicar, e apaga a origem', () => {
    const from = seedContext('@pc')
    const to = seedContext('@computador')
    const other = seedContext('@casa')
    const onlyFrom = seedTask()
    const both = seedTask()
    link(onlyFrom, from)
    link(both, from)
    link(both, to)
    link(both, other)

    expect(mergeContexts(db, from, to)).toEqual([onlyFrom, both])
    expect(contextIdsOf(onlyFrom)).toEqual([to])
    expect(contextIdsOf(both)).toEqual([to, other])
    expect(listTaskIdsWithContext(db, from)).toEqual([])
    expect(db.prepare('SELECT id FROM contexts WHERE id = ?').get(from)).toBeUndefined()
  })

  it('recusa mesclar consigo mesmo ou com contexto inexistente', () => {
    const id = seedContext('@pc')
    expect(() => mergeContexts(db, id, id)).toThrow(/ele mesmo/)
    expect(() => mergeContexts(db, 999, id)).toThrow(/origem/)
    expect(() => mergeContexts(db, id, 999)).toThrow(/destino/)
  })
})
