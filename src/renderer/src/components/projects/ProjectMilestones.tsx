import { useEffect, useState } from 'react'
import {
  App,
  Button,
  Card,
  DatePicker,
  Dropdown,
  Flex,
  Form,
  Input,
  Modal,
  Popconfirm,
  Progress,
  Segmented,
  Tag,
  Timeline,
  Tooltip,
  Typography,
  theme,
  type MenuProps
} from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { Check, CircleCheck, Ellipsis, Milestone, Pencil, Plus, Trash2, Undo2 } from 'lucide-react'
import type { MilestoneKind, ProjectMilestone } from '@shared/types'
import { errorMessage } from '@renderer/components/settings/settingsStatus'
import { STATUS_COLORS } from '@renderer/theme/semantic'
import { useThemeSettings } from '@renderer/theme/themeSettings'
import { MILESTONE_KIND_ICON } from './milestoneIcons'
import {
  MILESTONE_KIND_LABEL,
  MILESTONE_KIND_ORDER,
  milestoneDue,
  nextOpenMilestone,
  readyToClose,
  takenKinds
} from './milestoneView'

const { Text } = Typography

const ICON = { size: 14, strokeWidth: 1.75, 'aria-hidden': true } as const

interface MilestoneFormValues {
  name: string
  kind: MilestoneKind
  due: Dayjs | null
  description: string
}

interface MilestoneModalProps {
  open: boolean
  projectId: number
  editing: ProjectMilestone | null
  milestones: ProjectMilestone[]
  onClose: () => void
  onChanged: () => void
}

function MilestoneModal({
  open,
  projectId,
  editing,
  milestones,
  onClose,
  onChanged
}: MilestoneModalProps): React.JSX.Element {
  const { message } = App.useApp()
  const [form] = Form.useForm<MilestoneFormValues>()
  const [saving, setSaving] = useState(false)
  const taken = takenKinds(milestones, editing?.id)

  useEffect(() => {
    if (!open) return
    form.setFieldsValue({
      name: editing?.name ?? '',
      kind: editing?.kind ?? 'desenvolvimento',
      due: editing?.due_date ? dayjs(editing.due_date) : null,
      description: editing?.description ?? ''
    })
  }, [open, editing, form])

  const submit = async (): Promise<void> => {
    const values = await form.validateFields()
    const fields = {
      name: values.name.trim(),
      kind: values.kind,
      due_date: values.due ? values.due.format('YYYY-MM-DD') : null,
      description: values.description?.trim() || null
    }
    setSaving(true)
    try {
      if (editing) await window.api.updateMilestone(editing.id, fields)
      else await window.api.createMilestone({ project_id: projectId, ...fields })
      message.success(editing ? 'Marco salvo' : 'Marco criado')
      onChanged()
      onClose()
    } catch (error) {
      message.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (): Promise<void> => {
    if (!editing) return
    try {
      await window.api.deleteMilestone(editing.id)
      message.success('Marco excluído')
      onChanged()
      onClose()
    } catch (error) {
      message.error(errorMessage(error))
    }
  }

  return (
    <Modal
      open={open}
      title={editing ? 'Editar marco' : 'Novo marco'}
      onCancel={onClose}
      destroyOnHidden
      footer={
        <Flex gap={8} align="center">
          {editing && (
            <Popconfirm
              title="Excluir este marco?"
              description="As tarefas dele continuam no projeto, sem marco."
              okText="Excluir"
              okButtonProps={{ danger: true }}
              cancelText="Cancelar"
              onConfirm={() => void remove()}
            >
              <Button danger type="text" icon={<Trash2 {...ICON} />}>
                Excluir
              </Button>
            </Popconfirm>
          )}
          <div style={{ flex: 1 }} />
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="primary" loading={saving} onClick={() => void submit()}>
            {editing ? 'Salvar' : 'Criar marco'}
          </Button>
        </Flex>
      }
    >
      <Form form={form} layout="vertical" requiredMark={false} style={{ marginTop: 12 }}>
        <Form.Item
          name="name"
          label="Nome"
          rules={[{ required: true, whitespace: true, message: 'Dê um nome ao marco' }]}
        >
          <Input autoFocus placeholder="Ex.: Entregas do dia 10" maxLength={120} />
        </Form.Item>
        <Form.Item
          name="kind"
          label="Tipo"
          extra="Início abre o projeto, Fim fecha: no máximo um de cada. Desenvolvimento marca as entregas do meio."
        >
          <Segmented
            block
            options={MILESTONE_KIND_ORDER.map((kind) => {
              const KindIcon = MILESTONE_KIND_ICON[kind]
              const blocked = taken.includes(kind)
              return {
                value: kind,
                disabled: blocked,
                label: (
                  <Tooltip
                    title={
                      blocked
                        ? `O projeto já tem um marco de ${MILESTONE_KIND_LABEL[kind].toLowerCase()}`
                        : undefined
                    }
                  >
                    <Flex gap={6} align="center" justify="center">
                      <KindIcon {...ICON} />
                      {MILESTONE_KIND_LABEL[kind]}
                    </Flex>
                  </Tooltip>
                )
              }
            })}
          />
        </Form.Item>
        <Form.Item name="due" label="Data">
          <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="Sem data" />
        </Form.Item>
        <Form.Item
          name="description"
          label="O que fica pronto neste marco"
          style={{ marginBottom: 0 }}
        >
          <Input.TextArea
            autoSize={{ minRows: 2, maxRows: 5 }}
            maxLength={2000}
            placeholder="Entregáveis, critério de pronto…"
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

interface ProjectMilestonesProps {
  projectId: number
  milestones: ProjectMilestone[]
  today: string
  onChanged: () => void
}

export function ProjectMilestones({
  projectId,
  milestones,
  today,
  onChanged
}: ProjectMilestonesProps): React.JSX.Element {
  const { token } = theme.useToken()
  const { mode } = useThemeSettings()
  const { message, modal: confirmModal } = App.useApp()
  const [modal, setModal] = useState<{ editing: ProjectMilestone | null } | null>(null)
  const next = nextOpenMilestone(milestones)
  const doneCount = milestones.filter((milestone) => milestone.done_at).length
  const doneColor = STATUS_COLORS.finalizada[mode].fg
  const mono: React.CSSProperties = {
    fontFamily: token.fontFamilyCode,
    fontVariantNumeric: 'tabular-nums',
    fontSize: 12
  }

  const toggleDone = async (milestone: ProjectMilestone): Promise<void> => {
    try {
      await window.api.setMilestoneDone(milestone.id, !milestone.done_at)
      message.success(milestone.done_at ? 'Marco reaberto' : 'Marco concluído')
      onChanged()
    } catch (error) {
      message.error(errorMessage(error))
    }
  }

  const confirmDelete = (milestone: ProjectMilestone): void => {
    confirmModal.confirm({
      title: `Excluir o marco ${milestone.name}?`,
      content: 'As tarefas dele continuam no projeto, sem marco.',
      okText: 'Excluir',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: () =>
        window.api
          .deleteMilestone(milestone.id)
          .then(() => {
            message.success('Marco excluído')
            onChanged()
          })
          .catch((error: unknown) => {
            message.error(errorMessage(error))
          })
    })
  }

  const actionsMenu = (milestone: ProjectMilestone): MenuProps => ({
    items: [
      { key: 'edit', label: 'Editar marco', icon: <Pencil {...ICON} /> },
      { type: 'divider' },
      { key: 'delete', label: 'Excluir marco', danger: true, icon: <Trash2 {...ICON} /> }
    ],
    onClick: ({ key }) => {
      if (key === 'edit') setModal({ editing: milestone })
      else if (key === 'delete') confirmDelete(milestone)
    }
  })

  const item = (
    milestone: ProjectMilestone
  ): { key: number; icon: React.JSX.Element; content: React.JSX.Element } => {
    const KindIcon = MILESTONE_KIND_ICON[milestone.kind]
    const due = milestoneDue(milestone, today)
    const toneColor =
      due?.tone === 'overdue'
        ? token.colorError
        : due?.tone === 'soon'
          ? token.colorWarning
          : token.colorTextTertiary
    const isNext = milestone.id === next?.id
    const pct = milestone.task_count
      ? Math.round((milestone.done_task_count / milestone.task_count) * 100)
      : 0
    const doneLabel = milestone.done_at ? 'Reabrir marco' : 'Concluir marco'
    return {
      key: milestone.id,
      icon: milestone.done_at ? (
        <CircleCheck {...ICON} color={doneColor} />
      ) : (
        <KindIcon {...ICON} color={isNext ? token.colorPrimary : toneColor} />
      ),
      content: (
        <Flex vertical gap={4} style={{ minWidth: 0 }}>
          <Flex gap={6} align="center">
            <Button
              type="link"
              size="small"
              onClick={() => setModal({ editing: milestone })}
              style={{
                flex: '1 1 auto',
                minWidth: 0,
                padding: 0,
                height: 'auto',
                justifyContent: 'flex-start',
                color: milestone.done_at ? token.colorTextTertiary : token.colorText,
                fontWeight: 500,
                textDecoration: milestone.done_at ? 'line-through' : undefined
              }}
            >
              <span className="truncate">{milestone.name}</span>
            </Button>
            <Tooltip title={doneLabel}>
              <Button
                type="text"
                size="small"
                aria-label={doneLabel}
                icon={milestone.done_at ? <Undo2 {...ICON} /> : <Check {...ICON} />}
                onClick={() => void toggleDone(milestone)}
              />
            </Tooltip>
            <Dropdown menu={actionsMenu(milestone)} trigger={['click']} placement="bottomRight">
              <Button
                type="text"
                size="small"
                aria-label={`Mais ações do marco ${milestone.name}`}
                icon={<Ellipsis {...ICON} />}
              />
            </Dropdown>
          </Flex>
          <Flex gap={8} align="center" wrap>
            <Tag bordered={false} style={{ margin: 0 }} icon={<KindIcon {...ICON} />}>
              <span style={{ marginInlineStart: 4 }}>{MILESTONE_KIND_LABEL[milestone.kind]}</span>
            </Tag>
            {due ? (
              <Text style={{ ...mono, color: milestone.done_at ? doneColor : toneColor }}>
                {due.label}
              </Text>
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>
                Sem data
              </Text>
            )}
            {isNext && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                · próximo
              </Text>
            )}
          </Flex>
          {milestone.task_count ? (
            <Flex gap={8} align="center">
              <Progress
                percent={pct}
                showInfo={false}
                size="small"
                strokeColor={milestone.done_at ? doneColor : undefined}
                style={{ flex: 1, margin: 0 }}
                aria-label={`${milestone.done_task_count} de ${milestone.task_count} tarefas`}
              />
              <Text type="secondary" style={mono}>
                {milestone.done_task_count}/{milestone.task_count}
              </Text>
            </Flex>
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Nenhuma tarefa neste marco
            </Text>
          )}
          {readyToClose(milestone) && (
            <Flex gap={6} align="center">
              <Text type="secondary" style={{ fontSize: 12 }}>
                Todas as tarefas feitas.
              </Text>
              <Button
                type="link"
                size="small"
                style={{ padding: 0 }}
                onClick={() => void toggleDone(milestone)}
              >
                Concluir marco
              </Button>
            </Flex>
          )}
        </Flex>
      )
    }
  }

  return (
    <Card
      size="small"
      title={
        <Flex align="center" gap={6}>
          <Milestone {...ICON} color={token.colorTextTertiary} />
          Marcos
          {milestones.length > 0 && (
            <Text type="secondary" style={mono}>
              {doneCount}/{milestones.length}
            </Text>
          )}
        </Flex>
      }
      extra={
        <Button
          type="text"
          size="small"
          icon={<Plus {...ICON} />}
          onClick={() => setModal({ editing: null })}
        >
          Novo marco
        </Button>
      }
    >
      {milestones.length ? (
        <Timeline style={{ marginTop: 8 }} items={milestones.map(item)} />
      ) : (
        <Flex vertical gap={8} align="flex-start">
          <Text type="secondary">
            Divida o projeto em entregas: um marco de início, os de desenvolvimento e o de fim.
          </Text>
          <Button
            size="small"
            icon={<Plus {...ICON} />}
            onClick={() => setModal({ editing: null })}
          >
            Novo marco
          </Button>
        </Flex>
      )}
      <MilestoneModal
        open={modal !== null}
        projectId={projectId}
        editing={modal?.editing ?? null}
        milestones={milestones}
        onClose={() => setModal(null)}
        onChanged={onChanged}
      />
    </Card>
  )
}
