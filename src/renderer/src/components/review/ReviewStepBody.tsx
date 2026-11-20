import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  App,
  Button,
  Dropdown,
  Flex,
  Grid,
  Input,
  Result,
  Select,
  Tag,
  Tooltip,
  Typography,
  theme
} from 'antd'
import {
  CalendarDays,
  Check,
  CircleArrowRight,
  CircleCheck,
  CirclePlay,
  Clock,
  Ellipsis,
  Flag,
  FolderKanban,
  Hourglass,
  Inbox,
  Lightbulb,
  Megaphone,
  Plus,
  Timer,
  Trash2,
  TrendingUp,
  TriangleAlert,
  User,
  type LucideIcon
} from 'lucide-react'
import {
  STATUS_LABELS,
  type Project,
  type ReviewCounterKey,
  type ReviewPastWeek,
  type ReviewStepKey,
  type Task,
  type TaskStatus
} from '@shared/types'
import { PROJECT_STATUS_LABELS } from '@shared/types'
import { HEALTH_LIMITS } from '@shared/healthLimits'
import { useErrorBoundary } from 'react-error-boundary'
import { localDateString } from '@shared/dueState'
import { addDays } from '@shared/calendarPrefs'
import { STATUS_COLORS } from '@renderer/theme/semantic'
import { useThemeSettings } from '@renderer/theme/themeSettings'
import { chipStyle } from '@renderer/components/chips/chipStyle'
import { StatusChip } from '@renderer/components/chips/StatusChip'
import {
  COLLECT_PLACES,
  MIND_TRIGGERS,
  UPCOMING_DAYS,
  chaseText,
  ideaLines,
  shortDuration,
  staleDays
} from './reviewFlowState'

const ICON = { size: 14, strokeWidth: 1.75, 'aria-hidden': true } as const

export interface ReviewStepActions {
  capture: (name: string) => Promise<void>
  bump: (key: ReviewCounterKey) => Promise<void>
  changed: () => void
}

interface ReviewStepBodyProps extends ReviewStepActions {
  step: ReviewStepKey
  captured: number[]
  ideas: string
  onIdeasChange: (value: string) => void
}

function dayHeading(day: string, today: string): string {
  const [y, m, d] = day.split('-').map(Number)
  const label = new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit'
  })
  return day === today ? `${label} · hoje` : label
}

function Eyebrow({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { token } = theme.useToken()
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '.08em',
        textTransform: 'uppercase',
        color: token.colorTextTertiary
      }}
    >
      {children}
    </span>
  )
}

function Act({
  icon: Icon,
  label,
  onClick,
  danger,
  wide
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
  danger?: boolean
  wide: boolean
}): React.JSX.Element {
  return (
    <Tooltip title={wide ? null : label}>
      <Button
        size="small"
        danger={danger}
        icon={<Icon {...ICON} />}
        onClick={onClick}
        aria-label={label}
      >
        {wide ? label : null}
      </Button>
    </Tooltip>
  )
}

function EmptyList({
  text,
  icon: Icon = CircleCheck
}: {
  text: string
  icon?: LucideIcon
}): React.JSX.Element {
  const { mode } = useThemeSettings()
  return (
    <div className="ct-rvempty">
      <Icon size={20} strokeWidth={1.75} aria-hidden color={STATUS_COLORS.executando[mode].fg} />
      <span>{text}</span>
    </div>
  )
}

function StaleChip({
  days,
  limit
}: {
  days: number | null
  limit: number
}): React.JSX.Element | null {
  const { token } = theme.useToken()
  const { mode } = useThemeSettings()
  if (days === null) return null
  if (days <= limit) {
    return (
      <Typography.Text type="secondary">
        há {days} dia{days === 1 ? '' : 's'}
      </Typography.Text>
    )
  }
  const { fg, bg } = STATUS_COLORS.aguardando[mode]
  return (
    <span style={chipStyle(fg, bg, 'transparent', token.borderRadiusSM)}>
      <Clock size={13} strokeWidth={2} aria-hidden />
      parada há {days} dias
    </span>
  )
}

function ProjectLabel({ task }: { task: Task }): React.JSX.Element | null {
  if (!task.project_name) return null
  return (
    <Flex align="center" gap={6} style={{ minWidth: 0 }}>
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          flex: 'none',
          background: task.project_color ?? undefined
        }}
      />
      <Typography.Text type="secondary" className="ct-ellipsis">
        {task.project_name}
      </Typography.Text>
    </Flex>
  )
}

function ReviewRow({
  task,
  meta,
  children
}: {
  task: Task
  meta?: React.ReactNode
  children: React.ReactNode
}): React.JSX.Element {
  const { token } = theme.useToken()
  return (
    <div className="ct-rvrow">
      <div
        style={{
          flex: '1 1 260px',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 4
        }}
      >
        <Typography.Link
          className="ct-ellipsis"
          style={{ color: token.colorText, fontWeight: 500 }}
          href={`#/task/${task.id}`}
        >
          {task.name}
        </Typography.Link>
        <Flex gap={10} wrap="wrap" align="center" style={{ fontSize: 12 }}>
          <ProjectLabel task={task} />
          {meta}
        </Flex>
      </div>
      <Flex gap={4} wrap="wrap" justify="flex-end">
        {children}
      </Flex>
    </div>
  )
}

function CaptureBox({
  placeholder,
  captured,
  onAdd,
  autoFocus
}: {
  placeholder: string
  captured: number[]
  onAdd: (name: string) => Promise<void>
  autoFocus?: boolean
}): React.JSX.Element {
  const { token } = theme.useToken()
  const { mode } = useThemeSettings()
  const [value, setValue] = useState('')
  const [names, setNames] = useState<Record<number, string>>({})
  const { showBoundary } = useErrorBoundary()

  useEffect(() => {
    const missing = captured.filter((id) => names[id] === undefined)
    if (missing.length === 0) return
    let alive = true
    void Promise.all(missing.map((id) => window.api.getTask(id)))
      .then((tasks) => {
        if (!alive) return
        setNames((current) => {
          const next = { ...current }
          missing.forEach((id, i) => {
            next[id] = tasks[i]?.name ?? ''
          })
          return next
        })
      })
      .catch(showBoundary)
    return () => {
      alive = false
    }
  }, [captured, names, showBoundary])

  const add = (): void => {
    const name = value.trim()
    if (!name) return
    setValue('')
    void onAdd(name)
  }

  const shown = captured.filter((id) => names[id])

  return (
    <Flex vertical gap={8}>
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onPressEnter={add}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-label={placeholder}
        prefix={<Plus {...ICON} color={token.colorTextTertiary} />}
        suffix={<Typography.Text keyboard>Enter</Typography.Text>}
      />
      {shown.length > 0 && (
        <Flex vertical gap={4}>
          <Eyebrow>No Inbox nesta revisão · {shown.length}</Eyebrow>
          {shown.map((id) => (
            <Flex key={id} align="center" gap={8} style={{ fontSize: 13 }}>
              <Inbox {...ICON} color={STATUS_COLORS.inbox[mode].fg} />
              <span className="ct-ellipsis">{names[id]}</span>
            </Flex>
          ))}
        </Flex>
      )}
    </Flex>
  )
}

function useStepData<T, A>(load: (arg: A) => Promise<T>, arg: A): [T | null, () => void] {
  const [data, setData] = useState<T | null>(null)
  const [version, setVersion] = useState(0)
  const { showBoundary } = useErrorBoundary()
  useEffect(() => {
    let alive = true
    void load(arg)
      .then((value) => {
        if (alive) setData(value)
      })
      .catch(showBoundary)
    return () => {
      alive = false
    }
  }, [load, arg, version, showBoundary])
  return [data, useCallback(() => setVersion((v) => v + 1), [])]
}

function loadStatusList(status: TaskStatus): Promise<Task[]> {
  return window.api.listTasks({ status, sort: 'status_changed' })
}

function loadPastWeek(): Promise<ReviewPastWeek> {
  return window.api.getReviewPastWeek()
}

function loadUpcoming(today: string): Promise<Task[]> {
  return window.api.listTasks({
    status: 'all',
    dueAfter: today,
    dueBefore: addDays(today, UPCOMING_DAYS),
    excludeStatus: ['finalizada'],
    sort: 'due_date'
  })
}

function loadActiveProjects(): Promise<Project[]> {
  return window.api.listProjects('active')
}

function loadSomeday(): Promise<[Task[], Project[]]> {
  return Promise.all([
    window.api.listTasks({ status: 'someday' }),
    window.api.listProjects('someday')
  ])
}

export function ReviewStepBody(props: ReviewStepBodyProps): React.JSX.Element {
  switch (props.step) {
    case 'collect':
      return (
        <Flex vertical gap={16}>
          <Flex gap={6} wrap="wrap">
            {COLLECT_PLACES.map((place) => (
              <Tag key={place} bordered={false}>
                {place}
              </Tag>
            ))}
          </Flex>
          <CaptureBox
            autoFocus
            placeholder="Anotar no Inbox"
            captured={props.captured}
            onAdd={props.capture}
          />
        </Flex>
      )
    case 'mind':
      return (
        <Flex vertical gap={16}>
          <div>
            <Eyebrow>Gatilhos</Eyebrow>
            <Flex gap={6} wrap="wrap" style={{ marginTop: 8 }}>
              {MIND_TRIGGERS.map((trigger) => (
                <Tag key={trigger} bordered={false}>
                  {trigger}
                </Tag>
              ))}
            </Flex>
          </div>
          <CaptureBox
            autoFocus
            placeholder="O que veio à cabeça?"
            captured={props.captured}
            onAdd={props.capture}
          />
        </Flex>
      )
    case 'past':
      return <PastStep {...props} />
    case 'upcoming':
      return <UpcomingStep {...props} />
    case 'creative':
      return <CreativeStep {...props} />
    case 'projects':
      return <ProjectsStep {...props} />
    case 'someday':
      return <SomedayStep {...props} />
    default:
      return <TaskListStep {...props} />
  }
}

const LIST_STATUS: Partial<Record<ReviewStepKey, TaskStatus>> = {
  inbox: 'inbox',
  next: 'proximas',
  waiting: 'aguardando'
}

function useTaskActions(
  actions: ReviewStepActions,
  reload: () => void
): {
  move: (task: Task, status: TaskStatus, text?: string, counter?: ReviewCounterKey) => void
  remove: (task: Task, counter?: ReviewCounterKey) => void
} {
  const { message } = App.useApp()
  const { showBoundary } = useErrorBoundary()
  const after = (counter?: ReviewCounterKey): void => {
    if (counter) void actions.bump(counter)
    reload()
    actions.changed()
  }
  return {
    move: (task, status, text, counter) => {
      void window.api
        .updateTask(task.id, { status })
        .then(() => {
          message.success(text ?? `${task.name} → ${STATUS_LABELS[status]}`)
          after(counter)
        })
        .catch(showBoundary)
    },
    remove: (task, counter) => {
      void window.api
        .deleteTask(task.id)
        .then(() => {
          message.success(`Excluída: ${task.name}`)
          after(counter)
        })
        .catch(showBoundary)
    }
  }
}

function TaskListStep(props: ReviewStepBodyProps): React.JSX.Element {
  const status = LIST_STATUS[props.step]!
  const screens = Grid.useBreakpoint()
  const wide = !!screens.lg
  const { mode } = useThemeSettings()
  const { message } = App.useApp()
  const { showBoundary } = useErrorBoundary()
  const [tasks, reload] = useStepData(loadStatusList, status)
  const { move, remove } = useTaskActions(props, reload)
  const now = new Date()

  if (!tasks) return <div style={{ minHeight: 48 }} />

  if (props.step === 'inbox') {
    if (tasks.length === 0) {
      return (
        <Result
          status="success"
          icon={
            <CircleCheck size={48} strokeWidth={1.5} color={STATUS_COLORS.executando[mode].fg} />
          }
          title="Inbox zero"
          subTitle="Tudo que chegou já tem lugar. Bom momento para seguir."
          style={{ padding: '16px 0' }}
        />
      )
    }
    return (
      <div>
        <Typography.Text
          type="secondary"
          style={{ fontSize: 12, display: 'block', marginBottom: 8 }}
        >
          {tasks.length} {tasks.length === 1 ? 'item' : 'itens'} · comece pelo mais antigo
        </Typography.Text>
        {tasks.map((task) => (
          <ReviewRow
            key={task.id}
            task={task}
            meta={
              task.due_date ? (
                <Typography.Text type="secondary">
                  prazo {task.due_date.slice(8, 10)}/{task.due_date.slice(5, 7)}
                </Typography.Text>
              ) : null
            }
          >
            <Act
              wide={wide}
              icon={CircleArrowRight}
              label="Próxima"
              onClick={() => move(task, 'proximas', undefined, 'processed')}
            />
            <Act
              wide={wide}
              icon={Hourglass}
              label="Aguardando"
              onClick={() => move(task, 'aguardando', undefined, 'processed')}
            />
            <Act
              wide={wide}
              icon={Lightbulb}
              label="Someday"
              onClick={() => move(task, 'someday', undefined, 'processed')}
            />
            <Act
              wide={wide}
              icon={Check}
              label="Feito (< 2 min)"
              onClick={() => move(task, 'finalizada', `Concluída: ${task.name}`, 'processed')}
            />
            <Act
              wide={false}
              icon={Trash2}
              label="Excluir"
              danger
              onClick={() => remove(task, 'processed')}
            />
          </ReviewRow>
        ))}
      </div>
    )
  }

  if (props.step === 'next') {
    if (tasks.length === 0) return <EmptyList text="Nenhuma próxima ação aberta." />
    return (
      <div>
        {tasks.map((task) => (
          <ReviewRow
            key={task.id}
            task={task}
            meta={<StaleChip days={staleDays(task, now)} limit={HEALTH_LIMITS.nextDays} />}
          >
            <Act
              wide={wide}
              icon={Check}
              label="Concluir"
              onClick={() => move(task, 'finalizada', `Concluída: ${task.name}`)}
            />
            <Act
              wide={wide}
              icon={Lightbulb}
              label="Someday"
              onClick={() => move(task, 'someday', undefined, 'cleaned')}
            />
            <Act
              wide={false}
              icon={Trash2}
              label="Excluir"
              danger
              onClick={() => remove(task, 'cleaned')}
            />
          </ReviewRow>
        ))}
      </div>
    )
  }

  if (tasks.length === 0) return <EmptyList text="Nada em Aguardando." />
  return (
    <div>
      {tasks.map((task) => (
        <ReviewRow
          key={task.id}
          task={task}
          meta={
            <>
              <Typography.Text type="secondary">
                <Flex component="span" align="center" gap={4}>
                  <User {...ICON} />
                  {task.waiting_for?.trim() || 'sem responsável'}
                </Flex>
              </Typography.Text>
              <StaleChip days={staleDays(task, now)} limit={HEALTH_LIMITS.waitingDays} />
            </>
          }
        >
          <Act
            wide={wide}
            icon={Check}
            label="Recebi"
            onClick={() => move(task, 'proximas', `Voltou para Próximas: ${task.name}`)}
          />
          <Act
            wide={wide}
            icon={Megaphone}
            label="Cobrar"
            onClick={() => {
              void props
                .capture(chaseText(task))
                .then(() => props.bump('chased'))
                .then(() => message.success('Ação "Cobrar" criada no Inbox'))
                .catch(showBoundary)
            }}
          />
          <Act
            wide={false}
            icon={Lightbulb}
            label="Someday"
            onClick={() => move(task, 'someday')}
          />
        </ReviewRow>
      ))}
    </div>
  )
}

function PastStep(props: ReviewStepBodyProps): React.JSX.Element {
  const { token } = theme.useToken()
  const { mode } = useThemeSettings()
  const [week] = useStepData(loadPastWeek, null)
  const today = localDateString(new Date())
  return (
    <Flex vertical gap={16}>
      {week && week.days.length === 0 && (
        <EmptyList
          text="Nenhuma sessão, entrega ou bloco nos últimos 7 dias."
          icon={CalendarDays}
        />
      )}
      {week && week.days.length > 0 && (
        <div className="ct-rvtimeline">
          {week.days.map((day) => (
            <div key={day.day} className="ct-rvday">
              <Eyebrow>{dayHeading(day.day, today)}</Eyebrow>
              {day.items.map((item) => {
                const Icon = item.done ? CircleCheck : item.kind === 'event' ? CalendarDays : Timer
                const color = item.done
                  ? STATUS_COLORS.finalizada[mode].fg
                  : token.colorTextTertiary
                const kind = item.done
                  ? 'concluída'
                  : item.kind === 'event'
                    ? 'bloco na agenda'
                    : 'sessão'
                return (
                  <Flex
                    key={`${item.kind}-${item.task_id}-${item.time ?? ''}`}
                    align="center"
                    gap={8}
                    style={{ fontSize: 13, padding: '3px 0' }}
                  >
                    <Icon size={14} strokeWidth={1.75} color={color} role="img" aria-label={kind} />
                    <span className="ct-ellipsis" style={{ flex: 1 }}>
                      {item.name}
                    </span>
                    <span
                      className="font-mono tabular-nums"
                      style={{ color: token.colorTextTertiary, fontSize: 12 }}
                    >
                      {item.time ?? shortDuration(item.seconds)}
                    </span>
                  </Flex>
                )
              })}
            </div>
          ))}
        </div>
      )}
      <CaptureBox
        placeholder="Gerou alguma ação? Anote aqui"
        captured={props.captured}
        onAdd={props.capture}
      />
    </Flex>
  )
}

function UpcomingStep(props: ReviewStepBodyProps): React.JSX.Element {
  const { token } = theme.useToken()
  const today = localDateString(new Date())
  const [tasks] = useStepData(loadUpcoming, today)
  const days = tasks ? Array.from(new Set(tasks.map((task) => task.due_date!))) : []
  return (
    <Flex vertical gap={16}>
      {tasks && days.length === 0 && (
        <EmptyList text="Nada marcado para as próximas duas semanas." icon={CalendarDays} />
      )}
      {days.length > 0 && (
        <div className="ct-rvtimeline">
          {days.map((day) => (
            <div key={day} className="ct-rvday">
              <Eyebrow>{dayHeading(day, today)}</Eyebrow>
              {tasks!
                .filter((task) => task.due_date === day)
                .map((task) => (
                  <Flex
                    key={task.id}
                    align="center"
                    gap={8}
                    style={{ fontSize: 13, padding: '3px 0' }}
                  >
                    <Flag {...ICON} color={token.colorTextTertiary} />
                    <Typography.Link
                      className="ct-ellipsis"
                      style={{ flex: 1, color: token.colorText }}
                      href={`#/task/${task.id}`}
                    >
                      {task.name}
                    </Typography.Link>
                    <StatusChip status={task.status} />
                    {task.due_time && (
                      <span
                        className="font-mono tabular-nums"
                        style={{ fontSize: 12, color: token.colorTextTertiary }}
                      >
                        {task.due_time}
                      </span>
                    )}
                  </Flex>
                ))}
            </div>
          ))}
        </div>
      )}
      <CaptureBox
        placeholder="Precisa preparar algo? Anote a ação"
        captured={props.captured}
        onAdd={props.capture}
      />
    </Flex>
  )
}

function ProjectRow({
  project,
  actions,
  reload
}: {
  project: Project
  actions: ReviewStepActions
  reload: () => void
}): React.JSX.Element {
  const { token } = theme.useToken()
  const { mode } = useThemeSettings()
  const { message } = App.useApp()
  const { showBoundary } = useErrorBoundary()
  const [open, setOpen] = useState<Task[] | null>(null)
  const lacksNext = !project.next_action

  const loadOpen = (): void => {
    if (open) return
    void window.api
      .getProjectTasks(project.id)
      .then((tasks) =>
        setOpen(tasks.filter((task) => task.status !== 'finalizada' && !task.is_archived))
      )
      .catch(showBoundary)
  }

  const update = (
    data: { next_task_id?: number; status?: Project['status'] },
    text: string,
    counter?: ReviewCounterKey
  ): void => {
    void window.api
      .updateProject(project.id, data)
      .then(() => {
        message.success(text)
        if (counter) void actions.bump(counter)
        reload()
        actions.changed()
      })
      .catch(showBoundary)
  }

  const warning = STATUS_COLORS.aguardando[mode]
  return (
    <div className="ct-rvrow">
      <div
        style={{ flex: '1 1 240px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}
      >
        <Flex align="center" gap={8} style={{ minWidth: 0 }}>
          <span
            aria-hidden
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              flex: 'none',
              background: project.color
            }}
          />
          <Typography.Link
            className="ct-ellipsis"
            style={{ color: token.colorText, fontWeight: 500 }}
            href={`#/project/${project.id}`}
          >
            {project.name}
          </Typography.Link>
        </Flex>
        <Flex gap={10} wrap="wrap" align="center" style={{ fontSize: 12 }}>
          <Typography.Text type="secondary" className="font-mono tabular-nums">
            {project.completed_task_count ?? 0}/{project.task_count ?? 0}
          </Typography.Text>
          {lacksNext ? (
            <span style={chipStyle(warning.fg, warning.bg, 'transparent', token.borderRadiusSM)}>
              <TriangleAlert size={13} strokeWidth={2} aria-hidden />
              Sem próxima ação
            </span>
          ) : (
            <Flex component="span" align="center" gap={6} style={{ minWidth: 0 }}>
              <CircleArrowRight {...ICON} color={STATUS_COLORS.proximas[mode].fg} />
              <span className="ct-ellipsis">{project.next_action}</span>
            </Flex>
          )}
        </Flex>
      </div>
      <Flex gap={4} wrap="wrap" justify="flex-end">
        {lacksNext && (
          <Select
            size="small"
            placeholder="Definir próxima ação"
            style={{ width: 220 }}
            aria-label={`Próxima ação de ${project.name}`}
            value={null}
            loading={open === null}
            onFocus={loadOpen}
            onOpenChange={(visible) => visible && loadOpen()}
            options={(open ?? []).map((task) => ({ value: task.id, label: task.name }))}
            notFoundContent="Nenhuma tarefa aberta"
            onChange={(id: number) =>
              update({ next_task_id: id }, 'Próxima ação definida', 'nextSet')
            }
          />
        )}
        <Dropdown
          trigger={['click']}
          menu={{
            items: [
              { key: 'someday', icon: <Lightbulb {...ICON} />, label: 'Mover para someday' },
              { key: 'done', icon: <CircleCheck {...ICON} />, label: 'Marcar como concluído' }
            ],
            onClick: ({ key }) =>
              update(
                { status: key as Project['status'] },
                `${project.name}: ${PROJECT_STATUS_LABELS[key as Project['status']]}`
              )
          }}
        >
          <Button
            size="small"
            type="text"
            aria-label={`Mais ações de ${project.name}`}
            icon={<Ellipsis {...ICON} />}
          />
        </Dropdown>
      </Flex>
    </div>
  )
}

function ProjectsStep(props: ReviewStepBodyProps): React.JSX.Element {
  const [projects, reload] = useStepData(loadActiveProjects, null)
  if (!projects) return <div style={{ minHeight: 48 }} />
  if (projects.length === 0) return <EmptyList text="Nenhum projeto ativo." icon={FolderKanban} />
  return (
    <div>
      {projects.map((project) => (
        <ProjectRow key={project.id} project={project} actions={props} reload={reload} />
      ))}
    </div>
  )
}

function SomedayStep(props: ReviewStepBodyProps): React.JSX.Element {
  const screens = Grid.useBreakpoint()
  const wide = !!screens.lg
  const { token } = theme.useToken()
  const { message } = App.useApp()
  const { showBoundary } = useErrorBoundary()
  const [data, reload] = useStepData(loadSomeday, null)
  const { move, remove } = useTaskActions(props, reload)
  if (!data) return <div style={{ minHeight: 48 }} />
  const [tasks, projects] = data
  if (tasks.length === 0 && projects.length === 0) {
    return <EmptyList text="A lista someday está vazia." icon={Lightbulb} />
  }
  const activate = (project: Project): void => {
    void window.api
      .updateProject(project.id, { status: 'active' })
      .then(() => {
        message.success(`${project.name} ativado. Defina a próxima ação no passo Projetos.`)
        reload()
        props.changed()
      })
      .catch(showBoundary)
  }
  return (
    <div>
      {projects.map((project) => (
        <div key={`p${project.id}`} className="ct-rvrow">
          <Flex align="center" gap={8} style={{ flex: 1, minWidth: 0 }}>
            <FolderKanban {...ICON} color={token.colorTextTertiary} />
            <span
              aria-hidden
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                flex: 'none',
                background: project.color
              }}
            />
            <span className="ct-ellipsis" style={{ fontWeight: 500 }}>
              {project.name}
            </span>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              projeto
            </Typography.Text>
          </Flex>
          <Act wide={wide} icon={CirclePlay} label="Ativar" onClick={() => activate(project)} />
        </div>
      ))}
      {tasks.map((task) => (
        <ReviewRow key={task.id} task={task}>
          <Act
            wide={wide}
            icon={CirclePlay}
            label="Ativar"
            onClick={() => move(task, 'proximas')}
          />
          <Act
            wide={false}
            icon={Trash2}
            label="Excluir"
            danger
            onClick={() => remove(task, 'cleaned')}
          />
        </ReviewRow>
      ))}
    </div>
  )
}

function CreativeStep(props: ReviewStepBodyProps): React.JSX.Element {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const { showBoundary } = useErrorBoundary()
  const lines = ideaLines(props.ideas)
  const send = async (): Promise<void> => {
    for (const line of lines) await props.capture(line)
    props.onIdeasChange('')
    message.success(
      `${lines.length} ${lines.length === 1 ? 'ideia foi' : 'ideias foram'} para o Inbox`
    )
  }
  return (
    <Flex vertical gap={12}>
      <Input.TextArea
        autoSize={{ minRows: 4, maxRows: 10 }}
        placeholder={'Uma ideia por linha.\nEx.: Curso de liderança em 2027'}
        value={props.ideas}
        onChange={(event) => props.onIdeasChange(event.target.value)}
        aria-label="Ideias"
      />
      <Flex gap={8} wrap="wrap">
        <Button
          icon={<Inbox {...ICON} />}
          disabled={lines.length === 0}
          onClick={() => void send().catch(showBoundary)}
        >
          Mandar para o Inbox
        </Button>
        <Button type="link" icon={<TrendingUp {...ICON} />} onClick={() => navigate('/horizons')}>
          Rever áreas e metas
        </Button>
      </Flex>
    </Flex>
  )
}
