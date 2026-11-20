import type { ReviewHealthIndicators } from '@shared/types'
import { HEALTH_LIMITS, calendarDaysSince } from '@shared/healthLimits'
import { localDateString } from '@shared/dueState'
import type { SqliteLike, SqliteParam } from './tagQueries'
import { PROJECT_ACTIVITY_JULIAN } from './projectQueries'

const DAY_MS = 24 * 60 * 60 * 1000
const INBOX_RATE_DAYS = 7

export function ensureStatusChangedAt(db: SqliteLike): void {
  const columns = db.prepare("PRAGMA table_info('tasks')").all() as { name: string }[]
  if (!columns.some((column) => column.name === 'status_changed_at')) {
    db.prepare('ALTER TABLE tasks ADD COLUMN status_changed_at DATETIME').run()
    db.prepare(
      'UPDATE tasks SET status_changed_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)'
    ).run()
  }
  db.prepare(
    `CREATE TRIGGER IF NOT EXISTS tasks_status_changed_at_insert AFTER INSERT ON tasks
     WHEN NEW.status_changed_at IS NULL
     BEGIN
       UPDATE tasks SET status_changed_at = COALESCE(NEW.created_at, CURRENT_TIMESTAMP)
       WHERE id = NEW.id;
     END`
  ).run()
  db.prepare(
    `CREATE TRIGGER IF NOT EXISTS tasks_status_changed_at_update AFTER UPDATE OF status ON tasks
     WHEN NEW.status IS NOT OLD.status
     BEGIN
       UPDATE tasks SET status_changed_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
     END`
  ).run()
  db.prepare(
    `CREATE TABLE IF NOT EXISTS task_status_events (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       task_id INTEGER NOT NULL,
       from_status TEXT,
       to_status TEXT NOT NULL,
       changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
     )`
  ).run()
  db.prepare(
    'CREATE INDEX IF NOT EXISTS idx_task_status_events_changed ON task_status_events(changed_at)'
  ).run()
  db.prepare(
    `CREATE TRIGGER IF NOT EXISTS tasks_status_event_insert AFTER INSERT ON tasks
     BEGIN
       INSERT INTO task_status_events (task_id, from_status, to_status)
       VALUES (NEW.id, NULL, NEW.status);
     END`
  ).run()
  db.prepare(
    `CREATE TRIGGER IF NOT EXISTS tasks_status_event_update AFTER UPDATE OF status ON tasks
     WHEN NEW.status IS NOT OLD.status
     BEGIN
       INSERT INTO task_status_events (task_id, from_status, to_status)
       VALUES (NEW.id, OLD.status, NEW.status);
     END`
  ).run()
}

function sqlUtc(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ')
}

function count(db: SqliteLike, sql: string, ...params: SqliteParam[]): number {
  return (db.prepare(sql).get(...params) as { n: number }).n
}

const OPEN = "status <> 'finalizada' AND COALESCE(is_archived, 0) = 0"
const TOP = 'parent_task_id IS NULL'
const CHANGED = 'julianday(COALESCE(status_changed_at, updated_at))'

export function healthIndicatorsQuery(db: SqliteLike, now: Date): ReviewHealthIndicators {
  const cutoff = (days: number): string => sqlUtc(new Date(now.getTime() - days * DAY_MS))

  const inbox = db
    .prepare(
      `SELECT COUNT(*) AS n, MIN(COALESCE(status_changed_at, created_at)) AS oldest FROM tasks
       WHERE status = 'inbox' AND COALESCE(is_archived, 0) = 0 AND parent_task_id IS NULL`
    )
    .get() as { n: number; oldest: string | null }

  const lastReview = db
    .prepare(
      `SELECT completed_at FROM weekly_reviews WHERE completed_at IS NOT NULL
       ORDER BY julianday(completed_at) DESC LIMIT 1`
    )
    .get() as { completed_at: string } | undefined

  const processedWeek = count(
    db,
    `SELECT COUNT(DISTINCT e.task_id) AS n FROM task_status_events e
     JOIN tasks t ON t.id = e.task_id
     WHERE e.from_status = 'inbox' AND t.parent_task_id IS NULL
       AND julianday(e.changed_at) >= julianday(?)`,
    cutoff(INBOX_RATE_DAYS)
  )
  const passedThrough = processedWeek + inbox.n

  return {
    inboxCount: inbox.n,
    oldestInboxDays: inbox.oldest ? calendarDaysSince(inbox.oldest, now) : null,
    projectsWithoutNextAction: count(
      db,
      `SELECT COUNT(*) AS n FROM projects p
       WHERE p.status = 'active'
         AND EXISTS (SELECT 1 FROM tasks t WHERE t.project_id = p.id AND t.${OPEN})
         AND NOT EXISTS (
           SELECT 1 FROM tasks c WHERE c.id = p.next_task_id AND c.project_id = p.id AND c.${OPEN}
         )
         AND NOT EXISTS (
           SELECT 1 FROM tasks n WHERE n.project_id = p.id AND n.status = 'proximas'
             AND COALESCE(n.is_archived, 0) = 0
         )`
    ),
    stalledProjects: count(
      db,
      `SELECT COUNT(*) AS n FROM projects p
       WHERE p.status = 'active' AND ${PROJECT_ACTIVITY_JULIAN} < julianday(?)`,
      cutoff(HEALTH_LIMITS.stalledProjectDays)
    ),
    staleWaitingTasks: count(
      db,
      `SELECT COUNT(*) AS n FROM tasks WHERE status = 'aguardando' AND ${TOP}
       AND COALESCE(is_archived, 0) = 0 AND ${CHANGED} < julianday(?)`,
      cutoff(HEALTH_LIMITS.waitingDays)
    ),
    staleNextTasks: count(
      db,
      `SELECT COUNT(*) AS n FROM tasks WHERE status = 'proximas' AND ${TOP}
       AND COALESCE(is_archived, 0) = 0 AND ${CHANGED} < julianday(?)`,
      cutoff(HEALTH_LIMITS.nextDays)
    ),
    overdueTasks: count(
      db,
      `SELECT COUNT(*) AS n FROM tasks
       WHERE ${OPEN} AND ${TOP} AND due_date IS NOT NULL AND due_date < ?`,
      localDateString(now)
    ),
    somedayCount: count(
      db,
      "SELECT COUNT(*) AS n FROM tasks WHERE status = 'someday' AND COALESCE(is_archived, 0) = 0 AND parent_task_id IS NULL"
    ),
    daysSinceLastReview: lastReview ? calendarDaysSince(lastReview.completed_at, now) : null,
    inboxProcessedWeek: processedWeek,
    inboxProcessedRate: passedThrough > 0 ? Math.round((processedWeek / passedThrough) * 100) : null
  }
}
