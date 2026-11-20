import { useState } from 'react'
import {
  App,
  Button,
  Card,
  Empty,
  Flex,
  Input,
  Segmented,
  Space,
  Spin,
  Switch,
  Tag,
  Timeline,
  Typography,
  theme
} from 'antd'
import {
  ArrowRight,
  Bot,
  Flag,
  MessageSquare,
  Pencil,
  User,
  Zap,
  type LucideIcon
} from 'lucide-react'
import type { TaskHistoryEntryKind, TaskHistoryItem } from '@shared/types'
import { StatusChip } from '@renderer/components/chips/StatusChip'
import { STATUS_ICONS } from '@renderer/components/chips/statusMeta'
import { useTaskHistory } from '@renderer/hooks/useTaskHistory'
import {
  filterHistory,
  formatHistoryTime,
  historyItemKey,
  type HistoryFilter
} from '@renderer/lib/taskHistoryView'
import { STATUS_COLORS } from '@renderer/theme/semantic'
import { useThemeSettings } from '@renderer/theme/themeSettings'

const { Text } = Typography

const ICON = { size: 14, strokeWidth: 1.75, 'aria-hidden': true } as const

const ENTRY_KIND: Record<TaskHistoryEntryKind, { label: string; icon: LucideIcon }> = {
  checkpoint: { label: 'Checkpoint', icon: Flag },
  operation: { label: 'Operação', icon: Zap },
  note: { label: 'Anotação', icon: MessageSquare }
}

const FILTERS: { value: HistoryFilter; label: string }[] = [
  { value: 'all', label: 'Tudo' },
  { value: 'checkpoints', label: 'Checkpoints' },
  { value: 'status', label: 'Movimentações' }
]

function DoneAndRemaining({ item }: { item: TaskHistoryItem }): React.JSX.Element {
  return (
    <>
      {item.done && (
        <Text type="secondary">
          <b>Feito:</b> {item.done}
        </Text>
      )}
      {item.remaining && (
        <Text type="secondary">
          <b>Falta:</b> {item.remaining}
        </Text>
      )}
    </>
  )
}

interface TaskHistoryPanelProps {
  taskId: number
  hasSubtasks: boolean
  readOnly?: boolean
}

export function TaskHistoryPanel({
  taskId,
  hasSubtasks,
  readOnly = false
}: TaskHistoryPanelProps): React.JSX.Element {
  const { token } = theme.useToken()
  const { mode } = useThemeSettings()
  const { message } = App.useApp()
  const [filter, setFilter] = useState<HistoryFilter>('all')
  const [withSubtasks, setWithSubtasks] = useState(true)
  const [writing, setWriting] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const { entries, lastCheckpoint, loading, addNote } = useTaskHistory(
    taskId,
    hasSubtasks && withSubtasks
  )
  const now = new Date()
  const shown = filterHistory(entries, filter)
  const mono = {
    fontFamily: token.fontFamilyCode,
    fontVariantNumeric: 'tabular-nums',
    fontSize: 12
  }

  const closeDraft = (): void => {
    setWriting(false)
    setDraft('')
  }

  const save = async (): Promise<void> => {
    const summary = draft.trim()
    if (!summary) return
    setSaving(true)
    try {
      await addNote(summary)
      closeDraft()
      message.success('Anotação gravada no histórico')
    } catch {
      message.error('Não foi possível gravar a anotação')
    } finally {
      setSaving(false)
    }
  }

  const meta = (item: TaskHistoryItem): React.JSX.Element => (
    <Flex gap={8} align="center" wrap>
      {item.task_id !== taskId && (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {item.task_name}
        </Text>
      )}
      <Text type="secondary" style={mono}>
        {formatHistoryTime(item.created_at, now)}
      </Text>
    </Flex>
  )

  const timelineItem = (
    item: TaskHistoryItem
  ): { key: string; icon: React.JSX.Element; content: React.JSX.Element } => {
    if (item.kind === 'status') {
      const StatusIcon = item.to_status ? STATUS_ICONS[item.to_status] : ArrowRight
      const color = item.to_status
        ? STATUS_COLORS[item.to_status][mode].fg
        : token.colorTextSecondary
      return {
        key: historyItemKey(item),
        icon: <StatusIcon {...ICON} color={color} />,
        content: (
          <Flex vertical gap={2}>
            <Flex gap={6} align="center" wrap>
              {item.from_status ? (
                <>
                  <StatusChip status={item.from_status} />
                  <ArrowRight size={12} aria-hidden color={token.colorTextTertiary} />
                </>
              ) : (
                <Text type="secondary">Criada em</Text>
              )}
              {item.to_status && <StatusChip status={item.to_status} />}
            </Flex>
            {meta(item)}
          </Flex>
        )
      }
    }

    const kind = ENTRY_KIND[item.kind]
    const KindIcon = kind.icon
    return {
      key: historyItemKey(item),
      icon: <KindIcon {...ICON} color={token.colorTextSecondary} />,
      content: (
        <Flex vertical gap={4}>
          <Flex gap={6} align="center" wrap>
            <Text strong>{kind.label}</Text>
            <Tag
              bordered={false}
              icon={item.origin === 'mcp' ? <Bot {...ICON} /> : <User {...ICON} />}
            >
              <span style={{ marginInlineStart: 4 }}>
                {item.origin === 'mcp' ? 'Claude' : 'Você'}
              </span>
            </Tag>
          </Flex>
          <Text style={{ whiteSpace: 'pre-wrap' }}>{item.summary}</Text>
          <DoneAndRemaining item={item} />
          {meta(item)}
        </Flex>
      )
    }
  }

  return (
    <Flex vertical gap={16} style={{ maxWidth: '76ch' }}>
      {lastCheckpoint && (
        <Card
          size="small"
          title={
            <Space size={6}>
              <Flag {...ICON} />
              Onde parei
            </Space>
          }
          extra={
            <Text type="secondary" style={mono}>
              {formatHistoryTime(lastCheckpoint.created_at, now)}
            </Text>
          }
        >
          <Flex vertical gap={6}>
            <Text strong style={{ whiteSpace: 'pre-wrap' }}>
              {lastCheckpoint.summary}
            </Text>
            <DoneAndRemaining item={lastCheckpoint} />
          </Flex>
        </Card>
      )}

      <Flex gap={8} align="center" wrap>
        <Segmented size="small" value={filter} onChange={setFilter} options={FILTERS} />
        {hasSubtasks && (
          <Space size={6}>
            <Switch
              size="small"
              checked={withSubtasks}
              onChange={setWithSubtasks}
              aria-label="Incluir subtarefas"
            />
            <Text type="secondary">Subtarefas</Text>
          </Space>
        )}
        <div style={{ flex: 1 }} />
        {!readOnly && (
          <Button size="small" icon={<Pencil {...ICON} />} onClick={() => setWriting(!writing)}>
            Anotar
          </Button>
        )}
      </Flex>

      {writing && (
        <Flex vertical gap={8}>
          <Input.TextArea
            autoFocus
            autoSize={{ minRows: 2, maxRows: 6 }}
            maxLength={4000}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="O que vale lembrar ao retomar esta tarefa?"
          />
          <Flex gap={8} justify="flex-end">
            <Button size="small" onClick={closeDraft}>
              Cancelar
            </Button>
            <Button
              size="small"
              type="primary"
              loading={saving}
              disabled={!draft.trim()}
              onClick={() => void save()}
            >
              Gravar
            </Button>
          </Flex>
        </Flex>
      )}

      {loading ? (
        <Flex justify="center" style={{ padding: 24 }}>
          <Spin />
        </Flex>
      ) : shown.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            entries.length === 0 ? 'Ainda não há histórico' : 'Nada no histórico com este filtro'
          }
        />
      ) : (
        <Timeline items={shown.map(timelineItem)} />
      )}
    </Flex>
  )
}
