import { DEFAULT_CAPTURE_SHORTCUT, isValidAccelerator } from './accelerator'

export interface AppPrefs {
  captureShortcut: string
  autoBackup: boolean
}

export interface AppPrefsStatus extends AppPrefs {
  captureShortcutActive: boolean
}

export const DEFAULT_APP_PREFS: AppPrefs = {
  captureShortcut: DEFAULT_CAPTURE_SHORTCUT,
  autoBackup: false
}

export const AUTO_BACKUP_KEEP = 14

export function sanitizeAppPrefs(raw: unknown, fallback: AppPrefs = DEFAULT_APP_PREFS): AppPrefs {
  const value = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {}
  return {
    captureShortcut: isValidAccelerator(value.captureShortcut)
      ? value.captureShortcut
      : fallback.captureShortcut,
    autoBackup: typeof value.autoBackup === 'boolean' ? value.autoBackup : fallback.autoBackup
  }
}

export function mergeAppPrefs(current: AppPrefs, patch: unknown): AppPrefs {
  const value = typeof patch === 'object' && patch !== null ? patch : {}
  return sanitizeAppPrefs({ ...current, ...value }, current)
}
