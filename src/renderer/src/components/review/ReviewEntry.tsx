import { useMemo, useState } from 'react'
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Flex,
  Grid,
  Row,
  Space,
  Table,
  Tooltip,
  Typography,
  theme
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  Check,
  ChartLine,
  CircleCheck,
  CircleMinus,
  CirclePause,
  CirclePlay,
  Gauge,
  History
} from 'lucide-react'
import type { ReviewHealthIndicators, WeeklyReview } from '@shared/types'
import { calendarPrefs } from '@shared/calendarPrefs'
import { CHART_COLORS, STATUS_COLORS } from '@renderer/theme/semantic'
import { useThemeSettings } from '@renderer/theme/themeSettings'
import { chipStyle } from '@renderer/components/chips/chipStyle'
import { Section } from '@renderer/components/shell/SectionHeader'
import { HealthCard, HealthGrid } from '@renderer/components/health/HealthCard'
import { HEALTH_TARGETS, REVIEW_HEALTH, healthItems } from '@renderer/components/health/healthItems'
import {
  REVIEW_PHASES,
  REVIEW_STEP_LABELS,
  RHYTHM_WEEKS,
  averageMinutes,
  lastReviewHeadline,
  openReviewSummary,
  reviewMinutes,
  reviewStartedAt,
  reviewStepCount,
  reviewWeeks,
  skippedText
} from './reviewEntryState'

interface ReviewEntryProps {
  openReview: WeeklyReview | null
  reviews: WeeklyReview[]
  health: ReviewHealthIndicators | null
  onStart: () => void
  onResume: () => void
  onDiscard: () => Promise<void>
  onOpenHealth: (route: string) => void
}

const ICON = { size: 16, strokeWidth: 1.75, 'aria-hidden': true } as const

function dayLabel(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

function timeLabel(date: Date): string {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function shortDay(date: string): string {
  const [, m, d] = date.split('-')
  return `${d}/${m}`
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

function InboxZeroChip(): React.JSX.Element {
  const { token } = theme.useToken()
  const { mode } = useThemeSettings()
  const { fg, bg } = STATUS_COLORS.executando[mode]
  return (
    <span style={chipStyle(fg, bg, 'transparent', token.borderRadiusSM)}>
      <CircleCheck size={13} strokeWidth={2} aria-hidden />
      Inbox zero
    </span>
  )
}

export function ReviewEntry({
  openReview,
  reviews,
  health,
  onStart,
  onResume,
  onDiscard,
  onOpenHealth
}: ReviewEntryProps): React.JSX.Element {
  const { token } = theme.useToken()
  const { mode } = useThemeSettings()
  const { modal } = App.useApp()
  const screens = Grid.useBreakpoint()
  const [shown, setShown] = useState<WeeklyReview | null>(null)

  const headline = lastReviewHeadline(health?.daysSinceLastReview ?? null)
  const weeks = useMemo(
    () => reviewWeeks(reviews, new Date(), calendarPrefs().weekStart),
    [reviews]
  )
  const doneWeeks = weeks.filter((week) => week.review).length
  const average = averageMinutes(reviews)
  const scale = CHART_COLORS[mode].sequential

  const confirmDiscard = (): void => {
    modal.confirm({
      title: 'Descartar a revisão em andamento?',
      content: 'Os passos marcados se perdem. O que você mudou nas tarefas continua mudado.',
      okText: 'Descartar',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: onDiscard
    })
  }

  const columns: ColumnsType<WeeklyReview> = [
    {
      title: 'Data',
      key: 'date',
      render: (_, review) => {
        const start = reviewStartedAt(review)
        return (
          <span>
            {dayLabel(start)}{' '}
            <Typography.Text type="secondary" className="font-mono tabular-nums">
              {timeLabel(start)}
            </Typography.Text>
          </span>
        )
      }
    },
    {
      title: 'Duração',
      key: 'minutes',
      align: 'right',
      width: 96,
      render: (_, review) => (
        <span className="font-mono tabular-nums">{reviewMinutes(review)} min</span>
      )
    },
    {
      title: 'Passos',
      key: 'steps',
      width: 140,
      render: (_, review) => {
        const count = reviewStepCount(review)
        return (
          <Tooltip title={skippedText(count)}>
            <span>
              <span className="font-mono tabular-nums">
                {count.done}/{count.total}
              </span>
              {count.skipped.length > 0 && (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {' '}
                  · {count.skipped.length} pulado{count.skipped.length > 1 ? 's' : ''}
                </Typography.Text>
              )}
            </span>
          </Tooltip>
        )
      }
    },
    ...(screens.md
      ? [
          {
            title: 'Inbox',
            key: 'inbox',
            width: 120,
            render: (_: unknown, review: WeeklyReview) =>
              review.inbox_cleared ? (
                <InboxZeroChip />
              ) : (
                <Typography.Text type="secondary">—</Typography.Text>
              )
          }
        ]
      : []),
    ...(screens.lg
      ? [
          {
            title: 'Notas',
            key: 'notes',
            ellipsis: true,
            render: (_: unknown, review: WeeklyReview) =>
              review.notes || <Typography.Text type="secondary">—</Typography.Text>
          }
        ]
      : [])
  ]

  return (
    <>
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={15}>
          <Card size="small" style={{ height: '100%' }}>
            <Flex vertical gap={16}>
              {openReview && (
                <Alert
                  type="info"
                  showIcon
                  icon={<CirclePause {...ICON} />}
                  title={
                    <span>
                      <Typography.Text strong>Revisão em andamento</Typography.Text> ·{' '}
                      {openReviewSummary(openReview)}
                    </span>
                  }
                  action={
                    <Space>
                      <Button size="small" type="primary" onClick={onResume}>
                        Retomar
                      </Button>
                      <Button size="small" type="text" onClick={confirmDiscard}>
                        Descartar
                      </Button>
                    </Space>
                  }
                />
              )}
              <Flex vertical gap={4}>
                <Eyebrow>Revisão semanal</Eyebrow>
                <Typography.Title level={3} style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>
                  {headline.title}
                </Typography.Title>
                <Typography.Text type="secondary">{headline.detail}</Typography.Text>
              </Flex>
              <div className="ct-rvphases">
                {REVIEW_PHASES.map((phase, index) => (
                  <div key={phase.key} className="ct-rvphase">
                    <span
                      className="ct-hzchip font-mono"
                      style={{ background: token.colorPrimaryBg, color: token.colorPrimary }}
                    >
                      {index + 1}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>{phase.label}</div>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {phase.sub} · {phase.steps.length} passos
                      </Typography.Text>
                    </div>
                  </div>
                ))}
              </div>
              {!openReview && (
                <div>
                  <Button
                    type="primary"
                    size="large"
                    icon={<CirclePlay {...ICON} />}
                    onClick={onStart}
                  >
                    Começar revisão
                  </Button>
                </div>
              )}
            </Flex>
          </Card>
        </Col>
        <Col xs={24} xl={9}>
          <Card
            size="small"
            style={{ height: '100%' }}
            title={
              <Flex align="center" gap={8}>
                <ChartLine {...ICON} color={token.colorTextTertiary} />
                Ritmo
              </Flex>
            }
            extra={
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {RHYTHM_WEEKS} semanas
              </Typography.Text>
            }
          >
            <Flex vertical gap={12}>
              <div
                className="ct-rvweeks"
                role="list"
                aria-label={`Revisões nas últimas ${RHYTHM_WEEKS} semanas`}
              >
                {weeks.map((week) => {
                  const minutes = week.review ? reviewMinutes(week.review) : null
                  const label = week.review
                    ? `Semana de ${shortDay(week.start)} · revisão em ${dayLabel(reviewStartedAt(week.review))}, ${minutes} min`
                    : `Semana de ${shortDay(week.start)} · sem revisão`
                  return (
                    <Tooltip key={week.start} title={label}>
                      <span
                        role="listitem"
                        tabIndex={0}
                        aria-label={label}
                        className="ct-rvweek"
                        style={{
                          background: week.review ? scale[4] : scale[0],
                          color: mode === 'dark' ? token.colorBgLayout : token.colorTextLightSolid
                        }}
                      >
                        {week.review && <Check size={12} strokeWidth={2.5} aria-hidden />}
                      </span>
                    </Tooltip>
                  )
                })}
              </div>
              <Typography.Text>
                <Typography.Text strong>
                  {doneWeeks} de {RHYTHM_WEEKS}
                </Typography.Text>{' '}
                semanas com revisão.
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {average !== null && `Média de ${average} min por revisão. `}
                Semana sem revisão acontece: o que importa é voltar.
              </Typography.Text>
            </Flex>
          </Card>
        </Col>
      </Row>

      {health && (
        <div style={{ marginTop: 24 }}>
          <Section icon={Gauge} title="Como está o sistema" extra="agora">
            <HealthGrid>
              {healthItems(health, REVIEW_HEALTH).map((item) => (
                <HealthCard
                  key={item.key}
                  item={item}
                  openLabel={HEALTH_TARGETS[item.key].cta}
                  onOpen={() => onOpenHealth(HEALTH_TARGETS[item.key].route)}
                />
              ))}
            </HealthGrid>
          </Section>
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <Section
          icon={History}
          title="Histórico"
          extra={`${reviews.length} ${reviews.length === 1 ? 'revisão' : 'revisões'}`}
        >
          <Table<WeeklyReview>
            rowKey="id"
            size="small"
            columns={columns}
            dataSource={reviews}
            pagination={{ pageSize: 6, hideOnSinglePage: true, size: 'small' }}
            scroll={{ x: 'max-content' }}
            locale={{ emptyText: 'Nenhuma revisão concluída ainda.' }}
            onRow={(review) => ({
              onClick: () => setShown(review),
              onKeyDown: (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setShown(review)
                }
              },
              tabIndex: 0,
              style: { cursor: 'pointer' }
            })}
          />
        </Section>
      </div>

      <Drawer
        open={!!shown}
        onClose={() => setShown(null)}
        size={screens.md ? 420 : '100%'}
        title={shown ? `Revisão de ${dayLabel(reviewStartedAt(shown))}` : ''}
      >
        {shown && (
          <Flex vertical gap={16}>
            <Descriptions
              size="small"
              column={1}
              items={[
                { key: 'start', label: 'Início', children: timeLabel(reviewStartedAt(shown)) },
                { key: 'minutes', label: 'Duração', children: `${reviewMinutes(shown)} min` },
                {
                  key: 'inbox',
                  label: 'Inbox',
                  children: shown.inbox_cleared ? 'Zerado' : 'Ficou com itens'
                }
              ]}
            />
            {REVIEW_PHASES.map((phase) => {
              const steps = phase.steps.filter((key) => shown.steps[key])
              if (steps.length === 0) return null
              return (
                <div key={phase.key}>
                  <Eyebrow>{phase.label}</Eyebrow>
                  {steps.map((key) => {
                    const skipped = shown.steps[key] === 'skipped'
                    return (
                      <Flex key={key} align="center" gap={8} style={{ padding: '4px 0' }}>
                        {skipped ? (
                          <CircleMinus {...ICON} color={token.colorTextTertiary} />
                        ) : (
                          <CircleCheck {...ICON} color={token.colorPrimary} />
                        )}
                        <Typography.Text type={skipped ? 'secondary' : undefined}>
                          {REVIEW_STEP_LABELS[key]}
                          {skipped ? ' · pulado' : ''}
                        </Typography.Text>
                      </Flex>
                    )
                  })}
                </div>
              )
            })}
            <div>
              <Eyebrow>Notas</Eyebrow>
              <Typography.Paragraph style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>
                {shown.notes || <Typography.Text type="secondary">Sem notas.</Typography.Text>}
              </Typography.Paragraph>
            </div>
          </Flex>
        )}
      </Drawer>
    </>
  )
}
