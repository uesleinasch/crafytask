import type { Project, ProjectStatus } from '@shared/types'
import type { SqliteLike } from './tagQueries'

export const PROJECT_ACTIVITY_JULIAN = `MAX(
    COALESCE(julianday(p.created_at), 0),
    COALESCE((
      SELECT MAX(CASE WHEN e.end_time IS NULL THEN julianday('now') ELSE julianday(e.end_time) END)
      FROM time_entries e JOIN tasks te ON te.id = e.task_id
      WHERE te.project_id = p.id
    ), 0),
    COALESCE((
      SELECT MAX(julianday(COALESCE(tf.status_changed_at, tf.updated_at)))
      FROM tasks tf WHERE tf.project_id = p.id AND tf.status = 'finalizada'
    ), 0)
  )`

const PROJECT_SELECT = `
  SELECT p.*, a.name AS area_name, g.name AS goal_name,
    COALESCE(s.task_count, 0) AS task_count,
    COALESCE(s.completed_task_count, 0) AS completed_task_count,
    COALESCE(s.open_task_count, 0) AS open_task_count,
    COALESCE(s.total_seconds, 0) AS total_seconds,
    COALESCE(c.id, d.id) AS next_action_id,
    COALESCE(c.name, d.name) AS next_action,
    datetime(${PROJECT_ACTIVITY_JULIAN}) AS last_activity_at
  FROM projects p
  LEFT JOIN areas a ON a.id = p.area_id
  LEFT JOIN goals g ON g.id = p.goal_id
  LEFT JOIN (
    SELECT project_id,
      COUNT(*) AS task_count,
      SUM(CASE WHEN status = 'finalizada' THEN 1 ELSE 0 END) AS completed_task_count,
      SUM(CASE WHEN status <> 'finalizada' AND COALESCE(is_archived, 0) = 0 THEN 1 ELSE 0 END)
        AS open_task_count,
      SUM(COALESCE(total_seconds, 0)) AS total_seconds
    FROM tasks
    WHERE project_id IS NOT NULL
    GROUP BY project_id
  ) s ON s.project_id = p.id
  LEFT JOIN tasks c ON c.id = p.next_task_id AND c.project_id = p.id
    AND c.status <> 'finalizada' AND COALESCE(c.is_archived, 0) = 0
  LEFT JOIN tasks d ON d.id = (
    SELECT n.id FROM tasks n
    WHERE n.project_id = p.id AND n.status = 'proximas' AND COALESCE(n.is_archived, 0) = 0
    ORDER BY n.updated_at DESC, n.id DESC LIMIT 1
  )`

type ProjectRow = Project & { next_action: string | null; next_action_id: number | null }

function normalize(row: ProjectRow): Project {
  return {
    ...row,
    next_action: row.next_action ?? undefined,
    next_action_id: row.next_action_id ?? undefined
  }
}

export function listProjectsQuery(db: SqliteLike, status?: ProjectStatus): Project[] {
  const rows = status
    ? db.prepare(`${PROJECT_SELECT} WHERE p.status = ? ORDER BY p.updated_at DESC`).all(status)
    : db.prepare(`${PROJECT_SELECT} ORDER BY p.updated_at DESC`).all()
  return (rows as ProjectRow[]).map(normalize)
}

export function getProjectQuery(db: SqliteLike, id: number): Project | undefined {
  const row = db.prepare(`${PROJECT_SELECT} WHERE p.id = ?`).get(id) as ProjectRow | undefined
  return row ? normalize(row) : undefined
}
