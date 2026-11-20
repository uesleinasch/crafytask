import { USER_COLORS } from '@renderer/theme/semantic'

export { UNTITLED_PAGE } from '@shared/notebookTree'

const COLOR_NAMES: Record<string, string> = {
  '#e5484d': 'vermelho',
  '#a84803': 'laranja',
  '#a15c00': 'âmbar',
  '#0b7a50': 'verde',
  '#0f6e7a': 'azul-petróleo',
  '#2a62d6': 'azul',
  '#5b47eb': 'violeta',
  '#7647b0': 'roxo',
  '#b8327a': 'magenta',
  '#5d6b82': 'ardósia'
}

export const DEFAULT_NOTEBOOK_COLOR = USER_COLORS[5]
export const DEFAULT_SECTION_COLOR = USER_COLORS[9]

export function colorName(color: string): string {
  return COLOR_NAMES[color.toLowerCase()] ?? color
}

export function moveIdOnto(ids: number[], id: number, targetId: number): number[] | null {
  const from = ids.indexOf(id)
  const to = ids.indexOf(targetId)
  if (from < 0 || to < 0 || from === to) return null
  const next = ids.filter((x) => x !== id)
  next.splice(to, 0, id)
  return next
}

export function shiftId(ids: number[], id: number, delta: -1 | 1): number[] | null {
  const from = ids.indexOf(id)
  const target = ids[from + delta]
  return from < 0 || target === undefined ? null : moveIdOnto(ids, id, target)
}

export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}
