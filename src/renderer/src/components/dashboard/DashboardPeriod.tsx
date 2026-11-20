import { useEffect, useMemo, useState } from 'react'
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Flex,
  Grid,
  Row,
  Segmented,
  Select,
  Typography,
  theme
} from 'antd'
import type { TableColumnsType } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  CalendarRange,
  CircleCheck,
  Clock,
  FileDown,
  Flag,
  FolderOpen,
  History,
  Minus,
  ListOrdered,
  Timer,
  TrendingUp,
  Zap
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useErrorBoundary } from 'react-error-boundary'
import type {
  PeriodStats,
  Project,
  StatsCategoryRow,
  StatsEnergyRow,
  StatsTaskRow,
  StatsTimeRow
} from '@shared/types'
import { CATEGORY_LABELS, ENERGY_LABELS } from '@shared/types'
import { localDateString } from '@shared/dueState'
import { Section } from '@renderer/components/shell/SectionHeader'
import { RegionBoundary } from '@renderer/components/shell/RegionBoundary'
import { CategoryChip } from '@renderer/components/chips/CategoryChip'
import { EnergyMeter } from '@renderer/components/chips/EnergyMeter'
import { ChartCard } from './ChartCard'
import { HBarList, type HBarRow } from './HBarList'
import { CalendarHeat, ColumnChart, HeatLegend, HourHeatmap } from './PeriodCharts'
import {
  CURRENT_LABEL,
  HEAT_HOURS,
  PERIOD_PRESETS,
  UNIT_LABEL,
  WEEKDAYS,
  WEEK_ORDER,
  bucketViews,
  calendarWeeks,
  delta,
  formatCount,
  formatDayLong,
  formatHM,
  hourGrid,
  percent,
  periodName,
  presetRange,
  rangeDays
} from './dashboardFormat'

const ICON = { size: 16, strokeWidth: 1.75, 'aria-hidden': true } as const
const TIME_LEAK_NOTICE = 0.1
const MAX_RANGE_DAYS = 365
type Dimension = 'project' | 'area' | 'context'

function Dot({ color }: { color: string | null }): React.JSX.Element {
  const { token } = theme.useToken()
  return (
    <span
      className="ct-dot"
      aria-hidden
      style={
        color
          ? { background: color }
          : { border: `1px dashed ${token.colorBorder}`, background: 'transparent' }
      }
    />
  )
}

function Label({
  lead,
  children
}: {
  lead: React.ReactNode
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
      {lead}
      <span className="ct-ellipsis">{children}</span>
    </span>
  )
}

function DeltaText({
  current,
  previous,
  format,
  period
}: {
  current: number
  previous: number
  format: (value: number) => string
  period: string
}): React.JSX.Element | null {
  const result = delta(current, previous, format)
  if (!result) return null
  const Icon = result.direction === 'up' ? ArrowUp : result.direction === 'down' ? ArrowDown : Minus
  return (
    <Typography.Text
      type="secondary"
      style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
    >
      <Icon size={12} strokeWidth={1.75} aria-hidden />
      {result.text} vs {period} anteriores
    </Typography.Text>
  )
}

function Tile({
  icon: Icon,
  label,
  value,
  children
}: {
  icon: typeof Clock
  label: string
  value: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <Card size="small" style={{ height: '100%' }}>
      <Flex vertical gap={4}>
        <Typography.Text
          type="secondary"
          style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <Icon {...ICON} />
          {label}
        </Typography.Text>
        <span className="ct-tile-figure">{value}</span>
        {children}
      </Flex>
    </Card>
  )
}

export function DashboardPeriod(): React.JSX.Element {
  const { token } = theme.useToken()
  const { message } = App.useApp()
  const screens = Grid.useBreakpoint()
  const navigate = useNavigate()
  const { showBoundary } = useErrorBoundary()
  const [days, setDays] = useState<number>(30)
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [projectId, setProjectId] = useState<number | null>(null)
  const [dimension, setDimension] = useState<Dimension>('project')
  const [projects, setProjects] = useState<Project[]>([])
  const [stats, setStats] = useState<PeriodStats | null>(null)
  const [busy, setBusy] = useState(true)
  const [exporting, setExporting] = useState(false)

  const today = localDateString(new Date())
  const period = useMemo(
    () =>
      range
        ? { start: range[0].format('YYYY-MM-DD'), end: range[1].format('YYYY-MM-DD') }
        : presetRange(days, new Date()),
    [range, days]
  )

  useEffect(() => {
    window.api
      .listProjects()
      .then((list) =>
        setProjects(list.filter((p) => p.status === 'active' || p.status === 'someday'))
      )
      .catch(showBoundary)
  }, [showBoundary])

  useEffect(() => {
    let cancelled = false
    const load = (): void => {
      setBusy(true)
      window.api
        .getPeriodStats({ ...period, projectId })
        .then((result) => {
          if (cancelled) return
          setStats(result)
          setBusy(false)
        })
        .catch(showBoundary)
    }
    load()
    const off = window.api.onTasksRefresh(load)
    return () => {
      cancelled = true
      off()
    }
  }, [period, projectId, showBoundary])

  const name = periodName(period.start, period.end)
  const projectName = projects.find((p) => p.id === projectId)?.name
  const total = stats?.focusSeconds.value ?? 0
  const empty = !!stats && total === 0

  const exportPdf = async (): Promise<void> => {
    setExporting(true)
    try {
      if (await window.api.generateWeeklyPDF(period)) message.success(`Relatório de ${name} salvo`)
    } catch {
      message.error('Não foi possível gerar o PDF.')
    } finally {
      setExporting(false)
    }
  }

  const filters = (
    <Flex gap={8} wrap align="center">
      <Segmented
        aria-label="Período"
        value={range ? undefined : days}
        onChange={(value) => {
          setRange(null)
          setDays(Number(value))
        }}
        options={PERIOD_PRESETS.map((p) => ({ value: p.value, label: p.label }))}
      />
      <DatePicker.RangePicker
        aria-label="Período personalizado"
        value={range}
        format="DD/MM/YYYY"
        allowClear
        placeholder={['Início', 'Fim']}
        disabledDate={(date, info) =>
          date.isAfter(dayjs(), 'day') ||
          (!!info?.from && Math.abs(date.diff(info.from, 'day')) >= MAX_RANGE_DAYS)
        }
        onChange={(value) => setRange(value && value[0] && value[1] ? [value[0], value[1]] : null)}
        style={{ width: screens.md ? 240 : '100%' }}
      />
      <Select
        aria-label="Projeto"
        value={projectId ?? 0}
        onChange={(value: number) => setProjectId(value || null)}
        style={{ width: screens.md ? 220 : '100%' }}
        options={[
          { value: 0, label: 'Todos os projetos' },
          ...projects.map((p) => ({
            value: p.id,
            label: <Label lead={<Dot color={p.color} />}>{p.name}</Label>
          }))
        ]}
      />
      <div style={{ flex: 1 }} />
      <Button
        icon={<FileDown {...ICON} />}
        disabled={empty}
        loading={exporting}
        onClick={() => void exportPdf()}
        aria-label="Exportar PDF"
      >
        {screens.sm ? 'Exportar PDF' : null}
      </Button>
    </Flex>
  )

  const content = !stats ? null : empty ? (
    <Card size="small">
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <span>
            Nenhuma sessão de tempo neste período.
            <br />
            <Typography.Text type="secondary">
              Os gráficos aparecem quando houver tempo registrado.
            </Typography.Text>
          </span>
        }
      >
        <Flex gap={8} justify="center" wrap>
          {projectId !== null && (
            <Button onClick={() => setProjectId(null)}>Todos os projetos</Button>
          )}
          {rangeDays(period.start, period.end) < 365 && (
            <Button
              onClick={() => {
                setRange(null)
                setDays(365)
              }}
            >
              Ver 12 meses
            </Button>
          )}
        </Flex>
      </Empty>
    </Card>
  ) : (
    <PeriodContent
      stats={stats}
      periodLabel={name}
      dimension={dimension}
      onDimension={setDimension}
      today={today}
      onOpen={navigate}
      mono={{ fontFamily: token.fontFamilyCode, fontVariantNumeric: 'tabular-nums' }}
    />
  )

  return (
    <Section
      icon={CalendarRange}
      title="No período"
      extra={projectName ? `${name} · ${projectName}` : name}
    >
      {filters}
      <div
        style={{ opacity: busy ? 0.55 : 1, transition: `opacity ${token.motionDurationMid}` }}
        aria-busy={busy}
      >
        {content}
      </div>
    </Section>
  )
}

interface PeriodContentProps {
  stats: PeriodStats
  periodLabel: string
  dimension: Dimension
  onDimension: (dimension: Dimension) => void
  today: string
  onOpen: (route: string) => void
  mono: React.CSSProperties
}

function PeriodContent({
  stats,
  periodLabel,
  dimension,
  onDimension,
  today,
  onOpen,
  mono
}: PeriodContentProps): React.JSX.Element {
  const screens = Grid.useBreakpoint()
  const total = stats.focusSeconds.value
  const days = rangeDays(stats.period.start, stats.period.end)
  const buckets = bucketViews(stats.buckets, stats.granularity, days)
  const grid = hourGrid(stats.hourly)
  const weeks = calendarWeeks(stats.period.start, stats.period.end, stats.daily)
  const activeDays = stats.daily.filter((d) => d.seconds > 0).length
  const gutter: [number, number] = [16, 16]
  const share = (seconds: number): string => percent(seconds, total)
  const timeCell = (seconds: number): React.JSX.Element => (
    <span style={mono}>{formatHM(seconds)}</span>
  )

  const timeRows = (rows: StatsTimeRow[], kind: Dimension): HBarRow[] =>
    rows.map((row) => ({
      key: `${kind}-${row.id ?? 'none'}`,
      label: row.name,
      lead:
        kind === 'project' ? (
          <Label lead={<Dot color={row.color} />}>{row.name}</Label>
        ) : (
          <Label
            lead={
              kind === 'area' ? (
                <TrendingUp size={14} strokeWidth={1.75} aria-hidden />
              ) : (
                <Dot color={row.color} />
              )
            }
          >
            {row.name}
          </Label>
        ),
      value: row.seconds,
      valueText: formatHM(row.seconds),
      shareText: share(row.seconds),
      open:
        kind === 'project'
          ? () => onOpen(row.id === null ? '/?projeto=sem' : `/project/${row.id}`)
          : row.id === null
            ? undefined
            : kind === 'area'
              ? () => onOpen('/horizons')
              : () => onOpen(`/?context=${row.id}`)
    }))

  const dimensionRows = {
    project: stats.byProject,
    area: stats.byArea,
    context: stats.byContext
  }[dimension]
  const dimensionTitle = { project: 'Projeto', area: 'Área', context: 'Contexto' }[dimension]
  const timeColumns: TableColumnsType<StatsTimeRow> = [
    { title: dimensionTitle, dataIndex: 'name', key: 'name' },
    { title: 'Tempo', key: 'time', align: 'right', render: (_, row) => timeCell(row.seconds) },
    {
      title: '%',
      key: 'share',
      align: 'right',
      render: (_, row) => <span style={mono}>{share(row.seconds)}</span>
    }
  ]

  const taskRows: HBarRow[] = stats.topTasks.map((task) => ({
    key: `task-${task.taskId}`,
    label: task.name,
    lead: <Label lead={<Dot color={task.projectColor} />}>{task.name}</Label>,
    value: task.seconds,
    valueText: formatHM(task.seconds),
    shareText: share(task.seconds),
    tooltip: (
      <span>
        <b style={mono}>{formatHM(task.seconds)}</b> · {share(task.seconds)} do total ·{' '}
        {task.projectName ?? 'sem projeto'}
      </span>
    ),
    open: () => onOpen(`/task/${task.taskId}`)
  }))

  const categoryRows: HBarRow[] = stats.byCategory.map((row) => ({
    key: row.category,
    label: CATEGORY_LABELS[row.category],
    lead: (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <CategoryChip category={row.category} />
        <Typography.Text type="secondary" className="ct-ellipsis" style={{ fontSize: 12 }}>
          {row.taskCount} {row.taskCount === 1 ? 'tarefa' : 'tarefas'}
        </Typography.Text>
      </span>
    ),
    value: row.seconds,
    valueText: formatHM(row.seconds),
    shareText: share(row.seconds),
    tooltip: (
      <span>
        <b style={mono}>{formatHM(row.seconds)}</b> · {share(row.seconds)} do total ·{' '}
        {row.taskCount} {row.taskCount === 1 ? 'tarefa' : 'tarefas'}
      </span>
    ),
    open: () => onOpen(`/?categoria=${row.category}`)
  }))
  const leak = stats.byCategory.find((row) => row.category === 'time_leak')
  const leakNotice = !!leak && total > 0 && leak.seconds / total > TIME_LEAK_NOTICE

  const energyRows: HBarRow[] = stats.byEnergy.map((row) => ({
    key: row.energy,
    label: ENERGY_LABELS[row.energy],
    lead: (
      <Label lead={<EnergyMeter level={row.energy} tooltip={false} />}>
        {ENERGY_LABELS[row.energy]}{' '}
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          · média {formatHM(row.avgSeconds)}
        </Typography.Text>
      </Label>
    ),
    value: row.seconds,
    valueText: formatHM(row.seconds),
    shareText: share(row.seconds),
    tooltip: (
      <span>
        <b style={mono}>{formatHM(row.seconds)}</b> · {row.taskCount}{' '}
        {row.taskCount === 1 ? 'tarefa' : 'tarefas'} · média {formatHM(row.avgSeconds)} por tarefa
      </span>
    ),
    open: () => onOpen(`/?energia=${row.energy}`)
  }))

  const avgSession = stats.avgSessionSeconds
  const hero = (
    <Card
      size="small"
      style={{ height: '100%' }}
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Timer {...ICON} />
          Tempo focado
        </span>
      }
      extra={
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          por {UNIT_LABEL[stats.granularity]}
        </Typography.Text>
      }
    >
      <Flex vertical gap={16}>
        <Flex wrap align="baseline" gap="4px 16px">
          <span className="ct-hero-figure">{formatHM(total)}</span>
          <Flex vertical gap={2}>
            <DeltaText
              current={total}
              previous={stats.focusSeconds.previous}
              format={formatHM}
              period={periodLabel}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              média de {formatHM(stats.workdayAvgSeconds)} por dia útil
            </Typography.Text>
          </Flex>
        </Flex>
        <ColumnChart
          buckets={buckets}
          unitLabel={UNIT_LABEL[stats.granularity]}
          currentLabel={CURRENT_LABEL[stats.granularity]}
        />
      </Flex>
    </Card>
  )

  const tiles = [
    <Tile
      key="done"
      icon={CircleCheck}
      label="Tarefas concluídas"
      value={formatCount(stats.completedTasks.value)}
    >
      <DeltaText
        current={stats.completedTasks.value}
        previous={stats.completedTasks.previous}
        format={formatCount}
        period={periodLabel}
      />
    </Tile>,
    <Tile
      key="sessions"
      icon={Zap}
      label="Sessões de foco"
      value={formatCount(stats.sessions.value)}
    >
      <DeltaText
        current={stats.sessions.value}
        previous={stats.sessions.previous}
        format={formatCount}
        period={periodLabel}
      />
    </Tile>,
    <Tile key="avg" icon={History} label="Média por sessão" value={formatHM(avgSession.value)}>
      <DeltaText
        current={avgSession.value}
        previous={avgSession.previous}
        format={formatHM}
        period={periodLabel}
      />
    </Tile>
  ]

  return (
    <Row gutter={gutter}>
      <Col xs={24} xl={16}>
        <RegionBoundary region="gráfico Tempo focado">{hero}</RegionBoundary>
      </Col>
      <Col xs={24} xl={8}>
        <Row gutter={gutter} style={{ height: screens.xl ? '100%' : 'auto' }}>
          {tiles.map((tile) => (
            <Col key={tile.key} xs={24} sm={8} xl={24}>
              <RegionBoundary region={`número ${tile.key}`}>{tile}</RegionBoundary>
            </Col>
          ))}
        </Row>
      </Col>

      <Col xs={24} lg={12}>
        <ChartCard<StatsTimeRow>
          title="Para onde foi o tempo"
          icon={FolderOpen}
          extra={
            <Segmented
              size="small"
              aria-label="Agrupar por"
              value={dimension}
              onChange={(value) => onDimension(value as Dimension)}
              options={[
                { value: 'project', label: 'Projeto' },
                { value: 'area', label: 'Área' },
                { value: 'context', label: 'Contexto' }
              ]}
            />
          }
          table={{ rowKey: 'name', columns: timeColumns, data: dimensionRows }}
        >
          <HBarList rows={timeRows(dimensionRows, dimension)} />
        </ChartCard>
      </Col>
      <Col xs={24} lg={12}>
        <ChartCard<StatsTaskRow>
          title="Tarefas com mais tempo"
          icon={ListOrdered}
          empty={stats.topTasks.length ? null : 'Nenhuma tarefa com tempo.'}
          table={{
            rowKey: 'taskId',
            data: stats.topTasks,
            columns: [
              { title: 'Tarefa', dataIndex: 'name', key: 'name' },
              {
                title: 'Projeto',
                key: 'project',
                render: (_, row) => row.projectName ?? '—'
              },
              {
                title: 'Tempo',
                key: 'time',
                align: 'right',
                render: (_, row) => timeCell(row.seconds)
              }
            ]
          }}
        >
          <HBarList rows={taskRows} />
        </ChartCard>
      </Col>

      <Col xs={24} lg={12}>
        <ChartCard<StatsCategoryRow>
          title="Por categoria"
          icon={Flag}
          table={{
            rowKey: 'category',
            data: stats.byCategory,
            columns: [
              {
                title: 'Categoria',
                key: 'category',
                render: (_, row) => CATEGORY_LABELS[row.category]
              },
              {
                title: 'Tarefas',
                key: 'tasks',
                align: 'right',
                render: (_, row) => <span style={mono}>{row.taskCount}</span>
              },
              {
                title: 'Tempo',
                key: 'time',
                align: 'right',
                render: (_, row) => timeCell(row.seconds)
              }
            ]
          }}
        >
          <HBarList rows={categoryRows} />
          {leakNotice && (
            <Typography.Text
              type="secondary"
              style={{ fontSize: 12, display: 'block', marginTop: 8, paddingInline: 8 }}
            >
              Time leak é tempo que escapou do plano. Vale olhar na revisão semanal, sem culpa.
            </Typography.Text>
          )}
        </ChartCard>
      </Col>
      <Col xs={24} lg={12}>
        <ChartCard<StatsEnergyRow>
          title="Por nível de energia"
          icon={Zap}
          empty={
            stats.byEnergy.length ? null : 'Nenhuma tarefa com nível de energia neste período.'
          }
          table={{
            rowKey: 'energy',
            data: stats.byEnergy,
            columns: [
              { title: 'Energia', key: 'energy', render: (_, row) => ENERGY_LABELS[row.energy] },
              {
                title: 'Tarefas',
                key: 'tasks',
                align: 'right',
                render: (_, row) => <span style={mono}>{row.taskCount}</span>
              },
              {
                title: 'Tempo',
                key: 'time',
                align: 'right',
                render: (_, row) => timeCell(row.seconds)
              },
              {
                title: 'Média',
                key: 'avg',
                align: 'right',
                render: (_, row) => timeCell(row.avgSeconds)
              }
            ]
          }}
        >
          <HBarList rows={energyRows} />
        </ChartCard>
      </Col>

      <Col xs={24} xl={14}>
        <ChartCard<{ key: number; name: string; values: number[] }>
          title="Quando você foca"
          icon={Clock}
          extra={screens.sm ? <HeatLegend /> : null}
          table={{
            rowKey: 'key',
            data: WEEK_ORDER.map((weekday, row) => ({
              key: weekday,
              name: WEEKDAYS[weekday],
              values: grid[row]
            })),
            columns: [
              { title: 'Dia', dataIndex: 'name', key: 'name', fixed: 'left' },
              ...HEAT_HOURS.map((hour, col) => ({
                title: `${hour}h`,
                key: `h${hour}`,
                align: 'right' as const,
                render: (_: unknown, row: { values: number[] }) => (
                  <span style={mono}>
                    {row.values[col] ? Math.round(row.values[col] / 60) : ''}
                  </span>
                )
              }))
            ]
          }}
        >
          <HourHeatmap grid={grid} />
          <Typography.Text
            type="secondary"
            style={{ fontSize: 12, display: 'block', marginTop: 8 }}
          >
            Seus horários de mais foco: use para marcar as tarefas de energia alta.
          </Typography.Text>
        </ChartCard>
      </Col>
      <Col xs={24} xl={10}>
        <ChartCard<{ date: string; seconds: number }>
          title="Constância"
          icon={CalendarDays}
          extra={screens.sm ? <HeatLegend /> : null}
          table={{
            rowKey: 'date',
            data: stats.daily.slice().reverse(),
            columns: [
              {
                title: 'Dia',
                dataIndex: 'date',
                key: 'date',
                render: (date: string) => <span style={mono}>{formatDayLong(date)}</span>
              },
              {
                title: 'Tempo',
                key: 'time',
                align: 'right',
                render: (_, row) => timeCell(row.seconds)
              }
            ]
          }}
        >
          <CalendarHeat weeks={weeks} today={today} />
          <Typography.Text
            type="secondary"
            style={{ fontSize: 12, display: 'block', marginTop: 8 }}
          >
            {activeDays} de {days} dias com sessão de foco.
          </Typography.Text>
        </ChartCard>
      </Col>
    </Row>
  )
}
