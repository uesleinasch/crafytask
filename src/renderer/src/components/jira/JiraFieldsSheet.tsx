import { useCallback, useEffect, useState, type SyntheticEvent } from 'react'
import { App, Button, Drawer, Flex, Spin, Tooltip, Typography } from 'antd'
import { ExternalLink, Loader2, RefreshCw } from 'lucide-react'
import { errorMessage } from '@renderer/components/settings/settingsStatus'
import { Field } from '@renderer/components/shell/SectionHeader'
import type { JiraField, JiraFieldInput, JiraIssueFields } from '@shared/types'
import { JiraFieldEditor } from './JiraFieldEditor'
import { JiraStatusSelect } from './JiraStatusSelect'

interface JiraFieldsSheetProps {
  taskId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

const stop = (event: SyntheticEvent): void => event.stopPropagation()

function FieldLabel({ field, saving }: { field: JiraField; saving: boolean }): React.JSX.Element {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
      {field.name}
      {field.required && <span aria-label="obrigatório">*</span>}
      {saving && <Loader2 size={11} className="animate-spin" aria-label="Salvando" />}
    </span>
  )
}

export function JiraFieldsSheet({
  taskId,
  open,
  onOpenChange
}: JiraFieldsSheetProps): React.JSX.Element {
  const { message } = App.useApp()
  const [issue, setIssue] = useState<JiraIssueFields | null>(null)
  const [loading, setLoading] = useState(false)
  const [savingField, setSavingField] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  const load = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      setIssue(await window.api.jiraGetFields(taskId))
    } catch (error) {
      message.error(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [taskId, message])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  async function save(fieldId: string, value: JiraFieldInput): Promise<void> {
    setSavingField(fieldId)
    try {
      setIssue(await window.api.jiraUpdateField(taskId, fieldId, value))
    } catch (error) {
      message.error(errorMessage(error))
      setRevision((r) => r + 1)
    } finally {
      setSavingField(null)
    }
  }

  return (
    <div onClick={stop} onContextMenu={stop} style={{ display: 'contents' }}>
      <Drawer
        open={open}
        onClose={() => onOpenChange(false)}
        size={380}
        title={issue ? `Campos do Jira · ${issue.key}` : 'Campos do Jira'}
        extra={
          <Flex gap={4}>
            {issue && (
              <Tooltip title="Abrir no Jira">
                <Button
                  type="text"
                  aria-label="Abrir no Jira"
                  icon={<ExternalLink size={14} strokeWidth={1.75} />}
                  onClick={() => window.api.appOpenExternal(issue.url).catch(() => undefined)}
                />
              </Tooltip>
            )}
            <Tooltip title="Recarregar">
              <Button
                type="text"
                aria-label="Recarregar"
                loading={loading}
                icon={<RefreshCw size={14} strokeWidth={1.75} />}
                onClick={() => void load()}
              />
            </Tooltip>
          </Flex>
        }
      >
        {!issue ? (
          <Flex align="center" gap={8}>
            {loading && <Spin size="small" />}
            <Typography.Text type="secondary">
              {loading ? 'Carregando campos…' : 'Não foi possível carregar a issue.'}
            </Typography.Text>
          </Flex>
        ) : (
          <Flex vertical gap={12}>
            <Field label="Status">
              <JiraStatusSelect
                taskId={taskId}
                status={issue.statusName}
                onChanged={() => void load()}
                style={{ width: '100%' }}
              />
            </Field>
            {issue.fields.map((field) => (
              <Field
                key={field.id}
                label={<FieldLabel field={field} saving={savingField === field.id} />}
                align={field.kind === 'text' ? 'start' : 'center'}
              >
                <JiraFieldEditor
                  key={`${field.id}:${revision}:${JSON.stringify(field.value)}`}
                  field={field}
                  taskId={taskId}
                  me={issue.me}
                  saving={savingField !== null}
                  onSave={(value) => save(field.id, value)}
                />
              </Field>
            ))}
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Campos lidos do editmeta da issue; cada um grava na hora no Jira.
            </Typography.Text>
          </Flex>
        )}
      </Drawer>
    </div>
  )
}
