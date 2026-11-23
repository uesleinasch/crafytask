import { DatabaseSync } from 'node:sqlite'
import { beforeEach, describe, expect, it } from 'vitest'
import type { SqliteLike } from './tagQueries'
import {
  createMilestone,
  deleteMilestone,
  ensureMilestoneSchema,
  getMilestone,
  listMilestones,
  setMilestoneDone,
  setTaskMilestone,
  updateMilestone
} from './milestoneQueries'

let raw: DatabaseSync
let db: SqliteLike

const milestoneOf = (taskId: number): number | null =>
  (
    raw.prepare('SELECT milestone_id FROM tasks WHERE id = ?').get(taskId) as {
      milestone_id: number | null
    }
  ).milestone_id

beforeEach(() => {
  raw = new DatabaseSync(':memory:')
  raw.exec('PRAGMA foreign_keys = ON')
  raw.exec(`
    CREATE TABLE projects (id INTEGER PRIMARY KEY, name TEXT);
    CREATE TABLE tasks (
      id INTEGER PRIMARY KEY, name TEXT, status TEXT, is_archived INTEGER DEFAULT 0,
      project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    INSERT INTO projects (id, name) VALUES (1, 'CrafyTask'), (2, 'Outro');
    INSERT INTO tasks (id, name, status, project_id) VALUES
      (10, 'a', 'finalizada', 1), (11, 'b', 'proximas', 1), (12, 'c', 'proximas', 2);
  `)
  db = {
    prepare: (sql) => raw.prepare(sql) as unknown as ReturnType<SqliteLike['prepare']>,
    transaction: (fn) => fn
  }
  ensureMilestoneSchema(db)
  ensureMilestoneSchema(db)
})

describe('marcos do projeto', () => {
  it('lista por tipo e data, com a contagem de tarefas', () => {
    const fim = createMilestone(db, { project_id: 1, name: 'Release', kind: 'fim' })
    const dev2 = createMilestone(db, {
      project_id: 1,
      name: 'Dia 15',
      kind: 'desenvolvimento',
      due_date: '2026-12-15'
    })
    const dev1 = createMilestone(db, {
      project_id: 1,
      name: '  Dia 10 ',
      kind: 'desenvolvimento',
      due_date: '2026-12-10'
    })
    const inicio = createMilestone(db, { project_id: 1, name: 'Kickoff', kind: 'inicio' })
    setTaskMilestone(db, 10, dev1.id)
    setTaskMilestone(db, 11, dev1.id)

    const list = listMilestones(db, 1)
    expect(list.map((m) => m.id)).toEqual([inicio.id, dev1.id, dev2.id, fim.id])
    expect(list[1]).toMatchObject({ name: 'Dia 10', task_count: 2, done_task_count: 1 })
    expect(listMilestones(db, 2)).toEqual([])
  })

  it('aceita no máximo um início e um fim por projeto', () => {
    createMilestone(db, { project_id: 1, name: 'A', kind: 'inicio' })
    expect(() => createMilestone(db, { project_id: 1, name: 'B', kind: 'inicio' })).toThrow(
      'já tem um marco de início'
    )
    createMilestone(db, { project_id: 2, name: 'C', kind: 'inicio' })
    const dev = createMilestone(db, { project_id: 1, name: 'D', kind: 'desenvolvimento' })
    expect(() => updateMilestone(db, dev.id, { kind: 'inicio' })).toThrow('início')
    expect(updateMilestone(db, dev.id, { kind: 'fim' }).kind).toBe('fim')
  })

  it('valida nome, tipo, data e projeto', () => {
    expect(() => createMilestone(db, { project_id: 1, name: ' ', kind: 'fim' })).toThrow('nome')
    expect(() => createMilestone(db, { project_id: 1, name: 'x', kind: 'meio' as 'fim' })).toThrow(
      'Tipo'
    )
    expect(() =>
      createMilestone(db, { project_id: 1, name: 'x', kind: 'fim', due_date: '10/12' })
    ).toThrow('AAAA-MM-DD')
    expect(() => createMilestone(db, { project_id: 9, name: 'x', kind: 'fim' })).toThrow(
      'Projeto 9'
    )
  })

  it('edita, conclui e reabre', () => {
    const m = createMilestone(db, { project_id: 1, name: 'A', kind: 'desenvolvimento' })
    const edited = updateMilestone(db, m.id, {
      name: 'B',
      due_date: '2026-12-01',
      description: ' pronto '
    })
    expect(edited).toMatchObject({ name: 'B', due_date: '2026-12-01', description: 'pronto' })
    expect(updateMilestone(db, m.id, { due_date: null }).due_date).toBeNull()
    const done = setMilestoneDone(db, m.id, true)
    expect(done.done_at).toMatch(/^\d{4}-\d{2}-\d{2} /)
    expect(setMilestoneDone(db, m.id, true).done_at).toBe(done.done_at)
    expect(setMilestoneDone(db, m.id, false).done_at).toBeNull()
  })

  it('só liga a task a marco do projeto dela', () => {
    const m = createMilestone(db, { project_id: 1, name: 'A', kind: 'desenvolvimento' })
    expect(() => setTaskMilestone(db, 12, m.id)).toThrow('mesmo projeto')
    expect(() => setTaskMilestone(db, 99, m.id)).toThrow('Task 99')
    setTaskMilestone(db, 11, m.id)
    expect(milestoneOf(11)).toBe(m.id)
    setTaskMilestone(db, 11, null)
    expect(milestoneOf(11)).toBeNull()
  })

  it('tira a task do marco quando ela muda de projeto', () => {
    const m = createMilestone(db, { project_id: 1, name: 'A', kind: 'desenvolvimento' })
    setTaskMilestone(db, 11, m.id)
    raw.exec("UPDATE tasks SET name = 'renomeada' WHERE id = 11")
    expect(milestoneOf(11)).toBe(m.id)
    raw.exec('UPDATE tasks SET project_id = 2 WHERE id = 11')
    expect(milestoneOf(11)).toBeNull()
  })

  it('excluir o marco ou o projeto solta as tarefas', () => {
    const m = createMilestone(db, { project_id: 1, name: 'A', kind: 'desenvolvimento' })
    setTaskMilestone(db, 11, m.id)
    deleteMilestone(db, m.id)
    expect(getMilestone(db, m.id)).toBeNull()
    expect(milestoneOf(11)).toBeNull()

    const n = createMilestone(db, { project_id: 1, name: 'B', kind: 'fim' })
    setTaskMilestone(db, 10, n.id)
    raw.exec('DELETE FROM projects WHERE id = 1')
    expect(getMilestone(db, n.id)).toBeNull()
    expect(milestoneOf(10)).toBeNull()
  })
})
