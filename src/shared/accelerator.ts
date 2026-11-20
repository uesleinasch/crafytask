export const DEFAULT_CAPTURE_SHORTCUT = 'CommandOrControl+Shift+Space'

const MODIFIERS = ['CommandOrControl', 'Alt', 'Shift', 'Super'] as const
type Modifier = (typeof MODIFIERS)[number]

const NAMED_KEYS = [
  'Space',
  'Up',
  'Down',
  'Left',
  'Right',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'Insert',
  'Delete'
]

const CODE_TO_KEY: Record<string, string> = {
  Space: 'Space',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  Insert: 'Insert',
  Delete: 'Delete'
}

const LABELS: Record<string, string> = {
  CommandOrControl: 'Ctrl',
  Up: '↑',
  Down: '↓',
  Left: '←',
  Right: '→'
}

function isKey(part: string): boolean {
  return /^[A-Z0-9]$/.test(part) || /^F([1-9]|1[0-2])$/.test(part) || NAMED_KEYS.includes(part)
}

export function isValidAccelerator(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const parts = value.split('+')
  const key = parts.pop()
  if (!key || !isKey(key)) return false
  const modifiers = parts as Modifier[]
  if (!modifiers.every((m) => MODIFIERS.includes(m))) return false
  if (new Set(modifiers).size !== modifiers.length) return false
  const order = modifiers.map((m) => MODIFIERS.indexOf(m))
  if (order.some((index, i) => i > 0 && index < order[i - 1])) return false
  return modifiers.some((m) => m !== 'Shift')
}

export interface KeyEventLike {
  code: string
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
  metaKey: boolean
}

function keyFromCode(code: string): string | null {
  const letter = /^Key([A-Z])$/.exec(code)
  if (letter) return letter[1]
  const digit = /^Digit(\d)$/.exec(code)
  if (digit) return digit[1]
  if (/^F([1-9]|1[0-2])$/.test(code)) return code
  return CODE_TO_KEY[code] ?? null
}

export function acceleratorFromEvent(event: KeyEventLike): string | null {
  const key = keyFromCode(event.code)
  if (!key) return null
  const parts: string[] = []
  if (event.ctrlKey) parts.push('CommandOrControl')
  if (event.altKey) parts.push('Alt')
  if (event.shiftKey) parts.push('Shift')
  if (event.metaKey) parts.push('Super')
  const accelerator = [...parts, key].join('+')
  return isValidAccelerator(accelerator) ? accelerator : null
}

export function acceleratorKeys(accelerator: string): string[] {
  return accelerator.split('+').map((part) => LABELS[part] ?? part)
}
