import { useEffect, useState } from 'react'
import { App, Flex, Input, Modal, Segmented, Select } from 'antd'
import type { Area, GoalHorizon } from '@shared/types'
import { errorMessage } from '@renderer/components/settings/settingsStatus'
import type { GoalDraft } from './horizonDrafts'
import { GOAL_HORIZONS } from './horizonLevels'

interface GoalModalProps {
  draft: GoalDraft | null
  areas: Area[]
  onClose: () => void
  onSaved: () => void
}

export function GoalModal({ draft, areas, onClose, onSaved }: GoalModalProps): React.JSX.Element {
  const { message } = App.useApp()
  const [value, setValue] = useState<GoalDraft | null>(draft)
  const [saving, setSaving] = useState(false)
  useEffect(() => setValue(draft), [draft])

  async function save(): Promise<void> {
    if (!value) return
    const name = value.name.trim()
    if (!name) {
      message.error('Dê um nome à meta.')
      return
    }
    setSaving(true)
    try {
      const description = value.description.trim()
      if (value.id) {
        await window.api.updateGoal(value.id, {
          name,
          horizon: value.horizon,
          area_id: value.areaId,
          description
        })
        message.success('Atualizada')
      } else {
        await window.api.createGoal({
          name,
          horizon: value.horizon,
          area_id: value.areaId ?? undefined,
          description: description || undefined
        })
        message.success(`Criada em H${value.horizon}`)
      }
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
      title={draft?.id ? 'Editar' : 'Nova meta, visão ou propósito'}
      okText="Salvar"
      cancelText="Cancelar"
      onOk={() => void save()}
      onCancel={onClose}
      confirmLoading={saving}
      destroyOnHidden
    >
      {value && (
        <Flex vertical gap={12}>
          <Segmented<GoalHorizon>
            block
            value={value.horizon}
            onChange={(horizon) => setValue({ ...value, horizon })}
            options={GOAL_HORIZONS.map((lv) => ({
              value: lv.h,
              label: `${lv.emoji} H${lv.h} ${lv.label}`
            }))}
            aria-label="Horizonte"
          />
          <Input
            autoFocus
            placeholder="Ex.: Tornar-me líder técnico sênior"
            value={value.name}
            onChange={(e) => setValue({ ...value, name: e.target.value })}
            aria-label="Nome"
          />
          <Select
            allowClear
            placeholder="Sem área (vale para todas)"
            value={value.areaId ?? undefined}
            onChange={(areaId?: number) => setValue({ ...value, areaId: areaId ?? null })}
            options={areas.map((a) => ({ value: a.id, label: `${a.icon} ${a.name}` }))}
            aria-label="Área de foco"
          />
          <Input.TextArea
            placeholder="Descrição (quebras de linha são mantidas)"
            autoSize={{ minRows: 3 }}
            value={value.description}
            onChange={(e) => setValue({ ...value, description: e.target.value })}
            aria-label="Descrição"
          />
        </Flex>
      )}
    </Modal>
  )
}
