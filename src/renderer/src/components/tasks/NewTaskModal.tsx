import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  App,
  Button,
  Checkbox,
  Flex,
  Grid,
  Input,
  Modal,
  Tooltip,
  Typography,
  theme,
  type InputRef
} from 'antd'
import { CalendarClock, Inbox, Link, Repeat, Tags, Timer } from 'lucide-react'
import type { Context, Project, Tag as TaskTag } from '@shared/types'
import { KeyCombo } from '@renderer/components/shell/Kbd'
import { onNewTaskRequest } from '@renderer/lib/newTaskRequest'
import {
  AddPropertyButton,
  CategoryPill,
  ContextsPill,
  DuePill,
  EnergyPill,
  LinkPill,
  PropPill,
  ProjectPill,
  RecurrencePill,
  SchedulePill,
  TagsPill,
  type OptionalPill
} from './propertyPills'
import {
  EMPTY_DRAFT,
  draftForAnother,
  draftProblem,
  draftToCreateInput,
  parseTimeLimit,
  type NewTaskDraft
} from './newTaskDraft'

const INBOX_HINT = 'Vai para o Inbox'

type OptionalKey = 'programado' | 'recorrencia' | 'tags' | 'link' | 'limite'

const OPTIONAL: OptionalPill<OptionalKey>[] = [
  { key: 'programado', label: 'Programado', icon: CalendarClock },
  { key: 'recorrencia', label: 'Recorrência', icon: Repeat },
  { key: 'tags', label: 'Tags', icon: Tags },
  { key: 'link', label: 'Link externo', icon: Link },
  { key: 'limite', label: 'Limite de tempo', icon: Timer }
]

export function NewTaskModal(): React.JSX.Element {
  const navigate = useNavigate()
  const { token } = theme.useToken()
  const { message } = App.useApp()
  const screens = Grid.useBreakpoint()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<NewTaskDraft>(EMPTY_DRAFT)
  const [shown, setShown] = useState<OptionalKey[]>([])
  const [another, setAnother] = useState(false)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const nameRef = useRef<InputRef>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [contexts, setContexts] = useState<Context[]>([])
  const [tags, setTags] = useState<TaskTag[]>([])

  useEffect(
    () =>
      onNewTaskRequest(() => {
        setDraft(EMPTY_DRAFT)
        setShown([])
        setOpen(true)
      }),
    []
  )

  useEffect(() => {
    if (!open) return
    Promise.all([window.api.listProjects(), window.api.listContexts(), window.api.listTags()])
      .then(([nextProjects, nextContexts, nextTags]) => {
        setProjects(nextProjects)
        setContexts(nextContexts)
        setTags(nextTags)
      })
      .catch((error: unknown) =>
        message.error(error instanceof Error ? error.message : 'Não foi possível carregar a lista')
      )
  }, [open, message])

  const set = (patch: Partial<NewTaskDraft>): void => setDraft((prev) => ({ ...prev, ...patch }))
  const problem = draftProblem(draft)
  const limitValid = parseTimeLimit(draft.timeLimit) !== null

  const filled: Record<OptionalKey, boolean> = {
    programado: !!draft.scheduledDate,
    recorrencia: !!draft.recurrence,
    tags: draft.tags.length > 0,
    link: !!draft.externalUrl.trim(),
    limite: !!draft.timeLimit.trim()
  }
  const visible = (key: OptionalKey): boolean => filled[key] || shown.includes(key)

  const close = (): void => setOpen(false)

  const submit = async (): Promise<void> => {
    const input = draftToCreateInput(draft)
    if (!input || savingRef.current) return
    savingRef.current = true
    setSaving(true)
    try {
      const task = await window.api.createTask(input)
      if (another) {
        message.success(`Tarefa criada: ${task.name}`)
        setDraft(draftForAnother(draft))
        setShown([])
        nameRef.current?.focus()
      } else {
        message.success('Tarefa criada')
        setOpen(false)
        navigate(`/task/${task.id}`)
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Não foi possível criar a tarefa')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const footer = (
    <Flex align="center" justify="space-between" gap={8} wrap="wrap">
      <Flex align="center" gap={12} wrap="wrap" style={{ minWidth: 0 }}>
        <Checkbox checked={another} onChange={(event) => setAnother(event.target.checked)}>
          Criar outra em seguida
        </Checkbox>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          <Inbox size={14} strokeWidth={1.75} aria-hidden style={{ verticalAlign: -2 }} />{' '}
          {INBOX_HINT}
        </Typography.Text>
      </Flex>
      <Flex align="center" gap={8}>
        {screens.sm !== false && (
          <span aria-hidden>
            <KeyCombo keys={['Ctrl', 'Enter']} />
          </span>
        )}
        <Button onClick={close}>Cancelar</Button>
        <Tooltip title={problem && draft.name.trim() ? problem : 'Ctrl+Enter'}>
          <Button
            type="primary"
            loading={saving}
            disabled={!!problem}
            onClick={() => void submit()}
          >
            Criar tarefa
          </Button>
        </Tooltip>
      </Flex>
    </Flex>
  )

  return (
    <Modal
      open={open}
      onCancel={close}
      title="Nova tarefa"
      width={640}
      footer={footer}
      destroyOnHidden
      afterOpenChange={(opened) => opened && nameRef.current?.focus()}
    >
      <div
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault()
            void submit()
          }
        }}
      >
        <Input
          ref={nameRef}
          variant="borderless"
          autoFocus
          placeholder="Nome da tarefa"
          aria-label="Nome da tarefa"
          maxLength={300}
          value={draft.name}
          onChange={(event) => set({ name: event.target.value })}
          onPressEnter={(event) => {
            if (!event.ctrlKey && !event.metaKey) void submit()
          }}
          style={{ fontSize: 18, fontWeight: 600, paddingInline: 0 }}
        />
        <Input.TextArea
          variant="borderless"
          placeholder="Descrição (opcional)"
          aria-label="Descrição"
          autoSize={{ minRows: 2, maxRows: 6 }}
          value={draft.description}
          onChange={(event) => set({ description: event.target.value })}
          style={{ paddingInline: 0 }}
        />
        <Flex wrap="wrap" gap={6} style={{ marginTop: 12 }}>
          <CategoryPill value={draft.category} onChange={(category) => set({ category })} />
          <ProjectPill
            value={draft.projectId}
            projects={projects}
            onChange={(projectId) => set({ projectId })}
          />
          <ContextsPill
            selected={contexts.filter((c) => draft.contextIds.includes(c.id))}
            contexts={contexts}
            onChange={(contextIds) => set({ contextIds })}
            onManage={() => {
              close()
              navigate('/contexts')
            }}
          />
          <DuePill
            date={draft.dueDate}
            time={draft.dueTime}
            onChange={(patch) =>
              set({
                ...('due_date' in patch
                  ? {
                      dueDate: patch.due_date ?? null,
                      dueTime: patch.due_date ? draft.dueTime : null
                    }
                  : {}),
                ...('due_time' in patch ? { dueTime: patch.due_time ?? null } : {})
              })
            }
          />
          <EnergyPill value={draft.energy} onChange={(energy) => set({ energy })} />
          {visible('programado') && (
            <SchedulePill
              date={draft.scheduledDate}
              start={draft.scheduledTime}
              end={draft.scheduledEndTime}
              onChange={(patch) =>
                set({
                  ...('scheduled_date' in patch
                    ? {
                        scheduledDate: patch.scheduled_date ?? null,
                        ...(patch.scheduled_date
                          ? {}
                          : { scheduledTime: null, scheduledEndTime: null })
                      }
                    : {}),
                  ...('scheduled_time' in patch
                    ? { scheduledTime: patch.scheduled_time ?? null }
                    : {}),
                  ...('scheduled_end_time' in patch
                    ? { scheduledEndTime: patch.scheduled_end_time ?? null }
                    : {})
                })
              }
            />
          )}
          {visible('recorrencia') && (
            <RecurrencePill
              value={draft.recurrence}
              onChange={(recurrence) => set({ recurrence })}
            />
          )}
          {visible('tags') && (
            <TagsPill
              value={draft.tags}
              options={tags.map((t) => t.name)}
              onChange={(names) => set({ tags: names })}
            />
          )}
          {visible('link') && (
            <LinkPill
              value={draft.externalUrl || null}
              onChange={(url) => set({ externalUrl: url ?? '' })}
            />
          )}
          {visible('limite') && (
            <PropPill
              label="Limite de tempo"
              icon={Timer}
              muted={!draft.timeLimit.trim()}
              tone={limitValid ? undefined : token.colorError}
              content={
                <Flex vertical gap={6}>
                  <Input
                    autoFocus
                    placeholder="HH:MM:SS"
                    aria-label="Limite de tempo"
                    status={limitValid ? undefined : 'error'}
                    value={draft.timeLimit}
                    onChange={(event) => set({ timeLimit: event.target.value })}
                    style={{ fontFamily: token.fontFamilyCode }}
                  />
                  <Typography.Text
                    type={limitValid ? 'secondary' : 'danger'}
                    style={{ fontSize: 12 }}
                  >
                    {limitValid
                      ? 'Avisa quando o tempo da tarefa chegar perto. Ex.: 1:30:00 ou 45.'
                      : 'Use HH:MM:SS, MM:SS ou só os minutos.'}
                  </Typography.Text>
                </Flex>
              }
            >
              <span
                style={{ fontFamily: token.fontFamilyCode, fontVariantNumeric: 'tabular-nums' }}
              >
                {draft.timeLimit.trim() || 'Limite'}
              </span>
            </PropPill>
          )}
          <AddPropertyButton
            options={OPTIONAL.filter((o) => !visible(o.key))}
            onAdd={(key) => setShown([...shown, key])}
          />
        </Flex>
      </div>
    </Modal>
  )
}
