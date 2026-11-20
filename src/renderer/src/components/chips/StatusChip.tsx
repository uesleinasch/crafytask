import { theme } from 'antd'
import { STATUS_LABELS, type TaskStatus } from '@shared/types'
import { STATUS_COLORS } from '@renderer/theme/semantic'
import { useThemeSettings } from '@renderer/theme/themeSettings'
import { chipStyle } from './chipStyle'
import { STATUS_ICONS } from './statusMeta'

export function StatusChip({ status }: { status: TaskStatus }): React.JSX.Element {
  const { token } = theme.useToken()
  const { mode } = useThemeSettings()
  const { fg, bg } = STATUS_COLORS[status][mode]
  const Icon = STATUS_ICONS[status]
  return (
    <span style={chipStyle(fg, bg, 'transparent', token.borderRadiusSM)}>
      <Icon size={13} strokeWidth={2} aria-hidden />
      {STATUS_LABELS[status]}
    </span>
  )
}
