import { describe, expect, it } from 'vitest'
import { DEFAULT_APP_PREFS, mergeAppPrefs, sanitizeAppPrefs } from './appPrefs'

describe('preferências do app', () => {
  it('cai nos padrões: atalho Ctrl+Shift+Space e backup automático desligado', () => {
    expect(sanitizeAppPrefs(null)).toEqual(DEFAULT_APP_PREFS)
    expect(DEFAULT_APP_PREFS.autoBackup).toBe(false)
  })

  it('aplica o patch e mantém o atual no que for inválido', () => {
    const next = mergeAppPrefs(DEFAULT_APP_PREFS, { captureShortcut: 'Alt+K', autoBackup: true })
    expect(next).toEqual({ captureShortcut: 'Alt+K', autoBackup: true })
    expect(mergeAppPrefs(next, { captureShortcut: 'K', autoBackup: 'sim' })).toEqual(next)
  })
})
