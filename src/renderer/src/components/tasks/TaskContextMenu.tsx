import { useContext, useRef, useState } from 'react'
import { App, Dropdown, type MenuProps } from 'antd'
import {
  Archive,
  CalendarDays,
  CircleCheck,
  Copy,
  ExternalLink,
  FileText,
  Flag,
  Folder,
  MapPin,
  Pause,
  Plug,
  Play,
  SlidersHorizontal,
  Trash2
} from 'lucide-react'
import {
  STATUS_LABELS,
  type JiraTransitionOption,
  type Task,
  type TaskCategory,
  type TaskStatus
} from '@shared/types'
import { localDateString } from '@shared/dueState'
import { TaskMenuChangedContext, TaskMenuDataContext } from '@renderer/components/taskMenuContext'
import { CATEGORY_CHIP_LABELS } from '@renderer/components/chips/categoryMeta'
import { STATUS_ICONS } from '@renderer/components/chips/statusMeta'
import { useTimerStore } from '@renderer/stores/timerStore'
import { STATUS_COLORS } from '@renderer/theme/semantic'
import { useThemeSettings } from '@renderer/theme/themeSettings'
import { JiraFieldsSheet } from '@renderer/components/jira/JiraFieldsSheet'
import { isSafeHttpUrl } from '@shared/externalUrl'
import { plural, todayToggle } from './bulkActionText'
import { useTaskBulkActions } from './useTaskBulkActions'

const STATUSES = Object.keys(STATUS_LABELS) as TaskStatus[]
const CATEGORIES: TaskCategory[] = ['urgente', 'prioridade', 'normal', 'time_leak']
const ICON = { size: 14, strokeWidth: 1.75, 'aria-hidden': true } as const

interface TaskContextMenuProps {
  task: Task
  onOpen: () => void
  onScheduleForToday?: (taskId: number) => void
  trigger?: Array<'contextMenu' | 'click'>
  children: React.ReactElement
}

export function TaskContextMenu({
  task,
  onOpen,
  onScheduleForToday,
  trigger = ['contextMenu'],
  children
}: TaskContextMenuProps): React.JSX.Element {
  const { message } = App.useApp()
  const onChanged = useContext(TaskMenuChangedContext)
  const { projects, contexts, selectedIds, taskById } = useContext(TaskMenuDataContext)
  const { mode } = useThemeSettings()
  const startTimer = useTimerStore((s) => s.startTimer)
  const stopTimer = useTimerStore((s) => s.stopTimer)
  const bulk = useTaskBulkActions()
  const [transitions, setTransitions] = useState<
    JiraTransitionOption[] | 'loading' | { error: string }
  >('loading')
  const transitionsRequest = useRef(0)
  const [fieldsOpen, setFieldsOpen] = useState(false)

  const many = selectedIds.length > 1 && selectedIds.includes(task.id)
  const ids = many ? selectedIds : [task.id]
  const targets = ids.map((id) => (id === task.id ? task : taskById(id)))
  const anyBlocked = targets.some((t) => t?.is_blocked)
  const todayItems = targets.map((t, index) => ({
    id: ids[index],
    scheduled_date: t?.scheduled_date
  }))
  const removesFromToday = todayToggle(todayItems, localDateString(new Date())).date === null
  const taskContextIds = (task.contexts ?? []).map((c) => c.id)
  const tag = (label: string): string => (many ? `${label} (${ids.length})` : label)
  const check = (on: boolean): string => (!many && on ? '✓ ' : '')

  const run = async (action: () => Promise<unknown>, success: string): Promise<void> => {
    try {
      await action()
      message.success(success)
    } catch (error) {
      console.error('[TaskContextMenu]', error)
      message.error(error instanceof Error ? error.message : 'Não foi possível concluir a ação')
    } finally {
      onChanged()
    }
  }

  const jiraUrl =
    task.jira_key &&
    task.external_url &&
    isSafeHttpUrl(task.external_url) &&
    task.external_url.includes(`/browse/${task.jira_key}`)
      ? task.external_url
      : null

  const loadTransitions = async (): Promise<void> => {
    const request = ++transitionsRequest.current
    setTransitions('loading')
    try {
      const options = await window.api.jiraListTransitions(task.id)
      if (request === transitionsRequest.current) setTransitions(options)
    } catch (error) {
      console.error('[TaskContextMenu] transições do Jira', error)
      if (request === transitionsRequest.current) {
        setTransitions({ error: error instanceof Error ? error.message : String(error) })
      }
    }
  }

  const currentJiraStatus = task.jira_status
    ? [{ key: 'jira-current', label: `✓ ${task.jira_status}`, disabled: true }]
    : []
  const transitionItems: NonNullable<MenuProps['items']> =
    transitions === 'loading'
      ? [...currentJiraStatus, { key: 'jira-loading', label: 'Carregando…', disabled: true }]
      : !Array.isArray(transitions)
        ? [
            ...currentJiraStatus,
            {
              key: 'jira-error',
              label: `Não foi possível carregar: ${transitions.error}`,
              disabled: true
            }
          ]
        : [
            ...currentJiraStatus,
            ...(transitions.length === 0
              ? [{ key: 'jira-none', label: 'Nenhuma outra transição', disabled: true }]
              : transitions
                  .filter((transition) => transition.name !== task.jira_status)
                  .map((transition) => ({
                    key: `jirast:${transition.id}`,
                    label: transition.name
                  })))
          ]

  const items: MenuProps['items'] = [
    ...(many
      ? [
          {
            key: 'header',
            type: 'group' as const,
            label: plural(ids.length, 'tarefa selecionada', 'tarefas selecionadas')
          }
        ]
      : [
          { key: 'open', icon: <FileText {...ICON} />, label: 'Abrir' },
          task.is_running
            ? { key: 'stop', icon: <Pause {...ICON} />, label: 'Pausar timer' }
            : {
                key: 'start',
                icon: <Play {...ICON} />,
                label: 'Iniciar timer',
                disabled: task.is_blocked
              }
        ]),
    {
      key: 'today',
      icon: <CalendarDays {...ICON} />,
      label: tag(removesFromToday ? 'Tirar do plano de hoje' : 'Planejar para hoje')
    },
    {
      key: 'status',
      icon: <CircleCheck {...ICON} />,
      label: tag('Marcar como'),
      children: STATUSES.map((status) => {
        const Icon = STATUS_ICONS[status]
        return {
          key: `status:${status}`,
          icon: <Icon {...ICON} style={{ color: STATUS_COLORS[status][mode].fg }} />,
          label: `${check(task.status === status)}${STATUS_LABELS[status]}`,
          disabled: status === 'executando' && anyBlocked
        }
      })
    },
    {
      key: 'category',
      icon: <Flag {...ICON} />,
      label: tag('Categoria'),
      children: CATEGORIES.map((category) => ({
        key: `category:${category}`,
        label: `${check((task.category ?? 'normal') === category)}${CATEGORY_CHIP_LABELS[category]}`
      }))
    },
    {
      key: 'project',
      icon: <Folder {...ICON} />,
      label: tag('Mover para projeto'),
      children: [
        { key: 'project:none', label: `${check(!task.project_id)}Sem projeto` },
        ...projects
          .filter((project) => project.status !== 'archived' || project.id === task.project_id)
          .map((project) => ({
            key: `project:${project.id}`,
            label: `${check(task.project_id === project.id)}${project.name}`
          }))
      ]
    },
    ...(many || !task.jira_key
      ? []
      : [
          {
            key: 'jira',
            icon: <Plug {...ICON} />,
            label: 'Jira',
            children: [
              {
                key: 'jira:open',
                icon: <ExternalLink {...ICON} />,
                label: jiraUrl ? 'Abrir no Jira' : 'Abrir no Jira (sem link da issue)',
                disabled: !jiraUrl
              },
              { key: 'jira:status', label: 'Status no Jira', children: transitionItems },
              {
                key: 'jira:fields',
                icon: <SlidersHorizontal {...ICON} />,
                label: 'Campos do Jira…'
              }
            ]
          }
        ]),
    ...(many
      ? []
      : [
          {
            key: 'contexts',
            icon: <MapPin {...ICON} />,
            label: 'Contextos',
            disabled: contexts.length === 0,
            children: contexts.map((context) => ({
              key: `context:${context.id}`,
              label: `${check(taskContextIds.includes(context.id))}${context.icon ? `${context.icon} ` : ''}${context.name}`
            }))
          }
        ]),
    { type: 'divider' as const },
    ...(many ? [] : [{ key: 'copy', icon: <Copy {...ICON} />, label: `Copiar #${task.id}` }]),
    { key: 'archive', icon: <Archive {...ICON} />, label: tag('Arquivar') },
    { key: 'delete', icon: <Trash2 {...ICON} />, label: tag('Excluir…'), danger: true }
  ]

  const onClick: MenuProps['onClick'] = ({ key, domEvent }) => {
    domEvent.stopPropagation()
    const [kind, value] = key.split(':')
    if (kind === 'open') onOpen()
    if (kind === 'stop') void run(() => stopTimer(task.id), 'Timer pausado')
    if (kind === 'start') void run(() => startTimer(task.id), 'Timer iniciado')
    if (kind === 'today') {
      if (!many && onScheduleForToday) onScheduleForToday(task.id)
      else void bulk.toggleToday(todayItems)
    }
    if (kind === 'status') void bulk.setStatus(ids, value as TaskStatus)
    if (kind === 'category') void bulk.setCategory(ids, value as TaskCategory)
    if (kind === 'project') {
      const projectId = value === 'none' ? null : Number(value)
      const name = projects.find((p) => p.id === projectId)?.name
      void bulk.moveToProject(ids, projectId, name)
    }
    if (kind === 'context') {
      const contextId = Number(value)
      const next = taskContextIds.includes(contextId)
        ? taskContextIds.filter((id) => id !== contextId)
        : [...taskContextIds, contextId]
      void run(() => window.api.setTaskContexts(task.id, next), 'Contextos atualizados')
    }
    if (kind === 'jira' && value === 'open' && jiraUrl) {
      void window.api
        .appOpenExternal(jiraUrl)
        .catch(() => message.error('Não foi possível abrir o link'))
    }
    if (kind === 'jira' && value === 'fields') setFieldsOpen(true)
    if (kind === 'jirast') {
      const target = Array.isArray(transitions)
        ? transitions.find((transition) => transition.id === value)
        : undefined
      void run(
        () => window.api.jiraTransition(task.id, value),
        `Jira: ${target?.name ?? 'status alterado'}`
      )
    }
    if (kind === 'copy') {
      void navigator.clipboard
        .writeText(String(task.id))
        .then(() => message.success(`#${task.id} copiado`))
        .catch(() => message.error('Não foi possível copiar'))
    }
    if (kind === 'archive') void bulk.archive(ids)
    if (kind === 'delete') bulk.confirmDelete(ids)
  }

  return (
    <>
      <Dropdown
        menu={{
          items,
          onClick,
          onOpenChange: (openKeys) => {
            if (openKeys.includes('jira:status')) void loadTransitions()
          }
        }}
        trigger={trigger}
        placement="bottomRight"
      >
        {children}
      </Dropdown>
      {task.jira_key && (
        <JiraFieldsSheet taskId={task.id} open={fieldsOpen} onOpenChange={setFieldsOpen} />
      )}
    </>
  )
}
