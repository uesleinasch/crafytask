import type { RecurrenceRule } from './types'

export const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'Não repete' },
  { value: JSON.stringify({ type: 'daily' } satisfies RecurrenceRule), label: 'Diária' },
  { value: JSON.stringify({ type: 'weekly' } satisfies RecurrenceRule), label: 'Semanal' },
  { value: JSON.stringify({ type: 'monthly' } satisfies RecurrenceRule), label: 'Mensal' }
]

export function recurrenceOptionValue(rule: string | null | undefined): string {
  if (!rule) return 'none'
  try {
    const type = (JSON.parse(rule) as Partial<RecurrenceRule>).type
    return RECURRENCE_OPTIONS.find((option) => option.value.includes(`"${type}"`))?.value ?? rule
  } catch {
    return rule
  }
}

export function recurrenceLabel(rule: string | null | undefined): string {
  const value = recurrenceOptionValue(rule)
  return RECURRENCE_OPTIONS.find((option) => option.value === value)?.label ?? 'Personalizada'
}
