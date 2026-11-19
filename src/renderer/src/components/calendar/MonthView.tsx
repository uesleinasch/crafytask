import { Grid, Popover, Tooltip, theme } from 'antd'
import type { CalendarRangeData } from '@renderer/hooks/useCalendar'
import { CalendarChip } from './CalendarChip'
import {
  allDayOf,
  chipAlreadyOn,
  durationLabel,
  itemName,
  readDropPayload,
  timedItemsOfDay,
  toMin,
  type AllDayItem,
  type ShowKey
} from './calendarView'

interface MonthViewProps {
  cursor: string
  cells: string[]
  today: string
  data: CalendarRangeData
  show: Set<ShowKey>
  onOpenDay: (date: string) => void
  onTaskOpen: (taskId: number) => void
  onDropTask: (taskId: number, date: string) => void
  onDropChip: (kind: AllDayItem['kind'], taskId: number, date: string) => void
}

const fmt = (date: string, options: Intl.DateTimeFormatOptions): string =>
  new Intl.DateTimeFormat('pt-BR', options).format(new Date(`${date}T12:00:00`))

export function MonthView({
  cursor,
  cells,
  today,
  data,
  show,
  onOpenDay,
  onTaskOpen,
  onDropTask,
  onDropChip
}: MonthViewProps): React.JSX.Element {
  const { token } = theme.useToken()
  const screens = Grid.useBreakpoint()
  const max = screens.xl ? 3 : 2
  const month = cursor.slice(0, 7)
  const tasksById = new Map(data.tasks.map((t) => [t.id, t]))

  const chip = (item: AllDayItem, compact = true): React.ReactNode => (
    <CalendarChip key={item.key} item={item} today={today} compact={compact} onOpen={onTaskOpen} />
  )

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <div
        className="ct-calmonth"
        role="grid"
        aria-label={fmt(cursor, { month: 'long', year: 'numeric' })}
      >
        {cells.slice(0, 7).map((d) => (
          <span key={`wd-${d}`} className="ct-calmonth-wd" role="columnheader">
            {fmt(d, { weekday: 'short' }).replace('.', '')}
          </span>
        ))}
        {cells.map((d) => {
          const out = d.slice(0, 7) !== month
          const list = allDayOf(data.tasks, d, show)
          const timed = timedItemsOfDay(data, d, show)
          const minutes = timed.reduce((sum, i) => sum + toMin(i.end) - toMin(i.start), 0)
          const summary = `${timed.length} ${timed.length === 1 ? 'bloco' : 'blocos'}, ${durationLabel(minutes)}`
          return (
            <div
              key={d}
              role="gridcell"
              className={out ? 'ct-calmonth-cell out' : 'ct-calmonth-cell'}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const payload = readDropPayload(e.dataTransfer)
                if (!payload) return
                if (payload.chip) {
                  if (!chipAlreadyOn(tasksById.get(payload.taskId), payload.chip, d)) {
                    onDropChip(payload.chip, payload.taskId, d)
                  }
                  return
                }
                onDropTask(payload.taskId, d)
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 4
                }}
              >
                <button
                  type="button"
                  className={d === today ? 'ct-calnum sm today' : 'ct-calnum sm'}
                  onClick={() => onOpenDay(d)}
                  aria-label={`Ver ${fmt(d, { day: 'numeric', month: 'long' })}`}
                  aria-current={d === today ? 'date' : undefined}
                >
                  {Number(d.slice(8))}
                </button>
                {timed.length > 0 && (
                  <Tooltip
                    title={timed.map((i) => `${i.start}–${i.end} ${itemName(i)}`).join(' · ')}
                  >
                    <span
                      aria-label={summary}
                      style={{
                        fontFamily: token.fontFamilyCode,
                        fontSize: 11,
                        color: token.colorTextTertiary,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {timed.length} · {durationLabel(minutes)}
                    </span>
                  </Tooltip>
                )}
              </div>
              {list.slice(0, max).map((item) => chip(item))}
              {list.length > max && (
                <Popover
                  trigger="click"
                  content={
                    <div style={{ width: 240, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {list.map((item) => chip(item, false))}
                    </div>
                  }
                >
                  <button type="button" className="ct-calmore">
                    +{list.length - max} mais
                  </button>
                </Popover>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
