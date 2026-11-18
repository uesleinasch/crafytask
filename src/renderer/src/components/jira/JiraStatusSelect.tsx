import { useEffect, useState, type CSSProperties } from 'react'
import { App, Select } from 'antd'
import type { JiraTransitionOption } from '@shared/types'
import { errorMessage } from '@renderer/components/settings/settingsStatus'

interface JiraStatusSelectProps {
  taskId: number
  status: string | null | undefined
  style?: CSSProperties
  onChanged?: (status: string) => void
}

export function JiraStatusSelect({
  taskId,
  status,
  style,
  onChanged
}: JiraStatusSelectProps): React.JSX.Element {
  const { message } = App.useApp()
  const [current, setCurrent] = useState(status ?? '')
  const [transitions, setTransitions] = useState<JiraTransitionOption[] | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => setCurrent(status ?? ''), [status])

  const load = async (open: boolean): Promise<void> => {
    if (!open) return
    setTransitions(null)
    try {
      setTransitions(await window.api.jiraListTransitions(taskId))
    } catch (error) {
      setTransitions([])
      message.error(errorMessage(error))
    }
  }

  const apply = async (transitionId: string): Promise<void> => {
    const target = transitions?.find((t) => t.id === transitionId)
    if (!target) return
    setSaving(true)
    try {
      await window.api.jiraTransition(taskId, transitionId)
      setCurrent(target.name)
      onChanged?.(target.name)
      message.success(`Jira: ${target.name}`)
    } catch (error) {
      message.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Select
      aria-label="Status no Jira"
      value={current || null}
      placeholder="Sem status"
      loading={saving}
      disabled={saving}
      onOpenChange={(open) => void load(open)}
      onChange={(id: string) => void apply(id)}
      notFoundContent={transitions === null ? 'Carregando transições…' : 'Nenhuma transição'}
      style={{ width: '100%', ...style }}
      options={(transitions ?? []).map((t) => ({ value: t.id, label: t.name }))}
    />
  )
}
