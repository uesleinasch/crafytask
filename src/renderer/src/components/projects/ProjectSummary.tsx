import { forwardRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  App,
  Button,
  Card,
  Col,
  Flex,
  Input,
  Progress,
  Row,
  Select,
  Statistic,
  Tag,
  Typography,
  theme,
  type RefSelectProps
} from 'antd'
import { ChartColumn, Play, Target } from 'lucide-react'
import type { Project, Task, UpdateProjectInput } from '@shared/types'
import { StatusChip } from '@renderer/components/chips/StatusChip'
import { STATUS_ICONS } from '@renderer/components/chips/statusMeta'
import { errorMessage } from '@renderer/components/settings/settingsStatus'
import { formatShortDuration } from '@renderer/components/tasks/taskTableFormat'
import { useTimerStore } from '@renderer/stores/timerStore'
import { CATEGORY_COLORS, STATUS_COLORS } from '@renderer/theme/semantic'
import { useThemeSettings } from '@renderer/theme/themeSettings'
import { daysUntil, openTasks, progressPercent } from './projectList'

const ICON = { size: 14, strokeWidth: 1.75, 'aria-hidden': true } as const

function CardTitle({
  icon,
  children
}: {
  icon: React.ReactNode
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <Flex align="center" gap={6}>
      {icon}
      {children}
    </Flex>
  )
}

interface NextActionCardProps {
  project: Project
  tasks: Task[]
  onSave: (patch: UpdateProjectInput, success?: string) => Promise<void>
}

export const NextActionCard = forwardRef<RefSelectProps, NextActionCardProps>(
  function NextActionCard({ project, tasks, onSave }, ref) {
    const navigate = useNavigate()
    const { message } = App.useApp()
    const { token } = theme.useToken()
    const { mode } = useThemeSettings()
    const startTimer = useTimerStore((s) => s.startTimer)
    const next = tasks.find((t) => t.id === project.next_action_id)
    const name = next?.name ?? project.next_action
    const Icon = STATUS_ICONS.proximas
    const choices = tasks.filter(
      (t) => t.status !== 'finalizada' && t.id !== project.next_action_id
    )
    return (
      <Card
        size="small"
        title={
          <CardTitle icon={<Icon {...ICON} color={STATUS_COLORS.proximas[mode].fg} />}>
            Próxima ação
          </CardTitle>
        }
      >
        {name && project.next_action_id ? (
          <Flex vertical gap={8}>
            <Typography.Link
              href={`#/task/${project.next_action_id}`}
              onClick={(e) => {
                e.preventDefault()
                void navigate(`/task/${project.next_action_id}`)
              }}
              style={{ color: token.colorText, fontWeight: 500 }}
            >
              {name}
            </Typography.Link>
            {next && (
              <Flex gap={6} align="center" wrap="wrap">
                <StatusChip status={next.status} />
                {(next.contexts ?? []).map((c) => (
                  <Tag key={c.id} bordered={false} style={{ margin: 0 }}>
                    {c.icon} {c.name}
                  </Tag>
                ))}
                <span style={{ flex: 1 }} />
                <Button
                  size="small"
                  type="primary"
                  disabled={next.is_blocked}
                  icon={<Play {...ICON} />}
                  onClick={() =>
                    startTimer(next.id)
                      .then(() => message.success(`Timer iniciado: ${next.name}`))
                      .catch((error) => message.error(errorMessage(error)))
                  }
                >
                  Iniciar
                </Button>
              </Flex>
            )}
          </Flex>
        ) : (
          <Typography.Text type="secondary">
            Nenhuma tarefa marcada como próxima ação.
          </Typography.Text>
        )}
        <Select
          ref={ref}
          showSearch
          optionFilterProp="label"
          placeholder="Escolher outra tarefa como próxima…"
          value={null}
          style={{ width: '100%', marginTop: 10 }}
          aria-label="Definir próxima ação"
          options={choices.map((t) => ({ value: t.id, label: t.name }))}
          notFoundContent="Nenhuma tarefa aberta"
          onChange={(id: number) => void onSave({ next_task_id: id }, 'Marcada como próxima ação')}
        />
      </Card>
    )
  }
)

export function OutcomeCard({
  project,
  onSave
}: {
  project: Project
  onSave: (patch: UpdateProjectInput) => Promise<void>
}): React.JSX.Element {
  const { token } = theme.useToken()
  return (
    <Card
      size="small"
      title={
        <CardTitle icon={<Target {...ICON} color={token.colorTextTertiary} />}>
          Resultado desejado
        </CardTitle>
      }
    >
      <Input.TextArea
        key={`${project.id}:${project.outcome ?? ''}`}
        variant="borderless"
        autoSize={{ minRows: 2, maxRows: 8 }}
        defaultValue={project.outcome}
        placeholder="Como vai ser quando este projeto estiver pronto?"
        aria-label="Resultado desejado"
        onBlur={(e) => {
          if (e.target.value !== (project.outcome ?? '')) void onSave({ outcome: e.target.value })
        }}
        style={{ padding: 0, fontSize: 15 }}
      />
    </Card>
  )
}

export function ProgressCard({
  project,
  tasks,
  today
}: {
  project: Project
  tasks: Task[]
  today: string
}): React.JSX.Element {
  const { token } = theme.useToken()
  const { mode } = useThemeSettings()
  const mono: React.CSSProperties = {
    fontFamily: token.fontFamilyCode,
    fontVariantNumeric: 'tabular-nums',
    fontSize: 20
  }
  const done = project.completed_task_count ?? 0
  const total = project.task_count ?? 0
  const pct = progressPercent(project)
  const blocked = tasks.filter((t) => t.status !== 'finalizada' && t.is_blocked).length
  const days = project.due_date ? daysUntil(project.due_date, today) : null
  return (
    <Card
      size="small"
      title={
        <CardTitle icon={<ChartColumn {...ICON} color={token.colorTextTertiary} />}>
          Progresso
        </CardTitle>
      }
    >
      <Flex vertical gap={12}>
        <div>
          <Flex justify="space-between">
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {done} de {total} tarefas
            </Typography.Text>
            <span style={{ ...mono, fontSize: 12 }}>{pct}%</span>
          </Flex>
          <Progress percent={pct} showInfo={false} aria-label={`${pct}% concluído`} />
        </div>
        <Row gutter={[12, 12]}>
          <Col span={12}>
            <Statistic title="Abertas" value={openTasks(project)} styles={{ content: mono }} />
          </Col>
          <Col span={12}>
            <Statistic
              title="Bloqueadas"
              value={blocked}
              styles={{
                content: {
                  ...mono,
                  color: blocked ? CATEGORY_COLORS.prioridade[mode].fg : undefined
                }
              }}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title="Tempo total"
              value={formatShortDuration(project.total_seconds ?? 0)}
              styles={{ content: mono }}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title="Prazo"
              value={days === null ? '—' : days < 0 ? 'venceu' : `${days} dias`}
              styles={{
                content: {
                  ...mono,
                  color:
                    days !== null && days < 0 && project.status === 'active'
                      ? token.colorError
                      : undefined
                }
              }}
            />
          </Col>
        </Row>
      </Flex>
    </Card>
  )
}
