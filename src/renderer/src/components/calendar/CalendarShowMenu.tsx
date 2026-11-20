import { Button, Checkbox, Divider, Grid, Popover, Typography, theme } from 'antd'
import { CalendarSync, Clock, Eye, Flag, Flame } from 'lucide-react'
import { CAL_BLOCK_COLORS } from '@renderer/theme/semantic'
import { useThemeSettings } from '@renderer/theme/themeSettings'
import type { ShowKey } from './calendarView'

const SHOW_OPTIONS: { key: ShowKey; label: string }[] = [
  { key: 'block', label: 'Blocos de tempo' },
  { key: 'event', label: 'Tarefas com horário' },
  { key: 'scheduled', label: 'Agendadas sem horário' },
  { key: 'due', label: 'Prazos' },
  { key: 'sessions', label: 'Sessões registradas' },
  { key: 'weekend', label: 'Fins de semana' }
]

function Swatch({ kind }: { kind: ShowKey }): React.ReactNode {
  const { token } = theme.useToken()
  const { mode } = useThemeSettings()
  const box = (style: React.CSSProperties): React.ReactNode => (
    <span className="ct-calsw" aria-hidden style={style} />
  )
  if (kind === 'block') {
    return box({
      background: CAL_BLOCK_COLORS[mode].calBlock,
      border: `1px solid ${CAL_BLOCK_COLORS[mode].calBlockBorder}`
    })
  }
  if (kind === 'event') {
    return box({ background: token.colorBgContainer, border: `1px solid ${token.colorBorder}` })
  }
  if (kind === 'scheduled') {
    return box({ background: token.colorBgLayout, border: `1px solid ${token.colorBorder}` })
  }
  if (kind === 'due') {
    return <Flag size={14} strokeWidth={2} aria-hidden style={{ color: token.colorWarning }} />
  }
  if (kind === 'sessions') return box({ width: 4, background: token.colorPrimary })
  return null
}

interface CalendarShowMenuProps {
  show: Set<ShowKey>
  onChange: (show: Set<ShowKey>) => void
}

export function CalendarShowMenu({ show, onChange }: CalendarShowMenuProps): React.JSX.Element {
  const screens = Grid.useBreakpoint()
  const icon = { size: 12, strokeWidth: 2, 'aria-hidden': true, style: { verticalAlign: -1 } }
  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      content={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 220 }}>
          {SHOW_OPTIONS.map((option) => (
            <Checkbox
              key={option.key}
              checked={show.has(option.key)}
              onChange={(e) => {
                const next = new Set(show)
                if (e.target.checked) next.add(option.key)
                else next.delete(option.key)
                onChange(next)
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 18, display: 'inline-flex', justifyContent: 'center' }}>
                  <Swatch kind={option.key} />
                </span>
                {option.label}
              </span>
            </Checkbox>
          ))}
          <Divider style={{ margin: '4px 0' }} />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Ícones: <Flame {...icon} /> urgente · <Flag {...icon} /> prioridade ·{' '}
            <Clock {...icon} /> time leak · <CalendarSync {...icon} /> no Google
          </Typography.Text>
        </div>
      }
    >
      <Button icon={<Eye size={14} strokeWidth={1.75} />} aria-label="Mostrar">
        {screens.md ? 'Mostrar' : null}
      </Button>
    </Popover>
  )
}
