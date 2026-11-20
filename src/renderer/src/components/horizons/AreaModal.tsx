import { useEffect, useState } from 'react'
import { App, Flex, Input, Modal, Typography } from 'antd'
import { errorMessage } from '@renderer/components/settings/settingsStatus'
import type { AreaDraft } from './horizonDrafts'
import { AREA_ICONS } from './horizonLevels'

interface AreaModalProps {
  draft: AreaDraft | null
  onClose: () => void
  onSaved: () => void
}

export function AreaModal({ draft, onClose, onSaved }: AreaModalProps): React.JSX.Element {
  const { message } = App.useApp()
  const [value, setValue] = useState<AreaDraft | null>(draft)
  const [saving, setSaving] = useState(false)
  useEffect(() => setValue(draft), [draft])

  async function save(): Promise<void> {
    if (!value) return
    const name = value.name.trim()
    if (!name) {
      message.error('Dê um nome à área.')
      return
    }
    setSaving(true)
    try {
      const data = { name, icon: value.icon, description: value.description.trim() }
      if (value.id) await window.api.updateArea(value.id, data)
      else await window.api.createArea(data)
      message.success(value.id ? 'Área atualizada' : 'Área criada')
      onSaved()
    } catch (error) {
      message.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={!!draft}
      title={draft?.id ? 'Editar área de foco' : 'Nova área de foco'}
      okText="Salvar"
      cancelText="Cancelar"
      onOk={() => void save()}
      onCancel={onClose}
      confirmLoading={saving}
      destroyOnHidden
    >
      {value && (
        <Flex vertical gap={12}>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Ícone
            </Typography.Text>
            <Flex gap={6} wrap role="group" aria-label="Ícone" style={{ marginTop: 6 }}>
              {AREA_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  aria-pressed={value.icon === icon}
                  aria-label={`Ícone ${icon}`}
                  className={value.icon === icon ? 'ct-emoji-opt on' : 'ct-emoji-opt'}
                  onClick={() => setValue({ ...value, icon })}
                >
                  {icon}
                </button>
              ))}
            </Flex>
          </div>
          <Input
            autoFocus
            placeholder="Ex.: Carreira, Saúde, Família"
            value={value.name}
            onChange={(e) => setValue({ ...value, name: e.target.value })}
            onPressEnter={() => void save()}
            aria-label="Nome"
          />
          <Input.TextArea
            placeholder="Descrição"
            autoSize={{ minRows: 2 }}
            value={value.description}
            onChange={(e) => setValue({ ...value, description: e.target.value })}
            aria-label="Descrição"
          />
        </Flex>
      )}
    </Modal>
  )
}
