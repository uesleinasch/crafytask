import type {
  AddTaskHistoryInput,
  TaskHistoryEntryKind,
  TaskHistoryItem,
  TaskHistoryOrigin
} from '@shared/types'
import type { SqliteLike, SqliteParam } from './tagQueries'

export const TASK_HISTORY_ENTRY_KINDS: readonly TaskHistoryEntryKind[] = [
  'checkpoint',
  'operation',
  'note'
]
export const TASK_HISTORY_TEXT_LIMIT = 4000
export const TASK_HISTORY_DEFAULT_LIMIT = 50
export const TASK_HISTORY_MAX_LIMIT = 200

export function ensureTaskHistorySchema(db: SqliteLike): void {
  db.prepare(
    `CREATE TABLE IF NOT EXISTS task_history (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       task_id INTEGER NOT NULL,
       kind TEXT NOT NULL CHECK (kind IN ('checkpoint', 'operation', 'note')),
       origin TEXT NOT NULL CHECK (origin IN ('app', 'mcp')),
       summary TEXT NOT NULL,
       done TEXT,
       remaining TEXT,
       task_status TEXT,
       created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
     )`
  ).run()
  db.prepare(
    'CREATE INDEX IF NOT EXISTS idx_task_history_task ON task_history(task_id, created_at)'
  ).run()
}

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed.slice(0, TASK_HISTORY_TEXT_LIMIT) : null
}

export function addTaskHistoryEntry(
  db: SqliteLike,
  input: AddTaskHistoryInput,
  origin: TaskHistoryOrigin
): number {
  const summary = clean(input.summary)
  if (!summary) throw new Error('O resumo da entrada de histórico não pode ser vazio.')
  const result = db
    .prepare(
      `INSERT INTO task_history (task_id, kind, origin, summary, done, remaining, task_status)
       SELECT id, ?, ?, ?, ?, ?, status FROM tasks WHERE id = ?`
    )
    .run(
      input.kind ?? 'checkpoint',
      origin,
      summary,
      clean(input.done),
      clean(input.remaining),
      input.task_id
    ) as { changes: number | bigint; lastInsertRowid: number | bigint }
  if (Number(result.changes) === 0) throw new Error(`Task ${input.task_id} não existe.`)
  return Number(result.lastInsertRowid)
}

export interface TaskHistoryQuery {
  taskId: number
  includeSubtasks?: boolean
  limit?: number
  before?: string
}

const SCOPE_SELF = 't.id = ?'
const SCOPE_WITH_SUBTASKS = '(t.id = ? OR t.parent_task_id = ?)'

export function listTaskHistory(db: SqliteLike, query: TaskHistoryQuery): TaskHistoryItem[] {
  const scope = query.includeSubtasks ? SCOPE_WITH_SUBTASKS : SCOPE_SELF
  const scopeParams: SqliteParam[] = query.includeSubtasks
    ? [query.taskId, query.taskId]
    : [query.taskId]
  const limit = Math.min(
    Math.max(1, Math.trunc(query.limit ?? TASK_HISTORY_DEFAULT_LIMIT)),
    TASK_HISTORY_MAX_LIMIT
  )
  const beforeClause = query.before ? 'WHERE created_at < ?' : ''
  const params: SqliteParam[] = [...scopeParams, ...scopeParams]
  if (query.before) params.push(query.before)
  params.push(limit)

  return db
    .prepare(
      `SELECT id, task_id, task_name, kind, origin, summary, done, remaining,
              from_status, to_status, created_at
       FROM (
         SELECT h.id AS id, h.task_id AS task_id, t.name AS task_name, h.kind AS kind,
                h.origin AS origin, h.summary AS summary, h.done AS done,
                h.remaining AS remaining, NULL AS from_status, h.task_status AS to_status,
                h.created_at AS created_at, 1 AS source_order
         FROM task_history h JOIN tasks t ON t.id = h.task_id
         WHERE ${scope}
         UNION ALL
         SELECT e.id, e.task_id, t.name, 'status', NULL, NULL, NULL, NULL,
                e.from_status, e.to_status, e.changed_at, 0
         FROM task_status_events e JOIN tasks t ON t.id = e.task_id
         WHERE ${scope}
       )
       ${beforeClause}
       ORDER BY created_at DESC, source_order DESC, id DESC
       LIMIT ?`
    )
    .all(...params) as TaskHistoryItem[]
}

export function getLastCheckpoint(
  db: SqliteLike,
  taskId: number,
  includeSubtasks = false
): TaskHistoryItem | null {
  const scope = includeSubtasks ? SCOPE_WITH_SUBTASKS : SCOPE_SELF
  const params: SqliteParam[] = includeSubtasks ? [taskId, taskId] : [taskId]
  const row = db
    .prepare(
      `SELECT h.id AS id, h.task_id AS task_id, t.name AS task_name, h.kind AS kind,
              h.origin AS origin, h.summary AS summary, h.done AS done,
              h.remaining AS remaining, NULL AS from_status, h.task_status AS to_status,
              h.created_at AS created_at
       FROM task_history h JOIN tasks t ON t.id = h.task_id
       WHERE h.kind = 'checkpoint' AND ${scope}
       ORDER BY h.created_at DESC, h.id DESC
       LIMIT 1`
    )
    .get(...params)
  return (row as TaskHistoryItem | undefined) ?? null
}

export function lastCheckpointsFor(
  db: SqliteLike,
  taskIds: number[]
): Map<number, TaskHistoryItem> {
  const ids = [...new Set(taskIds)]
  if (ids.length === 0) return new Map()
  const rows = db
    .prepare(
      `SELECT h.id AS id, h.task_id AS task_id, t.name AS task_name, h.kind AS kind,
              h.origin AS origin, h.summary AS summary, h.done AS done,
              h.remaining AS remaining, NULL AS from_status, h.task_status AS to_status,
              h.created_at AS created_at
       FROM task_history h JOIN tasks t ON t.id = h.task_id
       WHERE h.task_id IN (${ids.map(() => '?').join(', ')})
         AND h.id = (
           SELECT last.id FROM task_history last
           WHERE last.task_id = h.task_id AND last.kind = 'checkpoint'
           ORDER BY last.created_at DESC, last.id DESC
           LIMIT 1
         )`
    )
    .all(...ids) as TaskHistoryItem[]
  return new Map(rows.map((row) => [row.task_id, row]))
}
