import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  App,
  Button,
  ConfigProvider,
  Dropdown,
  Flex,
  Input,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
  theme
} from 'antd'
import type { MenuProps } from 'antd'
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Check,
  Copy,
  Ellipsis,
  Lock,
  PanelRightClose,
  PanelRightOpen,
  Pause,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Trash2
} from 'lucide-react'
import type { Task, TaskStatus, UpdateTaskInput } from '@shared/types'
import { effectiveWorkingDir } from '@shared/workingDir'
import { STATUS_CHIP_LABELS, STATUS_ICONS } from '@renderer/components/chips/statusMeta'
import { STATUS_COLORS } from '@renderer/theme/semantic'
import { useThemeSettings } from '@renderer/theme/themeSettings'
import { LiveDot } from '@renderer/components/chips/LiveDot'
import { TerminalTaskButton } from '@renderer/components/terminal/TerminalTaskButton'
import { formatTime } from '@renderer/lib/utils'
import { blockedLabel } from './taskTableFormat'
import { TaskPropertyBar } from './TaskPropertyBar'

const STATUSES: TaskStatus[] = [
  'inbox',
  'aguardando',
  'proximas',
  'executando',
  'finalizada',
  'someday'
]

const ICON = { size: 16, strokeWidth: 1.75, 'aria-hidden': true } as const

export type InspectorPlacement = 'side' | 'drawer' | 'tabs'

interface TaskHeaderProps {
  task: Task
  displaySeconds: number
  isRunning: boolean
  overLimit: boolean
  compact: boolean
  showTimerLabel: boolean
  inspector: InspectorPlacement
  inspectorOpen: boolean
  onToggleInspector: () => void
  onRename: (name: string) => Promise<void>
  onDescribe: (description: string) => Promise<void>
  onStatusChange: (status: TaskStatus) => Promise<void>
  onStart: () => Promise<void>
  onPause: () => Promise<void>
  onFinish: () => Promise<void>
  onResetTime: () => Promise<void>
  onArchive: () => Promise<void>
  onUnarchive: () => Promise<void>
  onDelete: () => Promise<void>
  onOpenJiraFields: () => void
  onWorkingDirChange: () => Promise<void>
  onUpdate: (data: UpdateTaskInput) => Promise<void>
  onShowRelations: () => void
}

export function TaskHeader({
  task,
  displaySeconds,
  isRunning,
  overLimit,
  compact,
  showTimerLabel,
  inspector,
  inspectorOpen,
  onToggleInspector,
  onRename,
  onDescribe,
  onStatusChange,
  onStart,
  onPause,
  onFinish,
  onResetTime,
  onArchive,
  onUnarchive,
  onDelete,
  onOpenJiraFields,
  onWorkingDirChange,
  onUpdate,
  onShowRelations
}: TaskHeaderProps): React.JSX.Element {
  const navigate = useNavigate()
  const { token } = theme.useToken()
  const { message, modal } = App.useApp()
  const { mode } = useThemeSettings()
  const [blockerNames, setBlockerNames] = useState<string[]>([])
  const blockerKey = (task.blocked_by ?? []).join(',')
  const [name, setName] = useState(task.name)
  const [description, setDescription] = useState(task.description ?? '')

  useEffect(() => setName(task.name), [task.name])
  useEffect(() => setDescription(task.description ?? ''), [task.description])

  useEffect(() => {
    const open = blockerKey ? blockerKey.split(',').map(Number) : []
    if (!open.length) {
      setBlockerNames([])
      return
    }
    let alive = true
    window.api
      .getDependencies(task.id)
      .then((deps) => {
        if (!alive) return
        setBlockerNames(
          deps
            .filter((d) => open.includes(d.depends_on_task_id))
            .map((d) => d.depends_on_task_name ?? `#${d.depends_on_task_id}`)
        )
      })
      .catch(console.error)
    return () => {
      alive = false
    }
  }, [task.id, blockerKey])

  const startBlocked = task.is_blocked && !isRunning
  const timeColor = overLimit
    ? token.colorError
    : isRunning
      ? token.colorText
      : token.colorTextTertiary

  const saveName = (): void => {
    const next = name.trim()
    if (!next) {
      setName(task.name)
      return
    }
    if (next !== task.name) void onRename(next)
  }

  const saveDescription = (): void => {
    const next = description.trim()
    if (next !== (task.description ?? '')) void onDescribe(next)
  }

  const copyId = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(String(task.id))
      message.success(`#${task.id} copiado`)
    } catch {
      message.error('Não foi possível copiar o número')
    }
  }

  const readOnly = !!task.is_archived

  const menu: MenuProps = {
    items: [
      { key: 'copy', icon: <Copy {...ICON} />, label: `Copiar #${task.id}` },
      { key: 'reset', icon: <RotateCcw {...ICON} />, label: 'Zerar tempo…', disabled: readOnly },
      task.is_archived
        ? { key: 'unarchive', icon: <ArchiveRestore {...ICON} />, label: 'Desarquivar' }
        : { key: 'archive', icon: <Archive {...ICON} />, label: 'Arquivar' },
      { type: 'divider' },
      { key: 'delete', icon: <Trash2 {...ICON} />, label: 'Excluir tarefa…', danger: true }
    ],
    onClick: ({ key }) => {
      if (key === 'copy') void copyId()
      if (key === 'archive') void onArchive()
      if (key === 'unarchive') void onUnarchive()
      if (key === 'reset')
        modal.confirm({
          title: 'Zerar o tempo da tarefa?',
          content: 'Todas as sessões são apagadas e o total volta a zero.',
          okText: 'Zerar',
          okButtonProps: { danger: true },
          cancelText: 'Cancelar',
          onOk: onResetTime
        })
      if (key === 'delete')
        modal.confirm({
          title: 'Excluir esta tarefa?',
          content:
            'Apaga a tarefa, as sessões, as notas e o desenho. No Notion e no Google também, se estiverem ligados.',
          okText: 'Excluir',
          okButtonProps: { danger: true },
          cancelText: 'Cancelar',
          onOk: onDelete
        })
    }
  }

  const inspectorTitle =
    inspector === 'side' ? (inspectorOpen ? 'Esconder painel' : 'Mostrar painel') : 'Abrir painel'

  return (
    <div
      style={{
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        padding: '12px 16px 14px'
      }}
    >
      <Flex align="center" gap={6} wrap="wrap">
        <Button
          size="small"
          type="text"
          icon={<ArrowLeft {...ICON} />}
          onClick={() => navigate('/')}
        >
          Tarefas
        </Button>
        {task.project_id && task.project_name && (
          <>
            <Typography.Text type="secondary">/</Typography.Text>
            <Typography.Link
              onClick={() => navigate(`/project/${task.project_id}`)}
              style={{ color: token.colorTextSecondary }}
            >
              {task.project_name}
            </Typography.Link>
          </>
        )}
      </Flex>

      <Flex
        wrap="wrap"
        align="flex-start"
        justify="space-between"
        style={{ marginTop: 8, columnGap: 24, rowGap: 12 }}
      >
        <div style={{ flex: '1 1 380px', minWidth: 0 }}>
          <Flex align="center" gap={8} wrap="wrap">
            <Select
              size="small"
              variant="filled"
              disabled={readOnly}
              aria-label="Status"
              value={task.status}
              onChange={(status: TaskStatus) => void onStatusChange(status)}
              popupMatchSelectWidth={false}
              style={{ width: 152 }}
              options={STATUSES.map((status) => {
                const Icon = STATUS_ICONS[status]
                return {
                  value: status,
                  disabled: status === 'executando' && task.is_blocked && task.status !== status,
                  label: (
                    <Space size={6}>
                      <Icon
                        size={14}
                        strokeWidth={1.75}
                        aria-hidden
                        color={STATUS_COLORS[status][mode].fg}
                      />
                      {STATUS_CHIP_LABELS[status]}
                    </Space>
                  )
                }
              })}
            />
            <Tooltip title="Copiar número">
              <Tag
                bordered={false}
                role="button"
                tabIndex={0}
                aria-label={`Copiar #${task.id}`}
                onClick={() => void copyId()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    void copyId()
                  }
                }}
                style={{
                  margin: 0,
                  cursor: 'pointer',
                  fontFamily: token.fontFamilyCode,
                  fontVariantNumeric: 'tabular-nums'
                }}
              >
                #{task.id}
              </Tag>
            </Tooltip>
            {task.jira_key && (
              <Tag bordered={false} style={{ margin: 0 }}>
                {[task.jira_issue_type, task.jira_key, task.jira_status]
                  .filter(Boolean)
                  .join(' · ')}
              </Tag>
            )}
            {task.is_archived && (
              <Tag bordered={false} style={{ margin: 0 }}>
                Arquivada
              </Tag>
            )}
          </Flex>
          <Input
            variant="borderless"
            readOnly={readOnly}
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={saveName}
            onPressEnter={(event) => event.currentTarget.blur()}
            placeholder="Nome da tarefa"
            aria-label="Nome da tarefa"
            style={{ fontSize: 22, fontWeight: 600, padding: '2px 0', letterSpacing: '-.01em' }}
          />
          <Input.TextArea
            variant="borderless"
            readOnly={readOnly}
            autoSize={{ minRows: 1, maxRows: 4 }}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            onBlur={saveDescription}
            placeholder="Adicionar descrição"
            aria-label="Descrição"
            style={{ padding: 0, color: token.colorTextSecondary }}
          />
        </div>

        <Flex align="center" gap={8} wrap="wrap" style={{ flex: 'none' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 6px 6px 12px',
              border: `1px solid ${token.colorBorderSecondary}`,
              borderRadius: token.borderRadiusLG,
              background: token.colorBgLayout
            }}
          >
            {isRunning && <LiveDot label="Timer rodando" />}
            <span
              style={{
                fontFamily: token.fontFamilyCode,
                fontVariantNumeric: 'tabular-nums',
                fontSize: compact ? 24 : 30,
                fontWeight: 500,
                letterSpacing: '-.02em',
                lineHeight: 1,
                color: timeColor
              }}
            >
              {formatTime(displaySeconds)}
            </span>
            <Tooltip title={startBlocked ? blockedLabel(task.blocked_by) : ''}>
              <Button
                type="primary"
                disabled={readOnly || startBlocked}
                aria-label={isRunning ? 'Pausar' : 'Iniciar'}
                icon={isRunning ? <Pause {...ICON} /> : <Play {...ICON} />}
                onClick={() => void (isRunning ? onPause() : onStart())}
              >
                {showTimerLabel ? (isRunning ? 'Pausar' : 'Iniciar') : null}
              </Button>
            </Tooltip>
            <Tooltip title="Finalizar tarefa">
              <Button
                aria-label="Finalizar"
                disabled={readOnly || task.status === 'finalizada'}
                icon={<Check {...ICON} />}
                onClick={() => void onFinish()}
              />
            </Tooltip>
          </div>

          <Flex align="center" gap={4}>
            <ConfigProvider componentDisabled={readOnly}>
              <TerminalTaskButton
                taskId={task.id}
                workingDir={effectiveWorkingDir(task).dir}
                onWorkingDirChange={onWorkingDirChange}
              />
            </ConfigProvider>
            {task.jira_key && (
              <Tooltip title="Campos do Jira">
                <Button
                  type="text"
                  disabled={readOnly}
                  aria-label="Campos do Jira"
                  icon={<SlidersHorizontal {...ICON} />}
                  onClick={onOpenJiraFields}
                />
              </Tooltip>
            )}
            {inspector !== 'tabs' && (
              <Tooltip title={inspectorTitle}>
                <Button
                  type="text"
                  aria-label="Painel"
                  aria-pressed={inspector === 'side' ? inspectorOpen : undefined}
                  icon={
                    inspector === 'side' && inspectorOpen ? (
                      <PanelRightClose {...ICON} />
                    ) : (
                      <PanelRightOpen {...ICON} />
                    )
                  }
                  onClick={onToggleInspector}
                />
              </Tooltip>
            )}
            <Dropdown menu={menu} trigger={['click']} placement="bottomRight">
              <Button type="text" aria-label="Mais ações" icon={<Ellipsis {...ICON} />} />
            </Dropdown>
          </Flex>
        </Flex>
      </Flex>
      <TaskPropertyBar task={task} update={onUpdate} />
      {task.is_blocked && (
        <Alert
          type="warning"
          showIcon
          icon={<Lock {...ICON} />}
          style={{ marginTop: 12 }}
          title={`Bloqueada por dependências${blockerNames.length ? `: ${blockerNames.join(', ')}` : ''}`}
          action={
            <Button size="small" onClick={onShowRelations}>
              Ver dependências
            </Button>
          }
        />
      )}
    </div>
  )
}
