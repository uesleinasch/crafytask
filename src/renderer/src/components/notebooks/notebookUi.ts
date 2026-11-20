import { USER_COLORS, USER_COLOR_NAMES } from '@renderer/theme/semantic'

export { UNTITLED_PAGE } from '@shared/notebookTree'

export const DEFAULT_NOTEBOOK_COLOR = USER_COLORS[5]
export const DEFAULT_SECTION_COLOR = USER_COLORS[9]

export function colorName(color: string): string {
  const match = USER_COLORS.find((c) => c.toLowerCase() === color.toLowerCase())
  return match ? USER_COLOR_NAMES[match] : 'atual'
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
