import { localDateString } from '@shared/dueState'

export function formatShortDuration(seconds: number): string {
  if (seconds >= 3600) {
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${Math.floor(seconds / 3600)}h${String(minutes).padStart(2, '0')}`
  }
  if (seconds > 0) return `${Math.max(1, Math.round(seconds / 60))} min`
  return '—'
}

export function formatDueShort(date: string, time?: string | null): string {
  const [, month, day] = date.split('-')
  return time ? `${day}/${month} ${time}` : `${day}/${month}`
}

export type DueTone = 'danger' | 'warning' | undefined

export function dueTone(date: string | null | undefined, now: Date): DueTone {
  if (!date) return undefined
  const today = localDateString(now)
  if (date < today) return 'danger'
  if (date === today) return 'warning'
  return undefined
}

export function blockedLabel(blockerIds: readonly number[] | undefined): string {
  const refs = (blockerIds ?? []).map((id) => `#${id}`)
  if (refs.length === 0) return 'Bloqueada por dependências'
  if (refs.length > 3) {
    return `Bloqueada: depende de ${refs.slice(0, 3).join(', ')} e mais ${refs.length - 3}`
  }
  const list = refs.length === 1 ? refs[0] : `${refs.slice(0, -1).join(', ')} e ${refs.at(-1)}`
  return `Bloqueada: depende de ${list}`
}
