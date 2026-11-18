import { theme } from 'antd'
import { Archive, CircleCheck, FolderOpen, Lightbulb, type LucideIcon } from 'lucide-react'
import type { ProjectStatus } from '@shared/types'
import { PROJECT_STATUS_LABELS } from '@shared/types'
import { PROJECT_STATUS_COLORS } from '@renderer/theme/semantic'
import { useThemeSettings } from '@renderer/theme/themeSettings'
import { chipStyle } from './chipStyle'

const ICONS: Record<ProjectStatus, LucideIcon> = {
  active: FolderOpen,
  someday: Lightbulb,
  done: CircleCheck,
  archived: Archive
}

export function ProjectStatusChip({ status }: { status: ProjectStatus }): React.JSX.Element {
  const { token } = theme.useToken()
  const { mode } = useThemeSettings()
  const { fg, bg } = PROJECT_STATUS_COLORS[status][mode]
  const Icon = ICONS[status]
  return (
    <span style={chipStyle(fg, bg, 'transparent', token.borderRadiusSM)}>
      <Icon size={13} strokeWidth={2} aria-hidden />
      {PROJECT_STATUS_LABELS[status]}
    </span>
  )
}
