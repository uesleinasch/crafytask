import { DatabaseSync } from 'node:sqlite'
import { beforeEach, describe, expect, it } from 'vitest'
import type { SqliteLike } from './tagQueries'
import { ensureStatusChangedAt } from './healthQueries'
import {
  bumpReviewCounter,
  completeReview,
  createReview,
  ensureReviewSchema,
  discardReview,
  getReview,
  lastReview,
  listReviews,
  migrateReviewSteps,
  openReview,
  reviewPastWeek,
  setReviewCurrentStep,
  setReviewStep,
  updateReviewNotes
} from './reviewQueries'

const NOW = new Date(2026, 10, 19, 15, 0, 0)

let raw: DatabaseSync
let db: SqliteLike

function seed(sql: string): void {
  raw.exec(sql)
}

beforeEach(() => {
  raw = new DatabaseSync(':memory:')
  raw.exec(`
    CREATE TABLE projects (
      id INTEGER PRIMARY KEY, name TEXT, color TEXT, status TEXT, created_at TEXT,
      next_task_id INTEGER
    );
    CREATE TABLE tasks (
      id INTEGER PRIMARY KEY, name TEXT, status TEXT, category TEXT DEFAULT 'normal',
      project_id INTEGER, due_date TEXT, total_seconds INTEGER DEFAULT 0,
      is_running INTEGER DEFAULT 0, gcal_sync INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      is_archived INTEGER DEFAULT 0, parent_task_id INTEGER
    );
    CREATE TABLE time_entries (
      id INTEGER PRIMARY KEY, task_id INTEGER, start_time TEXT, end_time TEXT,
      duration_seconds INTEGER
    );
    CREATE TABLE time_blocks (
      id INTEGER PRIMARY KEY, task_id INTEGER, date TEXT, start_time TEXT, end_time TEXT,
      created_at TEXT
    );
    CREATE TABLE weekly_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT, started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME, inbox_cleared INTEGER DEFAULT 0, notes TEXT,
      checklist_state TEXT DEFAULT '{}'
    );
  `)
  db = {
    prepare: (sql) => raw.prepare(sql) as unknown as ReturnType<SqliteLike['prepare']>,
    transaction: (fn) => fn
  }
  ensureStatusChangedAt(db)
})

describe('migrateReviewSteps', () => {
  it('leva as chaves dos 8 passos antigos para as novas', () => {
    expect(
      migrateReviewSteps(
        { process_inbox: true, review_calendar: true, review_next: false, collect: true },
        false
      )
    ).toEqual({ inbox: 'done', upcoming: 'done', collect: 'done' })
  })

  it('marca como pulados os passos antigos não feitos de uma revisão concluída', () => {
    const steps = migrateReviewSteps({ collect: true, process_inbox: true }, true)
    expect(steps.collect).toBe('done')
    expect(steps.waiting).toBe('skipped')
    expect(steps.mind).toBeUndefined()
    expect(Object.keys(steps)).toHaveLength(8)
  })

  it('mantém o formato novo e ignora o que não reconhece', () => {
    expect(migrateReviewSteps({ past: 'skipped', mind: 'done', foo: true, next: 1 }, true)).toEqual(
      { past: 'skipped', mind: 'done' }
    )
    expect(migrateReviewSteps(null, false)).toEqual({})
  })
})

describe('ensureReviewSchema', () => {
  it('migra as revisões antigas uma vez: concluídas sobre 8, em andamento sobre 10', () => {
    seed(`
      INSERT INTO weekly_reviews (id, started_at, completed_at, checklist_state) VALUES
        (1, '2026-11-01 10:00:00', '2026-11-01T11:00:00.000Z', '{"collect":true,"review_projects":true}'),
        (2, '2026-11-15 10:00:00', NULL, '{"process_inbox":true}')
    `)
    ensureReviewSchema(db)
    ensureReviewSchema(db)
    const old = getReview(db, 1)!
    expect(old.step_total).toBe(8)
    expect(old.steps.projects).toBe('done')
    expect(old.steps.someday).toBe('skipped')
    const open = getReview(db, 2)!
    expect(open.step_total).toBe(10)
    expect(open.steps).toEqual({ inbox: 'done' })
    expect(open.start_health).toBeNull()
    expect(open.counters.processed).toBe(0)
  })
})

describe('revisão em andamento', () => {
  beforeEach(() => ensureReviewSchema(db))

  it('cria com o retrato dos indicadores e devolve a aberta em vez de duplicar', () => {
    seed(`INSERT INTO tasks (id, name, status) VALUES (1, 'a', 'inbox'), (2, 'b', 'inbox')`)
    const review = createReview(db, NOW)
    expect(review.start_health?.inboxCount).toBe(2)
    expect(review.step_total).toBe(10)
    seed(`UPDATE tasks SET status = 'proximas'`)
    expect(createReview(db, NOW).id).toBe(review.id)
    expect(getReview(db, review.id)!.start_health?.inboxCount).toBe(2)
    expect(openReview(db)?.id).toBe(review.id)
  })

  it('marca, pula e desfaz passos', () => {
    const { id } = createReview(db, NOW)
    setReviewStep(db, id, 'collect', 'done')
    setReviewStep(db, id, 'mind', 'skipped')
    expect(getReview(db, id)!.steps).toEqual({ collect: 'done', mind: 'skipped' })
    setReviewStep(db, id, 'mind', null)
    expect(getReview(db, id)!.steps).toEqual({ collect: 'done' })
    expect(() => setReviewStep(db, id, 'nope' as 'mind', 'done')).toThrow()
  })

  it('soma contadores e guarda o que foi coletado', () => {
    const { id } = createReview(db, NOW)
    bumpReviewCounter(db, id, 'collected', 7)
    bumpReviewCounter(db, id, 'processed')
    const review = bumpReviewCounter(db, id, 'processed')
    expect(review.counters).toEqual({
      collected: 1,
      processed: 2,
      nextSet: 0,
      chased: 0,
      cleaned: 0
    })
    expect(review.captured).toEqual([7])
    expect(() => bumpReviewCounter(db, id, 'collected')).toThrow()
  })

  it('guarda o passo atual: avança ao marcar, volta ao desfazer e aceita ir a um passo', () => {
    const { id } = createReview(db, NOW)
    expect(getReview(db, id)!.current_step).toBe('collect')
    expect(setReviewStep(db, id, 'collect', 'done').current_step).toBe('inbox')
    expect(setReviewCurrentStep(db, id, 'collect').current_step).toBe('collect')
    expect(setReviewStep(db, id, 'inbox', 'skipped').current_step).toBe('mind')
    expect(setReviewStep(db, id, 'collect', null).current_step).toBe('collect')
  })

  it('descarta só a revisão em andamento', () => {
    const { id } = createReview(db, NOW)
    discardReview(db, id)
    expect(getReview(db, id)).toBeUndefined()
    const other = createReview(db, NOW)
    completeReview(db, other.id, NOW)
    expect(() => discardReview(db, other.id)).toThrow('Revisão já concluída.')
  })

  it('lista só as concluídas, sem limite, e lastReview inclui a aberta', () => {
    for (let i = 0; i < 25; i++) completeReview(db, createReview(db, NOW).id, NOW)
    const open = createReview(db, NOW)
    expect(listReviews(db)).toHaveLength(25)
    expect(lastReview(db)?.id).toBe(open.id)
  })

  it('conclui com passos pulados, marca o Inbox zerado e trava a revisão', () => {
    const { id } = createReview(db, NOW)
    setReviewStep(db, id, 'collect', 'done')
    updateReviewNotes(db, id, 'rascunho')
    const done = completeReview(db, id, NOW)
    expect(done.completed_at).toBe(NOW.toISOString().slice(0, 19).replace('T', ' '))
    expect(done.notes).toBe('rascunho')
    expect(done.inbox_cleared).toBe(true)
    expect(done.steps.collect).toBe('done')
    expect(done.steps.creative).toBe('skipped')
    expect(Object.keys(done.steps)).toHaveLength(10)
    expect(() => setReviewStep(db, id, 'mind', 'done')).toThrow('Revisão já concluída.')
    expect(() => completeReview(db, id, NOW)).toThrow()
    expect(openReview(db)).toBeUndefined()
    expect(listReviews(db).map((r) => r.id)).toEqual([id])
  })

  it('guarda as notas passadas ao concluir', () => {
    seed(`INSERT INTO tasks (id, name, status) VALUES (1, 'a', 'inbox')`)
    const { id } = createReview(db, NOW)
    const done = completeReview(db, id, NOW, 'fim')
    expect(done.notes).toBe('fim')
    expect(done.inbox_cleared).toBe(false)
  })
})

describe('reviewPastWeek', () => {
  const utc = (d: Date): string => d.toISOString().slice(0, 19).replace('T', ' ')
  const at = (day: number, hour: number, minute = 0): Date =>
    new Date(2026, 10, day, hour, minute, 0)

  it('junta sessões, conclusões e blocos dos últimos 7 dias por dia', () => {
    seed(`
      INSERT INTO tasks (id, name, status, total_seconds) VALUES
        (1, 'Escrever', 'executando', 0), (2, 'Release', 'proximas', 0),
        (3, 'Reunião', 'proximas', 0), (4, 'Antiga', 'proximas', 0);
      INSERT INTO time_entries (task_id, start_time, end_time) VALUES
        (1, '${utc(at(18, 9))}', '${utc(at(18, 10))}'),
        (1, '${utc(at(18, 14))}', '${utc(at(18, 14, 30))}'),
        (2, '${utc(at(17, 9))}', '${utc(at(17, 9, 15))}'),
        (4, '${utc(at(10, 9))}', '${utc(at(10, 10))}');
      INSERT INTO time_blocks (task_id, date, start_time, end_time) VALUES
        (3, '2026-11-17', '14:00', '15:00'), (3, '2026-11-10', '14:00', '15:00'),
        (3, '2026-11-19', '16:00', '17:00');
    `)
    seed(`UPDATE tasks SET status = 'finalizada' WHERE id = 2`)
    seed(`UPDATE tasks SET status_changed_at = '${utc(at(17, 16))}' WHERE id = 2`)
    const week = reviewPastWeek(db, NOW)
    expect(week.from).toBe('2026-11-13')
    expect(week.to).toBe('2026-11-19')
    expect(week.days.map((d) => d.day)).toEqual(['2026-11-18', '2026-11-17'])
    expect(week.days[0].items).toEqual([
      { kind: 'work', task_id: 1, name: 'Escrever', seconds: 5400, done: false }
    ])
    expect(week.days[1].items).toEqual([
      {
        kind: 'event',
        task_id: 3,
        name: 'Reunião',
        seconds: 3600,
        done: false,
        time: '14:00'
      },
      { kind: 'work', task_id: 2, name: 'Release', seconds: 900, done: true }
    ])
  })

  it('corta a sessão que começou antes do intervalo e conta a que está rodando até agora', () => {
    seed(`
      INSERT INTO tasks (id, name, status) VALUES (1, 'Longa', 'executando');
      INSERT INTO time_entries (task_id, start_time, end_time) VALUES
        (1, '${utc(new Date(2026, 10, 12, 23, 0, 0))}', '${utc(new Date(2026, 10, 13, 1, 0, 0))}'),
        (1, '${utc(at(19, 14))}', NULL);
    `)
    const week = reviewPastWeek(db, NOW)
    expect(week.days.map((d) => [d.day, d.items[0].seconds])).toEqual([
      ['2026-11-19', 3600],
      ['2026-11-13', 3600]
    ])
  })
})
