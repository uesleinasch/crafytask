import { Button, Flex, Progress, Tooltip, Typography, theme } from 'antd'
import { ChevronDown, ChevronRight, LayoutGrid, TrendingUp, TriangleAlert } from 'lucide-react'
import type { Project } from '@shared/types'
import { PROJECT_STATUS_ICONS } from '@renderer/components/chips/projectStatusMeta'
import { chipStyle } from '@renderer/components/chips/chipStyle'
import { STATUS_ICONS } from '@renderer/components/chips/statusMeta'
import { formatDueShort } from '@renderer/components/tasks/taskTableFormat'
import { PROJECT_STATUS_COLORS, STATUS_COLORS } from '@renderer/theme/semantic'
import { useThemeSettings } from '@renderer/theme/themeSettings'
import { dueHint, dueTone, lacksNextAction, progressPercent, type ProjectTab } from './projectList'

export function ProjectProgress({
  project,
  width
}: {
  project: Project
  width: number
}): React.JSX.Element {
  const { token } = theme.useToken()
  const done = project.completed_task_count ?? 0
  const total = project.task_count ?? 0
  return (
    <Flex align="center" gap={8}>
      <Progress
        percent={progressPercent(project)}
        size={[width, 4]}
        showInfo={false}
        aria-label={`${done} de ${total} tarefas feitas`}
      />
      <span
        style={{
          fontFamily: token.fontFamilyCode,
          fontVariantNumeric: 'tabular-nums',
          fontSize: 12,
          color: token.colorTextSecondary,
          whiteSpace: 'nowrap'
        }}
      >
        {done}/{total}
      </span>
    </Flex>
  )
}

export function NextActionCell({ project }: { project: Project }): React.JSX.Element {
  const { token } = theme.useToken()
  const { mode } = useThemeSettings()
  if (lacksNextAction(project)) {
    const { fg, bg } = STATUS_COLORS.aguardando[mode]
    return (
      <span style={chipStyle(fg, bg, 'transparent', token.borderRadiusSM)}>
        <TriangleAlert size={13} strokeWidth={2} aria-hidden />
        Sem próxima ação
      </span>
    )
  }
  if (!project.next_action) return <Typography.Text type="secondary">—</Typography.Text>
  const Icon = STATUS_ICONS.proximas
  return (
    <Flex align="center" gap={6} style={{ minWidth: 0 }}>
      <Icon
        size={14}
        strokeWidth={1.75}
        aria-hidden
        style={{ flex: 'none', color: STATUS_COLORS.proximas[mode].fg }}
      />
      <Typography.Text ellipsis style={{ minWidth: 0 }}>
        <span className="sr-only">Próxima ação: </span>
        {project.next_action}
      </Typography.Text>
    </Flex>
  )
}

export function ProjectDue({
  project,
  today
}: {
  project: Project
  today: string
}): React.JSX.Element {
  const { token } = theme.useToken()
  if (!project.due_date) return <Typography.Text type="secondary">—</Typography.Text>
  const date = project.due_date.slice(0, 10)
  const tone = dueTone(project, today)
  return (
    <Tooltip title={dueHint(date, today)}>
      <Typography.Text
        type={tone === 'overdue' ? 'danger' : tone === 'soon' ? 'warning' : undefined}
        style={{ fontFamily: token.fontFamilyCode, fontVariantNumeric: 'tabular-nums' }}
      >
        {formatDueShort(date)}
      </Typography.Text>
    </Tooltip>
  )
}

export function ProjectGroupHeader({
  name,
  count,
  collapsed,
  onToggle
}: {
  name: string
  count: number
  collapsed: boolean
  onToggle: () => void
}): React.JSX.Element {
  const { token } = theme.useToken()
  const icon = { size: 14, strokeWidth: 1.75, 'aria-hidden': true } as const
  return (
    <Flex align="center" gap={8} style={{ minWidth: 0 }}>
      <Button
        size="small"
        type="text"
        aria-expanded={!collapsed}
        aria-label={`${collapsed ? 'Expandir' : 'Recolher'} ${name}`}
        icon={collapsed ? <ChevronRight {...icon} /> : <ChevronDown {...icon} />}
        onClick={onToggle}
      />
      <TrendingUp {...icon} style={{ flex: 'none', color: token.colorTextTertiary }} />
      <Typography.Text strong ellipsis style={{ minWidth: 0 }}>
        {name}
      </Typography.Text>
      <Typography.Text
        type="secondary"
        style={{ fontFamily: token.fontFamilyCode, fontVariantNumeric: 'tabular-nums' }}
      >
        {count}
      </Typography.Text>
    </Flex>
  )
}

export function ProjectTabLabel({
  tab,
  label,
  count
}: {
  tab: ProjectTab
  label: string
  count: number
}): React.JSX.Element {
  const { token } = theme.useToken()
  const { mode } = useThemeSettings()
  const Icon = tab === 'all' ? LayoutGrid : PROJECT_STATUS_ICONS[tab]
  const color = tab === 'all' ? token.colorTextSecondary : PROJECT_STATUS_COLORS[tab][mode].fg
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <Icon size={16} strokeWidth={1.75} color={color} aria-hidden />
      {label}
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
    </span>
  )
}
