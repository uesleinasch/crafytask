import { NAV_FOOTER, NAV_GROUPS, type NavKey } from './navigation'

export interface NavCommand {
  key: NavKey
  label: string
  route: string
}

export const NAV_COMMANDS: NavCommand[] = [
  ...NAV_GROUPS.flatMap((group) => group.items),
  ...NAV_FOOTER
].map((item) => ({ key: item.key, label: `Ir para ${item.label}`, route: item.route }))

export function normalizeSearch(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

export function matchesQuery(text: string, query: string): boolean {
  const needle = normalizeSearch(query)
  return needle === '' || normalizeSearch(text).includes(needle)
}

export function moveIndex(current: number, delta: number, total: number): number {
  if (total === 0) return 0
  return (current + delta + total) % total
}

type KeyInfo = Pick<KeyboardEvent, 'ctrlKey' | 'altKey' | 'metaKey' | 'shiftKey' | 'code'>

export function isCtrlShortcut(event: KeyInfo, code: string, insideTerminal: boolean): boolean {
  if (insideTerminal || event.altKey || event.shiftKey) return false
  return (event.ctrlKey || event.metaKey) && event.code === code
}

type Listener = () => void
const listeners = new Set<Listener>()

export function openCommandPalette(): void {
  listeners.forEach((listener) => listener())
}

export function onCommandPaletteRequest(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
