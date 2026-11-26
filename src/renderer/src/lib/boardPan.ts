export interface WheelLike {
  shiftKey: boolean
  deltaX: number
  deltaY: number
}

export function horizontalWheelDelta(event: WheelLike, overflows: boolean): number | null {
  if (!event.shiftKey || !overflows) return null
  const delta = event.deltaY || event.deltaX
  return delta === 0 ? null : delta
}

export const PAN_IGNORE_SELECTOR =
  '[data-kanban-card], button, a, input, textarea, select, [role="button"], [role="checkbox"]'
