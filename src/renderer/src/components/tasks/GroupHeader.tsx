import { Button, Flex, Tooltip, Typography, theme } from 'antd'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { TaskGroup } from '@renderer/lib/taskGrouping'
import { formatShortDuration } from './taskTableFormat'

const ICON = { size: 14, strokeWidth: 1.75, 'aria-hidden': true } as const

interface GroupHeaderProps {
  group: TaskGroup
  collapsed: boolean
  onToggle: () => void
  allSelected: boolean
  onToggleSelection: (selected: boolean) => void
  totalSeconds: number
  dragHandle?: React.ReactNode
}

export function GroupHeader({
  group,
  collapsed,
  onToggle,
  allSelected,
  onToggleSelection,
  totalSeconds,
  dragHandle
}: GroupHeaderProps): React.JSX.Element {
  const { token } = theme.useToken()
  const mono: React.CSSProperties = {
    fontFamily: token.fontFamilyCode,
    fontVariantNumeric: 'tabular-nums'
  }
  return (
    <Flex align="center" gap={8} style={{ minWidth: 0 }}>
      {dragHandle}
      <Button
        size="small"
        type="text"
        aria-expanded={!collapsed}
        aria-label={`${collapsed ? 'Expandir' : 'Recolher'} ${group.label}`}
        icon={collapsed ? <ChevronRight {...ICON} /> : <ChevronDown {...ICON} />}
        onClick={onToggle}
      />
      {group.icon ? (
        <span aria-hidden>{group.icon}</span>
      ) : (
        <span
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            flex: 'none',
            background: group.color || token.colorBorder
          }}
        />
      )}
      <Typography.Text strong ellipsis style={{ minWidth: 0 }}>
        {group.label}
      </Typography.Text>
      <Typography.Text type="secondary" style={mono}>
        {group.tasks.length}
      </Typography.Text>
      <Button
        size="small"
        type="link"
        style={{ fontSize: 12, paddingInline: 0 }}
        onClick={() => onToggleSelection(!allSelected)}
      >
        {allSelected ? 'Desmarcar grupo' : 'Selecionar grupo'}
      </Button>
      <span style={{ flex: 1 }} />
      <Tooltip title="Tempo somado do grupo">
        <Typography.Text type="secondary" style={mono}>
          {formatShortDuration(totalSeconds)}
        </Typography.Text>
      </Tooltip>
    </Flex>
  )
}
