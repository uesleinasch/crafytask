import { useEffect, useState, type ReactNode } from 'react'
import {
  App,
  Button,
  Col,
  Flex,
  Input,
  List,
  Progress,
  Row,
  Space,
  Statistic,
  Typography,
  theme
} from 'antd'
import { History, PencilLine } from 'lucide-react'
import type { Task, TimeEntry } from '@shared/types'
import { LiveDot } from '@renderer/components/chips/LiveDot'
import { Section } from '@renderer/components/shell/SectionHeader'
import { formatDateTime, formatTime, parseTimeInput } from '@renderer/lib/utils'

interface TaskTimePanelProps {
  task: Task
  displaySeconds: number
  timeEntries: TimeEntry[]
  onAddTime: (seconds: number) => Promise<void>
  onSetTotal: (seconds: number) => Promise<void>
  onSetLimit: (seconds: number) => Promise<void>
}

function parseDuration(value: string): number | null {
  if (!/^\d{1,3}(:\d{1,2}){0,2}$/.test(value.trim())) return null
  return parseTimeInput(value.trim())
}

function Field({ label, children }: { label: string; children: ReactNode }): React.JSX.Element {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '92px minmax(0, 1fr)',
        gap: 8,
        alignItems: 'center'
      }}
    >
      <Typography.Text type="secondary">{label}</Typography.Text>
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  )
}

export function TaskTimePanel({
  task,
  displaySeconds,
  timeEntries,
  onAddTime,
  onSetTotal,
  onSetLimit
}: TaskTimePanelProps): React.JSX.Element {
  const { token } = theme.useToken()
  const { message } = App.useApp()
  const limit = task.time_limit_seconds ?? 0
  const [addValue, setAddValue] = useState('')
  const [totalValue, setTotalValue] = useState('')
  const [limitValue, setLimitValue] = useState(limit ? formatTime(limit) : '')

  useEffect(() => setLimitValue(limit ? formatTime(limit) : ''), [limit])

  const mono = { fontFamily: token.fontFamilyCode, fontVariantNumeric: 'tabular-nums' } as const
  const pct = limit ? Math.round((displaySeconds / limit) * 100) : 0
  const limitColor =
    pct >= 100 ? token.colorError : pct >= 80 ? token.colorWarning : token.colorSuccess
  const closedTotal = timeEntries
    .filter((entry) => entry.end_time !== null)
    .reduce((sum, entry) => sum + (entry.duration_seconds ?? 0), 0)
  const sessions = [...timeEntries].sort((a, b) =>
    a.end_time === null ? -1 : b.end_time === null ? 1 : b.start_time.localeCompare(a.start_time)
  )

  const add = async (): Promise<void> => {
    const seconds = parseDuration(addValue)
    if (!seconds) {
      message.error('Use HH:MM:SS, por exemplo 01:30:00.')
      return
    }
    await onAddTime(seconds)
    setAddValue('')
    message.success(`+${formatTime(seconds)} adicionado`)
  }

  const setTotal = async (): Promise<void> => {
    const seconds = parseDuration(totalValue)
    if (seconds === null) {
      message.error('Use HH:MM:SS.')
      return
    }
    await onSetTotal(seconds)
    setTotalValue('')
    message.success(`Total definido em ${formatTime(seconds)}`)
  }

  const saveLimit = async (): Promise<void> => {
    const seconds = parseDuration(limitValue)
    if (!seconds) {
      message.error('Use HH:MM:SS.')
      return
    }
    await onSetLimit(seconds)
    message.success(`Limite de ${formatTime(seconds)}`)
  }

  return (
    <Flex vertical gap={16}>
      {limit > 0 && (
        <div>
          <Flex justify="space-between">
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Limite {formatTime(limit)}
            </Typography.Text>
            <span style={{ ...mono, fontSize: 12, color: limitColor }}>{pct}%</span>
          </Flex>
          <Progress percent={Math.min(100, pct)} showInfo={false} strokeColor={limitColor} />
        </div>
      )}

      <Row gutter={12}>
        <Col span={12}>
          <Statistic title="Total" value={formatTime(displaySeconds)} valueStyle={mono} />
        </Col>
        <Col span={12}>
          <Statistic title="Sessões" value={timeEntries.length} valueStyle={mono} />
        </Col>
      </Row>

      <Section icon={History} title="Sessões" extra={timeEntries.length}>
        <List
          size="small"
          dataSource={sessions}
          locale={{ emptyText: 'Nenhuma sessão registrada' }}
          renderItem={(entry) => (
            <List.Item key={entry.id}>
              <Flex align="center" gap={8} style={{ width: '100%' }}>
                {entry.end_time === null && <LiveDot label="Sessão em andamento" />}
                <span style={mono}>
                  {formatDateTime(entry.start_time)}
                  {entry.end_time === null ? ' – agora' : ''}
                </span>
                <span style={{ flex: 1 }} />
                <span style={mono}>
                  +
                  {formatTime(
                    entry.end_time === null
                      ? Math.max(0, displaySeconds - closedTotal)
                      : (entry.duration_seconds ?? 0)
                  )}
                </span>
              </Flex>
            </List.Item>
          )}
        />
      </Section>

      <Section icon={PencilLine} title="Ajustes de tempo">
        <Flex vertical gap={10}>
          <Field label="Adicionar">
            <Space.Compact style={{ width: '100%' }}>
              <Input
                style={mono}
                placeholder="01:30:00"
                value={addValue}
                onChange={(event) => setAddValue(event.target.value)}
                onPressEnter={() => void add()}
                aria-label="Tempo a adicionar"
              />
              <Button onClick={() => void add()}>Adicionar</Button>
            </Space.Compact>
          </Field>
          <Field label="Total">
            <Space.Compact style={{ width: '100%' }}>
              <Input
                style={mono}
                placeholder={formatTime(task.total_seconds)}
                value={totalValue}
                onChange={(event) => setTotalValue(event.target.value)}
                onPressEnter={() => void setTotal()}
                aria-label="Novo total"
              />
              <Button onClick={() => void setTotal()}>Definir</Button>
            </Space.Compact>
          </Field>
          <Field label="Limite">
            <Space.Compact style={{ width: '100%' }}>
              <Input
                style={mono}
                placeholder="sem limite"
                value={limitValue}
                onChange={(event) => setLimitValue(event.target.value)}
                onPressEnter={() => void saveLimit()}
                aria-label="Limite de tempo"
              />
              <Button onClick={() => void saveLimit()}>Salvar</Button>
            </Space.Compact>
          </Field>
          {limit > 0 && (
            <Typography.Link style={{ alignSelf: 'flex-end' }} onClick={() => void onSetLimit(0)}>
              Remover limite
            </Typography.Link>
          )}
        </Flex>
      </Section>
    </Flex>
  )
}
