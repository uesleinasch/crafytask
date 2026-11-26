export const MEDIA_KEYS_SCHEMA = 'org.gnome.settings-daemon.plugins.media-keys'
export const CUSTOM_SCHEMA = 'org.gnome.settings-daemon.plugins.media-keys.custom-keybinding'
export const CRAFYTASK_PATH =
  '/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/crafytask-capture/'
export const KEYBINDING_NAME = 'CrafyTask: captura rápida'

export interface GnomeKeybindingSlot {
  path: string
  name: string
}

export const CAPTURE_SLOT: GnomeKeybindingSlot = { path: CRAFYTASK_PATH, name: KEYBINDING_NAME }
export const DICTATION_SLOT: GnomeKeybindingSlot = {
  path: '/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/crafytask-dictation/',
  name: 'CrafyTask: ditado'
}

export type GsettingsRun = (args: string[]) => Promise<string>

const MODIFIER_TO_GNOME: Record<string, string> = {
  CommandOrControl: '<Control>',
  Alt: '<Alt>',
  Shift: '<Shift>',
  Super: '<Super>'
}

const KEY_TO_GNOME: Record<string, string> = {
  Space: 'space',
  PageUp: 'Page_Up',
  PageDown: 'Page_Down'
}

export function gnomeBinding(accelerator: string): string {
  const parts = accelerator.split('+')
  const key = parts.pop() ?? ''
  const gnomeKey = KEY_TO_GNOME[key] ?? (/^[A-Z]$/.test(key) ? key.toLowerCase() : key)
  return parts.map((part) => MODIFIER_TO_GNOME[part] ?? '').join('') + gnomeKey
}

export function gvariantString(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

export function parseStrv(output: string): string[] {
  const text = output.trim().replace(/^@as\s*/, '')
  const items: string[] = []
  const pattern = /'((?:[^'\\]|\\.)*)'/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text))) items.push(match[1].replace(/\\(.)/g, '$1'))
  return items
}

export function formatStrv(items: string[]): string {
  return `[${items.map(gvariantString).join(', ')}]`
}

export function shellQuote(value: string): string {
  return /^[\w@%+=:,./-]+$/.test(value) ? value : `"${value.replace(/(["\\$`])/g, '\\$1')}"`
}

export interface GnomeKeybinding {
  binding: string
  command: string
}

export async function readGnomeKeybinding(
  run: GsettingsRun,
  slot: GnomeKeybindingSlot = CAPTURE_SLOT
): Promise<GnomeKeybinding | null> {
  const paths = parseStrv(await run(['get', MEDIA_KEYS_SCHEMA, 'custom-keybindings']))
  if (!paths.includes(slot.path)) return null
  const key = `${CUSTOM_SCHEMA}:${slot.path}`
  const [binding] = parseStrv(await run(['get', key, 'binding']))
  const [command] = parseStrv(await run(['get', key, 'command']))
  return { binding: binding ?? '', command: command ?? '' }
}

export async function writeGnomeKeybinding(
  run: GsettingsRun,
  accelerator: string,
  command: string,
  slot: GnomeKeybindingSlot = CAPTURE_SLOT
): Promise<void> {
  const key = `${CUSTOM_SCHEMA}:${slot.path}`
  await run(['set', key, 'name', gvariantString(slot.name)])
  await run(['set', key, 'command', gvariantString(command)])
  await run(['set', key, 'binding', gvariantString(gnomeBinding(accelerator))])
  const paths = parseStrv(await run(['get', MEDIA_KEYS_SCHEMA, 'custom-keybindings']))
  if (!paths.includes(slot.path)) {
    await run(['set', MEDIA_KEYS_SCHEMA, 'custom-keybindings', formatStrv([...paths, slot.path])])
  }
}

export async function removeGnomeKeybinding(
  run: GsettingsRun,
  slot: GnomeKeybindingSlot
): Promise<void> {
  const paths = parseStrv(await run(['get', MEDIA_KEYS_SCHEMA, 'custom-keybindings']))
  if (paths.includes(slot.path)) {
    const rest = paths.filter((path) => path !== slot.path)
    await run(['set', MEDIA_KEYS_SCHEMA, 'custom-keybindings', formatStrv(rest)])
  }
  await run(['reset-recursively', `${CUSTOM_SCHEMA}:${slot.path}`])
}

export function isGnomeKeybindingCurrent(
  current: GnomeKeybinding | null,
  accelerator: string,
  command: string
): boolean {
  return !!current && current.binding === gnomeBinding(accelerator) && current.command === command
}
