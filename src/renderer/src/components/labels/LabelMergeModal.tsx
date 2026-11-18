import { useEffect, useState } from 'react'
import { App, Flex, Modal, Select, Typography, theme } from 'antd'
import { errorMessage } from '@renderer/components/settings/settingsStatus'
import { labelDisplay, type Label } from './labels'

interface LabelMergeModalProps {
  source: Label | null
  labels: Label[]
  onClose: () => void
  onMerge: (source: Label, target: Label) => Promise<number>
}

const plural = (n: number): string => `${n} tarefa${n === 1 ? '' : 's'}`

export function LabelMergeModal({
  source,
  labels,
  onClose,
  onMerge
}: LabelMergeModalProps): React.JSX.Element {
  const { token } = theme.useToken()
  const { message } = App.useApp()
  const [targetId, setTargetId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  useEffect(() => setTargetId(null), [source])

  const target = labels.find((label) => label.id === targetId) ?? null

  async function merge(): Promise<void> {
    if (!source || !target) return
    setSaving(true)
    try {
      const affected = await onMerge(source, target)
      message.success(
        `Mesclado em ${labelDisplay(target.kind, target.name)}: ${plural(affected)} atualizada${affected === 1 ? '' : 's'}`
      )
      onClose()
    } catch (error) {
      message.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const sourceName = source ? labelDisplay(source.kind, source.name) : ''

  return (
    <Modal
      open={source !== null}
      title={`Mesclar ${sourceName}`}
      okText="Mesclar"
      cancelText="Cancelar"
      okButtonProps={{ disabled: !target }}
      confirmLoading={saving}
      onOk={() => void merge()}
      onCancel={onClose}
      destroyOnHidden
    >
      {source && (
        <Flex vertical gap={12}>
          <Typography.Text>
            {source.task_count > 0 ? (
              <>
                As <strong>{plural(source.task_count)}</strong> com {sourceName} passam para o
                destino, e <strong>{sourceName}</strong> deixa de existir.
              </>
            ) : (
              <>
                <strong>{sourceName}</strong> não está em nenhuma tarefa e deixa de existir.
              </>
            )}
          </Typography.Text>
          <Select
            aria-label="Destino"
            placeholder="Mesclar em…"
            showSearch={{ optionFilterProp: 'title' }}
            value={targetId}
            onChange={setTargetId}
            options={labels
              .filter((label) => label.id !== source.id)
              .map((label) => ({
                value: label.id,
                title: label.name,
                label: (
                  <Flex justify="space-between" gap={8}>
                    <span>
                      {label.icon ? `${label.icon} ` : ''}
                      {labelDisplay(label.kind, label.name)}
                    </span>
                    <span
                      style={{
                        fontFamily: token.fontFamilyCode,
                        fontVariantNumeric: 'tabular-nums',
                        color: token.colorTextTertiary
                      }}
                    >
                      {label.task_count}
                    </span>
                  </Flex>
                )
              }))}
          />
        </Flex>
      )}
    </Modal>
  )
}
