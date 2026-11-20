import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  Button,
  Checkbox,
  Flex,
  Grid,
  Table,
  Tooltip,
  Typography,
  theme,
  type TableColumnsType,
  type TableProps
} from 'antd'
import { ChevronDown, ChevronRight, Clock, Copy, Lock } from 'lucide-react'
import type { Context, Task, TaskStatus } from '@shared/types'
import { formatTimeRange } from '@shared/taskTime'
import { StatusChip } from '@renderer/components/chips/StatusChip'
import { CategoryChip } from '@renderer/components/chips/CategoryChip'
import { EnergyMeter } from '@renderer/components/chips/EnergyMeter'
import { LiveDot } from '@renderer/components/chips/LiveDot'
import { TaskContextMenu } from './TaskContextMenu'
import { TaskMenuChangedContext } from '@renderer/components/taskMenuContext'
import { toast } from '@renderer/components/ui/sonner'
import type { GroupBy, TaskGroup } from '@renderer/lib/taskGrouping'
import { liveSeconds } from '@renderer/lib/liveSeconds'
import { useTimerStore } from '@renderer/stores/timerStore'
import { CATEGORY_COLORS, timeLeakBackground, timeLeakLevel } from '@renderer/theme/semantic'
import { useThemeSettings } from '@renderer/theme/themeSettings'
import { useTimeLeakThresholds } from '@renderer/lib/workflowPrefs'
import { ContextsCell } from './ContextsCell'
import { JiraKey } from './JiraKey'
import { WaitingForIcon } from './WaitingFor'
import { GroupHeader } from './GroupHeader'
import { ProjectLabel } from './ProjectLabel'
import { TaskActions } from './TaskActions'
import { blockedLabel, dueTone, formatDueShort, formatShortDuration } from './taskTableFormat'

interface TaskRow {
  key: string
  kind: 'task'
  task: Task
  groupKey?: string
  children?: SubRow[]
}

interface SubRow {
  key: string
  kind: 'sub'
  task: Task
  parent: Task
}

interface GroupRow {
  key: string
  kind: 'group'
  group: TaskGroup
}

type TableRow = TaskRow | SubRow | GroupRow
type TaskLikeRow = TaskRow | SubRow

interface BaseColumn {
  title: React.ReactNode
  key: string
  width?: number
  align?: 'right'
  render: (row: TaskLikeRow) => React.ReactNode
}

interface TaskTableProps {
  tasks: Task[]
  groups?: TaskGroup[] | null
  groupBy?: GroupBy | null
  status: TaskStatus | 'all'
  contexts: Context[]
  selectedTaskIds: Set<number>
  onToggleTaskSelection: (taskId: number, selected: boolean) => void
  onToggleSelectAll: (selected: boolean) => void
  onToggleGroupSelection: (taskIds: number[], selected: boolean) => void
  onTaskClick: (taskId: number) => void
  onScheduleForToday?: (taskId: number) => void
  onSubtasksChange?: (subtasks: Task[]) => void
  collapsedGroups: Set<string>
  onToggleGroup: (key: string) => void
  hideProject?: boolean
}

interface RowMenu {
  taskOf: (rowKey: string) => Task | undefined
  onOpen: (taskId: number) => void
  onScheduleForToday?: (taskId: number) => void
}

const RowMenuContext = createContext<RowMenu | null>(null)
const ICON = { size: 14, strokeWidth: 1.75, 'aria-hidden': true } as const
const NAME_MIN_WIDTH = 240
const INTERACTIVE = 'button, a, input, label, [role="checkbox"], [data-row-click="ignore"]'

function MenuRow(
  props: React.HTMLAttributes<HTMLTableRowElement> & { 'data-row-key'?: string | number }
): React.JSX.Element {
  const menu = useContext(RowMenuContext)
  const task = menu?.taskOf(String(props['data-row-key']))
  if (!menu || !task) return <tr {...props} />
  return (
    <TaskContextMenu
      task={task}
      onOpen={() => menu.onOpen(task.id)}
      onScheduleForToday={menu.onScheduleForToday}
    >
      <tr {...props} />
    </TaskContextMenu>
  )
}

const TABLE_COMPONENTS: TableProps<TableRow>['components'] = { body: { row: MenuRow } }

function rowKeyOf(prefix: 't' | 's', id: number, groupKey?: string): string {
  return groupKey ? `${prefix}:${id}@${groupKey}` : `${prefix}:${id}`
}

export function TaskTable({
  tasks,
  groups,
  groupBy,
  status,
  contexts,
  selectedTaskIds,
  onToggleTaskSelection,
  onToggleSelectAll,
  onToggleGroupSelection,
  onTaskClick,
  onScheduleForToday,
  onSubtasksChange,
  collapsedGroups,
  onToggleGroup,
  hideProject
}: TaskTableProps): React.JSX.Element {
  const { token } = theme.useToken()
  const { mode } = useThemeSettings()
  const leakThresholds = useTimeLeakThresholds()
  const showStatus = status === 'all'
  const screens = Grid.useBreakpoint()
  const onChanged = useContext(TaskMenuChangedContext)
  const timers = useTimerStore((s) => s.timers)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [subtasks, setSubtasks] = useState<Record<number, Task[]>>({})
  const expandedRef = useRef(expanded)
  expandedRef.current = expanded

  const mono: React.CSSProperties = {
    fontFamily: token.fontFamilyCode,
    fontVariantNumeric: 'tabular-nums'
  }

  const loadSubtasks = useCallback(async (parentIds: number[]): Promise<void> => {
    if (parentIds.length === 0) return
    try {
      const entries = await Promise.all(
        parentIds.map(async (id) => [id, await window.api.listSubtasks(id)] as const)
      )
      setSubtasks((current) => ({ ...current, ...Object.fromEntries(entries) }))
    } catch (error) {
      console.error('[TaskTable] subtarefas', error)
      toast.error('Não foi possível carregar as subtarefas')
    }
  }, [])

  useEffect(() => {
    void loadSubtasks([...expandedRef.current])
  }, [tasks, loadSubtasks])

  useEffect(() => {
    onSubtasksChange?.(Object.values(subtasks).flat())
  }, [subtasks, onSubtasksChange])

  const toggleExpand = (taskId: number): void => {
    const next = new Set(expanded)
    if (next.has(taskId)) {
      next.delete(taskId)
    } else {
      next.add(taskId)
      if (!subtasks[taskId]) void loadSubtasks([taskId])
    }
    setExpanded(next)
  }

  const run = async (action: () => Promise<unknown>, success: string): Promise<void> => {
    try {
      await action()
      toast.success(success)
      onChanged()
    } catch (error) {
      console.error('[TaskTable]', error)
      toast.error(error instanceof Error ? error.message : 'Não foi possível concluir a ação')
    }
  }

  const { data, expandedRowKeys, rowTasks } = useMemo(() => {
    const rowTasks = new Map<string, Task>()
    const expandedRowKeys: string[] = []
    const toRow = (task: Task, groupKey?: string): TaskRow => {
      const key = rowKeyOf('t', task.id, groupKey)
      rowTasks.set(key, task)
      const subs = expanded.has(task.id) ? subtasks[task.id] : undefined
      if (subs && subs.length > 0) expandedRowKeys.push(key)
      return {
        key,
        kind: 'task',
        task,
        groupKey,
        children: subs?.length
          ? subs.map((sub) => {
              const subKey = rowKeyOf('s', sub.id, groupKey)
              rowTasks.set(subKey, sub)
              return { key: subKey, kind: 'sub' as const, task: sub, parent: task }
            })
          : undefined
      }
    }
    const data: TableRow[] = groups
      ? groups.flatMap((group) => [
          { key: `g:${group.key}`, kind: 'group' as const, group },
          ...(collapsedGroups.has(group.key) ? [] : group.tasks.map((t) => toRow(t, group.key)))
        ])
      : tasks.map((task) => toRow(task))
    return { data, expandedRowKeys, rowTasks }
  }, [groups, tasks, expanded, subtasks, collapsedGroups])

  const rowMenu = useMemo<RowMenu>(
    () => ({ taskOf: (key) => rowTasks.get(key), onOpen: onTaskClick, onScheduleForToday }),
    [rowTasks, onTaskClick, onScheduleForToday]
  )

  const selectedRowKeys = useMemo(
    () => [...rowTasks.entries()].filter(([, t]) => selectedTaskIds.has(t.id)).map(([k]) => k),
    [rowTasks, selectedTaskIds]
  )

  const now = new Date()

  const groupHeader = (group: TaskGroup): React.ReactNode => {
    const ids = group.tasks.map((t) => t.id)
    return (
      <GroupHeader
        group={group}
        collapsed={collapsedGroups.has(group.key)}
        onToggle={() => onToggleGroup(group.key)}
        allSelected={ids.length > 0 && ids.every((id) => selectedTaskIds.has(id))}
        onToggleSelection={(selected) => onToggleGroupSelection(ids, selected)}
        totalSeconds={group.tasks.reduce((sum, t) => sum + liveSeconds(t, timers), 0)}
      />
    )
  }

  const nameCell = (row: TaskLikeRow): React.ReactNode => {
    const { task } = row
    const isSub = row.kind === 'sub'
    const subtaskCount = task.subtask_count ?? 0
    const open = expanded.has(task.id)
    const otherContexts =
      groupBy === 'context' && row.kind === 'task'
        ? (task.contexts ?? []).filter((c) => `c:${c.id}` !== row.groupKey).map((c) => c.name)
        : []
    const schedule = formatTimeRange(task.scheduled_time, task.scheduled_end_time)
    const scheduleLabel =
      task.scheduled_date && schedule
        ? `Agendada: ${formatDueShort(task.scheduled_date)} · ${schedule}`
        : null
    const done = task.status === 'finalizada'
    const parentBlocked = isSub && row.parent.is_blocked && !done

    return (
      <Flex align="center" gap={6} style={{ minWidth: 0 }}>
        {subtaskCount > 0 && !isSub ? (
          <Tooltip
            title={`${subtaskCount} subtarefas, ${task.completed_subtask_count ?? 0} concluídas`}
          >
            <Button
              size="small"
              type="text"
              aria-expanded={open}
              aria-label={`${open ? 'Recolher' : 'Expandir'} ${subtaskCount} subtarefas`}
              icon={open ? <ChevronDown {...ICON} /> : <ChevronRight {...ICON} />}
              onClick={() => toggleExpand(task.id)}
              style={{ width: 24, minWidth: 24, flex: 'none' }}
            />
          </Tooltip>
        ) : isSub ? (
          <Checkbox
            checked={done}
            disabled={parentBlocked}
            aria-label={`Concluir ${task.name}`}
            title={parentBlocked ? 'Conclua as dependências da tarefa pai primeiro' : undefined}
            onChange={(event) =>
              void run(
                () =>
                  window.api.updateStatus(task.id, event.target.checked ? 'finalizada' : 'inbox'),
                event.target.checked ? 'Subtarefa concluída' : 'Subtarefa reaberta'
              )
            }
          />
        ) : (
          <span aria-hidden style={{ width: 24, flex: 'none' }} />
        )}
        {task.is_blocked && (
          <Tooltip title={blockedLabel(task.blocked_by)}>
            <Lock
              size={14}
              strokeWidth={1.75}
              role="img"
              aria-label={blockedLabel(task.blocked_by)}
              style={{ flex: 'none', color: CATEGORY_COLORS.prioridade[mode].fg }}
            />
          </Tooltip>
        )}
        {task.is_running && <LiveDot label="Timer rodando" />}
        <Typography.Link
          href={`#/task/${task.id}`}
          ellipsis
          delete={done}
          style={{
            fontWeight: 500,
            minWidth: 0,
            color: done ? token.colorTextTertiary : token.colorText
          }}
        >
          {task.name}
        </Typography.Link>
        {isSub && !showStatus && <StatusChip status={task.status} />}
        {scheduleLabel && (
          <Tooltip title={scheduleLabel}>
            <Clock
              size={13}
              strokeWidth={1.75}
              role="img"
              aria-label={scheduleLabel}
              style={{ flex: 'none', color: token.colorTextTertiary }}
            />
          </Tooltip>
        )}
        <WaitingForIcon text={task.waiting_for} />
        <JiraKey {...task} />
        {otherContexts.length > 0 && (
          <Tooltip title={`Também em ${otherContexts.join(', ')}`}>
            <Copy
              size={12}
              strokeWidth={1.75}
              role="img"
              aria-label={`Também em ${otherContexts.join(', ')}`}
              style={{ flex: 'none', color: token.colorTextTertiary }}
            />
          </Tooltip>
        )}
      </Flex>
    )
  }

  const actionsCell = (row: TaskLikeRow): React.ReactNode => (
    <TaskActions
      task={row.task}
      onOpen={onTaskClick}
      onScheduleForToday={onScheduleForToday}
      showToday={row.kind === 'task'}
    />
  )

  const baseColumns: BaseColumn[] = [
    {
      title: 'ID',
      key: 'id',
      width: 72,
      render: (row) => (
        <Typography.Text type="secondary" style={{ ...mono, fontSize: 12 }}>
          #{row.task.id}
        </Typography.Text>
      )
    },
    { title: 'Tarefa', key: 'name', render: (row) => nameCell(row) },
    ...(showStatus
      ? [
          {
            title: 'Status',
            key: 'status',
            width: 132,
            render: (row: TaskLikeRow) => <StatusChip status={row.task.status} />
          }
        ]
      : []),
    ...(screens.lg
      ? [
          {
            title: 'Categoria',
            key: 'category',
            width: 124,
            render: (row: TaskLikeRow) =>
              row.task.category && row.task.category !== 'normal' ? (
                <CategoryChip category={row.task.category} />
              ) : null
          }
        ]
      : []),
    ...(screens.xl && groupBy !== 'project' && !hideProject
      ? [
          {
            title: 'Projeto',
            key: 'project',
            width: 160,
            render: (row: TaskLikeRow) =>
              row.kind === 'sub' || !row.task.project_name ? null : (
                <ProjectLabel name={row.task.project_name} color={row.task.project_color} />
              )
          }
        ]
      : []),
    ...(screens.lg && groupBy !== 'context'
      ? [
          {
            title: 'Contextos',
            key: 'contexts',
            width: 150,
            render: (row: TaskLikeRow) =>
              row.kind === 'sub' ? null : (
                <ContextsCell
                  taskId={row.task.id}
                  value={row.task.contexts ?? []}
                  options={contexts}
                />
              )
          }
        ]
      : []),
    ...(screens.xl
      ? [
          {
            title: 'Energia',
            key: 'energy',
            width: 76,
            render: (row: TaskLikeRow) =>
              row.task.energy_level ? <EnergyMeter level={row.task.energy_level} /> : null
          }
        ]
      : []),
    ...(screens.md
      ? [
          {
            title: 'Prazo',
            key: 'due',
            width: 104,
            render: (row: TaskLikeRow) =>
              row.task.due_date ? (
                <Typography.Text type={dueTone(row.task.due_date, now)} style={mono}>
                  {formatDueShort(row.task.due_date, row.task.due_time)}
                </Typography.Text>
              ) : null
          }
        ]
      : []),
    {
      title: 'Tempo',
      key: 'time',
      width: 84,
      align: 'right' as const,
      render: (row) => (
        <span style={mono}>{formatShortDuration(liveSeconds(row.task, timers))}</span>
      )
    },
    {
      title: <span className="sr-only">Ações</span>,
      key: 'actions',
      width: 104,
      render: (row) => actionsCell(row)
    }
  ]

  const columns: TableColumnsType<TableRow> = baseColumns.map((column, index) => ({
    title: column.title,
    key: column.key,
    width: column.width,
    align: column.align,
    render: (_: unknown, row: TableRow) => {
      if (row.kind === 'group') return index === 0 ? groupHeader(row.group) : null
      return column.render(row)
    },
    onCell: (row: TableRow) =>
      row.kind === 'group' ? { colSpan: index === 0 ? baseColumns.length : 0 } : {}
  }))

  const minTableWidth =
    baseColumns.reduce((sum, column) => sum + (column.width ?? 0), 0) + 40 + NAME_MIN_WIDTH

  const onRow = (row: TableRow): React.HTMLAttributes<HTMLElement> => {
    if (row.kind === 'group') return {}
    const level =
      row.kind === 'task'
        ? timeLeakLevel(row.task.category, liveSeconds(row.task, timers), leakThresholds)
        : 0
    return {
      style: { cursor: 'pointer', background: timeLeakBackground(mode, level) },
      onClick: (event) => {
        const target = event.target as HTMLElement
        if (!event.currentTarget.contains(target) || target.closest(INTERACTIVE)) return
        onTaskClick(row.task.id)
      }
    }
  }

  return (
    <RowMenuContext.Provider value={rowMenu}>
      <Table<TableRow>
        rowKey="key"
        size={screens.xxl ? 'middle' : 'small'}
        tableLayout="fixed"
        scroll={{ x: minTableWidth }}
        rowClassName={(row) => (row.kind === 'group' ? 'ct-table-grouprow' : '')}
        columns={columns}
        dataSource={data}
        pagination={false}
        components={TABLE_COMPONENTS}
        onRow={onRow}
        expandable={{
          expandedRowKeys,
          expandIcon: () => null,
          indentSize: 28,
          expandIconColumnIndex: 3
        }}
        rowSelection={{
          selectedRowKeys,
          checkStrictly: true,
          columnWidth: 40,
          getCheckboxProps: (row) => ({
            disabled: row.kind === 'group',
            'aria-label': row.kind === 'group' ? undefined : `Selecionar ${row.task.name}`
          }),
          renderCell: (_checked, row, _index, node) => (row.kind === 'group' ? null : node),
          onSelect: (row, selected) => {
            if (row.kind !== 'group') onToggleTaskSelection(row.task.id, selected)
          },
          onSelectAll: (selected) => onToggleSelectAll(selected)
        }}
      />
    </RowMenuContext.Provider>
  )
}
