const RELOADABLE_REASONS = new Set(['abnormal-exit', 'killed', 'crashed', 'oom', 'memory-eviction'])

export const RELOAD_WINDOW_MS = 60_000
export const MAX_RELOADS_IN_WINDOW = 3

export function recentReloads(reloads: readonly number[], now: number): number[] {
  return reloads.filter((time) => now - time < RELOAD_WINDOW_MS)
}

export function shouldReloadRenderer(
  reason: string,
  reloads: readonly number[],
  now: number
): boolean {
  if (!RELOADABLE_REASONS.has(reason)) return false
  return recentReloads(reloads, now).length < MAX_RELOADS_IN_WINDOW
}
