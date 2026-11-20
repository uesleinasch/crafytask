import { mergeAppPrefs, sanitizeAppPrefs, type AppPrefs } from '@shared/appPrefs'
import {
  mergeWorkflowPrefs,
  sanitizeWorkflowPrefs,
  type WorkflowPrefs
} from '@shared/workflowPrefs'
import type { SqliteLike } from './tagQueries'

export function ensurePrefsSchema(db: SqliteLike): void {
  db.prepare(
    'CREATE TABLE IF NOT EXISTS app_prefs (key TEXT PRIMARY KEY, value TEXT NOT NULL)'
  ).run()
}

function readRaw(db: SqliteLike, key: string): unknown {
  const row = db.prepare('SELECT value FROM app_prefs WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  if (!row) return null
  try {
    return JSON.parse(row.value)
  } catch {
    return null
  }
}

function writeRaw(db: SqliteLike, key: string, value: unknown): void {
  db.prepare(
    'INSERT INTO app_prefs (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, JSON.stringify(value))
}

export function readWorkflowPrefs(db: SqliteLike): WorkflowPrefs {
  return sanitizeWorkflowPrefs(readRaw(db, 'workflow'))
}

export function writeWorkflowPrefs(db: SqliteLike, patch: unknown): WorkflowPrefs {
  const next = mergeWorkflowPrefs(readWorkflowPrefs(db), patch)
  writeRaw(db, 'workflow', next)
  return next
}

export function readAppPrefs(db: SqliteLike): AppPrefs {
  return sanitizeAppPrefs(readRaw(db, 'app'))
}

export function writeAppPrefs(db: SqliteLike, patch: unknown): AppPrefs {
  const next = mergeAppPrefs(readAppPrefs(db), patch)
  writeRaw(db, 'app', next)
  return next
}
