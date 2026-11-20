import { useEffect, useState } from 'react'
import { App, Button, Flex, Input, Switch, Tag, Tooltip, Typography, theme } from 'antd'
import {
  Calendar,
  ExternalLink,
  FolderOpen,
  Plug,
  RefreshCw,
  SlidersHorizontal,
  SquareTerminal,
  Undo2
} from 'lucide-react'
import type { Task } from '@shared/types'
import { effectiveWorkingDir } from '@shared/workingDir'
import { JiraStatusSelect } from '@renderer/components/jira/JiraStatusSelect'
import { Field, Section } from '@renderer/components/shell/SectionHeader'
import { sameOwner, useTerminalStore } from '@renderer/stores/terminalStore'

const ICON = { size: 14, strokeWidth: 1.75, 'aria-hidden': true } as const

function shortPath(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean)
  return parts.length > 2 ? `…/${parts.slice(-2).join('/')}` : path
}

interface TaskDetailsPanelProps {
  task: Task
  refreshTask: () => Promise<void>
  onOpenJiraFields: () => void
}

function JiraSection({
  task,
  refreshTask,
  onOpenJiraFields
}: TaskDetailsPanelProps): React.JSX.Element {
  const { token } = theme.useToken()
  const space = task.jira_space ?? task.jira_key?.split('-')[0]
  const parentUrl = task.external_url?.replace(
    /\/browse\/[^/]+$/,
    `/browse/${encodeURIComponent(task.jira_parent_key ?? '')}`
  )
  const open = (url: string | null | undefined): void => {
    if (url) void window.api.appOpenExternal(url)
  }

  return (
    <Section icon={Plug} title="Jira">
      <Field label="Issue">
        <Flex gap={6} align="center" wrap="wrap">
          {task.jira_issue_type && (
            <Tag bordered={false} style={{ margin: 0 }}>
              {task.jira_issue_type}
            </Tag>
          )}
          <Tooltip title={space ? `Espaço no Jira: ${space}` : undefined}>
            <Typography.Link
              href={task.external_url ?? undefined}
              onClick={(event) => {
                event.preventDefault()
                open(task.external_url)
              }}
              style={{ fontFamily: token.fontFamilyCode }}
            >
              {task.jira_key}
            </Typography.Link>
          </Tooltip>
        </Flex>
      </Field>
      <Field label="Status Jira">
        <JiraStatusSelect
          taskId={task.id}
          status={task.jira_status}
          onChanged={() => void refreshTask()}
        />
      </Field>
      {task.jira_parent_key && (
        <Field label="Pai">
          <Typography.Link
            href={parentUrl}
            onClick={(event) => {
              event.preventDefault()
              open(parentUrl)
            }}
            ellipsis
          >
            <span style={{ fontFamily: token.fontFamilyCode }}>{task.jira_parent_key}</span>
            {task.jira_parent_summary && ` ${task.jira_parent_summary}`} <ExternalLink {...ICON} />
          </Typography.Link>
        </Field>
      )}
      <Button
        icon={<SlidersHorizontal {...ICON} />}
        onClick={onOpenJiraFields}
        style={{ alignSelf: 'flex-start' }}
      >
        Campos do Jira
      </Button>
    </Section>
  )
}

function GoogleSection({ task, refreshTask }: TaskDetailsPanelProps): React.JSX.Element | null {
  const { message } = App.useApp()
  const [connected, setConnected] = useState(false)
  const [busy, setBusy] = useState(false)
  const enabled = Boolean(task.gcal_sync)

  useEffect(() => {
    window.api
      .gcalGetStatus()
      .then((status) => setConnected(status.connected))
      .catch(console.error)
  }, [])

  if (!connected) return null

  const run = async (action: () => Promise<void>, success: string): Promise<void> => {
    setBusy(true)
    try {
      await action()
      message.success(success)
    } catch {
      message.error('Não foi possível sincronizar com o Google Calendar.')
    } finally {
      setBusy(false)
      await refreshTask()
    }
  }

  return (
    <Section icon={Calendar} title="Google Calendar">
      <Flex gap={8} align="center">
        <Switch
          size="small"
          checked={enabled}
          loading={busy}
          aria-label="Sincronizar com o Google Calendar"
          onChange={(on) =>
            void run(
              () => window.api.gcalSetTaskSync(task.id, on),
              on ? 'Enviada para a agenda TickTask' : 'Eventos apagados do Google'
            )
          }
        />
        <Typography.Text style={{ flex: 1 }}>
          {enabled ? 'Na agenda TickTask' : 'Fora do Google Calendar'}
        </Typography.Text>
        {enabled && (
          <Tooltip title="Ressincronizar">
            <Button
              size="small"
              type="text"
              aria-label="Ressincronizar"
              disabled={busy}
              icon={<RefreshCw {...ICON} />}
              onClick={() => void run(() => window.api.gcalSyncTask(task.id), 'Ressincronizada')}
            />
          </Tooltip>
        )}
      </Flex>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        Programado e prazo viram eventos; blocos de tempo também.
      </Typography.Text>
    </Section>
  )
}

function EnvironmentSection({ task, refreshTask }: TaskDetailsPanelProps): React.JSX.Element {
  const { token } = theme.useToken()
  const { message } = App.useApp()
  const { dir, source } = effectiveWorkingDir(task)
  const [command, setCommand] = useState(task.start_command ?? '')

  useEffect(() => setCommand(task.start_command ?? ''), [task.start_command])

  const attempt = async <T,>(action: () => Promise<T>, fallback: string): Promise<T | null> => {
    try {
      return await action()
    } catch (error) {
      message.error(error instanceof Error ? error.message : fallback)
      return null
    }
  }

  const pick = (): Promise<string | null> =>
    attempt(async () => {
      const picked = await window.api.terminalPickDirectory(task.id)
      if (picked) await refreshTask()
      return picked
    }, 'Não foi possível escolher o diretório')

  const inherit = (): Promise<void | null> =>
    attempt(async () => {
      await window.api.terminalSetTaskWorkspace(task.id, { working_dir: null })
      await refreshTask()
    }, 'Não foi possível voltar ao diretório do projeto')

  const saveCommand = async (): Promise<void> => {
    const next = command.trim()
    if (next === (task.start_command ?? '')) return
    await attempt(async () => {
      await window.api.terminalSetTaskWorkspace(task.id, { start_command: next || null })
      await refreshTask()
    }, 'Não foi possível salvar o comando')
  }

  const openTerminal = async (): Promise<void> => {
    if (!dir && !(await pick())) return
    const state = useTerminalStore.getState()
    const owner = { kind: 'task' as const, id: task.id }
    const showing =
      state.open && sameOwner(state.sessions.find((s) => s.id === state.activeId)?.owner, owner)
    if (showing) return
    await attempt(() => state.toggleFor(owner), 'Não foi possível abrir o terminal')
  }

  return (
    <Section icon={SquareTerminal} title="Ambiente">
      <Field label="Diretório">
        <Flex gap={6} align="center" wrap="wrap">
          {dir ? (
            <Tooltip title={dir}>
              <Typography.Text style={{ fontFamily: token.fontFamilyCode, fontSize: 12 }}>
                {shortPath(dir)}
              </Typography.Text>
            </Tooltip>
          ) : (
            <Typography.Text type="secondary">Nenhum</Typography.Text>
          )}
          {source === 'project' && (
            <Tag bordered={false} style={{ margin: 0 }}>
              do projeto
            </Tag>
          )}
          <Button size="small" icon={<FolderOpen {...ICON} />} onClick={() => void pick()}>
            {dir ? 'Alterar' : 'Escolher'}
          </Button>
          {source === 'task' && task.project_working_dir && (
            <Tooltip title={`Voltar a usar o diretório do projeto (${task.project_working_dir})`}>
              <Button
                size="small"
                type="text"
                aria-label="Herdar do projeto"
                icon={<Undo2 {...ICON} />}
                onClick={() => void inherit()}
              />
            </Tooltip>
          )}
        </Flex>
      </Field>
      {dir && (
        <Field label="Comando">
          <Input
            placeholder="Comando ao abrir o terminal"
            aria-label="Comando ao abrir o terminal"
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            onBlur={() => void saveCommand()}
            onPressEnter={(event) => event.currentTarget.blur()}
            style={{ fontFamily: token.fontFamilyCode }}
          />
        </Field>
      )}
      <Button
        icon={<SquareTerminal {...ICON} />}
        onClick={() => void openTerminal()}
        style={{ alignSelf: 'flex-start' }}
      >
        Abrir terminal
      </Button>
    </Section>
  )
}

export function TaskDetailsPanel(props: TaskDetailsPanelProps): React.JSX.Element {
  return (
    <Flex vertical gap={20}>
      {props.task.jira_key && <JiraSection {...props} />}
      <GoogleSection {...props} />
      <EnvironmentSection {...props} />
    </Flex>
  )
}
