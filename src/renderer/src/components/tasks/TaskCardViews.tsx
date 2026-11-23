import { useState } from 'react'
import { Flex, Typography, theme, type GlobalToken } from 'antd'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type KeyboardCoordinateGetter
} from '@dnd-kit/core'
import type { Context, Task } from '@shared/types'
import { GroupDragButton, SortableGroups } from '@renderer/components/SortableGroups'
import { useBoardPan } from '@renderer/hooks/useBoardPan'
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
  hideProject?: boolean
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
      showProject={!props.hideProject && groupBy !== 'project'}
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
  collapsedGroups: Set<string>
  onToggleGroup: (key: string) => void
}

export function TaskCardGroups(props: TaskCardGroupsProps): React.JSX.Element {
  const { token } = theme.useToken()
  const timers = useTimerStore((s) => s.timers)
  const {
    groups,
    groupBy,
    selectedTaskIds,
    onToggleGroupSelection,
    onReorderGroups,
    collapsedGroups,
    onToggleGroup
  } = props

  return (
    <SortableGroups
      keys={groups.map((group) => group.key)}
      direction="vertical"
      onReorder={onReorderGroups}
    >
      {groups.map((group) => {
        const ids = group.tasks.map((t) => t.id)
        const isCollapsed = collapsedGroups.has(group.key)
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
                onToggle={() => onToggleGroup(group.key)}
                allSelected={ids.length > 0 && ids.every((id) => selectedTaskIds.has(id))}
                onToggleSelection={(selected) => onToggleGroupSelection(ids, selected)}
                totalSeconds={group.tasks.reduce((sum, t) => sum + liveSeconds(t, timers), 0)}
                dragHandle={onReorderGroups ? <GroupDragButton label={group.label} /> : undefined}
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
  onMoveTask?: (taskId: number, columnKey: string) => void
  columnIcon?: (column: TaskGroup) => React.ReactNode
  emptyText?: string
}

const COLUMN_LIST_MAX_HEIGHT = 'max(320px, calc(100vh - 320px))'

const BOARD_GRID: React.CSSProperties = {
  display: 'grid',
  gridAutoFlow: 'column',
  gridAutoColumns: 'minmax(260px, 1fr)',
  alignItems: 'start',
  gap: 12
}

const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args)
  if (hits.length > 0) return hits
  const pointer = args.pointerCoordinates
  if (pointer) {
    const column = args.droppableContainers.find((container) => {
      const rect = args.droppableRects.get(container.id)
      return rect && pointer.x >= rect.left && pointer.x <= rect.right
    })
    if (column) return [{ id: column.id }]
  }
  return rectIntersection(args)
}

const columnCoordinates: KeyboardCoordinateGetter = (event, { context, currentCoordinates }) => {
  const { collisionRect, droppableRects } = context
  if (!collisionRect || (event.code !== 'ArrowRight' && event.code !== 'ArrowLeft')) {
    return undefined
  }
  event.preventDefault()
  const center = collisionRect.left + collisionRect.width / 2
  const forward = event.code === 'ArrowRight'
  let target: { left: number; top: number; width: number } | null = null
  for (const rect of droppableRects.values()) {
    const rectCenter = rect.left + rect.width / 2
    const ahead = forward ? rectCenter > center + 1 : rectCenter < center - 1
    if (!ahead) continue
    if (!target || (forward ? rect.left < target.left : rect.left > target.left)) target = rect
  }
  if (!target) return currentCoordinates
  return {
    x: target.left + target.width / 2 - collisionRect.width / 2,
    y: Math.min(currentCoordinates.y, target.top + 8)
  }
}

function dndAccessibility(
  columns: TaskGroup[]
): React.ComponentProps<typeof DndContext>['accessibility'] {
  const label = (id: string | number | undefined): string =>
    columns.find((col) => col.key === String(id))?.label ?? String(id)
  const taskName = (id: string | number): string =>
    columns.flatMap((col) => col.tasks).find((task) => task.id === Number(id))?.name ?? 'Card'
  return {
    screenReaderInstructions: {
      draggable:
        'Para mover o card, aperte espaço ou Enter. Use as setas para trocar de coluna e aperte espaço ou Enter de novo para soltar, ou Esc para cancelar.'
    },
    announcements: {
      onDragStart: ({ active }) => `${taskName(active.id)} pego.`,
      onDragOver: ({ over }) => (over ? `Sobre a coluna ${label(over.id)}.` : 'Fora das colunas.'),
      onDragEnd: ({ over }) =>
        over ? `Card solto na coluna ${label(over.id)}.` : 'Card solto fora das colunas.',
      onDragCancel: () => 'Movimento cancelado.'
    }
  }
}

function columnBoxStyle(token: GlobalToken, over: boolean): React.CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    padding: 10,
    background: over ? token.colorPrimaryBg : token.colorBgLayout,
    border: `1px solid ${over ? token.colorPrimary : token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    transition: `border-color ${token.motionDurationFast}, background-color ${token.motionDurationFast}`
  }
}

function ColumnHeader({
  column,
  columnIcon,
  dragHandle
}: {
  column: TaskGroup
  columnIcon?: (column: TaskGroup) => React.ReactNode
  dragHandle?: React.ReactNode
}): React.JSX.Element {
  const { token } = theme.useToken()
  return (
    <Flex align="center" gap={8} style={{ marginBottom: 8, minWidth: 0, flex: 'none' }}>
      {dragHandle}
      {columnIcon ? (
        columnIcon(column)
      ) : column.icon ? (
        <span aria-hidden>{column.icon}</span>
      ) : column.color ? (
        <span
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            flex: 'none',
            background: column.color
          }}
        />
      ) : null}
      <Typography.Text strong ellipsis style={{ minWidth: 0 }}>
        {column.label}
      </Typography.Text>
      <Typography.Text
        type="secondary"
        style={{ fontFamily: token.fontFamilyCode, fontVariantNumeric: 'tabular-nums' }}
      >
        {column.tasks.length}
      </Typography.Text>
    </Flex>
  )
}

function ColumnList({
  children,
  empty
}: {
  children: React.ReactNode
  empty?: string
}): React.JSX.Element {
  return (
    <Flex
      vertical
      gap={8}
      style={{
        maxHeight: COLUMN_LIST_MAX_HEIGHT,
        overflowY: 'auto',
        scrollbarWidth: 'thin',
        marginInline: -4,
        paddingInline: 4
      }}
    >
      {children}
      {empty && (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {empty}
        </Typography.Text>
      )}
    </Flex>
  )
}

function staticCards(tasks: Task[], props: CardCommonProps, groupBy: GroupBy): React.JSX.Element[] {
  return cardsOf(tasks, props, groupBy).map((card) => (
    <div key={card.key} data-kanban-card style={{ cursor: 'auto' }}>
      {card}
    </div>
  ))
}

function SortableBoard(props: TaskKanbanProps): React.JSX.Element {
  const { token } = theme.useToken()
  const { columns, groupBy, onReorderColumns, columnIcon, emptyText } = props
  return (
    <SortableGroups
      keys={columns.map((col) => col.key)}
      direction="horizontal"
      onReorder={onReorderColumns}
      style={BOARD_GRID}
    >
      {columns.map((col) => (
        <SortableGroups.Item key={col.key} id={col.key} style={columnBoxStyle(token, false)}>
          <ColumnHeader
            column={col}
            columnIcon={columnIcon}
            dragHandle={onReorderColumns ? <GroupDragButton label={col.label} /> : undefined}
          />
          <ColumnList empty={col.tasks.length === 0 ? emptyText : undefined}>
            {staticCards(col.tasks, props, groupBy)}
          </ColumnList>
        </SortableGroups.Item>
      ))}
    </SortableGroups>
  )
}

function DroppableColumn({
  column,
  columnIcon,
  dragging,
  emptyText,
  children
}: {
  column: TaskGroup
  columnIcon?: (column: TaskGroup) => React.ReactNode
  dragging: boolean
  emptyText?: string
  children: React.ReactNode
}): React.JSX.Element {
  const { token } = theme.useToken()
  const { setNodeRef, isOver } = useDroppable({ id: column.key })
  return (
    <div ref={setNodeRef} style={columnBoxStyle(token, isOver)}>
      <ColumnHeader column={column} columnIcon={columnIcon} />
      <ColumnList
        empty={column.tasks.length === 0 ? (dragging ? 'Solte aqui' : emptyText) : undefined}
      >
        {children}
      </ColumnList>
    </div>
  )
}

function DraggableCard({
  taskId,
  children
}: {
  taskId: number
  children: React.ReactNode
}): React.JSX.Element {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: taskId,
    attributes: { role: 'group', roleDescription: 'card arrastável' }
  })
  return (
    <div
      ref={(node) => {
        setNodeRef(node)
        setActivatorNodeRef(node)
      }}
      data-kanban-card
      {...attributes}
      {...listeners}
      style={{ cursor: 'grab', opacity: isDragging ? 0.4 : 1, touchAction: 'none' }}
    >
      {children}
    </div>
  )
}

function DraggableBoard(
  props: TaskKanbanProps & { onMoveTask: (taskId: number, columnKey: string) => void }
): React.JSX.Element {
  const { token } = theme.useToken()
  const { columns, groupBy, columnIcon, emptyText, onMoveTask } = props
  const [activeId, setActiveId] = useState<number | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: columnCoordinates })
  )
  const columnOf = (taskId: number): string | undefined =>
    columns.find((col) => col.tasks.some((task) => task.id === taskId))?.key
  const active =
    activeId === null ? null : columns.flatMap((col) => col.tasks).find((t) => t.id === activeId)

  const handleDragEnd = ({ active: dragged, over }: DragEndEvent): void => {
    setActiveId(null)
    if (!over) return
    const taskId = Number(dragged.id)
    const target = String(over.id)
    if (columnOf(taskId) !== target) onMoveTask(taskId, target)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      accessibility={dndAccessibility(columns)}
      onDragStart={({ active: dragged }) => setActiveId(Number(dragged.id))}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={handleDragEnd}
    >
      <div style={BOARD_GRID}>
        {columns.map((col) => (
          <DroppableColumn
            key={col.key}
            column={col}
            columnIcon={columnIcon}
            dragging={activeId !== null}
            emptyText={emptyText}
          >
            {cardsOf(col.tasks, props, groupBy).map((card, index) => (
              <DraggableCard key={card.key} taskId={col.tasks[index].id}>
                {card}
              </DraggableCard>
            ))}
          </DroppableColumn>
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {active ? (
          <div
            style={{
              cursor: 'grabbing',
              boxShadow: token.boxShadowSecondary,
              borderRadius: token.borderRadiusLG
            }}
          >
            {cardsOf([active], props, groupBy)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

export function TaskKanban(props: TaskKanbanProps): React.JSX.Element {
  const { ref, panning } = useBoardPan<HTMLDivElement>()
  const { onMoveTask } = props
  return (
    <div
      ref={ref}
      tabIndex={0}
      role="region"
      aria-label="Quadro Kanban"
      style={{
        overflowX: 'auto',
        paddingBottom: 8,
        cursor: panning ? 'grabbing' : 'grab',
        userSelect: panning ? 'none' : undefined
      }}
    >
      {onMoveTask ? (
        <DraggableBoard {...props} onMoveTask={onMoveTask} />
      ) : (
        <SortableBoard {...props} />
      )}
    </div>
  )
}
