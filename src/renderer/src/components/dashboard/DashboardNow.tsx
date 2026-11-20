import { useEffect, useState } from 'react'
import { Col, Flex, Row, Spin, theme } from 'antd'
import { Gauge, ListTodo } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useErrorBoundary } from 'react-error-boundary'
import { STATUS_LABELS, type ReviewHealthIndicators, type TaskStatus } from '@shared/types'
import type { TaskStatusCounts } from '@shared/taskStatusCounts'
import { Section } from '@renderer/components/shell/SectionHeader'
import { HealthCard, HealthGrid } from '@renderer/components/health/HealthCard'
import {
  DASHBOARD_HEALTH,
  HEALTH_TARGETS,
  healthItems
} from '@renderer/components/health/healthItems'
import { StatusChip } from '@renderer/components/chips/StatusChip'
import { ChartCard } from './ChartCard'
import { HBarList, type HBarRow } from './HBarList'
import { percent } from './dashboardFormat'

const OPEN_STATUSES: TaskStatus[] = ['inbox', 'proximas', 'executando', 'aguardando', 'someday']

interface StatusRow {
  status: TaskStatus
  name: string
  count: number
  share: string
}

export function DashboardNow(): React.JSX.Element {
  const { token } = theme.useToken()
  const navigate = useNavigate()
  const { showBoundary } = useErrorBoundary()
  const [health, setHealth] = useState<ReviewHealthIndicators | null>(null)
  const [counts, setCounts] = useState<TaskStatusCounts | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = (): void => {
      Promise.all([window.api.getReviewHealthIndicators(), window.api.getTaskStatusCounts({})])
        .then(([indicators, statusCounts]) => {
          if (cancelled) return
          setHealth(indicators)
          setCounts(statusCounts)
        })
        .catch(showBoundary)
    }
    load()
    const off = window.api.onTasksRefresh(load)
    return () => {
      cancelled = true
      off()
    }
  }, [showBoundary])

  const mono = { fontFamily: token.fontFamilyCode, fontVariantNumeric: 'tabular-nums' as const }

  const statusRows: StatusRow[] = OPEN_STATUSES.map((status) => ({
    status,
    name: STATUS_LABELS[status],
    count: counts?.[status] ?? 0,
    share: ''
  }))
  const openTotal = statusRows.reduce((sum, row) => sum + row.count, 0)
  for (const row of statusRows) row.share = percent(row.count, openTotal)

  const bars: HBarRow[] = statusRows.map((row) => ({
    key: row.status,
    label: row.name,
    lead: <StatusChip status={row.status} />,
    value: row.count,
    valueText: String(row.count),
    shareText: row.share,
    ariaValue: `${row.count} ${row.count === 1 ? 'tarefa' : 'tarefas'}`,
    tooltip: (
      <span>
        <b style={{ fontFamily: token.fontFamilyCode, fontVariantNumeric: 'tabular-nums' }}>
          {row.count}
        </b>{' '}
        {row.count === 1 ? 'tarefa' : 'tarefas'} · {row.share} das abertas
      </span>
    )
  }))

  return (
    <Section icon={Gauge} title="Agora" extra="estado do sistema, sem filtro">
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          {!health ? (
            <Flex align="center" justify="center" style={{ minHeight: 200 }}>
              <Spin />
            </Flex>
          ) : (
            <HealthGrid>
              {healthItems(health, DASHBOARD_HEALTH).map((item) => (
                <HealthCard
                  key={item.key}
                  item={item}
                  openLabel={HEALTH_TARGETS[item.key].cta}
                  onOpen={() => navigate(HEALTH_TARGETS[item.key].route)}
                />
              ))}
            </HealthGrid>
          )}
        </Col>
        <Col xs={24} xl={8}>
          <ChartCard<StatusRow>
            title="Tarefas abertas por status"
            icon={ListTodo}
            table={{
              rowKey: 'status',
              data: statusRows,
              columns: [
                { title: 'Status', dataIndex: 'name', key: 'name' },
                {
                  title: 'Tarefas',
                  dataIndex: 'count',
                  key: 'count',
                  align: 'right',
                  render: (value: number) => <span style={mono}>{value}</span>
                },
                {
                  title: '%',
                  dataIndex: 'share',
                  key: 'share',
                  align: 'right',
                  render: (value: string) => <span style={mono}>{value}</span>
                }
              ]
            }}
          >
            <HBarList rows={bars} onOpen={(row) => navigate(`/?status=${row.key}`)} />
          </ChartCard>
        </Col>
      </Row>
    </Section>
  )
}
