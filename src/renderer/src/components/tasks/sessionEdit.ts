const CLOCK = /^([01]?\d|2[0-3]):([0-5]\d)$/

export function sessionClock(iso: string): string {
  const date = new Date(iso)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function atClock(base: Date, clock: string): Date | null {
  const match = CLOCK.exec(clock.trim())
  if (!match) return null
  const date = new Date(base)
  date.setHours(Number(match[1]), Number(match[2]), 0, 0)
  return date
}

export type SessionRangeResult =
  | { ok: true; startIso: string; endIso: string }
  | { ok: false; error: string }

export function sessionRange(dayIso: string, start: string, end: string): SessionRangeResult {
  const day = new Date(dayIso)
  const from = atClock(day, start)
  const to = atClock(day, end)
  if (!from || !to) return { ok: false, error: 'Use HH:MM, por exemplo 09:30.' }
  if (to.getTime() === from.getTime()) {
    return { ok: false, error: 'O fim precisa ser depois do início (HH:MM).' }
  }
  if (to < from) to.setDate(to.getDate() + 1)
  return { ok: true, startIso: from.toISOString(), endIso: to.toISOString() }
}
