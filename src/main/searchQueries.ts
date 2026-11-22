import { notesPlainText, searchSnippet } from './notesPlainText'
import type { SqliteLike } from './tagQueries'

export const SEARCH_KINDS = ['task', 'page', 'history', 'project'] as const
export type SearchKind = (typeof SEARCH_KINDS)[number]

export const SEARCH_DEFAULT_LIMIT = 20
export const SEARCH_MAX_LIMIT = 50

export interface SearchResult {
  kind: SearchKind
  id: number
  title: string
  snippet: string
  updated_at: string
  title_match: boolean
  task_id?: number
  status?: string
}

export interface SearchOptions {
  kinds?: readonly SearchKind[]
  limit?: number
  includeArchived?: boolean
}

export function ensureTaskNotesText(db: SqliteLike): void {
  const columns = db.prepare("PRAGMA table_info('tasks')").all() as { name: string }[]
  if (columns.some((column) => column.name === 'notes_text')) return
  db.prepare("ALTER TABLE tasks ADD COLUMN notes_text TEXT NOT NULL DEFAULT ''").run()
  const rows = db.prepare('SELECT id, notes FROM tasks WHERE notes IS NOT NULL').all() as {
    id: number
    notes: string
  }[]
  const update = db.prepare('UPDATE tasks SET notes_text = ? WHERE id = ?')
  db.transaction(() => {
    for (const row of rows) {
      const text = notesPlainText(row.notes)
      if (text) update.run(text, row.id)
    }
  })()
}

function likePattern(query: string): string {
  return `%${query.replace(/[\\%_]/g, (char) => `\\${char}`)}%`
}

interface Row {
  id: number
  title: string
  body: string | null
  updated_at: string
  title_match: number
  task_id?: number
  status?: string
}

const QUERIES: Record<SearchKind, (archived: boolean) => string> = {
  task: (archived) => `
    SELECT t.id AS id, t.name AS title,
           COALESCE(t.description, '') || char(10) || t.notes_text AS body,
           t.updated_at AS updated_at, t.name LIKE ? ESCAPE '\\' AS title_match,
           t.status AS status
    FROM tasks t
    WHERE (t.name LIKE ? ESCAPE '\\' OR t.description LIKE ? ESCAPE '\\'
           OR t.notes_text LIKE ? ESCAPE '\\')
      ${archived ? '' : 'AND t.is_archived = 0'}
    ORDER BY title_match DESC, t.updated_at DESC, t.id DESC
    LIMIT ?`,
  page: () => `
    SELECT p.id AS id, p.title AS title, p.search_text AS body, p.updated_at AS updated_at,
           p.title LIKE ? ESCAPE '\\' AS title_match
    FROM notebook_pages p
    WHERE p.title LIKE ? ESCAPE '\\' OR p.search_text LIKE ? ESCAPE '\\'
    ORDER BY title_match DESC, p.updated_at DESC, p.id DESC
    LIMIT ?`,
  history: (archived) => `
    SELECT h.id AS id, t.name AS title,
           h.summary || char(10) || COALESCE(h.done, '') || char(10) || COALESCE(h.remaining, '')
             AS body,
           h.created_at AS updated_at, 0 AS title_match, h.task_id AS task_id
    FROM task_history h JOIN tasks t ON t.id = h.task_id
    WHERE (h.summary LIKE ? ESCAPE '\\' OR h.done LIKE ? ESCAPE '\\'
           OR h.remaining LIKE ? ESCAPE '\\')
      ${archived ? '' : 'AND t.is_archived = 0'}
    ORDER BY h.created_at DESC, h.id DESC
    LIMIT ?`,
  project: () => `
    SELECT p.id AS id, p.name AS title,
           COALESCE(p.description, '') || char(10) || COALESCE(p.outcome, '') AS body,
           p.updated_at AS updated_at, p.name LIKE ? ESCAPE '\\' AS title_match,
           p.status AS status
    FROM projects p
    WHERE p.name LIKE ? ESCAPE '\\' OR p.description LIKE ? ESCAPE '\\'
          OR p.outcome LIKE ? ESCAPE '\\'
    ORDER BY title_match DESC, p.updated_at DESC, p.id DESC
    LIMIT ?`
}

const LIKE_COUNT: Record<SearchKind, number> = { task: 4, page: 3, history: 3, project: 4 }

/** Título que casa vem antes de corpo; depois, o mais recente. */
export function searchAll(
  db: SqliteLike,
  query: string,
  options: SearchOptions = {}
): SearchResult[] {
  const q = query.trim()
  if (!q) return []
  const limit = Math.min(
    Math.max(1, Math.trunc(options.limit ?? SEARCH_DEFAULT_LIMIT)),
    SEARCH_MAX_LIMIT
  )
  const kinds = options.kinds?.length ? [...new Set(options.kinds)] : SEARCH_KINDS
  const like = likePattern(q)

  const results: SearchResult[] = []
  for (const kind of kinds) {
    const params = [...Array<string>(LIKE_COUNT[kind]).fill(like), limit]
    const rows = db.prepare(QUERIES[kind](options.includeArchived ?? false)).all(...params) as Row[]
    for (const row of rows) {
      results.push({
        kind,
        id: row.id,
        title: row.title,
        snippet: searchSnippet(row.body ?? '', q),
        updated_at: row.updated_at,
        title_match: Boolean(row.title_match),
        ...(row.task_id !== undefined && { task_id: row.task_id }),
        ...(row.status && { status: row.status })
      })
    }
  }

  return results
    .sort(
      (a, b) =>
        Number(b.title_match) - Number(a.title_match) ||
        b.updated_at.localeCompare(a.updated_at) ||
        b.id - a.id
    )
    .slice(0, limit)
}
