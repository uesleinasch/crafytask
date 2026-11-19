import type { TimeEntrySpan } from '@shared/types'
import type { SqliteLike } from './tagQueries'

interface EntryRow {
  task_id: number
  start_time: string
  end_time: string | null
  duration_seconds: number | null
  jira_worklog_id: string | null
}

export interface TimeEntryChange {
  taskId: number
  worklogId: string | null
}

export function sessionDuration(startIso: string, endIso: string): number {
  const start = Date.parse(startIso)
  const end = Date.parse(endIso)
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new Error('Data inválida para a sessão.')
  }
  if (end <= start) throw new Error('O fim precisa ser depois do início.')
  return Math.round((end - start) / 1000)
}

function closedEntry(db: SqliteLike, id: number): EntryRow {
  const row = db
    .prepare(
      `SELECT task_id, start_time, end_time, duration_seconds, jira_worklog_id
       FROM time_entries WHERE id = ?`
    )
    .get(id) as EntryRow | undefined
  if (!row) throw new Error('Sessão não encontrada.')
  if (row.end_time === null) throw new Error('Pare o timer antes de mexer na sessão em andamento.')
  return row
}

function shiftTotal(db: SqliteLike, taskId: number, delta: number): void {
  db.prepare(
    `UPDATE tasks SET total_seconds = MAX(0, total_seconds + ?), updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(delta, taskId)
}

export function updateTimeEntry(
  db: SqliteLike,
  id: number,
  startIso: string,
  endIso: string
): TimeEntryChange {
  const duration = sessionDuration(startIso, endIso)
  let change!: TimeEntryChange
  db.transaction(() => {
    const row = closedEntry(db, id)
    db.prepare(
      `UPDATE time_entries SET start_time = ?, end_time = ?, duration_seconds = ? WHERE id = ?`
    ).run(startIso, endIso, duration, id)
    shiftTotal(db, row.task_id, duration - (row.duration_seconds ?? 0))
    change = { taskId: row.task_id, worklogId: row.jira_worklog_id }
  })()
  return change
}

export function deleteTimeEntry(db: SqliteLike, id: number): TimeEntryChange {
  let change!: TimeEntryChange
  db.transaction(() => {
    const row = closedEntry(db, id)
    db.prepare('DELETE FROM time_entries WHERE id = ?').run(id)
    shiftTotal(db, row.task_id, -(row.duration_seconds ?? 0))
    change = { taskId: row.task_id, worklogId: row.jira_worklog_id }
  })()
  return change
}

export function listTimeEntriesInRange(
  db: SqliteLike,
  fromIso: string,
  toIso: string,
  nowIso: string
): TimeEntrySpan[] {
  const from = Date.parse(fromIso)
  const to = Date.parse(toIso)
  if (!Number.isFinite(from) || !Number.isFinite(to) || !Number.isFinite(Date.parse(nowIso))) {
    throw new Error('Intervalo inválido.')
  }
  if (to <= from) throw new Error('O fim do intervalo precisa ser depois do início.')
  return db
    .prepare(
      `SELECT te.id, te.task_id, te.start_time, te.end_time, te.duration_seconds,
         t.name AS task_name, t.category AS task_category, p.color AS project_color
       FROM time_entries te
       JOIN tasks t ON t.id = te.task_id
       LEFT JOIN projects p ON p.id = t.project_id
       WHERE julianday(te.start_time) < julianday(?)
         AND julianday(COALESCE(te.end_time, ?)) > julianday(?)
         AND (te.end_time IS NULL OR julianday(te.end_time) > julianday(te.start_time))
       ORDER BY julianday(te.start_time), te.id`
    )
    .all(new Date(to).toISOString(), nowIso, new Date(from).toISOString()) as TimeEntrySpan[]
}
