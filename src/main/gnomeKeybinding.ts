export const MEDIA_KEYS_SCHEMA = 'org.gnome.settings-daemon.plugins.media-keys'
export const CUSTOM_SCHEMA = 'org.gnome.settings-daemon.plugins.media-keys.custom-keybinding'
export const CRAFYTASK_PATH =
  '/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/crafytask-capture/'
export const KEYBINDING_NAME = 'CrafyTask: captura rápida'

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

export async function readGnomeKeybinding(run: GsettingsRun): Promise<GnomeKeybinding | null> {
  const paths = parseStrv(await run(['get', MEDIA_KEYS_SCHEMA, 'custom-keybindings']))
  if (!paths.includes(CRAFYTASK_PATH)) return null
  const key = `${CUSTOM_SCHEMA}:${CRAFYTASK_PATH}`
  const [binding] = parseStrv(await run(['get', key, 'binding']))
  const [command] = parseStrv(await run(['get', key, 'command']))
  return { binding: binding ?? '', command: command ?? '' }
}

export async function writeGnomeKeybinding(
  run: GsettingsRun,
  accelerator: string,
  command: string
): Promise<void> {
  const key = `${CUSTOM_SCHEMA}:${CRAFYTASK_PATH}`
  await run(['set', key, 'name', gvariantString(KEYBINDING_NAME)])
  await run(['set', key, 'command', gvariantString(command)])
  await run(['set', key, 'binding', gvariantString(gnomeBinding(accelerator))])
  const paths = parseStrv(await run(['get', MEDIA_KEYS_SCHEMA, 'custom-keybindings']))
  if (!paths.includes(CRAFYTASK_PATH)) {
    await run([
      'set',
      MEDIA_KEYS_SCHEMA,
      'custom-keybindings',
      formatStrv([...paths, CRAFYTASK_PATH])
    ])
  }
}

export async function removeGnomeKeybinding(run: GsettingsRun): Promise<void> {
  const paths = parseStrv(await run(['get', MEDIA_KEYS_SCHEMA, 'custom-keybindings']))
  if (paths.includes(CRAFYTASK_PATH)) {
    const rest = paths.filter((path) => path !== CRAFYTASK_PATH)
    await run([
      'set',
      MEDIA_KEYS_SCHEMA,
      'custom-keybindings',
      rest.length ? formatStrv(rest) : '@as []'
    ])
  }
  await run(['reset-recursively', `${CUSTOM_SCHEMA}:${CRAFYTASK_PATH}`])
}

export function isGnomeKeybindingCurrent(
  current: GnomeKeybinding | null,
  accelerator: string,
  command: string
): boolean {
  return !!current && current.binding === gnomeBinding(accelerator) && current.command === command
}
