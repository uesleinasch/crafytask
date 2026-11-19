import type { ReviewHealthIndicators } from '@shared/types'
import { HEALTH_LIMITS, calendarDaysSince } from '@shared/healthLimits'
import { localDateString } from '@shared/dueState'
import type { SqliteLike, SqliteParam } from './tagQueries'
import { PROJECT_ACTIVITY_JULIAN } from './projectQueries'

const DAY_MS = 24 * 60 * 60 * 1000

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
    daysSinceLastReview: lastReview ? calendarDaysSince(lastReview.completed_at, now) : null
  }
}
