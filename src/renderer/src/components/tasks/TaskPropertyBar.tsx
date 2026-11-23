import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { App, Flex, Input, Typography } from 'antd'
import { CalendarClock, Hourglass, Link, Repeat, Tags } from 'lucide-react'
import type {
  Context,
  Project,
  ProjectMilestone,
  Tag as TaskTag,
  Task,
  UpdateTaskInput
} from '@shared/types'
import { WAITING_FOR_MAX, normalizeWaitingFor } from '@shared/waitingFor'
import { STATUS_COLORS } from '@renderer/theme/semantic'
import { useThemeSettings } from '@renderer/theme/themeSettings'
import {
  AddPropertyButton,
  CategoryPill,
  ContextsPill,
  DuePill,
  EnergyPill,
  LinkPill,
  MilestonePill,
  PropPill,
  PropertyReadOnly,
  ProjectPill,
  RecurrencePill,
  SchedulePill,
  TagsPill,
  type OptionalPill
} from './propertyPills'

type OptionalKey = 'programado' | 'recorrencia' | 'tags' | 'link'

function useDraft(value: string): [string, (next: string) => void] {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  return [draft, setDraft]
}

function WaitingForEditor({
  value,
  onSave
}: {
  value: string | null | undefined
  onSave: (value: string | null) => Promise<void>
}): React.JSX.Element {
  const [draft, setDraft] = useDraft(value ?? '')
  const commit = (): void => {
    const next = normalizeWaitingFor(draft)
    setDraft(next ?? '')
    if (next !== (value ?? null)) void onSave(next)
  }
  return (
    <Flex vertical gap={8}>
      <Input
        autoFocus
        allowClear
        maxLength={WAITING_FOR_MAX}
        placeholder="Quem ou o quê? Ex.: Revisor externo"
        aria-label="Aguardando quem ou o quê"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onPressEnter={(event) => event.currentTarget.blur()}
      />
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        Aparece na lista (ampulheta) e no passo Aguardando da revisão semanal. Fica guardado se o
        status mudar.
      </Typography.Text>
    </Flex>
  )
}

interface TaskPropertyBarProps {
  task: Task
  update: (data: UpdateTaskInput) => Promise<void>
}

export function TaskPropertyBar(props: TaskPropertyBarProps): React.JSX.Element {
  return (
    <PropertyReadOnly readOnly={!!props.task.is_archived}>
      <PropertyBar {...props} />
    </PropertyReadOnly>
  )
}

const OPTIONAL: OptionalPill<OptionalKey>[] = [
  { key: 'programado', label: 'Programado', icon: CalendarClock },
  { key: 'recorrencia', label: 'Recorrência', icon: Repeat },
  { key: 'tags', label: 'Tags', icon: Tags },
  { key: 'link', label: 'Link externo', icon: Link }
]

function PropertyBar({ task, update }: TaskPropertyBarProps): React.JSX.Element {
  const navigate = useNavigate()
  const { mode } = useThemeSettings()
  const { message } = App.useApp()
  const [projects, setProjects] = useState<Project[]>([])
  const [contexts, setContexts] = useState<Context[]>([])
  const [allTags, setAllTags] = useState<TaskTag[]>([])
  const [shown, setShown] = useState<OptionalKey[]>([])
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([])
  const projectId = task.project_id ?? null

  useEffect(() => {
    window.api.listProjects().then(setProjects).catch(console.error)
    window.api.listContexts().then(setContexts).catch(console.error)
    window.api.listTags().then(setAllTags).catch(console.error)
  }, [])

  useEffect(() => setShown([]), [task.id])

  useEffect(() => {
    if (!projectId) {
      setMilestones([])
      return
    }
    const load = (): void => {
      window.api.listMilestones(projectId).then(setMilestones).catch(console.error)
    }
    load()
    return window.api.onTasksRefresh(load)
  }, [projectId])

  const saveMilestone = async (milestone_id: number | null): Promise<void> => {
    try {
      await update({ milestone_id })
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Não foi possível trocar o marco')
    }
  }

  const tags = task.tags ?? []
  const dueDate = task.due_date ? task.due_date.split('T')[0] : null
  const waitingColor = STATUS_COLORS.aguardando[mode].fg

  const filled: Record<OptionalKey, boolean> = {
    programado: !!task.scheduled_date,
    recorrencia: !!task.recurrence_rule,
    tags: tags.length > 0,
    link: !!task.external_url
  }
  const visible = (key: OptionalKey): boolean => filled[key] || shown.includes(key)

  const saveTags = async (names: string[]): Promise<void> => {
    try {
      const resolved = await Promise.all(
        names.map(
          (name) =>
            allTags.find((t) => t.name === name) ??
            tags.find((t) => t.name === name) ??
            window.api.getOrCreateTag(name)
        )
      )
      await update({ tagIds: resolved.map((t) => t.id) })
      window.api.listTags().then(setAllTags).catch(console.error)
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Não foi possível salvar as tags')
    }
  }

  return (
    <Flex wrap="wrap" gap={6} style={{ marginTop: 10 }}>
      {(task.status === 'aguardando' || task.waiting_for) && (
        <PropPill
          label="Aguardando"
          icon={Hourglass}
          muted={!task.waiting_for}
          tone={task.waiting_for ? waitingColor : undefined}
          content={
            <WaitingForEditor
              value={task.waiting_for}
              onSave={(waiting_for) => update({ waiting_for })}
            />
          }
        >
          {task.waiting_for ? `Aguardando: ${task.waiting_for}` : 'Aguardando quem?'}
        </PropPill>
      )}
      <CategoryPill value={task.category} onChange={(category) => update({ category })} />
      <ProjectPill
        value={task.project_id ?? null}
        projects={projects}
        current={task.project_name ? { name: task.project_name, color: task.project_color } : null}
        onChange={(project_id) => update({ project_id })}
        onOpen={(id) => navigate(`/project/${id}`)}
      />
      {projectId && milestones.length > 0 && (
        <MilestonePill
          value={task.milestone_id ?? null}
          milestones={milestones}
          onChange={saveMilestone}
        />
      )}
      <ContextsPill
        selected={task.contexts ?? []}
        contexts={contexts}
        onChange={(contextIds) => update({ contextIds })}
        onManage={() => navigate('/contexts')}
      />
      <DuePill date={dueDate} time={task.due_time} onChange={(patch) => update(patch)} />
      <EnergyPill value={task.energy_level} onChange={(energy_level) => update({ energy_level })} />
      {visible('programado') && (
        <SchedulePill
          date={task.scheduled_date}
          start={task.scheduled_time}
          end={task.scheduled_end_time}
          onChange={(patch) => update(patch)}
        />
      )}
      {visible('recorrencia') && (
        <RecurrencePill
          value={task.recurrence_rule}
          onChange={(recurrence_rule) => update({ recurrence_rule })}
        />
      )}
      {visible('tags') && (
        <TagsPill
          value={tags.map((t) => t.name)}
          options={allTags.map((t) => t.name)}
          onChange={saveTags}
        />
      )}
      {visible('link') && (
        <LinkPill
          value={task.external_url}
          jiraKey={task.jira_key}
          onChange={(external_url) => update({ external_url })}
        />
      )}
      {!task.is_archived && (
        <AddPropertyButton
          options={OPTIONAL.filter((o) => !visible(o.key))}
          onAdd={(key) => setShown([...shown, key])}
        />
      )}
    </Flex>
  )
}
