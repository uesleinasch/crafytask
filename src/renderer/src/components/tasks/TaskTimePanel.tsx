import { useEffect, useState } from 'react'
import {
  App,
  Button,
  Col,
  Flex,
  Input,
  List,
  Popconfirm,
  Progress,
  Row,
  Space,
  Statistic,
  Tooltip,
  Typography,
  theme
} from 'antd'
import { History, Pencil, PencilLine, Trash2 } from 'lucide-react'
import type { Task, TimeEntry } from '@shared/types'
import { LiveDot } from '@renderer/components/chips/LiveDot'
import { Field, Section } from '@renderer/components/shell/SectionHeader'
import { formatDate, formatDateTime, formatTime, parseTimeInput } from '@renderer/lib/utils'
import { formatShortDuration } from './taskTableFormat'
import { sessionClock, sessionRange } from './sessionEdit'

const ICON = { size: 14, strokeWidth: 1.75, 'aria-hidden': true } as const

function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

interface TaskTimePanelProps {
  task: Task
  displaySeconds: number
  timeEntries: TimeEntry[]
  onAddTime: (seconds: number) => Promise<void>
  onSetTotal: (seconds: number) => Promise<void>
  onSetLimit: (seconds: number) => Promise<void>
  onUpdateEntry: (id: number, startIso: string, endIso: string) => Promise<void>
  onDeleteEntry: (id: number) => Promise<void>
}

function parseDuration(value: string): number | null {
  if (!/^\d{1,3}(:\d{1,2}){0,2}$/.test(value.trim())) return null
  return parseTimeInput(value.trim())
}

export function TaskTimePanel({
  task,
  displaySeconds,
  timeEntries,
  onAddTime,
  onSetTotal,
  onSetLimit,
  onUpdateEntry,
  onDeleteEntry
}: TaskTimePanelProps): React.JSX.Element {
  const { token } = theme.useToken()
  const { message } = App.useApp()
  const limit = task.time_limit_seconds ?? 0
  const [addValue, setAddValue] = useState('')
  const [totalValue, setTotalValue] = useState('')
  const [limitValue, setLimitValue] = useState(limit ? formatTime(limit) : '')
  const [editing, setEditing] = useState<number | null>(null)
  const [draft, setDraft] = useState({ start: '', end: '' })

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

  const saveSession = async (entry: TimeEntry): Promise<void> => {
    const range = sessionRange(entry.start_time, draft.start, draft.end)
    if (!range.ok) {
      message.error(range.error)
      return
    }
    try {
      await onUpdateEntry(entry.id, range.startIso, range.endIso)
      setEditing(null)
      message.success('Sessão atualizada')
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Não foi possível salvar a sessão')
    }
  }

  const deleteSession = async (id: number): Promise<void> => {
    try {
      await onDeleteEntry(id)
      message.success('Sessão excluída')
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Não foi possível excluir a sessão')
    }
  }

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
              Limite {formatShortDuration(limit)}
            </Typography.Text>
            <span style={{ ...mono, fontSize: 12, color: limitColor }}>{pct}%</span>
          </Flex>
          <Progress percent={Math.min(100, pct)} showInfo={false} strokeColor={limitColor} />
        </div>
      )}

      <Row gutter={12}>
        <Col span={12}>
          <Statistic title="Total" value={formatShortDuration(displaySeconds)} valueStyle={mono} />
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
          renderItem={(entry) =>
            entry.end_time === null ? (
              <List.Item key={entry.id}>
                <Flex align="center" gap={8} style={{ width: '100%' }}>
                  <LiveDot label="Sessão em andamento" />
                  <span style={mono}>{formatDateTime(entry.start_time)} – agora</span>
                  <span style={{ flex: 1 }} />
                  <span style={mono}>+{formatTime(Math.max(0, displaySeconds - closedTotal))}</span>
                </Flex>
              </List.Item>
            ) : editing === entry.id ? (
              <List.Item key={entry.id}>
                <Flex align="center" gap={6} wrap="wrap" style={{ width: '100%' }}>
                  <span style={mono}>{formatDate(entry.start_time)}</span>
                  <Input
                    size="small"
                    autoFocus
                    aria-label="Início"
                    value={draft.start}
                    onChange={(event) => setDraft({ ...draft, start: event.target.value })}
                    onPressEnter={() => void saveSession(entry)}
                    style={{ ...mono, width: 68 }}
                  />
                  <span>–</span>
                  <Input
                    size="small"
                    aria-label="Fim"
                    value={draft.end}
                    onChange={(event) => setDraft({ ...draft, end: event.target.value })}
                    onPressEnter={() => void saveSession(entry)}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') setEditing(null)
                    }}
                    style={{ ...mono, width: 68 }}
                  />
                  <span style={{ flex: 1 }} />
                  <Button size="small" type="primary" onClick={() => void saveSession(entry)}>
                    Salvar
                  </Button>
                  <Button size="small" onClick={() => setEditing(null)}>
                    Cancelar
                  </Button>
                </Flex>
              </List.Item>
            ) : (
              <List.Item
                key={entry.id}
                actions={[
                  <Tooltip key="edit" title="Editar início e fim">
                    <Button
                      size="small"
                      type="text"
                      aria-label="Editar sessão"
                      icon={<Pencil {...ICON} />}
                      onClick={() => {
                        setEditing(entry.id)
                        setDraft({
                          start: sessionClock(entry.start_time),
                          end: sessionClock(entry.end_time as string)
                        })
                      }}
                    />
                  </Tooltip>,
                  <Popconfirm
                    key="delete"
                    title="Excluir esta sessão?"
                    description="O tempo dela sai do total. Se já foi enviada ao Jira, o worklog também é apagado."
                    okText="Excluir"
                    okButtonProps={{ danger: true }}
                    cancelText="Cancelar"
                    onConfirm={() => deleteSession(entry.id)}
                  >
                    <Button
                      size="small"
                      type="text"
                      danger
                      aria-label="Excluir sessão"
                      icon={<Trash2 {...ICON} />}
                    />
                  </Popconfirm>
                ]}
              >
                <Flex align="center" gap={8} style={{ width: '100%' }}>
                  <span style={mono}>
                    {formatDateTime(entry.start_time)} – {clockTime(entry.end_time as string)}
                  </span>
                  <span style={{ flex: 1 }} />
                  <span style={mono}>+{formatTime(entry.duration_seconds ?? 0)}</span>
                </Flex>
              </List.Item>
            )
          }
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
            <Button
              type="link"
              size="small"
              style={{ alignSelf: 'flex-end', padding: 0, height: 'auto' }}
              onClick={() => void onSetLimit(0)}
            >
              Remover limite
            </Button>
          )}
        </Flex>
      </Section>
    </Flex>
  )
}
