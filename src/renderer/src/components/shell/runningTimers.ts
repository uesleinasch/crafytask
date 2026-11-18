import type { ActiveTimer } from '@renderer/stores/timerStore'

export function sortByLatestStart(timers: readonly ActiveTimer[]): ActiveTimer[] {
  return [...timers].sort((a, b) => b.entry.start_time.localeCompare(a.entry.start_time))
}
