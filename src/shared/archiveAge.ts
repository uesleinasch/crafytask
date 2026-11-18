export const ARCHIVE_AGE_MONTHS = [3, 6, 12, 24] as const

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && ISO_DATE.test(value)
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function archiveCutoff(months: number, today: Date): string {
  const day = today.getDate()
  const cutoff = new Date(today.getFullYear(), today.getMonth() - months, 1)
  const lastDay = new Date(cutoff.getFullYear(), cutoff.getMonth() + 1, 0).getDate()
  cutoff.setDate(Math.min(day, lastDay))
  return `${cutoff.getFullYear()}-${pad(cutoff.getMonth() + 1)}-${pad(cutoff.getDate())}`
}
