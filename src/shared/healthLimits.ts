export const HEALTH_LIMITS = {
  waitingDays: 7,
  nextDays: 14,
  stalledProjectDays: 7,
  reviewDays: 7
} as const

const DAY_MS = 24 * 60 * 60 * 1000

export function parseSqlTime(value: string): Date {
  return new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`)
}

export function calendarDaysSince(value: string, now: Date): number {
  const then = parseSqlTime(value)
  const start = (d: Date): number => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  return Math.max(0, Math.round((start(now) - start(then)) / DAY_MS))
}

export function isReviewOverdue(daysSinceLastReview: number | null): boolean {
  return daysSinceLastReview === null || daysSinceLastReview > HEALTH_LIMITS.reviewDays
}
