import { useEffect, useMemo, useRef, useState } from 'react'
import { Dropdown, Grid, Popover, Tooltip, theme } from 'antd'
import { Calendar, CalendarSync, Check, Copy, FileText, Play, Trash2 } from 'lucide-react'
import type { Task, TaskCategory, TimeBlock } from '@shared/types'
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
import { BlockPopover, type PopoverSubject } from './BlockPopover'
import { CalendarChip } from './CalendarChip'
import {
  allDayOf,
  blocksOfDay,
  chipAlreadyOn,
  readDropPayload,
  clampToGrid,
  durationLabel,
  eventsOfDay,
  fromMin,
  isWeekend,
  layoutDay,
  movedTimes,
  resizedEnd,
  shiftedDay,
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

export interface BlockPatch {
  date?: string
  start_time: string
  end_time: string
}

export interface GridBlockActions {
  onOpen: (taskId: number) => void
  onStartTimer: (taskId: number, name: string) => void
  onMove: (block: TimeBlock, patch: BlockPatch, kind: 'move' | 'resize' | 'edit') => void
  onDuplicate: (block: TimeBlock) => void
  onDelete: (block: TimeBlock) => void
  onEventChange: (task: Task, patch: BlockPatch, kind: 'move' | 'resize' | 'edit') => void
}

interface DragState {
  key: string
  date: string
  start: string
  end: string
  block?: TimeBlock
  task?: Task
  kind: 'move' | 'resize'
  x: number
  y: number
  dx: number
  dy: number
  dayWidth: number
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
  const screens = Grid.useBreakpoint()
  const [openKey, setOpenKey] = useState<string | null>(null)
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
    const cancel = (): void => {
      suppressClick.current = true
      setDrag(null)
    }
    const key = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') cancel()
    }
    const up = (): void => {
      const d = dragRef.current
      setDrag(null)
      if (!d) return
      const moved = Math.abs(d.dx) > 4 || Math.abs(d.dy) > 4
      if (moved || d.kind === 'resize') suppressClick.current = true
      if (!moved) return
      const deltaMin = d.dy / pxPerMin
      const commit = (patch: BlockPatch, kind: DragState['kind']): void => {
        if (d.block) actionsRef.current.onMove(d.block, patch, kind)
        else if (d.task) actionsRef.current.onEventChange(d.task, patch, kind)
      }
      if (d.kind === 'resize') {
        const end_time = resizedEnd(d.start, d.end, deltaMin, h1)
        if (end_time !== d.end) commit({ start_time: d.start, end_time }, 'resize')
        return
      }
      const target = shiftedDay(days, d.date, d.dx / d.dayWidth)
      const times = movedTimes(d.start, d.end, deltaMin, h0, h1)
      if (target === d.date && times.start_time === d.start) return
      commit({ date: target, ...times }, 'move')
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    window.addEventListener('keydown', key)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      window.removeEventListener('keydown', key)
    }
  }, [dragging, pxPerMin, h0, h1, view, days])

  function startDrag(
    e: React.PointerEvent,
    item: PlacedItem,
    date: string,
    kind: DragState['kind']
  ): void {
    if (e.button !== 0) return
    e.stopPropagation()
    suppressClick.current = false
    const column = gridRef.current?.querySelector('.ct-calcol')
    const dayWidth = column ? column.getBoundingClientRect().width : 120
    setDrag({
      key: item.key,
      date,
      start: item.start,
      end: item.end,
      block: item.block,
      task: item.task ?? tasksById.get(item.taskId),
      kind,
      x: e.clientX,
      y: e.clientY,
      dx: 0,
      dy: 0,
      dayWidth
    })
  }

  function preview(item: PlacedItem): { start: string; end: string; shift: number } {
    if (!drag || drag.key !== item.key) {
      return { start: item.start, end: item.end, shift: 0 }
    }
    const deltaMin = drag.dy / pxPerMin
    if (drag.kind === 'resize') {
      return { start: item.start, end: resizedEnd(item.start, item.end, deltaMin, h1), shift: 0 }
    }
    const moved = movedTimes(item.start, item.end, deltaMin, h0, h1)
    const target = shiftedDay(days, drag.date, drag.dx / drag.dayWidth)
    const shift = (days.indexOf(target) - days.indexOf(drag.date)) * drag.dayWidth
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
        if (key === 'timer') blockActions.onStartTimer(block.task_id, block.task_name ?? '')
        if (key === 'dup') blockActions.onDuplicate(block)
        if (key === 'del') blockActions.onDelete(block)
      }
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
    const isDragging = drag?.key === item.key
    const isOpen = openKey === item.key
    const subject: PopoverSubject = {
      kind: item.kind,
      taskId: item.taskId,
      name,
      date,
      start: item.start,
      end: item.end,
      status,
      category,
      projectName: block ? block.project_name : task?.project_name,
      projectColor,
      gcal
    }
    const close = (): void => setOpenKey(null)
    const popover = (
      <BlockPopover
        subject={subject}
        onOpen={() => {
          close()
          blockActions.onOpen(item.taskId)
        }}
        onStartTimer={() => {
          close()
          blockActions.onStartTimer(item.taskId, name)
        }}
        onChange={(times) => {
          if (block) blockActions.onMove(block, times, 'edit')
          else if (task) blockActions.onEventChange(task, times, 'edit')
        }}
        onDelete={
          block
            ? () => {
                close()
                blockActions.onDelete(block)
              }
            : undefined
        }
      />
    )
    const wrapped = (
      <Popover
        open={isOpen}
        onOpenChange={(open) => {
          if (open && suppressClick.current) {
            suppressClick.current = false
            return
          }
          setOpenKey(open ? item.key : null)
        }}
        trigger="click"
        placement={screens.md ? 'right' : 'bottom'}
        destroyOnHidden
        content={popover}
      >
        {body()}
      </Popover>
    )

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
          zIndex: isDragging ? 5 : isOpen ? 4 : 2
        }}
      >
        {block ? (
          <Dropdown menu={blockMenu(block)} trigger={['contextMenu']}>
            <div style={{ height: '100%' }}>{wrapped}</div>
          </Dropdown>
        ) : (
          wrapped
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
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          onPointerDown={(e) => startDrag(e, item, date, 'move')}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setOpenKey(item.key)
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
          <span
            className="ct-calblock-resize"
            aria-hidden
            onPointerDown={(e) => startDrag(e, item, date, 'resize')}
          />
        </div>
      )
    }
  }

  function chip(item: AllDayItem): React.ReactNode {
    return <CalendarChip key={item.key} item={item} today={today} onOpen={onTaskOpen} />
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
                    const payload = readDropPayload(e.dataTransfer)
                    if (
                      payload?.chip &&
                      !chipAlreadyOn(tasksById.get(payload.taskId), payload.chip, d)
                    )
                      onDropChip(payload.chip, payload.taskId, d)
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
                  const payload = readDropPayload(e.dataTransfer)
                  if (!payload) return
                  if (payload.chip) {
                    if (!chipAlreadyOn(tasksById.get(payload.taskId), payload.chip, d))
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
