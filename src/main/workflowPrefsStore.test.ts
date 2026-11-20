import { DatabaseSync } from 'node:sqlite'
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_APP_PREFS } from '@shared/appPrefs'
import { DEFAULT_WORKFLOW_PREFS } from '@shared/workflowPrefs'
import type { SqliteLike } from './tagQueries'
import {
  ensurePrefsSchema,
  readAppPrefs,
  readWorkflowPrefs,
  writeAppPrefs,
  writeWorkflowPrefs
} from './workflowPrefsStore'

let raw: DatabaseSync
let db: SqliteLike

beforeEach(() => {
  raw = new DatabaseSync(':memory:')
  db = {
    prepare: (sql) => raw.prepare(sql),
    transaction: (fn) => () => fn()
  }
  ensurePrefsSchema(db)
})

describe('preferências de fluxo no banco', () => {
  it('sem linha salva devolve os padrões', () => {
    expect(readWorkflowPrefs(db)).toEqual(DEFAULT_WORKFLOW_PREFS)
  })

  it('grava o patch em cima do atual e relê igual', () => {
    writeWorkflowPrefs(db, { workdayHours: 6, weekStart: 'sunday' })
    const next = writeWorkflowPrefs(db, { dueNotices: { eve: false } })
    expect(next.workdayHours).toBe(6)
    expect(next.weekStart).toBe('sunday')
    expect(next.dueNotices.eve).toBe(false)
    expect(readWorkflowPrefs(db)).toEqual(next)
  })

  it('JSON corrompido volta aos padrões', () => {
    raw.prepare("INSERT INTO app_prefs (key, value) VALUES ('workflow', '{quebrado')").run()
    expect(readWorkflowPrefs(db)).toEqual(DEFAULT_WORKFLOW_PREFS)
  })
})

describe('preferências do app no banco', () => {
  it('ficam numa linha separada das de fluxo', () => {
    expect(readAppPrefs(db)).toEqual(DEFAULT_APP_PREFS)
    writeAppPrefs(db, { autoBackup: true })
    writeWorkflowPrefs(db, { workdayHours: 6 })
    expect(readAppPrefs(db)).toEqual({ ...DEFAULT_APP_PREFS, autoBackup: true })
    expect(readWorkflowPrefs(db).workdayHours).toBe(6)
  })
})
