import { DatabaseSync } from 'node:sqlite'
import { beforeEach, describe, expect, it } from 'vitest'
import type { SqliteLike } from './tagQueries'
import { granularityFor, periodStatsQuery, previousPeriod } from './statsQueries'

const NOW = new Date(2026, 10, 19, 15, 0, 0)
const WEEK = { start: '2026-11-13', end: '2026-11-19', projectId: null }

let raw: DatabaseSync
let db: SqliteLike

function at(day: number, hour: number, minute = 0): Date {
  return new Date(2026, 10, day, hour, minute)
}

function session(taskId: number, start: Date, minutes: number | null): void {
  const end = minutes === null ? null : new Date(start.getTime() + minutes * 60_000).toISOString()
  raw
    .prepare('INSERT INTO time_entries (task_id, start_time, end_time) VALUES (?, ?, ?)')
    .run(taskId, start.toISOString(), end)
}

beforeEach(() => {
  raw = new DatabaseSync(':memory:')
  raw.exec(`
    CREATE TABLE areas (id INTEGER PRIMARY KEY, name TEXT);
    CREATE TABLE projects (id INTEGER PRIMARY KEY, name TEXT, color TEXT, area_id INTEGER);
    CREATE TABLE tasks (
      id INTEGER PRIMARY KEY, name TEXT, status TEXT DEFAULT 'proximas', category TEXT,
      energy_level TEXT, project_id INTEGER, parent_task_id INTEGER, status_changed_at TEXT
    );
    CREATE TABLE time_entries (id INTEGER PRIMARY KEY, task_id INTEGER, start_time TEXT, end_time TEXT);
    CREATE TABLE contexts (id INTEGER PRIMARY KEY, name TEXT, color TEXT);
    CREATE TABLE task_contexts (task_id INTEGER, context_id INTEGER);

    INSERT INTO areas VALUES (1, 'Carreira');
    INSERT INTO projects VALUES (1, 'CrafyTask', '#E5484D', 1);
    INSERT INTO tasks (id, name, category, energy_level, project_id) VALUES
      (1, 'Refatorar', 'urgente', 'alto', 1),
      (2, 'Reunião', 'time_leak', NULL, NULL);
    INSERT INTO tasks (id, name, category, parent_task_id) VALUES (3, 'Subtarefa', 'normal', 1);
    INSERT INTO contexts VALUES (1, '@dev', NULL);
    INSERT INTO task_contexts VALUES (1, 1);
  `)
  db = {
    prepare: (sql) => raw.prepare(sql) as unknown as ReturnType<SqliteLike['prepare']>,
    transaction: (fn) => fn
  }
  session(1, at(18, 10, 30), 60)
  session(2, at(19, 14), 30)
  session(3, at(17, 9), 30)
  session(1, at(10, 9), 60)
  session(2, at(12, 23, 30), 60)
  session(1, at(19, 14, 30), null)
})

describe('periodStatsQuery', () => {
  it('recorta as sessões no período e compara com o anterior', () => {
    const stats = periodStatsQuery(db, WEEK, NOW)
    expect(stats.focusSeconds).toEqual({ value: 180 * 60, previous: 90 * 60 })
    expect(stats.sessions).toEqual({ value: 4, previous: 2 })
    expect(stats.avgSessionSeconds).toEqual({ value: 45 * 60, previous: 45 * 60 })
    expect(stats.workdayAvgSeconds).toBe((180 * 60) / 5)
    expect(stats.previous).toEqual({ start: '2026-11-06', end: '2026-11-12' })
  })

  it('agrupa por projeto (subtarefa herda o do pai), área e contexto', () => {
    const stats = periodStatsQuery(db, WEEK, NOW)
    expect(stats.byProject).toEqual([
      { id: 1, name: 'CrafyTask', color: '#E5484D', seconds: 120 * 60 },
      { id: null, name: 'Sem projeto', color: null, seconds: 60 * 60 }
    ])
    expect(stats.byArea.map((r) => [r.name, r.seconds])).toEqual([
      ['Carreira', 120 * 60],
      ['Sem área', 60 * 60]
    ])
    const contexts = Object.fromEntries(stats.byContext.map((r) => [r.name, r.seconds]))
    expect(contexts).toEqual({ '@dev': 90 * 60, 'Sem contexto': 90 * 60 })
  })

  it('categoria com número de tarefas e energia com média por tarefa', () => {
    const stats = periodStatsQuery(db, WEEK, NOW)
    expect(stats.byCategory).toEqual([
      { category: 'urgente', seconds: 90 * 60, taskCount: 1 },
      { category: 'time_leak', seconds: 60 * 60, taskCount: 1 },
      { category: 'normal', seconds: 30 * 60, taskCount: 1 }
    ])
    expect(stats.byEnergy).toEqual([
      { energy: 'alto', seconds: 90 * 60, taskCount: 1, avgSeconds: 90 * 60 }
    ])
    expect(stats.topTasks[0]).toEqual({
      taskId: 1,
      name: 'Refatorar',
      projectName: 'CrafyTask',
      projectColor: '#E5484D',
      seconds: 90 * 60
    })
  })

  it('divide o tempo por hora e por dia locais', () => {
    const stats = periodStatsQuery(db, WEEK, NOW)
    const cell = (weekday: number, hour: number): number | undefined =>
      stats.hourly.find((c) => c.weekday === weekday && c.hour === hour)?.seconds
    expect(cell(3, 10)).toBe(30 * 60)
    expect(cell(3, 11)).toBe(30 * 60)
    expect(stats.daily.find((d) => d.date === '2026-11-13')?.seconds).toBe(30 * 60)
    expect(stats.buckets).toHaveLength(7)
    expect(stats.buckets.filter((b) => b.current).map((b) => b.key)).toEqual(['2026-11-19'])
    expect(stats.granularity).toBe('day')
  })

  it('conta tarefas concluídas pela data da mudança de status', () => {
    raw
      .prepare(
        "INSERT INTO tasks (id, name, status, project_id, status_changed_at) VALUES (?, 'x', 'finalizada', 1, ?)"
      )
      .run(4, at(18, 12).toISOString())
    raw
      .prepare(
        "INSERT INTO tasks (id, name, status, status_changed_at) VALUES (?, 'y', 'finalizada', ?)"
      )
      .run(5, at(8, 12).toISOString())
    expect(periodStatsQuery(db, WEEK, NOW).completedTasks).toEqual({ value: 1, previous: 1 })
    expect(periodStatsQuery(db, { ...WEEK, projectId: 1 }, NOW).completedTasks).toEqual({
      value: 1,
      previous: 0
    })
  })

  it('filtra pelo projeto no SQL', () => {
    const stats = periodStatsQuery(db, { ...WEEK, projectId: 1 }, NOW)
    expect(stats.focusSeconds.value).toBe(120 * 60)
    expect(stats.byProject.map((r) => r.id)).toEqual([1])
  })

  it('recusa período invertido ou data malformada', () => {
    expect(() => periodStatsQuery(db, { ...WEEK, end: '2026-11-01' }, NOW)).toThrow()
    expect(() => periodStatsQuery(db, { ...WEEK, start: '13/11/2026' }, NOW)).toThrow()
    expect(() => periodStatsQuery(db, { ...WEEK, start: '2024-01-01' }, NOW)).toThrow()
  })
})

describe('granularidade e período anterior', () => {
  it('dia até 31, semana até 120, depois mês', () => {
    expect(granularityFor(31)).toBe('day')
    expect(granularityFor(32)).toBe('week')
    expect(granularityFor(120)).toBe('week')
    expect(granularityFor(121)).toBe('month')
  })

  it('o anterior tem o mesmo tamanho e termina na véspera', () => {
    expect(previousPeriod({ start: '2026-11-01', end: '2026-11-30', projectId: null })).toEqual({
      start: '2026-10-02',
      end: '2026-10-31'
    })
  })

  it('semanas começam na segunda e marcam a atual', () => {
    const stats = periodStatsQuery(
      db,
      { start: '2026-09-01', end: '2026-11-19', projectId: null },
      NOW
    )
    expect(stats.granularity).toBe('week')
    expect(stats.buckets[0].key).toBe('2026-08-31')
    expect(stats.buckets.find((b) => b.current)?.key).toBe('2026-11-16')
  })
})
