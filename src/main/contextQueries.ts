import { OPEN_COUNT, type SqliteLike } from './tagQueries'

export interface ContextUsageRow {
  id: number
  name: string
  icon: string
  color: string
  created_at: string
  task_count: number
  open_count: number
}

export function listContextsWithUsage(db: SqliteLike): ContextUsageRow[] {
  return db
    .prepare(
      `
    SELECT c.id, c.name, c.icon, c.color, c.created_at,
      COUNT(tk.id) AS task_count,
      ${OPEN_COUNT} AS open_count
    FROM contexts c
    LEFT JOIN task_contexts tc ON tc.context_id = c.id
    LEFT JOIN tasks tk ON tk.id = tc.task_id
    GROUP BY c.id
    ORDER BY c.name COLLATE NOCASE ASC
  `
    )
    .all() as ContextUsageRow[]
}

export function listTaskIdsWithContext(db: SqliteLike, contextId: number): number[] {
  const rows = db
    .prepare('SELECT task_id FROM task_contexts WHERE context_id = ? ORDER BY task_id')
    .all(contextId) as { task_id: number }[]
  return rows.map((row) => row.task_id)
}

export function assertContextNameFree(db: SqliteLike, name: string, exceptId?: number): void {
  const clash = db
    .prepare('SELECT id FROM contexts WHERE name = ? COLLATE NOCASE AND id != ?')
    .get(name.trim(), exceptId ?? -1)
  if (clash) {
    throw new Error(`Já existe um contexto chamado "${name.trim()}". Use mesclar para uni-los.`)
  }
}

export function mergeContexts(db: SqliteLike, sourceId: number, targetId: number): number[] {
  if (sourceId === targetId) {
    throw new Error('Não é possível mesclar um contexto com ele mesmo.')
  }
  if (!db.prepare('SELECT id FROM contexts WHERE id = ?').get(sourceId)) {
    throw new Error('Contexto de origem não encontrado.')
  }
  if (!db.prepare('SELECT id FROM contexts WHERE id = ?').get(targetId)) {
    throw new Error('Contexto de destino não encontrado.')
  }

  const affected = listTaskIdsWithContext(db, sourceId)

  db.transaction(() => {
    db.prepare(
      `
      INSERT OR IGNORE INTO task_contexts (task_id, context_id)
      SELECT task_id, ? FROM task_contexts WHERE context_id = ?
    `
    ).run(targetId, sourceId)
    db.prepare('DELETE FROM task_contexts WHERE context_id = ?').run(sourceId)
    db.prepare('DELETE FROM contexts WHERE id = ?').run(sourceId)
  })()

  return affected
}
