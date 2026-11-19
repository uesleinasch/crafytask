import { DatabaseSync } from 'node:sqlite'
import { beforeEach, describe, expect, it } from 'vitest'
import type { SqliteLike } from './tagQueries'
import { getProjectQuery, listProjectsQuery } from './projectQueries'

let db: SqliteLike

beforeEach(() => {
  const raw = new DatabaseSync(':memory:')
  raw.exec(`
    CREATE TABLE areas (id INTEGER PRIMARY KEY, name TEXT);
    CREATE TABLE projects (
      id INTEGER PRIMARY KEY, name TEXT, status TEXT, color TEXT, area_id INTEGER,
      created_at TEXT, updated_at TEXT, next_task_id INTEGER
    );
    CREATE TABLE tasks (
      id INTEGER PRIMARY KEY, name TEXT, status TEXT, project_id INTEGER,
      total_seconds INTEGER DEFAULT 0, updated_at TEXT, is_archived INTEGER DEFAULT 0,
      status_changed_at TEXT
    );
    CREATE TABLE time_entries (id INTEGER PRIMARY KEY, task_id INTEGER, start_time TEXT, end_time TEXT);
    INSERT INTO time_entries (task_id, start_time, end_time) VALUES
      (11, '2026-11-06T10:00:00.000Z', '2026-11-06T11:00:00.000Z');
    INSERT INTO areas VALUES (1, 'Carreira');
    INSERT INTO projects VALUES
      (1, 'Site', 'active', '#2A62D6', 1, '2026-11-01', '2026-11-10', NULL),
      (2, 'Viagem', 'someday', '#0B7A50', NULL, '2026-11-01', '2026-11-12', NULL),
      (3, 'Vazio', 'active', '#5D6B82', NULL, '2026-11-01', '2026-11-05', NULL);
    INSERT INTO tasks (id, name, status, project_id, total_seconds, updated_at, is_archived) VALUES
      (10, 'Rascunho', 'finalizada', 1, 3600, '2026-11-02', 0),
      (11, 'Layout', 'proximas', 1, 600, '2026-11-03', 0),
      (12, 'Deploy', 'proximas', 1, 0, '2026-11-08', 0),
      (13, 'Fotos', 'aguardando', 2, 120, '2026-11-04', 0),
      (14, 'Solta', 'proximas', NULL, 999, '2026-11-09', 0),
      (15, 'Velha', 'proximas', 1, 0, '2026-11-11', 1);
  `)
  db = {
    prepare: (sql) => raw.prepare(sql) as unknown as ReturnType<SqliteLike['prepare']>,
    transaction: (fn) => fn
  }
})

describe('listProjectsQuery', () => {
  it('traz contagens, tempo, área e a próxima ação mais recente numa consulta', () => {
    const [viagem, site, vazio] = listProjectsQuery(db)
    expect(site).toMatchObject({
      name: 'Site',
      area_name: 'Carreira',
      task_count: 4,
      completed_task_count: 1,
      open_task_count: 2,
      total_seconds: 4200,
      next_action: 'Deploy',
      next_action_id: 12
    })
    expect(viagem).toMatchObject({ task_count: 1, open_task_count: 1, total_seconds: 120 })
    expect(viagem.next_action).toBeUndefined()
    expect(vazio).toMatchObject({ task_count: 0, completed_task_count: 0, total_seconds: 0 })
  })

  it('última atividade: sessão, tarefa concluída ou criação, o que for mais recente', () => {
    const byName = Object.fromEntries(listProjectsQuery(db).map((p) => [p.name, p]))
    expect(byName.Site.last_activity_at).toBe('2026-11-06 11:00:00')
    expect(byName.Vazio.last_activity_at).toBe('2026-11-01 00:00:00')
  })

  it('filtra por status e lê um projeto só', () => {
    expect(listProjectsQuery(db, 'someday').map((p) => p.name)).toEqual(['Viagem'])
    expect(getProjectQuery(db, 1)?.next_action).toBe('Deploy')
    expect(getProjectQuery(db, 99)).toBeUndefined()
  })

  it('próxima ação escolhida vale enquanto a tarefa está aberta, no projeto e fora do arquivo', () => {
    const choose = (id: number | null): void => {
      db.prepare('UPDATE projects SET next_task_id = ? WHERE id = 1').run(id)
    }
    choose(11)
    expect(getProjectQuery(db, 1)).toMatchObject({ next_action: 'Layout', next_action_id: 11 })
    choose(13)
    expect(getProjectQuery(db, 1)?.next_action).toBe('Deploy')
    choose(10)
    expect(getProjectQuery(db, 1)?.next_action).toBe('Deploy')
    choose(15)
    expect(getProjectQuery(db, 1)?.next_action).toBe('Deploy')
  })
})
