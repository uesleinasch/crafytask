import { theme } from 'antd'
import type { ProjectStatus } from '@shared/types'
import { PROJECT_STATUS_LABELS } from '@shared/types'
import { PROJECT_STATUS_COLORS } from '@renderer/theme/semantic'
import { useThemeSettings } from '@renderer/theme/themeSettings'
import { chipStyle } from './chipStyle'
import { PROJECT_STATUS_ICONS } from './projectStatusMeta'

export function ProjectStatusChip({ status }: { status: ProjectStatus }): React.JSX.Element {
  const { token } = theme.useToken()
  const { mode } = useThemeSettings()
  const { fg, bg } = PROJECT_STATUS_COLORS[status][mode]
  const Icon = PROJECT_STATUS_ICONS[status]
  return (
    <span style={chipStyle(fg, bg, 'transparent', token.borderRadiusSM)}>
      <Icon size={13} strokeWidth={2} aria-hidden />
      {PROJECT_STATUS_LABELS[status]}
    </span>
  )
}
