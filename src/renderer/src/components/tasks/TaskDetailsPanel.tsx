import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flex, Typography } from 'antd'
import { CalendarDays, FolderKanban, Plug, SquareTerminal } from 'lucide-react'
import type { Context, EnergyLevel, Project, Task, UpdateTaskInput } from '@shared/types'
import { ENERGY_LABELS } from '@shared/types'
import { SearchableSelect } from '@renderer/components/ui/searchable-select'
import { CategorySelect } from '@renderer/components/CategorySelect'
import { TagInput } from '@renderer/components/TagInput'
import { RecurrenceSelect } from '@renderer/components/RecurrenceSelect'
import { GoogleCalendarTaskToggle } from '@renderer/components/GoogleCalendarTaskToggle'
import { ExternalLinkField } from '@renderer/components/ExternalLinkField'
import { TimeInput } from '@renderer/components/TimeInput'
import { WaitingForField } from '@renderer/components/tasks/WaitingFor'
import { WorkingDirField } from '@renderer/components/terminal/WorkingDirField'
import { JiraTaskControls } from '@renderer/components/jira/JiraTaskControls'
import { EnergyMeter } from '@renderer/components/chips/EnergyMeter'
import { Field, Section } from '@renderer/components/shell/SectionHeader'
import { cn } from '@renderer/lib/utils'

interface TaskDetailsPanelProps {
  task: Task
  updateTask: (data: UpdateTaskInput) => Promise<void>
  refreshTask: () => Promise<void>
}

const DATE_INPUT =
  'w-full h-8 text-xs border border-slate-200 rounded-lg px-2.5 focus:outline-none focus:ring-2 focus:ring-slate-300 bg-slate-50 text-slate-700'

export function TaskDetailsPanel({
  task,
  updateTask,
  refreshTask
}: TaskDetailsPanelProps): React.JSX.Element {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [contexts, setContexts] = useState<Context[]>([])

  useEffect(() => {
    window.api.listProjects().then(setProjects).catch(console.error)
    window.api.listContexts().then(setContexts).catch(console.error)
  }, [])

  const selectedContextIds = task.contexts?.map((c) => c.id) ?? []
  const projectOptions = [
    { value: 'none', label: 'Nenhum projeto' },
    ...projects
      .filter((p) => p.status === 'active' || p.status === 'someday' || p.id === task.project_id)
      .map((p) => ({ value: String(p.id), label: p.name }))
  ]
  const dueDate = task.due_date ? task.due_date.split('T')[0] : ''

  const toggleContext = (contextId: number): void => {
    const ids = selectedContextIds.includes(contextId)
      ? selectedContextIds.filter((id) => id !== contextId)
      : [...selectedContextIds, contextId]
    void updateTask({ contextIds: ids })
  }

  const openJiraParent = (): void => {
    const url = task.external_url?.replace(
      /\/browse\/[^/]+$/,
      `/browse/${encodeURIComponent(task.jira_parent_key ?? '')}`
    )
    if (url) void window.api.appOpenExternal(url)
  }

  return (
    <Flex vertical gap={20}>
      <Section icon={FolderKanban} title="Organização">
        <Field label="Categoria">
          <CategorySelect
            value={task.category || 'normal'}
            onChange={(category) => void updateTask({ category })}
          />
        </Field>
        {(task.status === 'aguardando' || task.waiting_for) && (
          <WaitingForField
            value={task.waiting_for}
            onSave={(value) => updateTask({ waiting_for: value })}
          />
        )}
        <Field label="Projeto" align="start">
          <SearchableSelect
            value={task.project_id ? String(task.project_id) : 'none'}
            onChange={(value) =>
              void updateTask({ project_id: value === 'none' ? null : Number(value) })
            }
            options={projectOptions}
            placeholder="Nenhum projeto"
            searchPlaceholder="Buscar projeto..."
          />
          {task.project_id && (
            <Typography.Link onClick={() => navigate(`/project/${task.project_id}`)}>
              Abrir projeto →
            </Typography.Link>
          )}
        </Field>
        {contexts.length > 0 && (
          <Field label="Contextos" align="start">
            <div className="flex flex-wrap gap-1.5">
              {contexts.map((ctx) => {
                const isSelected = selectedContextIds.includes(ctx.id)
                return (
                  <button
                    key={ctx.id}
                    type="button"
                    onClick={() => toggleContext(ctx.id)}
                    className={cn(
                      'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                      isSelected
                        ? 'text-white border-transparent'
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'
                    )}
                    style={isSelected ? { backgroundColor: ctx.color, borderColor: ctx.color } : {}}
                  >
                    <span>{ctx.icon}</span>
                    {ctx.name}
                  </button>
                )
              })}
            </div>
          </Field>
        )}
        <Field label="Tags" align="start">
          <TagInput
            selectedTags={task.tags ?? []}
            onChange={(tags) => void updateTask({ tagIds: tags.map((t) => t.id) })}
            placeholder="Adicionar tag..."
          />
        </Field>
      </Section>

      <Section icon={CalendarDays} title="Agenda">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Programado para</label>
            <input
              type="date"
              value={task.scheduled_date ?? ''}
              onChange={(e) => void updateTask({ scheduled_date: e.target.value || null })}
              className={DATE_INPUT}
            />
            {task.scheduled_date && (
              <div className="flex gap-2 mt-2">
                <TimeInput
                  label="Início"
                  value={task.scheduled_time ?? ''}
                  onChange={(value) => void updateTask({ scheduled_time: value || null })}
                />
                {task.scheduled_time && (
                  <TimeInput
                    label="Fim"
                    value={task.scheduled_end_time ?? ''}
                    min={task.scheduled_time}
                    onChange={(value) => void updateTask({ scheduled_end_time: value || null })}
                  />
                )}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Prazo</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => void updateTask({ due_date: e.target.value || null })}
              className={DATE_INPUT}
            />
            {dueDate && (
              <div className="flex gap-2 mt-2">
                <TimeInput
                  label="Hora"
                  value={task.due_time ?? ''}
                  onChange={(value) => void updateTask({ due_time: value || null })}
                />
              </div>
            )}
          </div>
        </div>
        <Field label="Recorrência">
          <RecurrenceSelect
            value={task.recurrence_rule || null}
            onChange={(value) => void updateTask({ recurrence_rule: value })}
          />
        </Field>
        <Field label="Energia">
          <div className="flex gap-2">
            {(['alto', 'medio', 'baixo'] as EnergyLevel[]).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() =>
                  void updateTask({ energy_level: task.energy_level === level ? null : level })
                }
                className={cn(
                  'flex-1 flex items-center justify-center gap-1 h-8 rounded-lg text-xs font-medium border transition-all',
                  task.energy_level === level
                    ? 'bg-slate-100 border-slate-400 text-slate-700'
                    : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'
                )}
              >
                <EnergyMeter level={level} tooltip={false} />
                {ENERGY_LABELS[level]}
              </button>
            ))}
          </div>
        </Field>
        <ExternalLinkField
          value={task.external_url}
          jiraKey={task.jira_key}
          onSave={(value) => updateTask({ external_url: value })}
        />
      </Section>

      {task.jira_key && (
        <Section icon={Plug} title="Jira">
          <JiraTaskControls task={task} showKey showFieldsButton={false} />
          {task.jira_parent_key && (
            <Field label="Pai">
              <Typography.Link onClick={openJiraParent} ellipsis>
                {task.jira_parent_key}
                {task.jira_parent_summary && ` · ${task.jira_parent_summary}`}
              </Typography.Link>
            </Field>
          )}
        </Section>
      )}

      <GoogleCalendarTaskToggle
        taskId={task.id}
        enabled={Boolean(task.gcal_sync)}
        onChange={refreshTask}
      />

      <Section icon={SquareTerminal} title="Ambiente">
        <WorkingDirField
          taskId={task.id}
          workingDir={task.working_dir}
          projectWorkingDir={task.project_working_dir}
          startCommand={task.start_command}
          onChange={refreshTask}
        />
      </Section>
    </Flex>
  )
}
