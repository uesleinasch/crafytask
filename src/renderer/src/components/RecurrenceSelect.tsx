import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@renderer/components/ui/select'
import { RECURRENCE_OPTIONS } from '@shared/recurrenceOptions'

interface RecurrenceSelectProps {
  value: string | null | undefined
  onChange: (value: string | null) => void
}

export function RecurrenceSelect({ value, onChange }: RecurrenceSelectProps): React.JSX.Element {
  const currentValue = value || 'none'

  return (
    <Select
      value={currentValue}
      onValueChange={(v) => onChange(v === 'none' ? null : v)}
    >
      <SelectTrigger className="border-slate-300 h-8 text-sm">
        <SelectValue placeholder="Não repete" />
      </SelectTrigger>
      <SelectContent>
        {RECURRENCE_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
