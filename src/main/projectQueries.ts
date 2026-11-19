import type { Project, ProjectStatus } from '@shared/types'
import type { SqliteLike } from './tagQueries'

const PROJECT_SELECT = `
  SELECT p.*, a.name AS area_name,
    COALESCE(s.task_count, 0) AS task_count,
    COALESCE(s.completed_task_count, 0) AS completed_task_count,
    COALESCE(s.total_seconds, 0) AS total_seconds,
    (SELECT n.id FROM tasks n WHERE n.project_id = p.id AND n.status = 'proximas'
      ORDER BY n.updated_at DESC, n.id DESC LIMIT 1) AS next_action_id,
    (SELECT n.name FROM tasks n WHERE n.project_id = p.id AND n.status = 'proximas'
      ORDER BY n.updated_at DESC, n.id DESC LIMIT 1) AS next_action
  FROM projects p
  LEFT JOIN areas a ON a.id = p.area_id
  LEFT JOIN (
    SELECT project_id,
      COUNT(*) AS task_count,
      SUM(CASE WHEN status = 'finalizada' THEN 1 ELSE 0 END) AS completed_task_count,
      SUM(COALESCE(total_seconds, 0)) AS total_seconds
    FROM tasks
    WHERE project_id IS NOT NULL
    GROUP BY project_id
  ) s ON s.project_id = p.id`

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
