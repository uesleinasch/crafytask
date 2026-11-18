import { theme } from 'antd'
import { ListTodo } from 'lucide-react'
import type { TaskStatus } from '@shared/types'
import { STATUS_COLORS } from '@renderer/theme/semantic'
import { useThemeSettings } from '@renderer/theme/themeSettings'
import { STATUS_ICONS, statusTabText } from '@renderer/components/chips/statusMeta'

interface StatusTabLabelProps {
  status: TaskStatus | 'all'
  count?: number
}

export function StatusTabLabel({ status, count }: StatusTabLabelProps): React.JSX.Element {
  const { token } = theme.useToken()
  const { mode } = useThemeSettings()
  const Icon = status === 'all' ? ListTodo : STATUS_ICONS[status]
  const color = status === 'all' ? token.colorTextSecondary : STATUS_COLORS[status][mode].fg

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <Icon size={16} strokeWidth={1.75} color={color} aria-hidden />
      {statusTabText(status)}
      {count !== undefined && (
        <span
          style={{
            fontFamily: token.fontFamilyCode,
            fontVariantNumeric: 'tabular-nums',
            fontSize: 12,
            lineHeight: '18px',
            color: token.colorTextTertiary,
            background: token.colorBgLayout,
            border: `1px solid ${token.colorBorderSecondary}`,
            borderRadius: token.borderRadiusSM,
            padding: '0 6px'
          }}
        >
          {count}
        </span>
      )}
    </span>
  )
}
