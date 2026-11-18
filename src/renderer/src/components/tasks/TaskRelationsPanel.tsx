import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  App,
  Button,
  Checkbox,
  Flex,
  Input,
  Progress,
  Select,
  Space,
  Spin,
  Tooltip,
  Typography,
  theme
} from 'antd'
import { ExternalLink, ListChecks, Lock, Network, Plus, X } from 'lucide-react'
import type { JiraChildrenResult, Task, TaskDependency, TaskListItem } from '@shared/types'
import { StatusChip } from '@renderer/components/chips/StatusChip'
import { Section } from '@renderer/components/shell/SectionHeader'
import { CATEGORY_COLORS, STATUS_COLORS } from '@renderer/theme/semantic'
import { useThemeSettings } from '@renderer/theme/themeSettings'

const ICON = { size: 14, strokeWidth: 1.75, 'aria-hidden': true } as const
const SEARCH_LIMIT = 10
const SEARCH_DEBOUNCE_MS = 250

interface TaskRelationsPanelProps {
  task: Task
  refreshTask: () => Promise<void>
}

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

function Subtasks({ task, refreshTask }: TaskRelationsPanelProps): React.JSX.Element {
  const navigate = useNavigate()
  const { token } = theme.useToken()
  const { message } = App.useApp()
  const [subtasks, setSubtasks] = useState<Task[] | null>(null)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const blocked = !!task.is_blocked

  const load = useCallback(async (): Promise<void> => {
    try {
      setSubtasks(await window.api.listSubtasks(task.id))
    } catch (error) {
      setSubtasks([])
      message.error(errorText(error, 'Não foi possível carregar as subtarefas'))
    }
  }, [task.id, message])

  useEffect(() => {
    void load()
  }, [load, task.subtask_count, task.completed_subtask_count])

  const toggle = async (subtask: Task, done: boolean): Promise<void> => {
    try {
      await window.api.updateStatus(subtask.id, done ? 'finalizada' : 'inbox')
      await load()
      await refreshTask()
    } catch (error) {
      message.error(errorText(error, 'Não foi possível atualizar a subtarefa'))
    }
  }

  const add = async (): Promise<void> => {
    const trimmed = name.trim()
    if (!trimmed) return
    setSaving(true)
    try {
      await window.api.createSubtask({ name: trimmed, parent_task_id: task.id })
      setName('')
      setAdding(false)
      await load()
      await refreshTask()
    } catch (error) {
      message.error(errorText(error, 'Não foi possível criar a subtarefa'))
    } finally {
      setSaving(false)
    }
  }

  const list = subtasks ?? []
  const done = list.filter((s) => s.status === 'finalizada').length

  return (
    <Section
      icon={ListChecks}
      title="Subtarefas"
      extra={list.length ? `${done}/${list.length}` : null}
    >
      {subtasks === null ? (
        <Spin size="small" />
      ) : (
        <>
          {blocked && list.length > 0 && (
            <Alert
              type="warning"
              showIcon
              title="Subtarefas bloqueadas: conclua as dependências da tarefa pai primeiro."
            />
          )}
          {list.length > 0 && (
            <Progress percent={Math.round((done / list.length) * 100)} size="small" />
          )}
          {list.map((subtask) => {
            const isDone = subtask.status === 'finalizada'
            return (
              <Flex key={subtask.id} gap={8} align="center">
                <Checkbox
                  checked={isDone}
                  disabled={blocked && !isDone}
                  aria-label={`Concluir ${subtask.name}`}
                  onChange={(event) => void toggle(subtask, event.target.checked)}
                />
                <Typography.Link
                  href={`#/task/${subtask.id}`}
                  onClick={(event) => {
                    event.preventDefault()
                    navigate(`/task/${subtask.id}`)
                  }}
                  ellipsis
                  style={{
                    flex: 1,
                    minWidth: 0,
                    color: isDone ? token.colorTextTertiary : token.colorText,
                    textDecoration: isDone ? 'line-through' : undefined
                  }}
                >
                  {subtask.name}
                </Typography.Link>
              </Flex>
            )
          })}
          {adding ? (
            <Space.Compact style={{ width: '100%' }}>
              <Input
                autoFocus
                placeholder="Nome da subtarefa"
                aria-label="Nome da subtarefa"
                value={name}
                onChange={(event) => setName(event.target.value)}
                onPressEnter={() => void add()}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setAdding(false)
                }}
              />
              <Button type="primary" loading={saving} onClick={() => void add()}>
                Adicionar
              </Button>
              <Button onClick={() => setAdding(false)}>Cancelar</Button>
            </Space.Compact>
          ) : (
            <Button
              size="small"
              type="dashed"
              icon={<Plus {...ICON} />}
              onClick={() => setAdding(true)}
              style={{ alignSelf: 'flex-start' }}
            >
              Nova subtarefa
            </Button>
          )}
        </>
      )}
    </Section>
  )
}

function Dependencies({ task, refreshTask }: TaskRelationsPanelProps): React.JSX.Element {
  const { message } = App.useApp()
  const { mode } = useThemeSettings()
  const [deps, setDeps] = useState<TaskDependency[] | null>(null)
  const [options, setOptions] = useState<TaskListItem[]>([])
  const [searching, setSearching] = useState(false)
  const searchSeq = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const openIds = task.blocked_by ?? []

  const load = useCallback(async (): Promise<void> => {
    try {
      setDeps(await window.api.getDependencies(task.id))
    } catch (error) {
      setDeps([])
      message.error(errorText(error, 'Não foi possível carregar as dependências'))
    }
  }, [task.id, message])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    []
  )

  const search = (text: string): void => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      const seq = ++searchSeq.current
      setSearching(true)
      try {
        const found = await window.api.listTasks({
          search: text.trim() || undefined,
          status: 'all',
          limit: SEARCH_LIMIT + 1 + (deps?.length ?? 0)
        })
        if (seq === searchSeq.current) setOptions(found)
      } catch (error) {
        message.error(errorText(error, 'Não foi possível buscar tarefas'))
      } finally {
        if (seq === searchSeq.current) setSearching(false)
      }
    }, SEARCH_DEBOUNCE_MS)
  }

  const change = async (action: () => Promise<void>, fallback: string): Promise<void> => {
    try {
      await action()
      await load()
      await refreshTask()
    } catch (error) {
      message.error(errorText(error, fallback))
    }
  }

  const linked = new Set((deps ?? []).map((d) => d.depends_on_task_id))
  const candidates = options
    .filter((t) => t.id !== task.id && !linked.has(t.id))
    .slice(0, SEARCH_LIMIT)

  return (
    <Section icon={Lock} title="Depende de" extra={deps?.length || null}>
      {deps === null ? (
        <Spin size="small" />
      ) : (
        deps.map((dep) => {
          const pending = openIds.includes(dep.depends_on_task_id)
          const colors = pending ? CATEGORY_COLORS.prioridade[mode] : STATUS_COLORS.executando[mode]
          const depName = dep.depends_on_task_name ?? `#${dep.depends_on_task_id}`
          return (
            <Flex
              key={dep.depends_on_task_id}
              gap={8}
              align="center"
              style={{ padding: '6px 10px', borderRadius: 8, background: colors.bg }}
            >
              <Lock {...ICON} color={colors.fg} />
              <Typography.Text ellipsis style={{ flex: 1, minWidth: 0 }}>
                {depName}
              </Typography.Text>
              <Typography.Text style={{ fontSize: 12, color: colors.fg }}>
                {pending ? 'pendente' : '✓ concluída'}
              </Typography.Text>
              <Tooltip title="Remover dependência">
                <Button
                  size="small"
                  type="text"
                  aria-label={`Remover dependência ${depName}`}
                  icon={<X {...ICON} />}
                  onClick={() =>
                    void change(
                      () => window.api.removeDependency(task.id, dep.depends_on_task_id),
                      'Não foi possível remover a dependência'
                    )
                  }
                />
              </Tooltip>
            </Flex>
          )
        })
      )}
      <Select
        showSearch
        aria-label="Adicionar dependência"
        placeholder="Adicionar dependência…"
        value={null}
        filterOption={false}
        loading={searching}
        notFoundContent={searching ? <Spin size="small" /> : 'Nenhuma tarefa'}
        onOpenChange={(open) => open && search('')}
        onSearch={search}
        onChange={(id: number) =>
          void change(
            () => window.api.addDependency(task.id, id),
            'Não foi possível adicionar a dependência'
          )
        }
        options={candidates.map((t) => ({
          value: t.id,
          title: t.name,
          label: (
            <Flex justify="space-between" gap={8} style={{ minWidth: 0 }}>
              <Typography.Text ellipsis style={{ minWidth: 0 }}>
                {t.name}
              </Typography.Text>
              <StatusChip status={t.status} />
            </Flex>
          )
        }))}
      />
    </Section>
  )
}

function JiraChildIssues({
  task
}: Pick<TaskRelationsPanelProps, 'task'>): React.JSX.Element | null {
  const navigate = useNavigate()
  const { token } = theme.useToken()
  const [result, setResult] = useState<JiraChildrenResult | null>(null)

  useEffect(() => {
    let active = true
    setResult(null)
    window.api
      .jiraGetChildren(task.id)
      .then((value) => active && setResult(value))
      .catch((error: unknown) => {
        if (active)
          setResult({ children: [], remoteError: errorText(error, 'Falha ao consultar o Jira.') })
      })
    return () => {
      active = false
    }
  }, [task.id])

  if (result && result.children.length === 0 && !result.remoteError) return null

  return (
    <Section icon={Network} title="Issues filhas no Jira" extra={result?.children.length ?? null}>
      {!result ? (
        <Flex gap={8} align="center">
          <Spin size="small" />
          <Typography.Text type="secondary">Buscando issues filhas no Jira…</Typography.Text>
        </Flex>
      ) : (
        <>
          {result.remoteError && (
            <Typography.Text type="warning" style={{ fontSize: 12 }}>
              Não foi possível consultar o Jira ({result.remoteError}). Mostrando só as importadas.
            </Typography.Text>
          )}
          {result.children.map((child) => (
            <Flex key={child.key} gap={6} align="center" style={{ minWidth: 0 }}>
              {child.issueType && (
                <Typography.Text type="secondary" style={{ fontSize: 12, flex: 'none' }}>
                  {child.issueType}
                </Typography.Text>
              )}
              <Typography.Link
                href={child.taskId ? `#/task/${child.taskId}` : child.url}
                title={child.taskId ? 'Abrir a task no CrafyTask' : 'Não importada: abrir no Jira'}
                onClick={(event) => {
                  event.preventDefault()
                  if (child.taskId) navigate(`/task/${child.taskId}`)
                  else void window.api.appOpenExternal(child.url)
                }}
                style={{ fontFamily: token.fontFamilyCode, flex: 'none' }}
              >
                {child.key} {!child.taskId && <ExternalLink {...ICON} />}
              </Typography.Link>
              <Typography.Text ellipsis style={{ flex: 1, minWidth: 0 }}>
                {child.summary}
              </Typography.Text>
              {child.statusName && (
                <Typography.Text type="secondary" style={{ fontSize: 12, flex: 'none' }}>
                  {child.statusName}
                </Typography.Text>
              )}
            </Flex>
          ))}
        </>
      )}
    </Section>
  )
}

export function TaskRelationsPanel({
  task,
  refreshTask
}: TaskRelationsPanelProps): React.JSX.Element {
  return (
    <Flex vertical gap={20}>
      {!task.parent_task_id && <Subtasks task={task} refreshTask={refreshTask} />}
      <Dependencies task={task} refreshTask={refreshTask} />
      {task.jira_key && task.jira_issue_kind !== 'subtask' && <JiraChildIssues task={task} />}
    </Flex>
  )
}
