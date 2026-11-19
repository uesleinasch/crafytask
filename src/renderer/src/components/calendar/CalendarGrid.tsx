import { useEffect, useMemo, useRef, useState } from 'react'
import { Dropdown, Popover, Tooltip, theme } from 'antd'
import { Calendar, CalendarSync, Check, Copy, FileText, Flag, Play, Trash2 } from 'lucide-react'
import type { TaskCategory, TimeBlock } from '@shared/types'
import { calendarPrefs } from '@shared/calendarPrefs'
import { CATEGORY_ICONS } from '@renderer/components/chips/categoryMeta'
import { LiveDot } from '@renderer/components/chips/LiveDot'
import {
  CAL_BLOCK_COLORS,
  CATEGORY_COLORS,
  timeLeakBackground,
  timeLeakLevel
} from '@renderer/theme/semantic'
import { useThemeSettings } from '@renderer/theme/themeSettings'
import type { CalendarRangeData } from '@renderer/hooks/useCalendar'
import { BlockPopover, type BlockActions } from './BlockPopover'
import {
  allDayOf,
  blocksOfDay,
  clampToGrid,
  durationLabel,
  eventsOfDay,
  fromMin,
  DRAG_TYPE,
  isWeekend,
  layoutDay,
  movedTimes,
  resizedEnd,
  plannedMinutes,
  sessionsOfDay,
  toMin,
  type AllDayItem,
  type GridView,
  type PlacedItem,
  type ShowKey
} from './calendarView'

interface CalendarGridProps {
  view: GridView
  days: string[]
  today: string
  now: Date
  data: CalendarRangeData
  show: Set<ShowKey>
  onOpenDay: (date: string) => void
  onSlotClick: (date: string, minutes: number) => void
  onTaskOpen: (taskId: number) => void
  blockActions: GridBlockActions
  onDropTask: (taskId: number, date: string, minutes: number) => void
  onDropChip: (kind: AllDayItem['kind'], taskId: number, date: string) => void
}

export interface GridBlockActions extends BlockActions {
  onMove: (block: TimeBlock, patch: { date?: string; start_time: string; end_time: string }) => void
  onDuplicate: (block: TimeBlock) => void
}

interface DragState {
  block: TimeBlock
  kind: 'move' | 'resize'
  x: number
  y: number
  dx: number
  dy: number
  dayWidth: number
}

interface DropPayload {
  taskId: number
  chip?: AllDayItem['kind']
}

function readDrop(event: React.DragEvent): DropPayload | null {
  try {
    const data = JSON.parse(event.dataTransfer.getData(DRAG_TYPE)) as DropPayload
    return typeof data.taskId === 'number' ? data : null
  } catch {
    return null
  }
}

const HOUR_LABEL_WIDTH = 52

function weekdayShort(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })
    .format(new Date(`${date}T12:00:00`))
    .replace('.', '')
}

function longDay(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(new Date(`${date}T12:00:00`))
}

export function CalendarGrid({
  view,
  days,
  today,
  now,
  data,
  show,
  onOpenDay,
  onSlotClick,
  onTaskOpen,
  blockActions,
  onDropTask,
  onDropChip
}: CalendarGridProps): React.JSX.Element {
  const { token } = theme.useToken()
  const { mode, density } = useThemeSettings()
  const prefs = calendarPrefs()
  const { dayStartHour: h0, dayEndHour: h1, journeyMinutes } = prefs
  const hourHeight = density === 'compact' ? 40 : 48
  const pxPerMin = hourHeight / 60
  const scrollRef = useRef<HTMLDivElement>(null)
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const minColumn = view === 'week' ? 96 : 140
  const columns = `${HOUR_LABEL_WIDTH}px repeat(${days.length}, minmax(${minColumn}px, 1fr))`
  const gridMinWidth = HOUR_LABEL_WIDTH + days.length * minColumn
  const tasksById = useMemo(() => new Map(data.tasks.map((t) => [t.id, t])), [data.tasks])
  const gridRef = useRef<HTMLDivElement>(null)
  const [openId, setOpenId] = useState<number | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const dragging = drag !== null
  const dragRef = useRef<DragState | null>(null)
  dragRef.current = drag
  const suppressClick = useRef(false)
  const actionsRef = useRef(blockActions)
  actionsRef.current = blockActions

  useEffect(() => {
    if (!dragging) return
    const move = (e: PointerEvent): void =>
      setDrag((d) => d && { ...d, dx: e.clientX - d.x, dy: e.clientY - d.y })
    const up = (): void => {
      const d = dragRef.current
      setDrag(null)
      if (!d) return
      const moved = Math.abs(d.dx) > 4 || Math.abs(d.dy) > 4
      if (moved || d.kind === 'resize') suppressClick.current = true
      if (!moved) return
      const deltaMin = d.dy / pxPerMin
      const { block } = d
      if (d.kind === 'resize') {
        actionsRef.current.onMove(block, {
          start_time: block.start_time,
          end_time: resizedEnd(block.start_time, block.end_time, deltaMin, h1)
        })
        return
      }
      const shift = view === 'day' ? 0 : Math.round(d.dx / d.dayWidth)
      const index = days.indexOf(block.date)
      const target =
        index >= 0 ? days[Math.min(days.length - 1, Math.max(0, index + shift))] : block.date
      actionsRef.current.onMove(block, {
        date: target,
        ...movedTimes(block.start_time, block.end_time, deltaMin, h0, h1)
      })
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [dragging, pxPerMin, h0, h1, view, days])

  function startDrag(e: React.PointerEvent, block: TimeBlock, kind: DragState['kind']): void {
    if (e.button !== 0) return
    e.stopPropagation()
    suppressClick.current = false
    const column = gridRef.current?.querySelector('.ct-calcol')
    const dayWidth = column ? column.getBoundingClientRect().width : 120
    setDrag({ block, kind, x: e.clientX, y: e.clientY, dx: 0, dy: 0, dayWidth })
  }

  function preview(item: PlacedItem): { start: string; end: string; shift: number } {
    if (!drag || !item.block || drag.block.id !== item.block.id) {
      return { start: item.start, end: item.end, shift: 0 }
    }
    const deltaMin = drag.dy / pxPerMin
    if (drag.kind === 'resize') {
      return { start: item.start, end: resizedEnd(item.start, item.end, deltaMin, h1), shift: 0 }
    }
    const moved = movedTimes(item.start, item.end, deltaMin, h0, h1)
    const shift = view === 'day' ? 0 : Math.round(drag.dx / drag.dayWidth) * drag.dayWidth
    return { start: moved.start_time, end: moved.end_time, shift }
  }

  function blockMenu(block: TimeBlock): React.ComponentProps<typeof Dropdown>['menu'] {
    const icon = { size: 14, strokeWidth: 1.75 }
    return {
      items: [
        { key: 'open', icon: <FileText {...icon} />, label: 'Abrir tarefa' },
        { key: 'timer', icon: <Play {...icon} />, label: 'Iniciar timer' },
        { key: 'dup', icon: <Copy {...icon} />, label: 'Repetir no dia seguinte' },
        { type: 'divider' },
        { key: 'del', icon: <Trash2 {...icon} />, label: 'Excluir bloco', danger: true }
      ],
      onClick: ({ key, domEvent }) => {
        domEvent.stopPropagation()
        if (key === 'open') blockActions.onOpen(block.task_id)
        if (key === 'timer') blockActions.onStartTimer(block)
        if (key === 'dup') blockActions.onDuplicate(block)
        if (key === 'del') blockActions.onDelete(block)
      }
    }
  }

  const popoverActions: BlockActions = {
    ...blockActions,
    onStartTimer: (block) => {
      setOpenId(null)
      blockActions.onStartTimer(block)
    },
    onDelete: (block) => {
      setOpenId(null)
      blockActions.onDelete(block)
    }
  }

  const scrollKey = `${view}:${days[0]}`
  useEffect(() => {
    const el = scrollRef.current
    const current = new Date()
    const minutes = current.getHours() * 60 + current.getMinutes()
    if (el) el.scrollTop = Math.max(0, (minutes - h0 * 60) * pxPerMin - 160)
  }, [scrollKey, h0, pxPerMin])

  const cssVars = {
    '--ct-cal-block': CAL_BLOCK_COLORS[mode].calBlock,
    '--ct-cal-block-border': CAL_BLOCK_COLORS[mode].calBlockBorder
  } as React.CSSProperties

  function categoryIcon(category: TaskCategory | undefined): React.ReactNode {
    if (!category || category === 'normal') return null
    const Icon = CATEGORY_ICONS[category]
    return (
      <Icon
        size={11}
        strokeWidth={2}
        aria-hidden
        style={{ flex: 'none', color: CATEGORY_COLORS[category][mode].fg }}
      />
    )
  }

  function itemEl(item: PlacedItem, date: string): React.ReactNode {
    const shown = preview(item)
    const geometry = clampToGrid(toMin(shown.start), toMin(shown.end), h0, h1)
    if (!geometry) return null
    const block = item.block
    const task = item.task ?? tasksById.get(item.taskId)
    const name = block?.task_name ?? task?.name ?? 'Tarefa'
    const category = block?.task_category ?? task?.category
    const status = block?.task_status ?? task?.status
    const seconds = block?.task_total_seconds ?? task?.total_seconds ?? 0
    const projectColor = block ? block.project_color : task?.project_color
    const gcal = block ? !!block.task_gcal_sync : !!task?.gcal_sync
    const running =
      (block ? !!block.task_running : !!task?.is_running) &&
      date === today &&
      toMin(item.start) <= nowMin &&
      toMin(item.end) >= nowMin
    const leak = timeLeakLevel(category, seconds)
    const done = status === 'finalizada'
    const event = item.kind === 'event'
    const top = geometry.top * pxPerMin
    const height = Math.max(18, geometry.length * pxPerMin - 2)
    const width = 100 / item.cols
    const short = height < 34
    const isDragging = !!block && drag?.block.id === block.id

    return (
      <div
        key={item.key}
        style={{
          position: 'absolute',
          top,
          height,
          left: `calc(${item.col * width}% + 2px)`,
          width: `calc(${width}% - 4px)`,
          transform: shown.shift ? `translateX(${shown.shift}px)` : undefined,
          zIndex: isDragging ? 5 : block && openId === block.id ? 4 : 2
        }}
      >
        {block ? (
          <Dropdown menu={blockMenu(block)} trigger={['contextMenu']}>
            <div style={{ height: '100%' }}>
              <Popover
                open={openId === block.id}
                onOpenChange={(open) => {
                  if (open && suppressClick.current) {
                    suppressClick.current = false
                    return
                  }
                  setOpenId(open ? block.id : null)
                }}
                trigger="click"
                placement="right"
                destroyOnHidden
                content={<BlockPopover block={block} actions={popoverActions} />}
              >
                {body()}
              </Popover>
            </div>
          </Dropdown>
        ) : (
          body()
        )}
      </div>
    )

    function body(): React.ReactNode {
      return (
        <div
          role="button"
          tabIndex={0}
          className={[
            'ct-calblock',
            event ? 'event' : '',
            leak ? 'leak' : '',
            done ? 'done' : '',
            isDragging ? 'dragging' : ''
          ].join(' ')}
          style={leak ? { background: timeLeakBackground(mode, leak) } : undefined}
          aria-label={`${name}, ${shown.start} a ${shown.end}, ${event ? 'tarefa com horário' : 'bloco de tempo'}`}
          onPointerDown={block ? (e) => startDrag(e, block, 'move') : undefined}
          onClick={(e) => {
            e.stopPropagation()
            if (!block) onTaskOpen(item.taskId)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              if (block) setOpenId(block.id)
              else onTaskOpen(item.taskId)
            }
            if (e.key === 'Delete' && block) {
              e.preventDefault()
              blockActions.onDelete(block)
            }
          }}
        >
          <div className="ct-calblock-title">
            {running && <LiveDot />}
            {projectColor && (
              <span
                aria-hidden
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  flex: 'none',
                  background: projectColor
                }}
              />
            )}
            {event && <Calendar size={11} strokeWidth={2} aria-hidden style={{ flex: 'none' }} />}
            {categoryIcon(category)}
            {done && <Check size={11} strokeWidth={2} aria-hidden style={{ flex: 'none' }} />}
            <span className="ct-calblock-name">{name}</span>
          </div>
          {!short && (
            <div className="ct-calblock-time">
              {shown.start}–{shown.end}
              {gcal && (
                <CalendarSync
                  size={10}
                  strokeWidth={2}
                  aria-label="Na agenda do Google"
                  style={{ marginLeft: 4, verticalAlign: -1 }}
                />
              )}
            </div>
          )}
          {block && (
            <span
              className="ct-calblock-resize"
              aria-hidden
              onPointerDown={(e) => startDrag(e, block, 'resize')}
            />
          )}
        </div>
      )
    }
  }

  function chip(item: AllDayItem): React.ReactNode {
    const { task } = item
    const due = item.kind === 'due'
    const dueDate = task.due_date?.slice(0, 10)
    const tone =
      due && dueDate && dueDate < today
        ? token.colorError
        : due && dueDate === today
          ? token.colorWarning
          : token.colorTextTertiary
    return (
      <button
        key={item.key}
        type="button"
        className={due ? 'ct-calchip due' : 'ct-calchip'}
        draggable
        onDragStart={(e) =>
          e.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ taskId: task.id, chip: item.kind }))
        }
        onClick={() => onTaskOpen(task.id)}
        title={`${due ? 'Prazo' : 'Agendada'}: ${task.name}${due && task.due_time ? ` às ${task.due_time}` : ''}`}
        aria-label={`${due ? 'Prazo' : 'Agendada'}: ${task.name}${due && task.due_time ? ` às ${task.due_time}` : ''}`}
      >
        {due ? (
          <Flag size={12} strokeWidth={2} aria-hidden style={{ flex: 'none', color: tone }} />
        ) : task.project_color ? (
          <span
            aria-hidden
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              flex: 'none',
              background: task.project_color
            }}
          />
        ) : null}
        <span className="ct-calblock-name" style={{ flex: 1 }}>
          {task.name}
        </span>
        {due && task.due_time && (
          <span style={{ fontFamily: token.fontFamilyCode, color: token.colorTextTertiary }}>
            {task.due_time}
          </span>
        )}
      </button>
    )
  }

  const empty = days.every(
    (d) =>
      !(show.has('block') && blocksOfDay(data.blocks, d).length) &&
      !(show.has('event') && eventsOfDay(data.tasks, d).length) &&
      !allDayOf(data.tasks, d, show).length &&
      !(show.has('sessions') && sessionsOfDay(data.sessions, d, now).length)
  )

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <div className="ct-calscroll" ref={scrollRef} style={cssVars}>
        <div className="ct-calsticky" style={{ minWidth: gridMinWidth }}>
          <div className="ct-calhead" style={{ gridTemplateColumns: columns }}>
            <span />
            {days.map((d) => {
              const planned = plannedMinutes(data.blocks, d)
              const over = planned > journeyMinutes
              return (
                <div key={d} className="ct-calhead-day">
                  <button
                    type="button"
                    className="ct-calhead-btn"
                    onClick={() => onOpenDay(d)}
                    aria-label={`Ver ${longDay(d)}`}
                  >
                    <span style={{ fontSize: 12, color: token.colorTextTertiary }}>
                      {weekdayShort(d)}
                    </span>
                    <span
                      className={d === today ? 'ct-calnum today' : 'ct-calnum'}
                      aria-current={d === today ? 'date' : undefined}
                    >
                      {Number(d.slice(8))}
                    </span>
                  </button>
                  <Tooltip
                    title={
                      planned
                        ? `${durationLabel(planned)} em blocos de ${durationLabel(journeyMinutes)} da jornada${over ? ' · passa da jornada' : ''}`
                        : 'Nenhum bloco'
                    }
                  >
                    <div
                      className="ct-calload"
                      role="img"
                      aria-label={`${durationLabel(planned)} planejadas${over ? ', passa da jornada' : ''}`}
                    >
                      <span
                        style={{
                          width: `${Math.min(100, (planned / journeyMinutes) * 100)}%`,
                          background: over ? token.colorWarning : token.colorPrimary
                        }}
                      />
                    </div>
                  </Tooltip>
                </div>
              )
            })}
          </div>
          <div className="ct-calallday" style={{ gridTemplateColumns: columns }}>
            <span className="ct-calhour">Dia</span>
            {days.map((d) => {
              const list = allDayOf(data.tasks, d, show)
              const max = view === 'day' ? 6 : 2
              return (
                <div
                  key={d}
                  className="ct-calallday-cell"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const payload = readDrop(e)
                    if (payload?.chip) onDropChip(payload.chip, payload.taskId, d)
                  }}
                >
                  {list.slice(0, max).map(chip)}
                  {list.length > max && (
                    <Popover
                      trigger="click"
                      content={
                        <div
                          style={{ width: 240, display: 'flex', flexDirection: 'column', gap: 4 }}
                        >
                          {list.map(chip)}
                        </div>
                      }
                    >
                      <button
                        type="button"
                        className="ct-calmore"
                        aria-label={`Mais ${list.length - max} em ${longDay(d)}`}
                      >
                        +{list.length - max}
                      </button>
                    </Popover>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        <div
          className="ct-calgrid"
          ref={gridRef}
          style={{
            gridTemplateColumns: columns,
            minWidth: gridMinWidth,
            height: (h1 - h0) * hourHeight
          }}
        >
          <div style={{ position: 'relative' }}>
            {Array.from({ length: h1 - h0 - 1 }, (_, i) => i + 1).map((i) => (
              <span key={i} className="ct-calhour" style={{ top: i * hourHeight }}>
                {String(h0 + i).padStart(2, '0')}:00
              </span>
            ))}
          </div>
          {days.map((d) => {
            const items = [
              ...(show.has('block') ? blocksOfDay(data.blocks, d) : []),
              ...(show.has('event') ? eventsOfDay(data.tasks, d) : [])
            ]
            return (
              <div
                key={d}
                className={isWeekend(d) ? 'ct-calcol weekend' : 'ct-calcol'}
                style={{ backgroundSize: `100% ${hourHeight}px` }}
                onClick={(e) => {
                  if (e.target !== e.currentTarget) return
                  const rect = e.currentTarget.getBoundingClientRect()
                  onSlotClick(d, h0 * 60 + (e.clientY - rect.top) / pxPerMin - 30)
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const payload = readDrop(e)
                  if (!payload) return
                  if (payload.chip) {
                    onDropChip(payload.chip, payload.taskId, d)
                    return
                  }
                  const rect = e.currentTarget.getBoundingClientRect()
                  onDropTask(payload.taskId, d, h0 * 60 + (e.clientY - rect.top) / pxPerMin)
                }}
              >
                {layoutDay(items).map((item) => itemEl(item, d))}
                {show.has('sessions') &&
                  sessionsOfDay(data.sessions, d, now).map((s) => {
                    const geometry = clampToGrid(s.start, s.end, h0, h1)
                    if (!geometry) return null
                    const end = s.running ? 'agora' : formatClock(s.end)
                    return (
                      <Tooltip
                        key={s.key}
                        placement="right"
                        title={`Sessão ${formatClock(s.start)}–${s.running ? 'agora' : formatClock(s.end)} · ${s.span.task_name}`}
                      >
                        <span
                          className={s.running ? 'ct-calsession running' : 'ct-calsession'}
                          role="img"
                          aria-label={`Sessão até ${end}, ${s.span.task_name}`}
                          style={{
                            top: geometry.top * pxPerMin,
                            height: Math.max(3, geometry.length * pxPerMin)
                          }}
                        />
                      </Tooltip>
                    )
                  })}
                {d === today && nowMin >= h0 * 60 && nowMin <= h1 * 60 && (
                  <span
                    className="ct-calnow"
                    style={{ top: (nowMin - h0 * 60) * pxPerMin }}
                    role="img"
                    aria-label={`Agora, ${formatClock(nowMin)}`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
      {empty && (
        <div className="ct-calempty">
          <Calendar size={14} strokeWidth={1.75} aria-hidden />
          {
            'Nada nestes dias. Clique na grade ou arraste uma tarefa de “A agendar” para reservar tempo.'
          }
        </div>
      )}
    </div>
  )
}

function formatClock(minutes: number): string {
  return fromMin(Math.min(minutes, 24 * 60 - 1))
}
