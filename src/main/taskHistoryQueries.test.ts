import { DatabaseSync } from 'node:sqlite'
import { beforeEach, describe, expect, it } from 'vitest'
import type { SqliteLike } from './tagQueries'
import { ensureStatusChangedAt } from './healthQueries'
import {
  TASK_HISTORY_TEXT_LIMIT,
  addTaskHistoryEntry,
  ensureTaskHistorySchema,
  getLastCheckpoint,
  lastCheckpointsFor,
  listTaskHistory
} from './taskHistoryQueries'

let raw: DatabaseSync
let db: SqliteLike

beforeEach(() => {
  raw = new DatabaseSync(':memory:')
  raw.exec('PRAGMA foreign_keys = ON')
  raw.exec(`
    CREATE TABLE tasks (
      id INTEGER PRIMARY KEY, name TEXT, status TEXT, parent_task_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `)
  db = {
    prepare: (sql) => raw.prepare(sql) as unknown as ReturnType<SqliteLike['prepare']>,
    transaction: (fn) => fn
  }
  ensureStatusChangedAt(db)
  ensureTaskHistorySchema(db)
  ensureTaskHistorySchema(db)
  raw.exec(`
    INSERT INTO tasks (id, name, status) VALUES (1, 'Épico', 'proximas');
    INSERT INTO tasks (id, name, status, parent_task_id) VALUES (2, 'Parte A', 'proximas', 1);
    INSERT INTO tasks (id, name, status) VALUES (3, 'Outra', 'inbox');
    UPDATE task_status_events SET changed_at = '2026-11-20 10:00:00';
  `)
})

function stamp(id: number, at: string): void {
  raw.prepare('UPDATE task_history SET created_at = ? WHERE id = ?').run(at, id)
}

describe('addTaskHistoryEntry', () => {
  it('grava checkpoint por padrão com o status da task naquele momento', () => {
    raw.exec("UPDATE tasks SET status = 'executando' WHERE id = 1")
    const id = addTaskHistoryEntry(
      db,
      { task_id: 1, summary: '  metade feita ', done: 'schema', remaining: 'tool' },
      'mcp'
    )
    const row = raw.prepare('SELECT * FROM task_history WHERE id = ?').get(id)
    expect(row).toMatchObject({
      task_id: 1,
      kind: 'checkpoint',
      origin: 'mcp',
      summary: 'metade feita',
      done: 'schema',
      remaining: 'tool',
      task_status: 'executando'
    })
  })

  it('recusa resumo vazio e task inexistente', () => {
    expect(() => addTaskHistoryEntry(db, { task_id: 1, summary: '   ' }, 'mcp')).toThrow()
    expect(() => addTaskHistoryEntry(db, { task_id: 99, summary: 'x' }, 'mcp')).toThrow(
      'Task 99 não existe.'
    )
  })

  it('corta texto acima do limite e guarda campo em branco como nulo', () => {
    const id = addTaskHistoryEntry(
      db,
      { task_id: 1, summary: 'a'.repeat(TASK_HISTORY_TEXT_LIMIT + 10), done: '  ' },
      'app'
    )
    const row = raw.prepare('SELECT summary, done FROM task_history WHERE id = ?').get(id) as {
      summary: string
      done: string | null
    }
    expect(row.summary).toHaveLength(TASK_HISTORY_TEXT_LIMIT)
    expect(row.done).toBeNull()
  })

  it('apaga o histórico junto com a task', () => {
    addTaskHistoryEntry(db, { task_id: 3, summary: 'x' }, 'mcp')
    raw.exec('DELETE FROM tasks WHERE id = 3')
    expect(raw.prepare('SELECT COUNT(*) AS n FROM task_history').get()).toEqual({ n: 0 })
  })
})

describe('listTaskHistory', () => {
  it('junta mudanças de status e entradas, da mais nova para a mais antiga', () => {
    raw.exec("UPDATE tasks SET status = 'executando' WHERE id = 1")
    raw.exec(
      "UPDATE task_status_events SET changed_at = '2026-11-20 11:00:00' WHERE from_status = 'proximas'"
    )
    stamp(addTaskHistoryEntry(db, { task_id: 1, summary: 'começou' }, 'mcp'), '2026-11-20 11:00:00')
    stamp(
      addTaskHistoryEntry(db, { task_id: 1, kind: 'note', summary: 'lembrete' }, 'app'),
      '2026-11-20 12:00:00'
    )

    const items = listTaskHistory(db, { taskId: 1 })
    expect(
      items.map((item) => [item.kind, item.summary, item.from_status, item.to_status])
    ).toEqual([
      ['note', 'lembrete', null, 'executando'],
      ['checkpoint', 'começou', null, 'executando'],
      ['status', null, 'proximas', 'executando'],
      ['status', null, null, 'proximas']
    ])
    expect(items[0]).toMatchObject({ task_id: 1, task_name: 'Épico', origin: 'app' })
    expect(items[2].origin).toBeNull()
  })

  it('só traz subtarefas quando pedido', () => {
    stamp(addTaskHistoryEntry(db, { task_id: 2, summary: 'parte A' }, 'mcp'), '2026-11-20 11:00:00')
    stamp(addTaskHistoryEntry(db, { task_id: 3, summary: 'alheia' }, 'mcp'), '2026-11-20 11:00:00')

    expect(listTaskHistory(db, { taskId: 1 }).map((item) => item.task_id)).toEqual([1])
    const withSubtasks = listTaskHistory(db, { taskId: 1, includeSubtasks: true })
    expect(withSubtasks.map((item) => item.task_id).sort()).toEqual([1, 2, 2])
    expect(withSubtasks[0]).toMatchObject({ summary: 'parte A', task_name: 'Parte A' })
  })

  it('pagina com limit e before', () => {
    for (let hour = 11; hour <= 14; hour++) {
      stamp(
        addTaskHistoryEntry(db, { task_id: 1, summary: `h${hour}` }, 'mcp'),
        `2026-11-20 ${hour}:00:00`
      )
    }
    const first = listTaskHistory(db, { taskId: 1, limit: 2 })
    expect(first.map((item) => item.summary)).toEqual(['h14', 'h13'])
    const second = listTaskHistory(db, { taskId: 1, limit: 2, before: first[1].created_at })
    expect(second.map((item) => item.summary)).toEqual(['h12', 'h11'])
  })
})

describe('getLastCheckpoint', () => {
  it('ignora notas e operações e respeita o escopo', () => {
    expect(getLastCheckpoint(db, 1)).toBeNull()
    stamp(addTaskHistoryEntry(db, { task_id: 1, summary: 'pai' }, 'mcp'), '2026-11-20 11:00:00')
    stamp(addTaskHistoryEntry(db, { task_id: 2, summary: 'filha' }, 'mcp'), '2026-11-20 12:00:00')
    stamp(
      addTaskHistoryEntry(db, { task_id: 1, kind: 'operation', summary: 'op' }, 'mcp'),
      '2026-11-20 13:00:00'
    )

    expect(getLastCheckpoint(db, 1)?.summary).toBe('pai')
    expect(getLastCheckpoint(db, 1, true)?.summary).toBe('filha')
  })
})

describe('lastCheckpointsFor', () => {
  it('devolve o checkpoint mais recente de cada task numa consulta só', () => {
    const old = addTaskHistoryEntry(db, { task_id: 1, summary: 'antigo' }, 'mcp')
    const recent = addTaskHistoryEntry(db, { task_id: 1, summary: 'recente' }, 'mcp')
    const note = addTaskHistoryEntry(db, { task_id: 1, summary: 'nota', kind: 'note' }, 'app')
    const other = addTaskHistoryEntry(db, { task_id: 2, summary: 'da parte A' }, 'mcp')
    stamp(old, '2026-11-20 10:00:00')
    stamp(recent, '2026-11-20 11:00:00')
    stamp(note, '2026-11-20 12:00:00')
    stamp(other, '2026-11-20 09:00:00')

    const result = lastCheckpointsFor(db, [1, 2, 3, 1])
    expect([...result.keys()].sort()).toEqual([1, 2])
    expect(result.get(1)).toMatchObject({
      summary: 'recente',
      kind: 'checkpoint',
      task_name: 'Épico'
    })
    expect(result.get(2)?.summary).toBe('da parte A')
  })

  it('lista vazia não consulta nada', () => {
    expect(lastCheckpointsFor(db, []).size).toBe(0)
  })
})
