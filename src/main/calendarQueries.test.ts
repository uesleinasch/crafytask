import { DatabaseSync } from 'node:sqlite'
import { beforeEach, describe, expect, it } from 'vitest'
import type { SqliteLike } from './tagQueries'
import {
  calendarTasksQuery,
  listTimeBlocksInRange,
  mergeTimeBlock,
  timeBlockError,
  unscheduledTasksQuery
} from './calendarQueries'

let raw: DatabaseSync
let db: SqliteLike

beforeEach(() => {
  raw = new DatabaseSync(':memory:')
  raw.exec(`
    CREATE TABLE projects (id INTEGER PRIMARY KEY, color TEXT);
    CREATE TABLE tasks (
      id INTEGER PRIMARY KEY, name TEXT, category TEXT, status TEXT, is_running INTEGER DEFAULT 0,
      gcal_sync INTEGER DEFAULT 0, project_id INTEGER, is_archived INTEGER DEFAULT 0,
      parent_task_id INTEGER, scheduled_date TEXT, scheduled_time TEXT, due_date TEXT,
      due_time TEXT, day_order INTEGER, created_at TEXT, updated_at TEXT
    );
    CREATE TABLE time_blocks (
      id INTEGER PRIMARY KEY, task_id INTEGER, date TEXT, start_time TEXT, end_time TEXT,
      created_at TEXT
    );
    INSERT INTO projects VALUES (3, '#2A62D6');
    INSERT INTO tasks (id, name, category, status, is_running, gcal_sync, project_id,
      scheduled_date, scheduled_time, due_date, due_time, created_at, updated_at) VALUES
      (1, 'Relatório', 'normal', 'executando', 1, 1, 3, '2026-11-17', '09:00', NULL, NULL, 'a', '2026-11-10'),
      (2, 'Prazo', 'urgente', 'proximas', 0, 0, NULL, NULL, NULL, '2026-11-18', '17:00', 'b', '2026-11-12'),
      (3, 'Prazo antigo', 'normal', 'proximas', 0, 0, NULL, NULL, NULL, '2026-11-19 00:00:00', NULL, 'c', '2026-11-15'),
      (4, 'Fora', 'normal', 'proximas', 0, 0, NULL, '2026-11-30', NULL, NULL, NULL, 'd', '2026-11-16'),
      (5, 'Agendada sem hora', 'normal', 'inbox', 0, 0, NULL, '2026-11-17', NULL, NULL, NULL, 'e', '2026-11-01'),
      (6, 'Finalizada', 'normal', 'finalizada', 0, 0, NULL, NULL, NULL, NULL, NULL, 'f', '2026-11-01');
    INSERT INTO tasks (id, name, status, is_archived, scheduled_date) VALUES
      (7, 'Arquivada', 'proximas', 1, '2026-11-17');
    INSERT INTO tasks (id, name, status, parent_task_id, scheduled_date) VALUES
      (8, 'Subtarefa', 'proximas', 1, '2026-11-17');
    INSERT INTO time_blocks VALUES
      (10, 1, '2026-11-17', '09:00', '10:30', 'x'),
      (11, 4, '2026-11-30', '14:00', '15:00', 'x'),
      (12, 2, '2026-11-18', '08:00', '09:00', 'x');
  `)
  db = { prepare: (sql) => raw.prepare(sql), transaction: (fn) => fn }
})

function run(query: { sql: string; params: (string | number)[] }): number[] {
  return (raw.prepare(query.sql).all(...query.params) as { id: number }[]).map((r) => r.id)
}

describe('listTimeBlocksInRange', () => {
  it('traz os blocos do intervalo com status, timer, Google e cor do projeto', () => {
    const blocks = listTimeBlocksInRange(db, '2026-11-16', '2026-11-22')
    expect(blocks.map((b) => b.id)).toEqual([10, 12])
    expect(blocks[0]).toMatchObject({
      task_name: 'Relatório',
      task_status: 'executando',
      task_running: 1,
      task_gcal_sync: 1,
      project_color: '#2A62D6'
    })
    expect(blocks[1].project_color).toBeNull()
  })

  it('recusa intervalo invertido ou data fora do formato', () => {
    expect(() => listTimeBlocksInRange(db, '2026-11-22', '2026-11-16')).toThrow('fim do intervalo')
    expect(() => listTimeBlocksInRange(db, '16/11/2026', '2026-11-22')).toThrow('Data inválida')
  })
})

describe('calendarTasksQuery', () => {
  it('junta agendadas e prazos do intervalo, inclusive prazo gravado com hora', () => {
    expect(run(calendarTasksQuery('t.id', '2026-11-16', '2026-11-22'))).toEqual([1, 5, 2, 3])
  })

  it('serve para 3 dias e para a agenda de 14 dias', () => {
    expect(run(calendarTasksQuery('t.id', '2026-11-18', '2026-11-20'))).toEqual([2, 3])
    expect(run(calendarTasksQuery('t.id', '2026-11-17', '2026-11-30'))).toEqual([1, 5, 2, 3, 4])
  })
})

describe('unscheduledTasksQuery', () => {
  it('lista Próximas e Executando sem bloco nos dias visíveis, executando primeiro', () => {
    expect(run(unscheduledTasksQuery('t.id', '2026-11-16', '2026-11-22'))).toEqual([3, 4])
    expect(run(unscheduledTasksQuery('t.id', '2026-11-23', '2026-11-29'))).toEqual([1, 2, 3, 4])
  })

  it('respeita o limite', () => {
    expect(run(unscheduledTasksQuery('t.id', '2026-11-23', '2026-11-29', 2))).toEqual([1, 2])
  })
})

describe('regras do bloco', () => {
  const block = { date: '2026-11-17', start_time: '09:00', end_time: '10:30' }

  it('aceita bloco válido e recusa fim antes do início, hora ou data inválida', () => {
    expect(timeBlockError(block)).toBeNull()
    expect(timeBlockError({ ...block, end_time: '09:00' })).toMatch('depois do início')
    expect(timeBlockError({ ...block, start_time: '9h' })).toMatch('Horário inválido')
    expect(timeBlockError({ ...block, date: '2026-13' })).toMatch('Data inválida')
  })

  it('mescla a mudança sobre o bloco atual, inclusive trocar o dia', () => {
    expect(mergeTimeBlock(block, { date: '2026-11-18' })).toEqual({ ...block, date: '2026-11-18' })
    expect(mergeTimeBlock(block, { end_time: '11:00' })).toEqual({ ...block, end_time: '11:00' })
  })
})
