import { useEffect, useState } from 'react'
import { App, Flex, Input, Modal, Typography, theme } from 'antd'
import { errorMessage } from '@renderer/components/settings/settingsStatus'
import { USER_COLORS } from '@renderer/theme/semantic'
import { LabelMark } from './LabelMark'
import {
  CONTEXT_EMOJIS,
  labelDisplay,
  labelNameTaken,
  normalizeLabelName,
  type Label,
  type LabelDraft,
  type LabelKind
} from './labels'

interface LabelEditModalProps {
  kind: LabelKind
  draft: LabelDraft | null
  labels: Label[]
  onClose: () => void
  onSave: (draft: LabelDraft, name: string) => Promise<void>
}

function Caption({ children }: { children: string }): React.JSX.Element {
  return (
    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
      {children}
    </Typography.Text>
  )
}

export function LabelEditModal({
  kind,
  draft: initial,
  labels,
  onClose,
  onSave
}: LabelEditModalProps): React.JSX.Element {
  const { token } = theme.useToken()
  const { message } = App.useApp()
  const [draft, setDraft] = useState<LabelDraft | null>(initial)
  const [saving, setSaving] = useState(false)
  useEffect(() => setDraft(initial), [initial])

  const isContext = kind === 'context'
  const original = draft?.original ?? null
  const noun = isContext ? 'um contexto' : 'uma tag'

  async function save(): Promise<void> {
    if (!draft) return
    const name = normalizeLabelName(kind, draft.name)
    if (!name) {
      message.error('Dê um nome.')
      return
    }
    if (labelNameTaken(labels, name, original?.id)) {
      message.error(`Já existe ${noun} com esse nome. Use Mesclar.`)
      return
    }
    setSaving(true)
    try {
      await onSave(draft, name)
      onClose()
    } catch (error) {
      message.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const previewName =
    normalizeLabelName(kind, draft?.name ?? '') || (isContext ? '@contexto' : 'tag')

  return (
    <Modal
      open={initial !== null}
      title={
        original
          ? `Editar ${labelDisplay(kind, original.name)}`
          : isContext
            ? 'Novo contexto'
            : 'Nova tag'
      }
      okText="Salvar"
      cancelText="Cancelar"
      confirmLoading={saving}
      onOk={() => void save()}
      onCancel={onClose}
      destroyOnHidden
    >
      {draft && (
        <Flex vertical gap={14}>
          {original && original.task_count > 0 && (
            <Typography.Text type="secondary">
              {original.task_count === 1
                ? 'O novo nome vale para a tarefa que já usa '
                : `O novo nome vale para as ${original.task_count} tarefas que já usam `}
              {isContext ? 'este contexto' : 'esta tag'}.
            </Typography.Text>
          )}
          <Input
            autoFocus
            aria-label="Nome"
            placeholder={isContext ? '@computador' : 'urgente'}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            onPressEnter={() => void save()}
          />
          {isContext && (
            <div>
              <Caption>Ícone</Caption>
              <Flex gap={6} wrap style={{ marginTop: 6 }}>
                {CONTEXT_EMOJIS.map((emoji) => {
                  const on = draft.icon === emoji
                  return (
                    <button
                      key={emoji}
                      type="button"
                      aria-pressed={on}
                      aria-label={`Ícone ${emoji}`}
                      onClick={() => setDraft({ ...draft, icon: emoji })}
                      style={{
                        width: 36,
                        height: 36,
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 18,
                        cursor: 'pointer',
                        borderRadius: token.borderRadius,
                        border: `1px solid ${on ? token.colorPrimary : token.colorBorder}`,
                        background: on ? token.colorPrimaryBg : token.colorBgContainer
                      }}
                    >
                      {emoji}
                    </button>
                  )
                })}
              </Flex>
            </div>
          )}
          <div>
            <Caption>Cor</Caption>
            <Flex gap={8} wrap style={{ marginTop: 6 }}>
              {USER_COLORS.map((color) => {
                const on = draft.color.toLowerCase() === color.toLowerCase()
                return (
                  <button
                    key={color}
                    type="button"
                    aria-pressed={on}
                    aria-label={`Cor ${color}`}
                    onClick={() => setDraft({ ...draft, color })}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      cursor: 'pointer',
                      background: color,
                      border: 'none',
                      boxShadow: on
                        ? `0 0 0 2px ${token.colorBgElevated}, 0 0 0 4px ${token.colorText}`
                        : undefined
                    }}
                  />
                )
              })}
            </Flex>
          </div>
          <div
            style={{
              padding: 12,
              borderRadius: token.borderRadius,
              border: `1px dashed ${token.colorBorder}`,
              background: token.colorBgLayout
            }}
          >
            <Typography.Text
              type="secondary"
              style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase' }}
            >
              Prévia
            </Typography.Text>
            <Flex align="center" gap={12} style={{ marginTop: 6 }}>
              <LabelMark kind={kind} color={draft.color} icon={draft.icon} />
              <Typography.Text strong>{labelDisplay(kind, previewName)}</Typography.Text>
            </Flex>
          </div>
        </Flex>
      )}
    </Modal>
  )
}
