import {
  mergeWorkflowPrefs,
  sanitizeWorkflowPrefs,
  type WorkflowPrefs
} from '@shared/workflowPrefs'
import type { SqliteLike } from './tagQueries'

const WORKFLOW_KEY = 'workflow'

export function ensurePrefsSchema(db: SqliteLike): void {
  db.prepare(
    'CREATE TABLE IF NOT EXISTS app_prefs (key TEXT PRIMARY KEY, value TEXT NOT NULL)'
  ).run()
}

export function readWorkflowPrefs(db: SqliteLike): WorkflowPrefs {
  const row = db.prepare('SELECT value FROM app_prefs WHERE key = ?').get(WORKFLOW_KEY) as
    | { value: string }
    | undefined
  if (!row) return sanitizeWorkflowPrefs(null)
  try {
    return sanitizeWorkflowPrefs(JSON.parse(row.value))
  } catch {
    return sanitizeWorkflowPrefs(null)
  }
}

export function writeWorkflowPrefs(db: SqliteLike, patch: unknown): WorkflowPrefs {
  const next = mergeWorkflowPrefs(readWorkflowPrefs(db), patch)
  db.prepare(
    'INSERT INTO app_prefs (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(WORKFLOW_KEY, JSON.stringify(next))
  return next
}
