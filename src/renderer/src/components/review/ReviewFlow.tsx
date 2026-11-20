import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  App,
  Button,
  Card,
  Divider,
  Flex,
  Grid,
  Input,
  Progress,
  Select,
  Space,
  Steps,
  Tooltip,
  Typography,
  theme
} from 'antd'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CircleArrowRight,
  CircleCheck,
  CircleMinus,
  Brain,
  Clock,
  Download,
  ExternalLink,
  Flag,
  FolderKanban,
  History,
  Hourglass,
  Inbox,
  Lightbulb,
  Pause,
  Rocket,
  type LucideIcon
} from 'lucide-react'
import type {
  ReviewCounterKey,
  ReviewHealthIndicators,
  ReviewStepKey,
  ReviewStepStatus,
  WeeklyReview
} from '@shared/types'
import { STATUS_COLORS } from '@renderer/theme/semantic'
import { useThemeSettings } from '@renderer/theme/themeSettings'
import { RegionBoundary } from '@renderer/components/shell/RegionBoundary'
import { useErrorBoundary } from 'react-error-boundary'
import { parseSqlTime } from '@shared/healthLimits'
import { localDateString } from '@shared/dueState'
import { REVIEW_PHASES, REVIEW_STEP_LABELS } from './reviewEntryState'
import {
  REVIEW_STEP_META,
  reviewStepRoute,
  elapsedMinutes,
  markedCount,
  phaseOf,
  previousStep,
  reviewView,
  stepNumber,
  summaryRows,
  systemRows,
  unmarkedSteps,
  unmarkedText,
  type ReviewView,
  type SystemRow
} from './reviewFlowState'
import { ReviewStepBody } from './ReviewStepBody'

const ICON = { size: 16, strokeWidth: 1.75, 'aria-hidden': true } as const
const NOTES_DELAY_MS = 600

const SYSTEM_ICONS: Record<SystemRow['key'], LucideIcon> = {
  inboxCount: Inbox,
  projectsWithoutNextAction: CircleArrowRight,
  staleWaitingTasks: Hourglass,
  staleNextTasks: Clock
}

const STEP_ICONS: Record<ReviewStepKey, LucideIcon> = {
  collect: Download,
  inbox: Inbox,
  mind: Brain,
  next: CircleArrowRight,
  past: History,
  upcoming: CalendarDays,
  waiting: Hourglass,
  projects: FolderKanban,
  someday: Lightbulb,
  creative: Rocket
}

interface ReviewFlowProps {
  review: WeeklyReview
  health: ReviewHealthIndicators | null
  onSetStep: (key: ReviewStepKey, status: ReviewStepStatus | null) => Promise<void>
  onGoToStep: (key: ReviewStepKey) => Promise<void>
  onBump: (key: ReviewCounterKey, taskId?: number) => Promise<void>
  onSaveNotes: (notes: string) => Promise<void>
  onRefreshHealth: () => Promise<void>
  onPause: () => void
  onComplete: (notes: string) => Promise<void>
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

function SystemIcon({ row, color }: { row: SystemRow; color: string }): React.JSX.Element {
  const Icon = SYSTEM_ICONS[row.key]
  return <Icon size={14} strokeWidth={1.75} aria-hidden color={color} />
}

function StepIcon({ step, color }: { step: ReviewStepKey; color: string }): React.JSX.Element {
  const Icon = STEP_ICONS[step]
  return <Icon size={18} strokeWidth={1.75} aria-hidden color={color} />
}

function useMinuteClock(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [])
  return now
}

export function ReviewFlow({
  review,
  health,
  onSetStep,
  onGoToStep,
  onBump,
  onSaveNotes,
  onRefreshHealth,
  onPause,
  onComplete
}: ReviewFlowProps): React.JSX.Element {
  const { token } = theme.useToken()
  const { mode } = useThemeSettings()
  const { message, modal } = App.useApp()
  const navigate = useNavigate()
  const screens = Grid.useBreakpoint()
  const now = useMinuteClock()
  const { showBoundary } = useErrorBoundary()

  const [atFinish, setAtFinish] = useState(false)
  const [ideas, setIdeas] = useState('')
  const [notes, setNotes] = useState(review.notes ?? '')
  const savedNotes = useRef(review.notes ?? '')

  const view: ReviewView = reviewView(review, atFinish)
  const done = markedCount(review)
  const elapsed = elapsedMinutes(review, now)

  useEffect(() => {
    if (notes === savedNotes.current) return
    const id = window.setTimeout(() => {
      savedNotes.current = notes
      void onSaveNotes(notes).catch(showBoundary)
    }, NOTES_DELAY_MS)
    return () => window.clearTimeout(id)
  }, [notes, onSaveNotes, showBoundary])

  const flushNotes = async (): Promise<void> => {
    if (notes === savedNotes.current) return
    savedNotes.current = notes
    await onSaveNotes(notes)
  }

  const goStep = (key: ReviewView): void => {
    if (key === 'finish') {
      setAtFinish(true)
      return
    }
    setAtFinish(false)
    void onGoToStep(key).catch(showBoundary)
  }

  const markStep = (key: ReviewStepKey, status: ReviewStepStatus): void => {
    setAtFinish(false)
    void onSetStep(key, status).catch(showBoundary)
  }

  const markRef = useRef(markStep)
  useEffect(() => {
    markRef.current = markStep
  })
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (!(event.ctrlKey || event.metaKey) || event.key !== 'Enter' || view === 'finish') return
      if (event.defaultPrevented || document.querySelector('[role="dialog"][aria-modal="true"]')) {
        return
      }
      event.preventDefault()
      markRef.current(view, 'done')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view])

  const capture = async (name: string): Promise<void> => {
    const task = await window.api.createTask({ name })
    await onBump('collected', task.id)
    await onRefreshHealth()
  }

  const bump = async (key: ReviewCounterKey): Promise<void> => {
    await onBump(key)
  }

  const pause = async (): Promise<void> => {
    await flushNotes()
    message.info('Revisão pausada. Ela continua de onde parou.')
    onPause()
  }

  const openScreen = async (key: ReviewStepKey): Promise<void> => {
    const target = REVIEW_STEP_META[key].open
    if (!target) return
    await flushNotes()
    message.info(`${target.text}. A revisão continua aqui.`)
    navigate(reviewStepRoute(target, localDateString(new Date())))
  }

  const unmarked = unmarkedSteps(review)
  const finish = (): void => {
    const save = async (): Promise<void> => {
      savedNotes.current = notes
      await onComplete(notes)
      message.success('Revisão registrada. Até a próxima semana.')
    }
    if (unmarked.length === 0) {
      void save().catch(showBoundary)
      return
    }
    modal.confirm({
      title: `Concluir com ${unmarked.length} passo${unmarked.length > 1 ? 's' : ''} sem marcar?`,
      content:
        'Eles ficam registrados como pulados. Tudo bem: uma revisão parcial vale mais que nenhuma.',
      okText: 'Concluir assim',
      cancelText: 'Voltar',
      onOk: () => save().catch(showBoundary)
    })
  }

  const stepItems = (
    steps: readonly ReviewStepKey[]
  ): NonNullable<React.ComponentProps<typeof Steps>['items']> =>
    steps.map((key) => {
      const state = review.steps[key]
      return {
        title: <span style={{ fontSize: 13 }}>{REVIEW_STEP_LABELS[key]}</span>,
        status: state === 'done' ? 'finish' : key === view ? 'process' : 'wait',
        content: state === 'skipped' ? 'Pulado' : undefined,
        icon:
          state === 'skipped' ? (
            <CircleMinus size={20} strokeWidth={1.75} aria-hidden color={token.colorTextTertiary} />
          ) : undefined
      }
    })

  const rail = (
    <nav className="ct-rvrail" aria-label="Passos da revisão">
      {REVIEW_PHASES.map((phase, index) => (
        <div key={phase.key}>
          <div style={{ margin: index ? '12px 0 6px' : '0 0 6px' }}>
            <Eyebrow>
              {index + 1} · {phase.label}
            </Eyebrow>
          </div>
          <Steps
            orientation="vertical"
            size="small"
            current={view === 'finish' ? -1 : phase.steps.indexOf(view)}
            items={stepItems(phase.steps)}
            onChange={(i) => goStep(phase.steps[i])}
          />
        </div>
      ))}
      <Button
        block
        type={view === 'finish' ? 'primary' : 'default'}
        ghost={view === 'finish'}
        icon={<Flag {...ICON} />}
        onClick={() => goStep('finish')}
        style={{ marginTop: 8 }}
      >
        Fechar a revisão
      </Button>
    </nav>
  )

  const mobileNav = (
    <Select<ReviewView>
      value={view}
      onChange={goStep}
      style={{ width: '100%' }}
      aria-label="Passo"
      options={[
        ...REVIEW_PHASES.map((phase) => ({
          label: phase.label,
          options: phase.steps.map((key) => ({
            value: key,
            label:
              (review.steps[key] === 'done' ? '✓ ' : review.steps[key] === 'skipped' ? '– ' : '') +
              REVIEW_STEP_LABELS[key]
          }))
        })),
        { label: 'Fim', options: [{ value: 'finish' as ReviewView, label: 'Fechar a revisão' }] }
      ]}
    />
  )

  const finishBody = (
    <Flex vertical gap={16}>
      {health && (
        <div className="ct-rvsummary">
          {summaryRows(review, health).map((row) => (
            <div key={row.label}>
              <div
                className="font-mono tabular-nums"
                style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.15 }}
              >
                {row.value}
              </div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {row.label}
              </Typography.Text>
            </div>
          ))}
        </div>
      )}
      {unmarked.length > 0 && <Alert type="info" showIcon title={unmarkedText(unmarked)} />}
      <Typography.Text type="secondary">Duração: {elapsed} min.</Typography.Text>
    </Flex>
  )

  const target = view === 'finish' ? undefined : REVIEW_STEP_META[view].open
  const previous = view === 'finish' ? null : previousStep(view)

  const panel = (
    <Card
      size="small"
      styles={{ header: { paddingBlock: 12 } }}
      title={
        view === 'finish' ? (
          <Flex vertical gap={2}>
            <Eyebrow>Fim</Eyebrow>
            <span style={{ fontSize: 17 }}>Fechar a revisão</span>
          </Flex>
        ) : (
          <Flex vertical gap={2}>
            <Eyebrow>
              {phaseOf(view).label} · passo {stepNumber(view)} de 10
            </Eyebrow>
            <Flex component="span" align="center" gap={8} style={{ fontSize: 17 }}>
              <StepIcon step={view} color={token.colorPrimary} />
              {REVIEW_STEP_LABELS[view]}
            </Flex>
          </Flex>
        )
      }
      extra={
        target && view !== 'finish' ? (
          <Button
            size="small"
            type="link"
            icon={<ExternalLink {...ICON} />}
            aria-label={screens.md ? undefined : target.text}
            title={target.text}
            onClick={() => void openScreen(view).catch(showBoundary)}
          >
            {screens.md ? 'Abrir a tela' : null}
          </Button>
        ) : null
      }
    >
      <Flex vertical gap={16}>
        {view !== 'finish' && (
          <Typography.Text type="secondary" style={{ fontSize: 14 }}>
            {REVIEW_STEP_META[view].question}
          </Typography.Text>
        )}
        <RegionBoundary
          region={view === 'finish' ? 'fechamento da revisão' : `passo ${REVIEW_STEP_LABELS[view]}`}
          resetKeys={[view]}
        >
          {view === 'finish' ? (
            finishBody
          ) : (
            <ReviewStepBody
              key={view}
              step={view}
              captured={review.captured}
              ideas={ideas}
              onIdeasChange={setIdeas}
              capture={capture}
              bump={bump}
              changed={() => void onRefreshHealth()}
            />
          )}
        </RegionBoundary>
        <Divider style={{ margin: '4px 0' }} />
        <Flex gap={8} justify="space-between" wrap="wrap" align="center">
          {previous ? (
            <Button type="text" icon={<ArrowLeft {...ICON} />} onClick={() => goStep(previous)}>
              Anterior
            </Button>
          ) : (
            <span />
          )}
          {view === 'finish' ? (
            <Button type="primary" icon={<Check {...ICON} />} onClick={finish}>
              Concluir revisão
            </Button>
          ) : (
            <Space>
              <Button onClick={() => markStep(view, 'skipped')}>Pular</Button>
              <Tooltip title="Ctrl+Enter">
                <Button
                  type="primary"
                  icon={<Check {...ICON} />}
                  onClick={() => markStep(view, 'done')}
                >
                  Concluir passo
                </Button>
              </Tooltip>
            </Space>
          )}
        </Flex>
      </Flex>
    </Card>
  )

  const side = (
    <Flex vertical gap={16}>
      {health && (
        <Card size="small" title="Sistema nesta revisão">
          <Flex vertical gap={6}>
            {systemRows(review.start_health, health).map((row) => (
              <Flex key={row.key} align="center" gap={8} style={{ fontSize: 13 }}>
                <SystemIcon row={row} color={token.colorTextTertiary} />
                <span style={{ flex: 1 }}>{row.label}</span>
                <span className="font-mono tabular-nums" style={{ color: token.colorTextTertiary }}>
                  {row.start ?? '—'}
                </span>
                <ArrowRight
                  size={10}
                  strokeWidth={2}
                  aria-label="agora"
                  role="img"
                  color={token.colorTextTertiary}
                />
                <span
                  className="font-mono tabular-nums"
                  style={{ fontWeight: 600, minWidth: 16, textAlign: 'right' }}
                >
                  {row.now}
                </span>
                {row.now === 0 ? (
                  <CircleCheck
                    size={14}
                    strokeWidth={2}
                    role="img"
                    aria-label="Em dia"
                    color={STATUS_COLORS.executando[mode].fg}
                  />
                ) : (
                  <span style={{ width: 14 }} />
                )}
              </Flex>
            ))}
          </Flex>
        </Card>
      )}
      <Card
        size="small"
        title="Notas da revisão"
        extra={
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            salvas sozinhas
          </Typography.Text>
        }
      >
        <Input.TextArea
          autoSize={{ minRows: 3, maxRows: 8 }}
          placeholder="Observações, decisões, foco da próxima semana"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          onBlur={() => void flushNotes().catch(showBoundary)}
          aria-label="Notas da revisão"
        />
      </Card>
    </Flex>
  )

  const weekLabel = parseSqlTime(review.started_at).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit'
  })

  return (
    <>
      <Flex align="center" gap="8px 16px" wrap="wrap" style={{ marginBottom: 16 }}>
        <Flex vertical style={{ flex: '1 1 260px', minWidth: 0 }}>
          <span style={{ fontSize: 20, fontWeight: 600 }}>Revisão da semana {weekLabel}</span>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Começou há {elapsed} min · tudo fica salvo, pode sair e voltar
          </Typography.Text>
        </Flex>
        <Flex align="center" gap={8} style={{ flex: '0 1 280px', minWidth: 180 }}>
          <Progress
            percent={Math.round((done / 10) * 100)}
            showInfo={false}
            size="small"
            style={{ flex: 1, margin: 0 }}
            aria-label="Progresso da revisão"
          />
          <span
            className="font-mono tabular-nums"
            style={{ fontSize: 12, color: token.colorTextSecondary }}
          >
            {done}/10
          </span>
        </Flex>
        <Button icon={<Pause {...ICON} />} onClick={() => void pause().catch(showBoundary)}>
          Pausar
        </Button>
      </Flex>
      {screens.lg ? (
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          {rail}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {screens.xxl ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) 300px',
                  gap: 16,
                  alignItems: 'start'
                }}
              >
                {panel}
                {side}
              </div>
            ) : (
              <>
                {panel}
                {side}
              </>
            )}
          </div>
        </div>
      ) : (
        <Flex vertical gap={12}>
          {mobileNav}
          {panel}
          {side}
        </Flex>
      )}
    </>
  )
}
