export const WAITING_FOR_MAX = 120

export function normalizeWaitingFor(value: string | null | undefined): string | null {
  const text = (value ?? '').replace(/\s+/g, ' ').trim()
  return text ? text.slice(0, WAITING_FOR_MAX) : null
}
