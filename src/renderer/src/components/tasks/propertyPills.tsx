import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  App,
  Button,
  DatePicker,
  Dropdown,
  Empty,
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
  Link,
  MapPin,
  Plus,
  Repeat,
  Tags,
  type LucideIcon
} from 'lucide-react'
import {
  ENERGY_LABELS,
  type Context,
  type EnergyLevel,
  type Project,
  type TaskCategory
} from '@shared/types'
import { isSafeHttpUrl } from '@shared/externalUrl'
import {
  RECURRENCE_OPTIONS,
  recurrenceLabel,
  recurrenceOptionValue
} from '@shared/recurrenceOptions'
import { CategoryChip } from '@renderer/components/chips/CategoryChip'
import { EnergyMeter } from '@renderer/components/chips/EnergyMeter'
import { ProjectLabel } from './ProjectLabel'
import { dueTone, formatDueShort } from './taskTableFormat'

const ICON = { size: 14, strokeWidth: 1.75, 'aria-hidden': true } as const
const CATEGORIES: TaskCategory[] = ['urgente', 'prioridade', 'normal', 'time_leak']
const ENERGIES: EnergyLevel[] = ['alto', 'medio', 'baixo']
const DATE_FORMAT = 'DD/MM/YYYY'
const ISO = 'YYYY-MM-DD'
const LINK_BUTTON = { padding: 0, height: 'auto', alignSelf: 'flex-start' } as const

type Change<T> = (value: T) => void | Promise<void>

const toIso = (value: Dayjs | null): string | null => (value ? value.format(ISO) : null)
const clock = (value: string | null | undefined): Dayjs | null =>
  value ? dayjs(`2000-01-01 ${value}`) : null

const ReadOnlyContext = createContext(false)

export function PropertyReadOnly({
  readOnly,
  children
}: {
  readOnly: boolean
  children: ReactNode
}): React.JSX.Element {
  return <ReadOnlyContext.Provider value={readOnly}>{children}</ReadOnlyContext.Provider>
}

interface PropPillProps {
  label: string
  icon?: LucideIcon
  muted?: boolean
  tone?: string
  content: ReactNode
  children: ReactNode
}

export function PropPill({
  label,
  icon: Icon,
  muted,
  tone,
  content,
  children
}: PropPillProps): React.JSX.Element {
  const { token } = theme.useToken()
  const [open, setOpen] = useState(false)
  const readOnly = useContext(ReadOnlyContext)
  const pill = (
    <button
      type="button"
      className={muted ? 'ct-prop muted' : 'ct-prop'}
      aria-haspopup={readOnly ? undefined : 'dialog'}
      aria-expanded={readOnly ? undefined : open}
      disabled={readOnly}
      style={tone && !readOnly ? { color: tone } : undefined}
    >
      <span className="sr-only">{label}: </span>
      {Icon && <Icon {...ICON} color={(!readOnly && tone) || token.colorTextTertiary} />}
      {children}
    </button>
  )
  if (readOnly) return pill
  return (
    <Popover
      trigger="click"
      placement="bottomLeft"
      title={label}
      destroyOnHidden
      open={open}
      onOpenChange={setOpen}
      content={
        <div role="dialog" aria-label={label} style={{ width: 280, maxWidth: '80vw' }}>
          {content}
        </div>
      }
    >
      {pill}
    </Popover>
  )
}

export function CategoryPill({
  value,
  onChange
}: {
  value: TaskCategory
  onChange: Change<TaskCategory>
}): React.JSX.Element {
  const { token } = theme.useToken()
  return (
    <PropPill
      label="Categoria"
      content={
        <Flex vertical gap={6}>
          {CATEGORIES.map((category) => (
            <Button
              key={category}
              autoFocus={category === value}
              type={value === category ? 'primary' : 'text'}
              ghost={value === category}
              aria-pressed={value === category}
              style={{ justifyContent: 'flex-start' }}
              onClick={() => void onChange(category)}
            >
              <CategoryChip category={category} />
            </Button>
          ))}
        </Flex>
      }
    >
      {value === 'normal' ? (
        <span style={{ color: token.colorTextSecondary }}>Normal</span>
      ) : (
        <CategoryChip category={value} />
      )}
    </PropPill>
  )
}

export function ProjectPill({
  value,
  projects,
  current,
  onChange,
  onOpen
}: {
  value: number | null
  projects: Project[]
  current?: { name: string; color?: string | null } | null
  onChange: Change<number | null>
  onOpen?: (projectId: number) => void
}): React.JSX.Element {
  const selected = projects.find((p) => p.id === value) ?? (value ? current : null)
  const options = projects
    .filter((p) => p.status === 'active' || p.status === 'someday' || p.id === value)
    .map((p) => ({
      value: p.id,
      title: p.name,
      label: <ProjectLabel name={p.name} color={p.color} />
    }))
  return (
    <PropPill
      label="Projeto"
      muted={!value}
      content={
        <Flex vertical gap={8}>
          <Select
            autoFocus
            showSearch
            allowClear
            placeholder="Sem projeto"
            aria-label="Projeto"
            value={value ?? undefined}
            optionFilterProp="title"
            options={options}
            onChange={(next: number | undefined) => void onChange(next ?? null)}
          />
          {value && onOpen && (
            <Button type="link" size="small" style={LINK_BUTTON} onClick={() => onOpen(value)}>
              Abrir projeto →
            </Button>
          )}
        </Flex>
      }
    >
      {value && selected ? (
        <ProjectLabel name={selected.name} color={selected.color} />
      ) : (
        <>
          <Folder {...ICON} />
          Sem projeto
        </>
      )}
    </PropPill>
  )
}

export function ContextsPill({
  selected,
  contexts,
  onChange,
  onManage
}: {
  selected: Context[]
  contexts: Context[]
  onChange: Change<number[]>
  onManage?: () => void
}): React.JSX.Element {
  const { token } = theme.useToken()
  const ids = selected.map((c) => c.id)
  return (
    <PropPill
      label="Contextos"
      icon={ids.length ? undefined : MapPin}
      muted={!ids.length}
      content={
        contexts.length ? (
          <Flex gap={4} wrap="wrap">
            {contexts.map((c) => (
              <Tag.CheckableTag
                key={c.id}
                checked={ids.includes(c.id)}
                onChange={(on) =>
                  void onChange(on ? [...ids, c.id] : ids.filter((id) => id !== c.id))
                }
              >
                {c.icon} {c.name}
              </Tag.CheckableTag>
            ))}
          </Flex>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Nenhum contexto criado."
            style={{ margin: 0 }}
          >
            {onManage && (
              <Button type="link" size="small" onClick={onManage}>
                Criar em Contextos e tags
              </Button>
            )}
          </Empty>
        )
      }
    >
      {ids.length ? (
        <>
          {selected.slice(0, 2).map((c) => (
            <span key={c.id}>
              {c.icon ? `${c.icon} ` : ''}
              {c.name}
            </span>
          ))}
          {ids.length > 2 && (
            <span style={{ color: token.colorTextTertiary }}>+{ids.length - 2}</span>
          )}
        </>
      ) : (
        'Contexto'
      )}
    </PropPill>
  )
}

export interface DuePatch {
  due_date?: string | null
  due_time?: string | null
}

export function DuePill({
  date,
  time,
  onChange
}: {
  date: string | null
  time: string | null | undefined
  onChange: Change<DuePatch>
}): React.JSX.Element {
  const { token } = theme.useToken()
  const tone = dueTone(date, new Date())
  const color =
    tone === 'danger' ? token.colorError : tone === 'warning' ? token.colorWarning : undefined
  return (
    <PropPill
      label="Prazo"
      icon={Flag}
      muted={!date}
      tone={color}
      content={
        <Flex vertical gap={8}>
          <Flex gap={6}>
            <DatePicker
              autoFocus
              format={DATE_FORMAT}
              placeholder="Data"
              aria-label="Data do prazo"
              value={date ? dayjs(date) : null}
              onChange={(value) => void onChange({ due_date: toIso(value) })}
              style={{ flex: 1 }}
            />
            <TimePicker
              format="HH:mm"
              placeholder="Hora"
              aria-label="Hora do prazo"
              disabled={!date}
              value={clock(time)}
              onChange={(value) =>
                void onChange({ due_time: value ? value.format('HH:mm') : null })
              }
              style={{ width: 96 }}
            />
          </Flex>
          {date && (
            <Button
              type="link"
              size="small"
              style={LINK_BUTTON}
              onClick={() => void onChange({ due_date: null })}
            >
              Remover prazo
            </Button>
          )}
        </Flex>
      }
    >
      {date ? `Prazo ${formatDueShort(date, time)}` : 'Prazo'}
    </PropPill>
  )
}

export function EnergyPill({
  value,
  onChange
}: {
  value: EnergyLevel | null | undefined
  onChange: Change<EnergyLevel | null>
}): React.JSX.Element {
  return (
    <PropPill
      label="Energia"
      muted={!value}
      content={
        <Flex gap={4}>
          {ENERGIES.map((level) => (
            <Button
              key={level}
              autoFocus={level === (value ?? 'alto')}
              size="small"
              type={value === level ? 'primary' : 'default'}
              ghost={value === level}
              aria-pressed={value === level}
              style={{ flex: 1 }}
              onClick={() => void onChange(value === level ? null : level)}
            >
              <EnergyMeter level={level} tooltip={false} />
              {ENERGY_LABELS[level]}
            </Button>
          ))}
        </Flex>
      }
    >
      {value ? (
        <>
          <EnergyMeter level={value} tooltip={false} />
          Energia {ENERGY_LABELS[value].toLowerCase()}
        </>
      ) : (
        'Energia'
      )}
    </PropPill>
  )
}

export interface SchedulePatch {
  scheduled_date?: string | null
  scheduled_time?: string | null
  scheduled_end_time?: string | null
}

export function SchedulePill({
  date,
  start,
  end,
  onChange
}: {
  date: string | null | undefined
  start: string | null | undefined
  end: string | null | undefined
  onChange: Change<SchedulePatch>
}): React.JSX.Element {
  const { message } = App.useApp()
  const saveTimes = (from: Dayjs | null, to: Dayjs | null): void => {
    if (!from) {
      void onChange({ scheduled_time: null, scheduled_end_time: null })
      return
    }
    if (to && !to.isAfter(from, 'minute')) {
      message.error('O fim precisa ser depois do início.')
      to = null
    }
    void onChange({
      scheduled_time: from.format('HH:mm'),
      scheduled_end_time: to ? to.format('HH:mm') : null
    })
  }
  return (
    <PropPill
      label="Programado"
      icon={CalendarClock}
      muted={!date}
      content={
        <Flex vertical gap={8}>
          <DatePicker
            autoFocus
            format={DATE_FORMAT}
            placeholder="Data"
            aria-label="Data programada"
            value={date ? dayjs(date) : null}
            onChange={(value) => void onChange({ scheduled_date: toIso(value) })}
          />
          <TimePicker.RangePicker
            format="HH:mm"
            aria-label="Início e fim"
            placeholder={['Início', 'Fim']}
            allowEmpty={[true, true]}
            order={false}
            disabled={[!date, !date || !start]}
            value={start ? [clock(start), clock(end)] : null}
            onChange={(value) => saveTimes(value?.[0] ?? null, value?.[1] ?? null)}
          />
          {date && (
            <Button
              type="link"
              size="small"
              style={LINK_BUTTON}
              onClick={() => void onChange({ scheduled_date: null })}
            >
              Remover agendamento
            </Button>
          )}
        </Flex>
      }
    >
      {date ? `${formatDueShort(date, start)}${end ? `–${end}` : ''}` : 'Programado'}
    </PropPill>
  )
}

export function RecurrencePill({
  value,
  onChange
}: {
  value: string | null | undefined
  onChange: Change<string | null>
}): React.JSX.Element {
  return (
    <PropPill
      label="Recorrência"
      icon={Repeat}
      muted={!value}
      content={
        <Select
          autoFocus
          aria-label="Recorrência"
          value={recurrenceOptionValue(value)}
          options={RECURRENCE_OPTIONS}
          onChange={(next: string) => void onChange(next === 'none' ? null : next)}
          style={{ width: '100%' }}
        />
      }
    >
      {recurrenceLabel(value)}
    </PropPill>
  )
}

export function TagsPill({
  value,
  options,
  onChange
}: {
  value: string[]
  options: string[]
  onChange: Change<string[]>
}): React.JSX.Element {
  return (
    <PropPill
      label="Tags"
      icon={Tags}
      muted={!value.length}
      content={
        <Select
          autoFocus
          mode="tags"
          aria-label="Tags"
          placeholder="Adicionar ou criar tag"
          value={value}
          options={options.map((name) => ({ value: name, label: name }))}
          onChange={(names: string[]) => void onChange(names)}
          style={{ width: '100%' }}
        />
      }
    >
      {value.length ? value.map((name) => `#${name}`).join(' ') : 'Tags'}
    </PropPill>
  )
}

function LinkEditor({
  value,
  jiraKey,
  live,
  onSave
}: {
  value: string | null | undefined
  jiraKey: string | null | undefined
  live?: boolean
  onSave: Change<string | null>
}): React.JSX.Element {
  const { message } = App.useApp()
  const [draft, setDraft] = useState(value ?? '')
  useEffect(() => setDraft(value ?? ''), [value])
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
          onChange={(event) => {
            setDraft(event.target.value)
            if (live) void onSave(event.target.value.trim() || null)
          }}
          onBlur={live ? undefined : commit}
          onPressEnter={(event) => event.currentTarget.blur()}
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

export function LinkPill({
  value,
  jiraKey,
  live,
  onChange
}: {
  value: string | null | undefined
  jiraKey?: string | null
  live?: boolean
  onChange: Change<string | null>
}): React.JSX.Element {
  return (
    <PropPill
      label="Link externo"
      icon={Link}
      muted={!value}
      content={<LinkEditor value={value} jiraKey={jiraKey} live={live} onSave={onChange} />}
    >
      {value ? value.replace(/^https?:\/\//, '').split('/')[0] : 'Link'}
    </PropPill>
  )
}

export interface OptionalPill<K extends string> {
  key: K
  label: string
  icon: LucideIcon
}

export function AddPropertyButton<K extends string>({
  options,
  onAdd
}: {
  options: OptionalPill<K>[]
  onAdd: (key: K) => void
}): React.JSX.Element | null {
  if (!options.length) return null
  return (
    <Dropdown
      trigger={['click']}
      menu={{
        items: options.map((o) => ({ key: o.key, icon: <o.icon {...ICON} />, label: o.label })),
        onClick: ({ key }) => onAdd(key as K)
      }}
    >
      <button type="button" className="ct-prop muted" aria-label="Adicionar propriedade">
        <Plus {...ICON} />
        Propriedade
      </button>
    </Dropdown>
  )
}
