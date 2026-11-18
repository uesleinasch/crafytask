import { useEffect, useState } from 'react'
import { Input, Tooltip, Typography } from 'antd'
import { Hourglass } from 'lucide-react'
import { WAITING_FOR_MAX, normalizeWaitingFor } from '@shared/waitingFor'
import { STATUS_COLORS } from '@renderer/theme/semantic'
import { useThemeSettings } from '@renderer/theme/themeSettings'

export function WaitingForIcon({ text }: { text?: string | null }): React.JSX.Element | null {
  const { mode } = useThemeSettings()
  if (!text) return null
  const label = `Aguardando: ${text}`
  return (
    <Tooltip title={label}>
      <Hourglass
        size={12}
        strokeWidth={1.75}
        role="img"
        aria-label={label}
        style={{ flex: 'none', color: STATUS_COLORS.aguardando[mode].fg }}
      />
    </Tooltip>
  )
}

interface WaitingForFieldProps {
  value?: string | null
  onSave: (value: string | null) => void
}

export function WaitingForField({ value, onSave }: WaitingForFieldProps): React.JSX.Element {
  const [draft, setDraft] = useState(value ?? '')
  useEffect(() => setDraft(value ?? ''), [value])

  const commit = (): void => {
    const next = normalizeWaitingFor(draft)
    if (next !== (value ?? null)) onSave(next)
  }

  return (
    <div className="grid grid-cols-[90px_1fr] items-center gap-3">
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        Aguardando
      </Typography.Text>
      <Input
        size="small"
        variant="filled"
        allowClear
        maxLength={WAITING_FOR_MAX}
        placeholder="Quem ou o quê? Ex.: Revisor externo"
        aria-label="Aguardando quem ou o quê"
        prefix={<Hourglass size={12} strokeWidth={1.75} aria-hidden />}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onPressEnter={commit}
      />
    </div>
  )
}
