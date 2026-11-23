import { useEffect, useState } from 'react'
import { App, Form, Input, Modal, Select } from 'antd'
import type { Area, CreateProjectInput, Goal, Project } from '@shared/types'
import { errorMessage } from '@renderer/components/settings/settingsStatus'
import { USER_COLORS } from '@renderer/theme/semantic'
import { ColorSwatches } from '@renderer/components/color/ColorSwatches'
import { GOAL_FIELD_HINT, NO_GOAL, goalSelectOptions } from './projectGoals'

interface NewProjectModalProps {
  open: boolean
  areas: Area[]
  goals: Goal[]
  initial?: Pick<CreateProjectInput, 'area_id' | 'goal_id'>
  onCancel: () => void
  onCreated: (project: Project) => void
}

const EMPTY: CreateProjectInput = { name: '', outcome: '', description: '', color: USER_COLORS[6] }

export function NewProjectModal({
  open,
  areas,
  goals,
  initial,
  onCancel,
  onCreated
}: NewProjectModalProps): React.JSX.Element {
  const { message } = App.useApp()
  const [draft, setDraft] = useState<CreateProjectInput>(EMPTY)
  const initialArea = initial?.area_id
  const initialGoal = initial?.goal_id
  useEffect(() => {
    if (open) setDraft({ ...EMPTY, area_id: initialArea, goal_id: initialGoal })
  }, [open, initialArea, initialGoal])
  const [saving, setSaving] = useState(false)
  const set = (patch: Partial<CreateProjectInput>): void => setDraft((d) => ({ ...d, ...patch }))

  async function submit(): Promise<void> {
    const name = draft.name.trim()
    if (!name) return
    setSaving(true)
    try {
      const project = await window.api.createProject({
        ...draft,
        name,
        outcome: draft.outcome?.trim() || undefined,
        description: draft.description?.trim() || undefined
      })
      setDraft(EMPTY)
      onCreated(project)
    } catch (error) {
      message.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title="Novo projeto"
      okText="Criar projeto"
      cancelText="Cancelar"
      onOk={() => void submit()}
      onCancel={() => {
        setDraft(EMPTY)
        onCancel()
      }}
      confirmLoading={saving}
      okButtonProps={{ disabled: !draft.name.trim() }}
      destroyOnHidden
    >
      <Form layout="vertical" requiredMark={false} onFinish={() => void submit()}>
        <Form.Item label="Nome" required>
          <Input
            autoFocus
            value={draft.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="Ex.: Redesenhar o módulo de autenticação"
            onPressEnter={() => void submit()}
          />
        </Form.Item>
        <Form.Item
          label="Resultado desejado"
          extra="Como fica o mundo quando o projeto estiver pronto?"
        >
          <Input.TextArea
            autoSize={{ minRows: 2, maxRows: 4 }}
            value={draft.outcome}
            onChange={(e) => set({ outcome: e.target.value })}
          />
        </Form.Item>
        <Form.Item label="Descrição">
          <Input.TextArea
            autoSize={{ minRows: 2, maxRows: 4 }}
            value={draft.description}
            onChange={(e) => set({ description: e.target.value })}
          />
        </Form.Item>
        <Form.Item label="Área de foco">
          <Select
            allowClear
            placeholder="Sem área"
            value={draft.area_id}
            onChange={(area_id?: number) => set({ area_id })}
            options={areas.map((a) => ({ value: a.id, label: a.name }))}
          />
        </Form.Item>
        <Form.Item label="Meta" extra={GOAL_FIELD_HINT}>
          <Select
            allowClear
            placeholder={NO_GOAL}
            value={draft.goal_id}
            onChange={(goal_id?: number) => set({ goal_id })}
            options={goalSelectOptions(goals, initialGoal)}
          />
        </Form.Item>
        <Form.Item label="Cor" style={{ marginBottom: 0 }}>
          <ColorSwatches value={draft.color ?? ''} onChange={(color) => set({ color })} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
