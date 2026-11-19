import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useErrorBoundary } from 'react-error-boundary'
import {
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Grid,
  List,
  Progress,
  Row,
  Space,
  Spin,
  Tooltip,
  Typography,
  theme
} from 'antd'
import { CheckSquare, Clock } from 'lucide-react'
import type { Task, TimeBlock } from '@shared/types'
import { localDateString } from '@shared/dueState'
import { formatTimeRange } from '@shared/taskTime'
import { StatusChip } from '@renderer/components/chips/StatusChip'
import { PageContainer } from '@renderer/components/shell/PageContainer'
import { ProjectLabel } from '@renderer/components/tasks/ProjectLabel'
import { formatShortDuration } from '@renderer/components/tasks/taskTableFormat'
import {
  JOURNEY_MIN,
  formatPlannedHours,
  loadPercent,
  planTitle,
  plannedMinByDate,
  weekDays
} from '@renderer/components/today/dayPlan'
import { useLiveSeconds } from '@renderer/hooks/useLiveSeconds'

function useMono(): React.CSSProperties {
  const { token } = theme.useToken()
  return { fontFamily: token.fontFamilyCode, fontVariantNumeric: 'tabular-nums' }
}

function PlanItem({ task, today }: { task: Task; today: string }): React.JSX.Element {
  const navigate = useNavigate()
  const { token } = theme.useToken()
  const mono = useMono()
  const seconds = useLiveSeconds(task)
  const range = formatTimeRange(task.scheduled_time, task.scheduled_end_time)
  const dueTime = task.due_date?.slice(0, 10) === today ? task.due_time : null

  return (
    <List.Item
      actions={[
        <Typography.Text key="time" style={mono}>
          {dueTime || formatShortDuration(seconds)}
        </Typography.Text>
      ]}
    >
      <List.Item.Meta
        title={
          <Typography.Link
            href={`#/task/${task.id}`}
            onClick={(event) => {
              event.preventDefault()
              navigate(`/task/${task.id}`)
            }}
            style={{ color: token.colorText }}
          >
            {task.name}
          </Typography.Link>
        }
        description={
          <Space size={6} wrap>
            {range && (
              <Tooltip title="Horário fixo: tarefas com horário vêm primeiro, pela hora">
                <Typography.Text type="secondary" style={{ ...mono, fontSize: 12 }}>
                  <Clock
                    size={14}
                    strokeWidth={1.75}
                    aria-hidden
                    style={{ verticalAlign: -2, marginRight: 4 }}
                  />
                  {range}
                </Typography.Text>
              </Tooltip>
            )}
            <StatusChip status={task.status} />
            {task.project_name && (
              <ProjectLabel name={task.project_name} color={task.project_color} />
            )}
          </Space>
        }
      />
    </List.Item>
  )
}

export function TodayPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { showBoundary } = useErrorBoundary()
  const { token } = theme.useToken()
  const mono = useMono()
  const screens = Grid.useBreakpoint()
  const [today, setToday] = useState(() => localDateString(new Date()))
  const day = useMemo(() => new Date(`${today}T12:00:00`), [today])
  const week = useMemo(() => weekDays(day), [day])
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [blocks, setBlocks] = useState<TimeBlock[]>([])

  const load = useCallback(async (): Promise<void> => {
    const [dayTasks, weekBlocks] = await Promise.all([
      window.api.getTasksForDate(today),
      window.api.getTimeBlocksForWeek(week[0].date)
    ])
    setTasks(dayTasks)
    setBlocks(weekBlocks)
  }, [today, week])

  useEffect(() => {
    load().catch(showBoundary)
    const reload = (): void => void load().catch(showBoundary)
    const offRefresh = window.api.onTasksRefresh(reload)
    const offStopped = window.api.onTimerStopped(reload)
    return () => {
      offRefresh()
      offStopped()
    }
  }, [load, showBoundary])

  useEffect(() => {
    const timer = window.setInterval(() => setToday(localDateString(new Date())), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const minutesByDate = useMemo(() => plannedMinByDate(blocks), [blocks])
  const plannedMin = minutesByDate.get(today) ?? 0
  const over = plannedMin > JOURNEY_MIN
  const loadLabel = `${formatPlannedHours(plannedMin)} de ${formatPlannedHours(JOURNEY_MIN)}`

  if (tasks === null) {
    return (
      <Flex justify="center" style={{ padding: 48 }}>
        <Spin />
      </Flex>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <PageContainer>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Card
              title={planTitle(day)}
              extra={
                <Flex align="center" gap={8}>
                  <Progress
                    percent={loadPercent(plannedMin)}
                    showInfo={false}
                    size="small"
                    strokeColor={over ? token.colorWarning : undefined}
                    style={{ width: screens.sm ? 96 : 48, margin: 0 }}
                    aria-label={`Carga planejada: ${loadLabel}${over ? ', passa da jornada' : ''}`}
                  />
                  <Tooltip title={over && !screens.sm ? 'Passa da jornada' : undefined}>
                    <Typography.Text
                      type="secondary"
                      style={over ? { ...mono, color: token.colorWarningText } : mono}
                    >
                      {loadLabel}
                      {over && screens.sm ? ' · passa da jornada' : ''}
                    </Typography.Text>
                  </Tooltip>
                </Flex>
              }
              styles={tasks.length ? { body: { paddingTop: 4, paddingBottom: 4 } } : undefined}
            >
              {tasks.length ? (
                <List
                  size="small"
                  dataSource={tasks}
                  rowKey="id"
                  renderItem={(task) => <PlanItem task={task} today={today} />}
                />
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <>
                      Nada planejado para hoje.
                      <br />
                      <Typography.Text type="secondary">
                        Na lista de tarefas, use <b>Hoje</b> (botão da linha ou do menu ⋯) para
                        trazer tarefas para cá.
                      </Typography.Text>
                    </>
                  }
                >
                  <Button
                    icon={<CheckSquare size={14} strokeWidth={1.75} />}
                    onClick={() => navigate('/')}
                  >
                    Ir para Tarefas
                  </Button>
                </Empty>
              )}
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card
              title="Semana"
              extra={
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  blocos de tempo
                </Typography.Text>
              }
            >
              <Flex vertical gap={10}>
                {week.map((day) => {
                  const minutes = minutesByDate.get(day.date) ?? 0
                  const dayOver = minutes > JOURNEY_MIN
                  return (
                    <Flex key={day.date} align="center" gap={10}>
                      <Typography.Text strong={day.date === today} style={{ width: 32 }}>
                        {day.label}
                      </Typography.Text>
                      <Progress
                        percent={loadPercent(minutes)}
                        showInfo={false}
                        size="small"
                        strokeColor={dayOver ? token.colorWarning : undefined}
                        style={{ flex: 1, margin: 0 }}
                        aria-label={`${day.label}: ${formatPlannedHours(minutes)} planejadas`}
                      />
                      <Typography.Text
                        style={{
                          ...mono,
                          width: 44,
                          textAlign: 'right',
                          color: dayOver ? token.colorWarningText : undefined
                        }}
                      >
                        {minutes ? formatPlannedHours(minutes) : '—'}
                      </Typography.Text>
                    </Flex>
                  )
                })}
              </Flex>
            </Card>
          </Col>
        </Row>
      </PageContainer>
    </div>
  )
}
