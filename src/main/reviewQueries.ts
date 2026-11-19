import type {
  ReviewCounterKey,
  ReviewCounters,
  ReviewHealthIndicators,
  ReviewPastDay,
  ReviewPastItem,
  ReviewPastWeek,
  ReviewStepKey,
  ReviewStepStatus,
  ReviewSteps,
  WeeklyReview
} from '@shared/types'
import {
  LEGACY_STEP_TOTAL,
  REVIEW_COUNTER_KEYS,
  REVIEW_STEP_KEYS,
  emptyReviewCounters,
  isReviewStepKey,
  isReviewStepStatus
} from '@shared/reviewSteps'
import { parseSqlTime } from '@shared/healthLimits'
import { localDateString } from '@shared/dueState'
import type { SqliteLike } from './tagQueries'
import { healthIndicatorsQuery } from './healthQueries'
import { listTimeEntriesInRange } from './timeEntryQueries'
import { listTimeBlocksInRange } from './calendarQueries'

const LEGACY_STEP_KEYS: Record<string, ReviewStepKey> = {
  collect: 'collect',
  process_inbox: 'inbox',
  review_next: 'next',
  review_projects: 'projects',
  review_waiting: 'waiting',
  review_someday: 'someday',
  review_calendar: 'upcoming',
  creative: 'creative'
}

const PAST_WEEK_DAYS = 7

interface ReviewRow {
  id: number
  started_at: string
  completed_at: string | null
  inbox_cleared: number
  notes: string | null
  checklist_state: string | null
  step_total: number | null
  counters: string | null
  start_health: string | null
}

function parseJson(value: string | null): unknown {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export function migrateReviewSteps(state: unknown, completed: boolean): ReviewSteps {
  const steps: ReviewSteps = {}
  if (!state || typeof state !== 'object') return steps
  let legacy = false
  for (const [key, value] of Object.entries(state as Record<string, unknown>)) {
    if (isReviewStepKey(key) && isReviewStepStatus(value)) {
      steps[key] = value
    } else if (key in LEGACY_STEP_KEYS) {
      legacy = true
      if (value === true) steps[LEGACY_STEP_KEYS[key]] = 'done'
    }
  }
  if (completed && legacy) {
    for (const key of Object.values(LEGACY_STEP_KEYS)) steps[key] ??= 'skipped'
  }
  return steps
}

function parseCounters(value: string | null): { counters: ReviewCounters; captured: number[] } {
  const raw = parseJson(value) as { counters?: Record<string, unknown>; captured?: unknown } | null
  const counters = emptyReviewCounters()
  for (const key of REVIEW_COUNTER_KEYS) {
    const n = raw?.counters?.[key]
    if (typeof n === 'number' && Number.isFinite(n)) counters[key] = n
  }
  const captured = Array.isArray(raw?.captured)
    ? raw.captured.filter((id): id is number => Number.isInteger(id))
    : []
  return { counters, captured }
}

function toReview(row: ReviewRow): WeeklyReview {
  const { counters, captured } = parseCounters(row.counters)
  return {
    id: row.id,
    started_at: row.started_at,
    completed_at: row.completed_at ?? undefined,
    inbox_cleared: Boolean(row.inbox_cleared),
    notes: row.notes ?? undefined,
    steps: migrateReviewSteps(parseJson(row.checklist_state), Boolean(row.completed_at)),
    step_total: row.step_total ?? REVIEW_STEP_KEYS.length,
    counters,
    captured,
    start_health: parseJson(row.start_health) as ReviewHealthIndicators | null
  }
}

export function ensureReviewSchema(db: SqliteLike): void {
  const columns = db.prepare("PRAGMA table_info('weekly_reviews')").all() as { name: string }[]
  const has = (name: string): boolean => columns.some((column) => column.name === name)
  if (!has('counters')) db.prepare('ALTER TABLE weekly_reviews ADD COLUMN counters TEXT').run()
  if (!has('start_health')) {
    db.prepare('ALTER TABLE weekly_reviews ADD COLUMN start_health TEXT').run()
  }
  if (has('step_total')) return
  db.prepare(
    `ALTER TABLE weekly_reviews ADD COLUMN step_total INTEGER NOT NULL DEFAULT ${REVIEW_STEP_KEYS.length}`
  ).run()
  const rows = db
    .prepare('SELECT id, completed_at, checklist_state FROM weekly_reviews')
    .all() as Pick<ReviewRow, 'id' | 'completed_at' | 'checklist_state'>[]
  const update = db.prepare(
    'UPDATE weekly_reviews SET checklist_state = ?, step_total = ? WHERE id = ?'
  )
  db.transaction(() => {
    for (const row of rows) {
      const completed = Boolean(row.completed_at)
      const steps = migrateReviewSteps(parseJson(row.checklist_state), completed)
      const total = completed ? LEGACY_STEP_TOTAL : REVIEW_STEP_KEYS.length
      update.run(JSON.stringify(steps), total, row.id)
    }
  })()
}

function getRow(db: SqliteLike, id: number): ReviewRow | undefined {
  return db.prepare('SELECT * FROM weekly_reviews WHERE id = ?').get(id) as ReviewRow | undefined
}

export function getReview(db: SqliteLike, id: number): WeeklyReview | undefined {
  const row = getRow(db, id)
  return row ? toReview(row) : undefined
}

export function listReviews(db: SqliteLike, limit = 20): WeeklyReview[] {
  return (
    db
      .prepare('SELECT * FROM weekly_reviews ORDER BY started_at DESC, id DESC LIMIT ?')
      .all(limit) as ReviewRow[]
  ).map(toReview)
}

export function lastReview(db: SqliteLike): WeeklyReview | undefined {
  return listReviews(db, 1)[0]
}

export function openReview(db: SqliteLike): WeeklyReview | undefined {
  const row = db
    .prepare(
      'SELECT * FROM weekly_reviews WHERE completed_at IS NULL ORDER BY started_at DESC, id DESC LIMIT 1'
    )
    .get() as ReviewRow | undefined
  return row ? toReview(row) : undefined
}

export function createReview(db: SqliteLike, now: Date): WeeklyReview {
  const open = openReview(db)
  if (open) return open
  const health = healthIndicatorsQuery(db, now)
  const result = db
    .prepare(
      `INSERT INTO weekly_reviews (started_at, checklist_state, step_total, counters, start_health)
       VALUES (?, '{}', ?, ?, ?)`
    )
    .run(
      now.toISOString().slice(0, 19).replace('T', ' '),
      REVIEW_STEP_KEYS.length,
      JSON.stringify({ counters: emptyReviewCounters(), captured: [] }),
      JSON.stringify(health)
    ) as { lastInsertRowid: number | bigint }
  return getReview(db, Number(result.lastInsertRowid))!
}

function openRow(db: SqliteLike, id: number): ReviewRow {
  const row = getRow(db, id)
  if (!row) throw new Error('Revisão não encontrada.')
  if (row.completed_at) throw new Error('Revisão já concluída.')
  return row
}

export function setReviewStep(
  db: SqliteLike,
  id: number,
  key: ReviewStepKey,
  status: ReviewStepStatus | null
): WeeklyReview {
  if (!isReviewStepKey(key)) throw new Error('Passo da revisão inválido.')
  if (status !== null && !isReviewStepStatus(status)) throw new Error('Estado do passo inválido.')
  db.transaction(() => {
    const steps = toReview(openRow(db, id)).steps
    if (status) steps[key] = status
    else delete steps[key]
    db.prepare('UPDATE weekly_reviews SET checklist_state = ? WHERE id = ?').run(
      JSON.stringify(steps),
      id
    )
  })()
  return getReview(db, id)!
}

export function bumpReviewCounter(
  db: SqliteLike,
  id: number,
  key: ReviewCounterKey,
  taskId?: number
): WeeklyReview {
  if (!REVIEW_COUNTER_KEYS.includes(key)) throw new Error('Contador da revisão inválido.')
  db.transaction(() => {
    const { counters, captured } = toReview(openRow(db, id))
    counters[key] += 1
    if (key === 'collected' && Number.isInteger(taskId)) captured.push(taskId as number)
    db.prepare('UPDATE weekly_reviews SET counters = ? WHERE id = ?').run(
      JSON.stringify({ counters, captured }),
      id
    )
  })()
  return getReview(db, id)!
}

export function updateReviewNotes(db: SqliteLike, id: number, notes: string): void {
  db.prepare('UPDATE weekly_reviews SET notes = ? WHERE id = ?').run(notes, id)
}

export function completeReview(
  db: SqliteLike,
  id: number,
  now: Date,
  notes?: string
): WeeklyReview {
  db.transaction(() => {
    const review = toReview(openRow(db, id))
    const steps = { ...review.steps }
    for (const key of REVIEW_STEP_KEYS) steps[key] ??= 'skipped'
    const inboxCleared = healthIndicatorsQuery(db, now).inboxCount === 0
    db.prepare(
      `UPDATE weekly_reviews
       SET completed_at = ?, checklist_state = ?, inbox_cleared = ?, notes = COALESCE(?, notes)
       WHERE id = ?`
    ).run(now.toISOString(), JSON.stringify(steps), inboxCleared ? 1 : 0, notes ?? null, id)
  })()
  return getReview(db, id)!
}

function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function reviewPastWeek(db: SqliteLike, now: Date): ReviewPastWeek {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (PAST_WEEK_DAYS - 1))
  const from = localDateString(start)
  const to = localDateString(now)
  const byDay = new Map<string, { work: Map<number, ReviewPastItem>; events: ReviewPastItem[] }>()
  const day = (key: string): { work: Map<number, ReviewPastItem>; events: ReviewPastItem[] } => {
    let entry = byDay.get(key)
    if (!entry) {
      entry = { work: new Map(), events: [] }
      byDay.set(key, entry)
    }
    return entry
  }
  const work = (key: string, taskId: number, name: string): ReviewPastItem => {
    const items = day(key).work
    let item = items.get(taskId)
    if (!item) {
      item = { kind: 'work', task_id: taskId, name, seconds: 0, done: false }
      items.set(taskId, item)
    }
    return item
  }

  const nowIso = now.toISOString()
  for (const span of listTimeEntriesInRange(db, start.toISOString(), nowIso, nowIso)) {
    const begin = Math.max(Date.parse(span.start_time), start.getTime())
    const end = Math.min(span.end_time ? Date.parse(span.end_time) : now.getTime(), now.getTime())
    if (end <= begin) continue
    work(localDateString(new Date(begin)), span.task_id, span.task_name).seconds += Math.round(
      (end - begin) / 1000
    )
  }

  const done = db
    .prepare(
      `SELECT id, name, status_changed_at FROM tasks
       WHERE status = 'finalizada' AND parent_task_id IS NULL AND status_changed_at IS NOT NULL
         AND julianday(status_changed_at) >= julianday(?) AND julianday(status_changed_at) <= julianday(?)`
    )
    .all(start.toISOString(), nowIso) as { id: number; name: string; status_changed_at: string }[]
  for (const task of done) {
    work(localDateString(parseSqlTime(task.status_changed_at)), task.id, task.name).done = true
  }

  for (const block of listTimeBlocksInRange(db, from, to)) {
    day(block.date).events.push({
      kind: 'event',
      task_id: block.task_id,
      name: block.task_name ?? '',
      seconds: (minutesOf(block.end_time) - minutesOf(block.start_time)) * 60,
      done: block.task_status === 'finalizada',
      time: block.start_time
    })
  }

  const days: ReviewPastDay[] = [...byDay.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, entry]) => ({
      day: key,
      items: [...entry.events, ...[...entry.work.values()].sort((a, b) => b.seconds - a.seconds)]
    }))
  return { from, to, days }
}
