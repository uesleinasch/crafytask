import { Tooltip } from 'antd'
import { Hourglass } from 'lucide-react'
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
