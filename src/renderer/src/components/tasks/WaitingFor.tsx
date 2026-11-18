import { useEffect, useRef, useState } from 'react'
import { Flex, Input, Tooltip, Typography } from 'antd'
import { Hourglass } from 'lucide-react'
import { WAITING_FOR_MAX, normalizeWaitingFor } from '@shared/waitingFor'
import { STATUS_COLORS } from '@renderer/theme/semantic'
import { useThemeSettings } from '@renderer/theme/themeSettings'
import { toast } from '@renderer/components/ui/sonner'

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
  onSave: (value: string | null) => Promise<unknown>
}

export function WaitingForField({ value, onSave }: WaitingForFieldProps): React.JSX.Element {
  const [draft, setDraft] = useState(value ?? '')
  const focused = useRef(false)
  const saved = useRef(value ?? null)

  useEffect(() => {
    saved.current = value ?? null
    if (!focused.current) setDraft(value ?? '')
  }, [value])

  const commit = async (): Promise<void> => {
    const next = normalizeWaitingFor(draft)
    setDraft(next ?? '')
    if (next === saved.current) return
    const previous = saved.current
    saved.current = next
    try {
      await onSave(next)
    } catch (error) {
      console.error('[WaitingForField]', error)
      saved.current = previous
      setDraft(previous ?? '')
      toast.error('Não foi possível salvar o aguardando')
    }
  }

  return (
    <div className="grid grid-cols-[90px_1fr] items-start gap-3">
      <Typography.Text type="secondary" style={{ fontSize: 12, paddingTop: 4 }}>
        Aguardando
      </Typography.Text>
      <Flex vertical gap={4}>
        <Input
          size="small"
          variant="filled"
          allowClear
          maxLength={WAITING_FOR_MAX}
          placeholder="Quem ou o quê? Ex.: Revisor externo"
          aria-label="Aguardando quem ou o quê"
          aria-describedby="waiting-for-help"
          prefix={<Hourglass size={12} strokeWidth={1.75} aria-hidden />}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={() => {
            focused.current = true
          }}
          onBlur={() => {
            focused.current = false
            void commit()
          }}
          onPressEnter={() => void commit()}
        />
        <Typography.Text id="waiting-for-help" type="secondary" style={{ fontSize: 12 }}>
          Aparece na lista (ampulheta). Fica guardado se o status mudar.
        </Typography.Text>
      </Flex>
    </div>
  )
}
