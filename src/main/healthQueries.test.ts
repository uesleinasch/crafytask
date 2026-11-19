import { DatabaseSync } from 'node:sqlite'
import { beforeEach, describe, expect, it } from 'vitest'
import type { SqliteLike } from './tagQueries'
import { ensureStatusChangedAt, healthIndicatorsQuery } from './healthQueries'

const NOW = new Date(2026, 10, 19, 15, 0, 0)

let raw: DatabaseSync
let db: SqliteLike

beforeEach(() => {
  raw = new DatabaseSync(':memory:')
  raw.exec(`
    CREATE TABLE projects (
      id INTEGER PRIMARY KEY, name TEXT, status TEXT, created_at TEXT, next_task_id INTEGER
    );
    CREATE TABLE tasks (
      id INTEGER PRIMARY KEY, name TEXT, status TEXT, project_id INTEGER, due_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      is_archived INTEGER DEFAULT 0
    );
    CREATE TABLE time_entries (id INTEGER PRIMARY KEY, task_id INTEGER, start_time TEXT, end_time TEXT);
    CREATE TABLE weekly_reviews (id INTEGER PRIMARY KEY, started_at TEXT, completed_at TEXT);
  `)
  db = {
    prepare: (sql) => raw.prepare(sql) as unknown as ReturnType<SqliteLike['prepare']>,
    transaction: (fn) => fn
  }
})

function seed(sql: string): void {
  raw.exec(sql)
}

describe('ensureStatusChangedAt', () => {
  it('cria a coluna com o valor de updated_at e é idempotente', () => {
    seed(`INSERT INTO tasks (id, status, updated_at) VALUES (1, 'inbox', '2026-11-01 10:00:00')`)
    ensureStatusChangedAt(db)
    ensureStatusChangedAt(db)
    const row = raw.prepare('SELECT status_changed_at FROM tasks WHERE id = 1').get() as {
      status_changed_at: string
    }
    expect(row.status_changed_at).toBe('2026-11-01 10:00:00')
  })

  it('marca a data só quando o status muda', () => {
    ensureStatusChangedAt(db)
    seed(`INSERT INTO tasks (id, status, created_at) VALUES (1, 'inbox', '2026-11-01 10:00:00')`)
    const changedAt = (): string =>
      (raw.prepare('SELECT status_changed_at AS v FROM tasks WHERE id = 1').get() as { v: string })
        .v
    expect(changedAt()).toBe('2026-11-01 10:00:00')
    seed(`UPDATE tasks SET name = 'x', status = 'inbox' WHERE id = 1`)
    expect(changedAt()).toBe('2026-11-01 10:00:00')
    seed(`UPDATE tasks SET status = 'proximas' WHERE id = 1`)
    expect(changedAt()).not.toBe('2026-11-01 10:00:00')
  })
})

describe('healthIndicatorsQuery', () => {
  beforeEach(() => ensureStatusChangedAt(db))

  it('conta tudo zerado num banco vazio', () => {
    expect(healthIndicatorsQuery(db, NOW)).toEqual({
      inboxCount: 0,
      oldestInboxDays: null,
      projectsWithoutNextAction: 0,
      stalledProjects: 0,
      staleWaitingTasks: 0,
      staleNextTasks: 0,
      overdueTasks: 0,
      somedayCount: 0,
      daysSinceLastReview: null
    })
  })

  it('usa a data da mudança de status, não a última edição', () => {
    seed(`
      INSERT INTO tasks (id, status, created_at, status_changed_at, updated_at) VALUES
        (1, 'aguardando', '2026-10-01', '2026-11-05 10:00:00', '2026-11-19 10:00:00'),
        (2, 'aguardando', '2026-10-01', '2026-11-15 10:00:00', '2026-11-15 10:00:00'),
        (3, 'proximas', '2026-10-01', '2026-11-01 10:00:00', '2026-11-18 10:00:00'),
        (4, 'proximas', '2026-10-01', '2026-11-10 10:00:00', '2026-11-10 10:00:00');
      INSERT INTO tasks (id, status, created_at, status_changed_at, is_archived) VALUES
        (5, 'aguardando', '2026-10-01', '2026-10-01 10:00:00', 1);
    `)
    const health = healthIndicatorsQuery(db, NOW)
    expect(health.staleWaitingTasks).toBe(1)
    expect(health.staleNextTasks).toBe(1)
  })

  it('conta inbox com o item mais antigo, someday e prazos vencidos abertos', () => {
    seed(`
      INSERT INTO tasks (id, status, created_at, due_date, is_archived) VALUES
        (1, 'inbox', '2026-11-15 12:00:00', NULL, 0),
        (2, 'inbox', '2026-11-18 12:00:00', '2026-11-18', 0),
        (3, 'someday', '2026-11-01', NULL, 0),
        (4, 'finalizada', '2026-11-01', '2026-11-10', 0),
        (5, 'proximas', '2026-11-01', '2026-11-19', 0),
        (6, 'proximas', '2026-11-01', '2026-11-01', 1);
    `)
    const health = healthIndicatorsQuery(db, NOW)
    expect(health).toMatchObject({
      inboxCount: 2,
      oldestInboxDays: 4,
      somedayCount: 1,
      overdueTasks: 1
    })
  })

  it('projeto sem próxima ação segue a mesma regra da lista de projetos', () => {
    seed(`
      INSERT INTO projects (id, status, created_at, next_task_id) VALUES
        (1, 'active', '2026-11-01', NULL),
        (2, 'active', '2026-11-01', 21),
        (3, 'active', '2026-11-01', NULL),
        (4, 'active', '2026-11-01', NULL),
        (5, 'someday', '2026-11-01', NULL);
      INSERT INTO tasks (id, status, project_id) VALUES
        (11, 'aguardando', 1),
        (21, 'aguardando', 2),
        (31, 'proximas', 3),
        (41, 'finalizada', 4),
        (51, 'inbox', 5);
    `)
    expect(healthIndicatorsQuery(db, NOW).projectsWithoutNextAction).toBe(1)
  })

  it('projeto parado: ativo, antigo, sem sessão nem conclusão nos últimos 7 dias', () => {
    seed(`
      INSERT INTO projects (id, status, created_at) VALUES
        (1, 'active', '2026-10-01'),
        (2, 'active', '2026-10-01'),
        (3, 'active', '2026-10-01'),
        (4, 'active', '2026-11-17'),
        (5, 'active', '2026-10-01'),
        (6, 'completed', '2026-10-01');
      INSERT INTO tasks (id, status, project_id, created_at, status_changed_at) VALUES
        (10, 'proximas', 1, '2026-10-01', '2026-10-02 10:00:00'),
        (20, 'proximas', 2, '2026-10-01', '2026-10-02 10:00:00'),
        (30, 'finalizada', 3, '2026-10-01', '2026-11-16 10:00:00'),
        (50, 'proximas', 5, '2026-10-01', '2026-10-02 10:00:00');
      INSERT INTO time_entries (task_id, start_time, end_time) VALUES
        (10, '2026-11-01T10:00:00.000Z', '2026-11-01T11:00:00.000Z'),
        (20, '2026-11-18T10:00:00.000Z', '2026-11-18T11:00:00.000Z'),
        (50, '2026-11-01T10:00:00.000Z', NULL);
    `)
    expect(healthIndicatorsQuery(db, NOW).stalledProjects).toBe(1)
  })

  it('dias desde a última revisão concluída, em dias de calendário', () => {
    seed(`
      INSERT INTO weekly_reviews (started_at, completed_at) VALUES
        ('2026-11-01', '2026-11-01T20:00:00.000Z'),
        ('2026-11-11', '2026-11-11T13:00:00.000Z'),
        ('2026-11-18', NULL);
    `)
    expect(healthIndicatorsQuery(db, NOW).daysSinceLastReview).toBe(8)
  })
})
