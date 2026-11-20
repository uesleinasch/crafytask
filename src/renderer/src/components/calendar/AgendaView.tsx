import { Empty, Typography, theme } from 'antd'
import { CAL_BLOCK_COLORS, timeLeakBackground, timeLeakLevel } from '@renderer/theme/semantic'
import { useThemeSettings } from '@renderer/theme/themeSettings'
import { useTimeLeakThresholds } from '@renderer/lib/workflowPrefs'
import type { CalendarRangeData } from '@renderer/hooks/useCalendar'
import { ProjectLabel } from '@renderer/components/tasks/ProjectLabel'
import { CalendarChip } from './CalendarChip'
import { allDayOf, itemName, timedItemsOfDay, type ShowKey } from './calendarView'

interface AgendaViewProps {
  days: string[]
  today: string
  data: CalendarRangeData
  show: Set<ShowKey>
  onTaskOpen: (taskId: number) => void
}

const fmt = (date: string, options: Intl.DateTimeFormatOptions): string =>
  new Intl.DateTimeFormat('pt-BR', options).format(new Date(`${date}T12:00:00`)).replace('.', '')

export function AgendaView({
  days,
  today,
  data,
  show,
  onTaskOpen
}: AgendaViewProps): React.JSX.Element {
  const { token } = theme.useToken()
  const { mode } = useThemeSettings()
  const leakThresholds = useTimeLeakThresholds()
  const rows = days
    .map((d) => ({ d, all: allDayOf(data.tasks, d, show), timed: timedItemsOfDay(data, d, show) }))
    .filter((r) => r.all.length || r.timed.length)

  if (!rows.length) {
    return (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nada nas próximas duas semanas." />
    )
  }

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <div className="ct-calagenda">
        {rows.map(({ d, all, timed }) => (
          <section
            key={d}
            className="ct-calagenda-day"
            aria-label={fmt(d, { weekday: 'long', day: 'numeric', month: 'long' })}
          >
            <div className="ct-calagenda-date">
              <span
                className={d === today ? 'ct-calnum sm today' : 'ct-calnum sm'}
                aria-current={d === today ? 'date' : undefined}
              >
                {Number(d.slice(8))}
              </span>
              <span style={{ textTransform: 'capitalize' }}>{fmt(d, { weekday: 'short' })}</span>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {fmt(d, { month: 'short' })}
              </Typography.Text>
            </div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {all.map((item) => (
                <CalendarChip key={item.key} item={item} today={today} onOpen={onTaskOpen} />
              ))}
              {timed.map((item) => {
                const category = item.block?.task_category ?? item.task?.category
                const seconds = item.block?.task_total_seconds ?? item.task?.total_seconds ?? 0
                const leak = timeLeakLevel(category, seconds, leakThresholds)
                const projectName = item.block ? item.block.project_name : item.task?.project_name
                const projectColor = item.block
                  ? item.block.project_color
                  : item.task?.project_color
                const event = item.kind === 'event'
                return (
                  <button
                    key={item.key}
                    type="button"
                    className="ct-calagenda-item"
                    onClick={() => onTaskOpen(item.taskId)}
                    aria-label={`${item.start} a ${item.end}, ${itemName(item)}, ${event ? 'tarefa com horário' : 'bloco de tempo'}`}
                  >
                    <span
                      style={{
                        width: 92,
                        flex: 'none',
                        fontFamily: token.fontFamilyCode,
                        color: token.colorTextSecondary
                      }}
                    >
                      {item.start}–{item.end}
                    </span>
                    <span
                      aria-hidden
                      className="ct-calsw"
                      style={{
                        height: 14,
                        border: `1px solid ${event || leak ? token.colorBorder : CAL_BLOCK_COLORS[mode].calBlockBorder}`,
                        background: leak
                          ? timeLeakBackground(mode, leak)
                          : event
                            ? token.colorBgContainer
                            : CAL_BLOCK_COLORS[mode].calBlock
                      }}
                    />
                    <span className="ct-calblock-name" style={{ flex: 1 }}>
                      {itemName(item)}
                    </span>
                    {projectName && <ProjectLabel name={projectName} color={projectColor} />}
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
