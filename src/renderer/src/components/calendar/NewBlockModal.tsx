import { useEffect, useState } from 'react'
import { App, DatePicker, Flex, Modal, Select, TimePicker, Typography, theme } from 'antd'
import dayjs from 'dayjs'
import type { CreateTimeBlockInput, TaskListItem } from '@shared/types'
import { Field } from '@renderer/components/shell/SectionHeader'
import { errorMessage } from '@renderer/components/settings/settingsStatus'
import { durationLabel, toMin } from './calendarView'

export interface NewBlockDraft {
  date: string
  start: string
  end: string
  taskId?: number
}

interface NewBlockModalProps {
  draft: NewBlockDraft | null
  onCancel: () => void
  onCreate: (input: CreateTimeBlockInput) => Promise<void>
}

export function NewBlockModal({
  draft,
  onCancel,
  onCreate
}: NewBlockModalProps): React.JSX.Element {
  const { token } = theme.useToken()
  const { message } = App.useApp()
  const [value, setValue] = useState<NewBlockDraft | null>(draft)
  const [tasks, setTasks] = useState<TaskListItem[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setValue(draft)
    if (!draft) return
    window.api
      .listActiveTasksLight()
      .then(setTasks)
      .catch((error) => {
        setTasks([])
        message.error(errorMessage(error))
      })
  }, [draft, message])

  async function submit(): Promise<void> {
    if (!value?.taskId) return
    setSaving(true)
    try {
      await onCreate({
        task_id: value.taskId,
        date: value.date,
        start_time: value.start,
        end_time: value.end
      })
    } catch {
      return
    } finally {
      setSaving(false)
    }
  }

  const length = value ? toMin(value.end) - toMin(value.start) : 0

  return (
    <Modal
      open={!!draft}
      title="Novo bloco de tempo"
      okText="Reservar"
      cancelText="Cancelar"
      onCancel={onCancel}
      onOk={() => void submit()}
      confirmLoading={saving}
      okButtonProps={{ disabled: !value?.taskId || length <= 0 }}
      destroyOnHidden
    >
      {value && (
        <Flex vertical gap={12}>
          <Field label="Tarefa">
            <Select
              showSearch
              autoFocus
              placeholder="Buscar próxima ação"
              optionFilterProp="label"
              value={value.taskId}
              onChange={(taskId: number) => setValue({ ...value, taskId })}
              options={tasks.map((t) => ({ value: t.id, label: t.name }))}
              style={{ width: '100%' }}
              aria-label="Tarefa"
            />
          </Field>
          <Field label="Dia">
            <DatePicker
              value={dayjs(value.date)}
              onChange={(day) => day && setValue({ ...value, date: day.format('YYYY-MM-DD') })}
              format="ddd, DD/MM/YYYY"
              allowClear={false}
              style={{ width: '100%' }}
              aria-label="Dia"
            />
          </Field>
          <Field label="Horário">
            <Flex align="center" gap={8}>
              <TimePicker.RangePicker
                format="HH:mm"
                minuteStep={15}
                allowClear={false}
                value={[dayjs(`${value.date} ${value.start}`), dayjs(`${value.date} ${value.end}`)]}
                onChange={(range) => {
                  if (!range?.[0] || !range[1]) return
                  setValue({
                    ...value,
                    start: range[0].format('HH:mm'),
                    end: range[1].format('HH:mm')
                  })
                }}
                style={{ flex: 1 }}
                aria-label="Horário"
              />
              <span
                style={{
                  fontFamily: token.fontFamilyCode,
                  fontSize: 12,
                  color: token.colorTextTertiary
                }}
              >
                {length > 0 ? durationLabel(length) : '—'}
              </span>
            </Flex>
          </Field>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Dica: arraste uma tarefa do painel &quot;A agendar&quot; direto para a grade.
          </Typography.Text>
        </Flex>
      )}
    </Modal>
  )
}
