import { DatabaseSync } from 'node:sqlite'
import { beforeEach, describe, expect, it } from 'vitest'
import type { SqliteLike } from './tagQueries'
import { ensureTaskNotesText, searchAll } from './searchQueries'

let raw: DatabaseSync
let db: SqliteLike

const doc = (text: string): string =>
  JSON.stringify({
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }]
  })

beforeEach(() => {
  raw = new DatabaseSync(':memory:')
  raw.exec(`
    CREATE TABLE tasks (
      id INTEGER PRIMARY KEY, name TEXT, description TEXT, notes TEXT, status TEXT DEFAULT 'inbox',
      is_archived INTEGER DEFAULT 0, updated_at TEXT DEFAULT '2026-11-01 10:00:00'
    );
    CREATE TABLE notebook_pages (
      id INTEGER PRIMARY KEY, title TEXT, search_text TEXT NOT NULL DEFAULT '',
      updated_at TEXT DEFAULT '2026-11-01 10:00:00'
    );
    CREATE TABLE task_history (
      id INTEGER PRIMARY KEY, task_id INTEGER, summary TEXT, done TEXT, remaining TEXT,
      created_at TEXT DEFAULT '2026-11-01 10:00:00'
    );
    CREATE TABLE projects (
      id INTEGER PRIMARY KEY, name TEXT, description TEXT, outcome TEXT, status TEXT DEFAULT 'active',
      updated_at TEXT DEFAULT '2026-11-01 10:00:00'
    );
  `)
  db = {
    prepare: (sql) => raw.prepare(sql) as unknown as ReturnType<SqliteLike['prepare']>,
    transaction: (fn) => fn
  }
})

function insertTask(id: number, name: string, extra: Record<string, string | number> = {}): void {
  const columns = ['id', 'name', ...Object.keys(extra)]
  raw
    .prepare(
      `INSERT INTO tasks (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`
    )
    .run(id, name, ...Object.values(extra))
}

describe('ensureTaskNotesText', () => {
  it('cria a coluna, preenche a partir das notas e não refaz na segunda vez', () => {
    insertTask(1, 'Com nota', { notes: doc('texto guardado na nota') })
    insertTask(2, 'Sem nota')
    insertTask(3, 'Nota legada', { notes: '{"blocks":[]}' })

    ensureTaskNotesText(db)
    const text = (id: number): unknown =>
      (raw.prepare('SELECT notes_text FROM tasks WHERE id = ?').get(id) as { notes_text: string })
        .notes_text
    expect(text(1)).toBe('texto guardado na nota')
    expect(text(2)).toBe('')
    expect(text(3)).toBe('')

    raw.exec("UPDATE tasks SET notes_text = 'mantido' WHERE id = 1")
    ensureTaskNotesText(db)
    expect(text(1)).toBe('mantido')
  })
})

describe('searchAll', () => {
  beforeEach(() => ensureTaskNotesText(db))

  it('acha a task pelo corpo da nota e devolve o trecho', () => {
    insertTask(1, 'Reunião', { notes_text: 'combinamos migrar o servidor em dezembro' })
    const [hit] = searchAll(db, 'servidor')
    expect(hit).toMatchObject({ kind: 'task', id: 1, title: 'Reunião', title_match: false })
    expect(hit.snippet).toContain('migrar o servidor em dezembro')
  })

  it('busca nas quatro fontes', () => {
    insertTask(1, 'Plano alfa', { description: 'nada' })
    raw.exec(`
      INSERT INTO notebook_pages (id, title, search_text) VALUES (5, 'Página', 'cita o alfa aqui');
      INSERT INTO task_history (id, task_id, summary, done) VALUES (7, 1, 'resumo', 'fechei o alfa');
      INSERT INTO projects (id, name, outcome) VALUES (9, 'Projeto', 'entregar o alfa');
    `)
    const hits = searchAll(db, 'alfa')
    expect(hits.map((hit) => hit.kind).sort()).toEqual(['history', 'page', 'project', 'task'])
    const history = hits.find((hit) => hit.kind === 'history')!
    expect(history).toMatchObject({ id: 7, task_id: 1, title: 'Plano alfa' })
    expect(history.snippet).toContain('fechei o alfa')
  })

  it('filtra por kinds', () => {
    insertTask(1, 'alfa')
    raw.exec("INSERT INTO projects (id, name) VALUES (9, 'alfa')")
    expect(searchAll(db, 'alfa', { kinds: ['project'] }).map((hit) => hit.kind)).toEqual([
      'project'
    ])
  })

  it('título que casa vem antes de corpo; depois, o mais recente', () => {
    insertTask(1, 'corpo antigo', { description: 'tem beta', updated_at: '2026-11-01 10:00:00' })
    insertTask(2, 'corpo novo', { description: 'tem beta', updated_at: '2026-11-10 10:00:00' })
    insertTask(3, 'beta no título', { updated_at: '2026-10-01 10:00:00' })
    raw.exec(
      "INSERT INTO notebook_pages (id, title, updated_at) VALUES (4, 'beta página', '2026-11-05 10:00:00')"
    )
    expect(searchAll(db, 'beta').map((hit) => `${hit.kind}:${hit.id}`)).toEqual([
      'page:4',
      'task:3',
      'task:2',
      'task:1'
    ])
  })

  it('trata % e _ como texto', () => {
    insertTask(1, 'desconto de 50% na loja')
    insertTask(2, 'desconto de 500 reais')
    insertTask(3, 'arquivo a_b.txt')
    insertTask(4, 'arquivo axb.txt')
    expect(searchAll(db, '50%').map((hit) => hit.id)).toEqual([1])
    expect(searchAll(db, 'a_b').map((hit) => hit.id)).toEqual([3])
  })

  it('respeita o limite e o teto', () => {
    for (let id = 1; id <= 60; id += 1) insertTask(id, `gama ${id}`)
    expect(searchAll(db, 'gama', { limit: 5 })).toHaveLength(5)
    expect(searchAll(db, 'gama')).toHaveLength(20)
    expect(searchAll(db, 'gama', { limit: 500 })).toHaveLength(50)
  })

  it('snippet no começo, no meio e no fim do texto', () => {
    const filler = 'palavra '.repeat(40).trim()
    insertTask(1, 'a', { notes_text: `delta ${filler}` })
    insertTask(2, 'b', { notes_text: `${filler} delta ${filler}` })
    insertTask(3, 'c', { notes_text: `${filler} delta` })
    const byId = new Map(searchAll(db, 'delta').map((hit) => [hit.id, hit.snippet]))
    expect(byId.get(1)).toMatch(/^delta .*…$/)
    expect(byId.get(2)).toMatch(/^….* delta .*…$/)
    expect(byId.get(3)).toMatch(/^….* delta$/)
  })

  it('deixa task arquivada (e o histórico dela) de fora por padrão', () => {
    insertTask(1, 'épsilon arquivada', { is_archived: 1 })
    raw.exec(
      "INSERT INTO task_history (id, task_id, summary) VALUES (7, 1, 'épsilon no histórico')"
    )
    expect(searchAll(db, 'épsilon')).toEqual([])
    expect(searchAll(db, 'épsilon', { includeArchived: true })).toHaveLength(2)
  })

  it('consulta vazia não busca nada', () => {
    insertTask(1, 'qualquer')
    expect(searchAll(db, '   ')).toEqual([])
  })
})
