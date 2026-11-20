import { useEffect, useRef, useState } from 'react'
import { Button, DatePicker, Flex, Input, InputNumber, Select, Typography } from 'antd'
import dayjs from 'dayjs'
import type { JiraField, JiraFieldInput, JiraUser } from '@shared/types'

interface EditorProps {
  field: JiraField
  taskId: number
  me: JiraUser | null
  saving: boolean
  onSave: (value: JiraFieldInput) => void
}

const FULL = { width: '100%' }

function TextEditor({
  initial,
  multiline,
  saving,
  onCommit
}: {
  initial: string
  multiline: boolean
  saving: boolean
  onCommit: (value: string) => void
}): React.JSX.Element {
  const [draft, setDraft] = useState(initial)
  useEffect(() => setDraft(initial), [initial])
  const commit = (): void => {
    if (draft !== initial) onCommit(draft)
  }
  if (multiline) {
    return (
      <Input.TextArea
        value={draft}
        disabled={saving}
        autoSize={{ minRows: 3, maxRows: 10 }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
      />
    )
  }
  return (
    <Input
      value={draft}
      disabled={saving}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') setDraft(initial)
      }}
    />
  )
}

function NumberEditor({
  initial,
  saving,
  onCommit
}: {
  initial: number | null
  saving: boolean
  onCommit: (value: number | null) => void
}): React.JSX.Element {
  const [draft, setDraft] = useState<number | null>(initial)
  useEffect(() => setDraft(initial), [initial])
  const commit = (): void => {
    if (draft !== initial) onCommit(draft)
  }
  return (
    <InputNumber
      value={draft}
      disabled={saving}
      style={FULL}
      onChange={(value) => setDraft(typeof value === 'number' ? value : null)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') setDraft(initial)
      }}
    />
  )
}

function normalizeLabels(labels: string[]): string[] {
  const clean = labels.map((label) => label.trim().replace(/\s+/g, '_')).filter(Boolean)
  return [...new Set(clean)]
}

function UserEditor({
  field,
  value,
  taskId,
  me,
  saving,
  onSave
}: {
  field: JiraField
  value: JiraUser | null
  taskId: number
  me: JiraUser | null
  saving: boolean
  onSave: (accountId: string | null) => void
}): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<JiraUser[] | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    if (query.trim().length < 2) {
      setResults(null)
      return
    }
    timer.current = setTimeout(() => {
      window.api
        .jiraSearchUsers(taskId, field.id, query.trim())
        .then(setResults)
        .catch(() => setResults([]))
    }, 300)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [query, taskId, field.id])

  const known = new Map<string, string>()
  for (const user of [value, ...(results ?? [])]) {
    if (user) known.set(user.accountId, user.displayName)
  }
  const options = [...known].map(([accountId, displayName]) => ({
    value: accountId,
    label: displayName
  }))

  const pick = (accountId: string | null): void => {
    setQuery('')
    setResults(null)
    onSave(accountId)
  }

  return (
    <Flex vertical gap={4}>
      <Select
        showSearch={{ filterOption: false, onSearch: setQuery, searchValue: query }}
        value={value?.accountId ?? null}
        placeholder="Ninguém"
        allowClear={!field.required}
        disabled={saving}
        options={options}
        style={FULL}
        notFoundContent={
          query.trim().length < 2
            ? 'Digite ao menos 2 letras'
            : results === null
              ? 'Buscando…'
              : 'Ninguém encontrado'
        }
        onChange={(accountId) => pick(accountId ?? null)}
      />
      {me && value?.accountId !== me.accountId && (
        <Button
          type="link"
          size="small"
          disabled={saving}
          onClick={() => pick(me.accountId)}
          style={{ alignSelf: 'start', paddingInline: 0 }}
        >
          Atribuir a mim
        </Button>
      )}
    </Flex>
  )
}

export function JiraFieldEditor({
  field,
  taskId,
  me,
  saving,
  onSave
}: EditorProps): React.JSX.Element {
  switch (field.kind) {
    case 'string':
    case 'text':
      return (
        <TextEditor
          initial={field.value ?? ''}
          multiline={field.kind === 'text'}
          saving={saving}
          onCommit={onSave}
        />
      )
    case 'number':
      return <NumberEditor initial={field.value} saving={saving} onCommit={onSave} />
    case 'date':
      return (
        <DatePicker
          format="DD/MM/YYYY"
          value={field.value ? dayjs(field.value) : null}
          disabled={saving}
          style={FULL}
          onChange={(value) => onSave(value ? value.format('YYYY-MM-DD') : null)}
        />
      )
    case 'datetime':
      return (
        <DatePicker
          showTime={{ format: 'HH:mm' }}
          format="DD/MM/YYYY HH:mm"
          value={field.value ? dayjs(field.value) : null}
          disabled={saving}
          style={FULL}
          onChange={(value) => onSave(value ? value.format('YYYY-MM-DDTHH:mm') : null)}
        />
      )
    case 'select':
    case 'sprint':
      return (
        <Select
          showSearch={{ optionFilterProp: 'label' }}
          value={field.value === null ? null : String(field.value)}
          placeholder="Nenhum"
          allowClear={!field.required}
          disabled={saving}
          options={field.options.map((option) => ({ value: option.id, label: option.label }))}
          style={FULL}
          onChange={(id) => onSave(id ?? null)}
        />
      )
    case 'multiselect':
      return (
        <Select
          mode="multiple"
          showSearch={{ optionFilterProp: 'label' }}
          value={field.value}
          placeholder={field.options.length === 0 ? 'Sem opções' : 'Adicionar opção…'}
          disabled={saving}
          options={field.options.map((option) => ({ value: option.id, label: option.label }))}
          style={FULL}
          onChange={(ids: string[]) => onSave(ids)}
        />
      )
    case 'labels':
      return (
        <Select
          mode="tags"
          value={field.value}
          placeholder="Adicionar…"
          notFoundContent={null}
          disabled={saving}
          style={FULL}
          onChange={(labels: string[]) => onSave(normalizeLabels(labels))}
        />
      )
    case 'user':
      return (
        <UserEditor
          field={field}
          value={field.value}
          taskId={taskId}
          me={me}
          saving={saving}
          onSave={onSave}
        />
      )
    case 'readonly':
      return <Typography.Text type="secondary">{field.value || '—'}</Typography.Text>
  }
}
