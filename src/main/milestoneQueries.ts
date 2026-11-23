import type {
  CreateMilestoneInput,
  MilestoneKind,
  ProjectMilestone,
  UpdateMilestoneInput
} from '@shared/types'
import type { SqliteLike, SqliteParam } from './tagQueries'

export const MILESTONE_KINDS: readonly MilestoneKind[] = ['inicio', 'desenvolvimento', 'fim']
export const MILESTONE_NAME_LIMIT = 120
export const MILESTONE_DESCRIPTION_LIMIT = 2000

const SINGLE_KINDS: readonly MilestoneKind[] = ['inicio', 'fim']
const KIND_LABEL: Record<MilestoneKind, string> = {
  inicio: 'início',
  desenvolvimento: 'desenvolvimento',
  fim: 'fim'
}

export function ensureMilestoneSchema(db: SqliteLike): void {
  db.prepare(
    `CREATE TABLE IF NOT EXISTS project_milestones (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       project_id INTEGER NOT NULL,
       name TEXT NOT NULL,
       kind TEXT NOT NULL CHECK (kind IN ('inicio', 'desenvolvimento', 'fim')),
       due_date TEXT,
       description TEXT,
       done_at TEXT,
       created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
       updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
     )`
  ).run()
  db.prepare(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_project_milestones_single_kind
       ON project_milestones(project_id, kind) WHERE kind IN ('inicio', 'fim')`
  ).run()
  const columns = db.prepare("PRAGMA table_info('tasks')").all() as { name: string }[]
  if (!columns.some((column) => column.name === 'milestone_id')) {
    db.prepare(
      'ALTER TABLE tasks ADD COLUMN milestone_id INTEGER REFERENCES project_milestones(id) ON DELETE SET NULL'
    ).run()
  }
  db.prepare('CREATE INDEX IF NOT EXISTS idx_tasks_milestone ON tasks(milestone_id)').run()
  db.prepare(
    `CREATE TRIGGER IF NOT EXISTS tasks_milestone_follows_project
     AFTER UPDATE OF project_id ON tasks
     WHEN NEW.milestone_id IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM project_milestones m
       WHERE m.id = NEW.milestone_id AND m.project_id IS NEW.project_id
     )
     BEGIN
       UPDATE tasks SET milestone_id = NULL WHERE id = NEW.id;
     END`
  ).run()
}

const MILESTONE_COLUMNS = `
  m.id, m.project_id, m.name, m.kind, m.due_date, m.description, m.done_at,
  m.created_at, m.updated_at,
  (SELECT COUNT(*) FROM tasks t WHERE t.milestone_id = m.id AND t.is_archived = 0) AS task_count,
  (SELECT COUNT(*) FROM tasks t
     WHERE t.milestone_id = m.id AND t.is_archived = 0 AND t.status = 'finalizada') AS done_task_count`

const MILESTONE_ORDER = `
  CASE m.kind WHEN 'inicio' THEN 0 WHEN 'desenvolvimento' THEN 1 ELSE 2 END,
  m.due_date IS NULL, m.due_date, m.id`

export function listMilestones(db: SqliteLike, projectId: number): ProjectMilestone[] {
  return db
    .prepare(
      `SELECT ${MILESTONE_COLUMNS} FROM project_milestones m
       WHERE m.project_id = ? ORDER BY ${MILESTONE_ORDER}`
    )
    .all(projectId) as ProjectMilestone[]
}

export function getMilestone(db: SqliteLike, id: number): ProjectMilestone | null {
  const row = db
    .prepare(`SELECT ${MILESTONE_COLUMNS} FROM project_milestones m WHERE m.id = ?`)
    .get(id)
  return (row as ProjectMilestone | undefined) ?? null
}

function cleanName(value: string): string {
  const name = value.trim().slice(0, MILESTONE_NAME_LIMIT)
  if (!name) throw new Error('O marco precisa de um nome.')
  return name
}

function cleanDescription(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed.slice(0, MILESTONE_DESCRIPTION_LIMIT) : null
}

function cleanDate(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Data do marco deve ser AAAA-MM-DD.')
  return value
}

function checkKind(kind: string): MilestoneKind {
  if (!MILESTONE_KINDS.includes(kind as MilestoneKind)) {
    throw new Error('Tipo do marco deve ser inicio, desenvolvimento ou fim.')
  }
  return kind as MilestoneKind
}

function assertSingleKindFree(
  db: SqliteLike,
  projectId: number,
  kind: MilestoneKind,
  exceptId: number | null
): void {
  if (!SINGLE_KINDS.includes(kind)) return
  const taken = db
    .prepare('SELECT id FROM project_milestones WHERE project_id = ? AND kind = ? AND id IS NOT ?')
    .get(projectId, kind, exceptId)
  if (taken) throw new Error(`O projeto já tem um marco de ${KIND_LABEL[kind]}.`)
}

export function createMilestone(db: SqliteLike, input: CreateMilestoneInput): ProjectMilestone {
  const kind = checkKind(input.kind)
  const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(input.project_id)
  if (!project) throw new Error(`Projeto ${input.project_id} não existe.`)
  assertSingleKindFree(db, input.project_id, kind, null)
  const result = db
    .prepare(
      `INSERT INTO project_milestones (project_id, name, kind, due_date, description)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      input.project_id,
      cleanName(input.name),
      kind,
      cleanDate(input.due_date),
      cleanDescription(input.description)
    ) as { lastInsertRowid: number | bigint }
  return getMilestone(db, Number(result.lastInsertRowid)) as ProjectMilestone
}

function requireMilestone(db: SqliteLike, id: number): ProjectMilestone {
  const milestone = getMilestone(db, id)
  if (!milestone) throw new Error(`Marco ${id} não existe.`)
  return milestone
}

export function updateMilestone(
  db: SqliteLike,
  id: number,
  patch: UpdateMilestoneInput
): ProjectMilestone {
  const current = requireMilestone(db, id)
  const sets: string[] = []
  const values: SqliteParam[] = []
  if (patch.name !== undefined) {
    sets.push('name = ?')
    values.push(cleanName(patch.name))
  }
  if (patch.kind !== undefined) {
    const kind = checkKind(patch.kind)
    assertSingleKindFree(db, current.project_id, kind, id)
    sets.push('kind = ?')
    values.push(kind)
  }
  if (patch.due_date !== undefined) {
    sets.push('due_date = ?')
    values.push(cleanDate(patch.due_date))
  }
  if (patch.description !== undefined) {
    sets.push('description = ?')
    values.push(cleanDescription(patch.description))
  }
  if (sets.length > 0) {
    db.prepare(
      `UPDATE project_milestones SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).run(...values, id)
  }
  return requireMilestone(db, id)
}

export function setMilestoneDone(db: SqliteLike, id: number, done: boolean): ProjectMilestone {
  requireMilestone(db, id)
  db.prepare(
    `UPDATE project_milestones
     SET done_at = ${done ? "COALESCE(done_at, strftime('%Y-%m-%d %H:%M:%S', 'now'))" : 'NULL'},
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(id)
  return requireMilestone(db, id)
}

export function milestoneTaskIds(db: SqliteLike, id: number): number[] {
  return (
    db.prepare('SELECT id FROM tasks WHERE milestone_id = ?').all(id) as { id: number }[]
  ).map((row) => row.id)
}

export function deleteMilestone(db: SqliteLike, id: number): void {
  requireMilestone(db, id)
  db.prepare('UPDATE tasks SET milestone_id = NULL WHERE milestone_id = ?').run(id)
  db.prepare('DELETE FROM project_milestones WHERE id = ?').run(id)
}

export function setTaskMilestone(db: SqliteLike, taskId: number, milestoneId: number | null): void {
  const task = db.prepare('SELECT project_id FROM tasks WHERE id = ?').get(taskId) as
    | { project_id: number | null }
    | undefined
  if (!task) throw new Error(`Task ${taskId} não existe.`)
  if (milestoneId !== null) {
    const milestone = requireMilestone(db, milestoneId)
    if (milestone.project_id !== task.project_id) {
      throw new Error('O marco precisa ser do mesmo projeto da task.')
    }
  }
  db.prepare('UPDATE tasks SET milestone_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
    milestoneId,
    taskId
  )
}
