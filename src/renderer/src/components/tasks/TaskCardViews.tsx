import { useState } from 'react'
import { Flex, Typography, theme } from 'antd'
import type { Context, Task } from '@shared/types'
import { GroupDragButton, SortableGroups } from '@renderer/components/SortableGroups'
import { liveSeconds } from '@renderer/lib/liveSeconds'
import type { GroupBy, TaskGroup } from '@renderer/lib/taskGrouping'
import { useTimerStore } from '@renderer/stores/timerStore'
import { GroupHeader } from './GroupHeader'
import { TaskCard } from './TaskCard'

interface CardCommonProps {
  selectedTaskIds: Set<number>
  onToggleTaskSelection: (taskId: number, selected: boolean) => void
  onTaskClick: (taskId: number) => void
  onScheduleForToday?: (taskId: number) => void
  showStatus: boolean
  contexts: Context[]
}

const GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))',
  gap: 16
}

function cardsOf(
  tasks: Task[],
  props: CardCommonProps,
  groupBy?: GroupBy | null
): React.JSX.Element[] {
  return tasks.map((task) => (
    <TaskCard
      key={task.id}
      task={task}
      selected={props.selectedTaskIds.has(task.id)}
      onToggleSelection={(selected) => props.onToggleTaskSelection(task.id, selected)}
      onOpen={props.onTaskClick}
      onScheduleForToday={props.onScheduleForToday}
      showStatus={props.showStatus}
      showProject={groupBy !== 'project'}
      showContexts={groupBy !== 'context'}
      contexts={props.contexts}
    />
  ))
}

export function TaskCardGrid(props: CardCommonProps & { tasks: Task[] }): React.JSX.Element {
  return <div style={GRID}>{cardsOf(props.tasks, props)}</div>
}

interface TaskCardGroupsProps extends CardCommonProps {
  groups: TaskGroup[]
  groupBy: GroupBy
  onToggleGroupSelection: (taskIds: number[], selected: boolean) => void
  onReorderGroups?: (activeKey: string, overKey: string) => void
}

export function TaskCardGroups(props: TaskCardGroupsProps): React.JSX.Element {
  const { token } = theme.useToken()
  const timers = useTimerStore((s) => s.timers)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const { groups, groupBy, selectedTaskIds, onToggleGroupSelection, onReorderGroups } = props

  const toggle = (key: string): void => {
    const next = new Set(collapsed)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setCollapsed(next)
  }

  return (
    <SortableGroups
      keys={groups.map((group) => group.key)}
      direction="vertical"
      onReorder={onReorderGroups}
    >
      {groups.map((group) => {
        const ids = group.tasks.map((t) => t.id)
        const isCollapsed = collapsed.has(group.key)
        return (
          <SortableGroups.Item key={group.key} id={group.key} style={{ marginBottom: 16 }}>
            <div
              style={{
                padding: '4px 0 8px',
                marginBottom: 8,
                borderBottom: `1px solid ${token.colorBorderSecondary}`
              }}
            >
              <GroupHeader
                group={group}
                collapsed={isCollapsed}
                onToggle={() => toggle(group.key)}
                allSelected={ids.length > 0 && ids.every((id) => selectedTaskIds.has(id))}
                onToggleSelection={(selected) => onToggleGroupSelection(ids, selected)}
                totalSeconds={group.tasks.reduce((sum, t) => sum + liveSeconds(t, timers), 0)}
                dragHandle={onReorderGroups ? <GroupDragButton /> : undefined}
              />
            </div>
            {!isCollapsed && <div style={GRID}>{cardsOf(group.tasks, props, groupBy)}</div>}
          </SortableGroups.Item>
        )
      })}
    </SortableGroups>
  )
}

interface TaskKanbanProps extends CardCommonProps {
  columns: TaskGroup[]
  groupBy: GroupBy
  onReorderColumns?: (activeKey: string, overKey: string) => void
}

export function TaskKanban(props: TaskKanbanProps): React.JSX.Element {
  const { token } = theme.useToken()
  const { columns, groupBy, onReorderColumns } = props
  const mono: React.CSSProperties = {
    fontFamily: token.fontFamilyCode,
    fontVariantNumeric: 'tabular-nums'
  }

  return (
    <SortableGroups
      keys={columns.map((col) => col.key)}
      direction="horizontal"
      onReorder={onReorderColumns}
      style={{
        display: 'grid',
        gridAutoFlow: 'column',
        gridAutoColumns: 'minmax(260px, 1fr)',
        gap: 12,
        overflowX: 'auto',
        paddingBottom: 8
      }}
    >
      {columns.map((col) => (
        <SortableGroups.Item
          key={col.key}
          id={col.key}
          style={{
            background: token.colorBgLayout,
            border: `1px solid ${token.colorBorderSecondary}`,
            borderRadius: token.borderRadiusLG,
            padding: 10,
            minWidth: 0
          }}
        >
          <Flex align="center" gap={8} style={{ marginBottom: 8, minWidth: 0 }}>
            {onReorderColumns && <GroupDragButton />}
            {col.icon ? (
              <span aria-hidden>{col.icon}</span>
            ) : (
              <span
                aria-hidden
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  flex: 'none',
                  background: col.color || token.colorBorder
                }}
              />
            )}
            <Typography.Text strong ellipsis style={{ minWidth: 0 }}>
              {col.label}
            </Typography.Text>
            <Typography.Text type="secondary" style={mono}>
              {col.tasks.length}
            </Typography.Text>
          </Flex>
          <Flex vertical gap={8}>
            {col.tasks.length > 0 ? (
              cardsOf(col.tasks, props, groupBy)
            ) : (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Nada executando
              </Typography.Text>
            )}
          </Flex>
        </SortableGroups.Item>
      ))}
    </SortableGroups>
  )
}
