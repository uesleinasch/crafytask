import { Flex, Tooltip, theme } from 'antd'
import { CHART_COLORS } from '@renderer/theme/semantic'
import { useThemeSettings } from '@renderer/theme/themeSettings'
import {
  HEAT_HOURS,
  WEEKDAYS,
  WEEK_ORDER,
  formatDayLong,
  formatHM,
  heatLevel,
  niceMaxHours,
  type BucketView,
  type CalendarWeek
} from './dashboardFormat'

function useChartColors(): (typeof CHART_COLORS)['light'] {
  const { mode } = useThemeSettings()
  return CHART_COLORS[mode]
}

function Figure({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { token } = theme.useToken()
  return (
    <b style={{ fontFamily: token.fontFamilyCode, fontVariantNumeric: 'tabular-nums' }}>
      {children}
    </b>
  )
}

interface ColumnChartProps {
  buckets: BucketView[]
  unitLabel: string
  currentLabel: string
}

export function ColumnChart({
  buckets,
  unitLabel,
  currentLabel
}: ColumnChartProps): React.JSX.Element {
  const colors = useChartColors()
  const maxHours = niceMaxHours(Math.max(0, ...buckets.map((b) => b.seconds)))
  const ticks = [maxHours, maxHours / 2, 0]
  const gap = buckets.length > 40 ? 1 : 2

  return (
    <div
      className="ct-colchart"
      role="img"
      aria-label={`Tempo focado por ${unitLabel}. Destaque: ${currentLabel}.`}
    >
      <div className="ct-colchart-y">
        {ticks.map((tick) => (
          <span key={tick}>{tick}h</span>
        ))}
      </div>
      <div>
        <div className="ct-colchart-plot" style={{ gap }}>
          {[0, 50].map((top) => (
            <span key={top} className="ct-gridline" style={{ top: `${top}%` }} />
          ))}
          {buckets.map((bucket) => (
            <Tooltip
              key={bucket.key}
              trigger={['hover', 'focus']}
              title={
                <span>
                  <Figure>{formatHM(bucket.seconds)}</Figure> · {bucket.title}
                  {bucket.current ? ` (${currentLabel})` : ''}
                </span>
              }
            >
              <span
                className="ct-colslot"
                tabIndex={0}
                aria-label={`${bucket.title}: ${formatHM(bucket.seconds)}`}
              >
                <span
                  className="ct-colbar"
                  style={{
                    height: `${(bucket.seconds / 3600 / maxHours) * 100}%`,
                    background: bucket.current ? colors.single : colors.muted
                  }}
                />
              </span>
            </Tooltip>
          ))}
        </div>
        <div className="ct-colchart-x" style={{ gap }}>
          {buckets.map((bucket) => (
            <span key={bucket.key}>{bucket.showLabel ? bucket.label : ''}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

export function HeatLegend(): React.JSX.Element {
  const { token } = theme.useToken()
  const colors = useChartColors()
  return (
    <Flex align="center" gap={4} style={{ fontSize: 12, color: token.colorTextTertiary }}>
      Menos
      {colors.sequential.map((color) => (
        <span
          key={color}
          className="ct-heatcell"
          style={{ background: color, width: 12, height: 12 }}
        />
      ))}
      Mais
    </Flex>
  )
}

export function HourHeatmap({ grid }: { grid: number[][] }): React.JSX.Element {
  const colors = useChartColors()
  const max = Math.max(1, ...grid.flat())
  return (
    <div style={{ overflowX: 'auto' }}>
      <div className="ct-hourheat" role="grid" aria-label="Tempo focado por dia da semana e hora">
        <span />
        {HEAT_HOURS.map((hour) => (
          <span key={hour} className="ct-heat-x">
            {hour % 3 === 0 ? `${hour}h` : ''}
          </span>
        ))}
        {WEEK_ORDER.map((weekday, row) => [
          <span key={`label-${weekday}`} className="ct-heat-y">
            {WEEKDAYS[weekday]}
          </span>,
          ...HEAT_HOURS.map((hour, col) => {
            const seconds = grid[row][col]
            return (
              <Tooltip
                key={`${weekday}-${hour}`}
                trigger={['hover', 'focus']}
                title={
                  <span>
                    <Figure>{formatHM(seconds)}</Figure> · {WEEKDAYS[weekday]}, {hour}h–{hour + 1}h
                  </span>
                }
              >
                <span
                  className="ct-heatcell"
                  tabIndex={0}
                  role="gridcell"
                  aria-label={`${WEEKDAYS[weekday]} ${hour}h: ${formatHM(seconds)}`}
                  style={{ background: colors.sequential[heatLevel(seconds, max)] }}
                />
              </Tooltip>
            )
          })
        ])}
      </div>
    </div>
  )
}

export function CalendarHeat({
  weeks,
  today
}: {
  weeks: CalendarWeek[]
  today: string
}): React.JSX.Element {
  const { token } = theme.useToken()
  const colors = useChartColors()
  const max = Math.max(1, ...weeks.flatMap((w) => w.days.map((d) => d?.seconds ?? 0)))
  return (
    <div style={{ overflowX: 'auto' }}>
      <div className="ct-calheat">
        <div className="ct-calheat-y">
          <span />
          {['Seg', '', 'Qua', '', 'Sex', '', 'Dom'].map((label, i) => (
            <span key={i}>{label}</span>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="ct-calheat-col">
            <span className="ct-heat-x">{week.month}</span>
            {week.days.map((day, di) =>
              day ? (
                <Tooltip
                  key={day.date}
                  trigger={['hover', 'focus']}
                  title={
                    <span>
                      <Figure>{formatHM(day.seconds)}</Figure> · {formatDayLong(day.date)}
                    </span>
                  }
                >
                  <span
                    className="ct-heatcell"
                    tabIndex={0}
                    aria-label={`${formatDayLong(day.date)}: ${formatHM(day.seconds)}`}
                    style={{
                      background: colors.sequential[heatLevel(day.seconds, max)],
                      boxShadow:
                        day.date === today ? `0 0 0 1px ${token.colorTextSecondary}` : undefined
                    }}
                  />
                </Tooltip>
              ) : (
                <span
                  key={`empty-${di}`}
                  className="ct-heatcell"
                  style={{ visibility: 'hidden' }}
                />
              )
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
