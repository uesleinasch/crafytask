import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  App,
  Button,
  DatePicker,
  Dropdown,
  Flex,
  Input,
  Popover,
  Select,
  Space,
  Tag,
  TimePicker,
  Typography,
  theme
} from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import {
  CalendarClock,
  ExternalLink,
  Flag,
  Folder,
  Hourglass,
  Link,
  MapPin,
  Plus,
  Repeat,
  Tags,
  type LucideIcon
} from 'lucide-react'
import type {
  Context,
  EnergyLevel,
  Project,
  Tag as TaskTag,
  Task,
  TaskCategory,
  UpdateTaskInput
} from '@shared/types'
import { WAITING_FOR_MAX, normalizeWaitingFor } from '@shared/waitingFor'
import { isSafeHttpUrl } from '@shared/externalUrl'
import {
  RECURRENCE_OPTIONS,
  recurrenceLabel,
  recurrenceOptionValue
} from '@shared/recurrenceOptions'
import { CategoryChip } from '@renderer/components/chips/CategoryChip'
import { EnergyMeter } from '@renderer/components/chips/EnergyMeter'
import { ENERGY_LABELS, STATUS_COLORS } from '@renderer/theme/semantic'
import { useThemeSettings } from '@renderer/theme/themeSettings'
import { ProjectLabel } from './ProjectLabel'
import { dueTone, formatDueShort } from './taskTableFormat'

const ICON = { size: 14, strokeWidth: 1.75, 'aria-hidden': true } as const
const CATEGORIES: TaskCategory[] = ['normal', 'urgente', 'prioridade', 'time_leak']
const ENERGIES: EnergyLevel[] = ['alto', 'medio', 'baixo']
const DATE_FORMAT = 'DD/MM/YYYY'
const ISO = 'YYYY-MM-DD'

type OptionalKey = 'programado' | 'recorrencia' | 'tags' | 'link'

interface PropPillProps {
  label: string
  icon?: LucideIcon
  muted?: boolean
  tone?: string
  content: ReactNode
  children: ReactNode
}

function PropPill({
  label,
  icon: Icon,
  muted,
  tone,
  content,
  children
}: PropPillProps): React.JSX.Element {
  const { token } = theme.useToken()
  return (
    <Popover
      trigger="click"
      placement="bottomLeft"
      title={label}
      destroyOnHidden
      content={<div style={{ width: 280, maxWidth: '80vw' }}>{content}</div>}
    >
      <button
        type="button"
        className={muted ? 'ct-prop muted' : 'ct-prop'}
        aria-haspopup="dialog"
        style={tone ? { color: tone } : undefined}
      >
        <span className="sr-only">{label}: </span>
        {Icon && <Icon {...ICON} color={tone ?? token.colorTextTertiary} />}
        {children}
      </button>
    </Popover>
  )
}

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
        onPressEnter={commit}
      />
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        Aparece na lista (ampulheta) e no passo Aguardando da revisão semanal. Fica guardado se o
        status mudar.
      </Typography.Text>
    </Flex>
  )
}

function LinkEditor({
  value,
  jiraKey,
  onSave
}: {
  value: string | null | undefined
  jiraKey: string | null | undefined
  onSave: (value: string | null) => Promise<void>
}): React.JSX.Element {
  const { message } = App.useApp()
  const [draft, setDraft] = useDraft(value ?? '')
  const commit = (): void => {
    const next = draft.trim()
    if (next === (value ?? '')) return
    if (next && !isSafeHttpUrl(next)) {
      message.error('Informe um link http:// ou https://')
      setDraft(value ?? '')
      return
    }
    void onSave(next || null)
  }
  const open = (): void => {
    window.api.appOpenExternal(draft.trim()).catch((error: unknown) => {
      message.error(error instanceof Error ? error.message : 'Não foi possível abrir o link')
    })
  }
  return (
    <Flex vertical gap={8}>
      <Space.Compact style={{ width: '100%' }}>
        <Input
          autoFocus
          placeholder="https://…"
          aria-label="Link externo"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onPressEnter={commit}
        />
        <Button
          aria-label="Abrir no navegador"
          icon={<ExternalLink {...ICON} />}
          disabled={!isSafeHttpUrl(draft.trim())}
          onClick={open}
        />
      </Space.Compact>
      {jiraKey && (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Link da issue {jiraKey} no Jira.
        </Typography.Text>
      )}
    </Flex>
  )
}

interface TaskPropertyBarProps {
  task: Task
  update: (data: UpdateTaskInput) => Promise<void>
}

export function TaskPropertyBar({ task, update }: TaskPropertyBarProps): React.JSX.Element {
  const navigate = useNavigate()
  const { token } = theme.useToken()
  const { mode } = useThemeSettings()
  const [projects, setProjects] = useState<Project[]>([])
  const [contexts, setContexts] = useState<Context[]>([])
  const [allTags, setAllTags] = useState<TaskTag[]>([])
  const [shown, setShown] = useState<OptionalKey[]>([])

  useEffect(() => {
    window.api.listProjects().then(setProjects).catch(console.error)
    window.api.listContexts().then(setContexts).catch(console.error)
    window.api.listTags().then(setAllTags).catch(console.error)
  }, [])

  useEffect(() => setShown([]), [task.id])

  const contextIds = task.contexts?.map((c) => c.id) ?? []
  const tags = task.tags ?? []
  const dueDate = task.due_date ? task.due_date.split('T')[0] : null
  const tone = dueTone(dueDate, new Date())
  const dueColor =
    tone === 'danger' ? token.colorError : tone === 'warning' ? token.colorWarning : undefined
  const waitingColor = STATUS_COLORS.aguardando[mode].fg
  const toIso = (value: Dayjs | null): string | null => (value ? value.format(ISO) : null)
  const clock = (value: string | null | undefined): Dayjs | null =>
    value ? dayjs(`2000-01-01 ${value}`) : null

  const optional: { key: OptionalKey; label: string; icon: LucideIcon; set: boolean }[] = [
    { key: 'programado', label: 'Programado', icon: CalendarClock, set: !!task.scheduled_date },
    { key: 'recorrencia', label: 'Recorrência', icon: Repeat, set: !!task.recurrence_rule },
    { key: 'tags', label: 'Tags', icon: Tags, set: tags.length > 0 },
    { key: 'link', label: 'Link externo', icon: Link, set: !!task.external_url }
  ]
  const visible = (key: OptionalKey): boolean =>
    optional.some((o) => o.key === key && o.set) || shown.includes(key)
  const hidden = optional.filter((o) => !visible(o.key))

  const projectOptions = projects
    .filter((p) => p.status === 'active' || p.status === 'someday' || p.id === task.project_id)
    .map((p) => ({
      value: p.id,
      title: p.name,
      label: <ProjectLabel name={p.name} color={p.color} />
    }))

  const saveTags = async (names: string[]): Promise<void> => {
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
  }

  const contextLabel = contextIds.length ? (
    <>
      {(task.contexts ?? []).slice(0, 2).map((c) => (
        <span key={c.id}>
          {c.icon ? `${c.icon} ` : ''}
          {c.name}
        </span>
      ))}
      {contextIds.length > 2 && (
        <span style={{ color: token.colorTextTertiary }}>+{contextIds.length - 2}</span>
      )}
    </>
  ) : (
    'Contexto'
  )

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

      <PropPill
        label="Categoria"
        content={
          <Flex vertical gap={6}>
            {CATEGORIES.map((category) => (
              <Button
                key={category}
                type={task.category === category ? 'primary' : 'text'}
                ghost={task.category === category}
                aria-pressed={task.category === category}
                style={{ justifyContent: 'flex-start' }}
                onClick={() => void update({ category })}
              >
                <CategoryChip category={category} />
              </Button>
            ))}
          </Flex>
        }
      >
        {task.category === 'normal' ? (
          <span style={{ color: token.colorTextSecondary }}>Normal</span>
        ) : (
          <CategoryChip category={task.category} />
        )}
      </PropPill>

      <PropPill
        label="Projeto"
        muted={!task.project_id}
        content={
          <Flex vertical gap={8}>
            <Select
              showSearch
              allowClear
              placeholder="Sem projeto"
              aria-label="Projeto"
              value={task.project_id ?? undefined}
              optionFilterProp="title"
              options={projectOptions}
              onChange={(value: number | undefined) => void update({ project_id: value ?? null })}
            />
            {task.project_id && (
              <Typography.Link onClick={() => navigate(`/project/${task.project_id}`)}>
                Abrir projeto →
              </Typography.Link>
            )}
          </Flex>
        }
      >
        {task.project_id && task.project_name ? (
          <ProjectLabel name={task.project_name} color={task.project_color} />
        ) : (
          <>
            <Folder {...ICON} />
            Sem projeto
          </>
        )}
      </PropPill>

      <PropPill
        label="Contextos"
        icon={contextIds.length ? undefined : MapPin}
        muted={!contextIds.length}
        content={
          contexts.length ? (
            <Flex gap={4} wrap="wrap">
              {contexts.map((c) => (
                <Tag.CheckableTag
                  key={c.id}
                  checked={contextIds.includes(c.id)}
                  onChange={(on) =>
                    void update({
                      contextIds: on
                        ? [...contextIds, c.id]
                        : contextIds.filter((id) => id !== c.id)
                    })
                  }
                >
                  {c.icon} {c.name}
                </Tag.CheckableTag>
              ))}
            </Flex>
          ) : (
            <Typography.Text type="secondary">Nenhum contexto criado.</Typography.Text>
          )
        }
      >
        {contextLabel}
      </PropPill>

      <PropPill
        label="Prazo"
        icon={Flag}
        muted={!dueDate}
        tone={dueColor}
        content={
          <Flex vertical gap={8}>
            <Flex gap={6}>
              <DatePicker
                format={DATE_FORMAT}
                placeholder="Data"
                aria-label="Data do prazo"
                value={dueDate ? dayjs(dueDate) : null}
                onChange={(value) => void update({ due_date: toIso(value) })}
                style={{ flex: 1 }}
              />
              <TimePicker
                format="HH:mm"
                placeholder="Hora"
                aria-label="Hora do prazo"
                disabled={!dueDate}
                value={clock(task.due_time)}
                onChange={(value) =>
                  void update({ due_time: value ? value.format('HH:mm') : null })
                }
                style={{ width: 96 }}
              />
            </Flex>
            {dueDate && (
              <Typography.Link onClick={() => void update({ due_date: null })}>
                Remover prazo
              </Typography.Link>
            )}
          </Flex>
        }
      >
        {dueDate ? `Prazo ${formatDueShort(dueDate, task.due_time)}` : 'Prazo'}
      </PropPill>

      <PropPill
        label="Energia"
        muted={!task.energy_level}
        content={
          <Flex gap={4}>
            {ENERGIES.map((level) => (
              <Button
                key={level}
                size="small"
                type={task.energy_level === level ? 'primary' : 'default'}
                ghost={task.energy_level === level}
                aria-pressed={task.energy_level === level}
                style={{ flex: 1 }}
                onClick={() =>
                  void update({ energy_level: task.energy_level === level ? null : level })
                }
              >
                <EnergyMeter level={level} tooltip={false} />
                {ENERGY_LABELS[level]}
              </Button>
            ))}
          </Flex>
        }
      >
        {task.energy_level ? (
          <>
            <EnergyMeter level={task.energy_level} tooltip={false} />
            Energia {ENERGY_LABELS[task.energy_level].toLowerCase()}
          </>
        ) : (
          'Energia'
        )}
      </PropPill>

      {visible('programado') && (
        <PropPill
          label="Programado"
          icon={CalendarClock}
          muted={!task.scheduled_date}
          content={
            <Flex vertical gap={8}>
              <DatePicker
                format={DATE_FORMAT}
                placeholder="Data"
                aria-label="Data programada"
                value={task.scheduled_date ? dayjs(task.scheduled_date) : null}
                onChange={(value) => void update({ scheduled_date: toIso(value) })}
              />
              <TimePicker.RangePicker
                format="HH:mm"
                placeholder={['Início', 'Fim']}
                allowEmpty={[true, true]}
                disabled={!task.scheduled_date}
                value={
                  task.scheduled_time
                    ? [clock(task.scheduled_time), clock(task.scheduled_end_time)]
                    : null
                }
                onChange={(value) =>
                  void update({
                    scheduled_time: value?.[0] ? value[0].format('HH:mm') : null,
                    scheduled_end_time: value?.[1] ? value[1].format('HH:mm') : null
                  })
                }
              />
              {task.scheduled_date && (
                <Typography.Link onClick={() => void update({ scheduled_date: null })}>
                  Remover agendamento
                </Typography.Link>
              )}
            </Flex>
          }
        >
          {task.scheduled_date
            ? `${formatDueShort(task.scheduled_date, task.scheduled_time)}${
                task.scheduled_end_time ? `–${task.scheduled_end_time}` : ''
              }`
            : 'Programado'}
        </PropPill>
      )}

      {visible('recorrencia') && (
        <PropPill
          label="Recorrência"
          icon={Repeat}
          muted={!task.recurrence_rule}
          content={
            <Select
              aria-label="Recorrência"
              value={recurrenceOptionValue(task.recurrence_rule)}
              options={RECURRENCE_OPTIONS}
              onChange={(value: string) =>
                void update({ recurrence_rule: value === 'none' ? null : value })
              }
              style={{ width: '100%' }}
            />
          }
        >
          {recurrenceLabel(task.recurrence_rule)}
        </PropPill>
      )}

      {visible('tags') && (
        <PropPill
          label="Tags"
          icon={Tags}
          muted={!tags.length}
          content={
            <Select
              mode="tags"
              aria-label="Tags"
              placeholder="Adicionar tag"
              value={tags.map((t) => t.name)}
              options={allTags.map((t) => ({ value: t.name, label: t.name }))}
              onChange={(names: string[]) => void saveTags(names)}
              style={{ width: '100%' }}
            />
          }
        >
          {tags.length ? tags.map((t) => `#${t.name}`).join(' ') : 'Tags'}
        </PropPill>
      )}

      {visible('link') && (
        <PropPill
          label="Link externo"
          icon={Link}
          muted={!task.external_url}
          content={
            <LinkEditor
              value={task.external_url}
              jiraKey={task.jira_key}
              onSave={(external_url) => update({ external_url })}
            />
          }
        >
          {task.external_url ? task.external_url.replace(/^https?:\/\//, '').split('/')[0] : 'Link'}
        </PropPill>
      )}

      {hidden.length > 0 && (
        <Dropdown
          trigger={['click']}
          menu={{
            items: hidden.map((o) => ({
              key: o.key,
              icon: <o.icon {...ICON} />,
              label: o.label
            })),
            onClick: ({ key }) => setShown([...shown, key as OptionalKey])
          }}
        >
          <button type="button" className="ct-prop muted" aria-label="Adicionar propriedade">
            <Plus {...ICON} />
            Propriedade
          </button>
        </Dropdown>
      )}
    </Flex>
  )
}
