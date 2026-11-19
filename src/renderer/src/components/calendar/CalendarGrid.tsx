import { useEffect, useMemo, useRef } from 'react'
import { Popover, Tooltip, theme } from 'antd'
import { Calendar, CalendarSync, Check, Flag } from 'lucide-react'
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
import {
  allDayOf,
  blocksOfDay,
  clampToGrid,
  durationLabel,
  eventsOfDay,
  fromMin,
  isWeekend,
  layoutDay,
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
  onBlockClick: (block: TimeBlock) => void
  onTaskOpen: (taskId: number) => void
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
  onBlockClick,
  onTaskOpen
}: CalendarGridProps): React.JSX.Element {
  const { token } = theme.useToken()
  const { mode, density } = useThemeSettings()
  const prefs = calendarPrefs()
  const { dayStartHour: h0, dayEndHour: h1, journeyMinutes } = prefs
  const hourHeight = density === 'compact' ? 40 : 48
  const pxPerMin = hourHeight / 60
  const scrollRef = useRef<HTMLDivElement>(null)
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const columns = `${HOUR_LABEL_WIDTH}px repeat(${days.length}, minmax(${view === 'week' ? 96 : 140}px, 1fr))`
  const tasksById = useMemo(() => new Map(data.tasks.map((t) => [t.id, t])), [data.tasks])

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
    const geometry = clampToGrid(toMin(item.start), toMin(item.end), h0, h1)
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
    const open = (): void => (block ? onBlockClick(block) : onTaskOpen(item.taskId))

    return (
      <div
        key={item.key}
        style={{
          position: 'absolute',
          top,
          height,
          left: `calc(${item.col * width}% + 2px)`,
          width: `calc(${width}% - 4px)`,
          zIndex: 2
        }}
      >
        <div
          role="button"
          tabIndex={0}
          className={[
            'ct-calblock',
            event ? 'event' : '',
            leak ? 'leak' : '',
            done ? 'done' : ''
          ].join(' ')}
          style={leak ? { background: timeLeakBackground(mode, leak) } : undefined}
          aria-label={`${name}, ${item.start} a ${item.end}, ${event ? 'tarefa com horário' : 'bloco de tempo'}`}
          onClick={(e) => {
            e.stopPropagation()
            open()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              open()
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
              {item.start}–{item.end}
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
        </div>
      </div>
    )
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
        onClick={() => onTaskOpen(task.id)}
        title={`${due ? 'Prazo' : 'Agendada'}: ${task.name}${due && task.due_time ? ` às ${task.due_time}` : ''}`}
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
      !allDayOf(data.tasks, d, show).length
  )

  return (
    <div className="ct-calscroll" ref={scrollRef} style={cssVars}>
      <div className="ct-calsticky">
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
                  <span className={d === today ? 'ct-calnum today' : 'ct-calnum'}>
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
                  <div className="ct-calload" aria-label={`${durationLabel(planned)} planejadas`}>
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
              <div key={d} className="ct-calallday-cell">
                {list.slice(0, max).map(chip)}
                {list.length > max && (
                  <Popover
                    trigger="click"
                    content={
                      <div style={{ width: 240, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {list.map(chip)}
                      </div>
                    }
                  >
                    <button type="button" className="ct-calmore">
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
        style={{ gridTemplateColumns: columns, height: (h1 - h0) * hourHeight }}
      >
        <div style={{ position: 'relative' }}>
          {Array.from({ length: h1 - h0 }, (_, i) => (
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
                        aria-label={`Sessão até ${end}`}
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
                  aria-label={`Agora, ${formatClock(nowMin)}`}
                />
              )}
            </div>
          )
        })}
      </div>
      {empty && (
        <div className="ct-calempty">
          <Calendar size={14} strokeWidth={1.75} aria-hidden />
          Nada nestes dias. Clique na grade para reservar tempo.
        </div>
      )}
    </div>
  )
}

function formatClock(minutes: number): string {
  return fromMin(Math.min(minutes, 24 * 60 - 1))
}
