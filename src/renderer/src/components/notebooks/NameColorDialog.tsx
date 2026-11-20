import { useEffect, useState } from 'react'
import { Form, Input, Modal } from 'antd'
import { ColorSwatches } from '@renderer/components/color/ColorSwatches'

export interface NameColorValue {
  name: string
  color: string
}

interface NameColorDialogProps {
  open: boolean
  title: string
  initial: NameColorValue
  placeholder?: string
  onCancel: () => void
  onSubmit: (value: NameColorValue) => Promise<void>
}

export function NameColorDialog({
  open,
  title,
  initial,
  placeholder,
  onCancel,
  onSubmit
}: NameColorDialogProps): React.JSX.Element {
  const [name, setName] = useState(initial.name)
  const [color, setColor] = useState(initial.color)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(initial.name)
    setColor(initial.color)
  }, [open, initial.name, initial.color])

  const submit = async (): Promise<void> => {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      await onSubmit({ name: name.trim(), color })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title={title}
      okText="Salvar"
      cancelText="Cancelar"
      onOk={() => void submit()}
      onCancel={onCancel}
      confirmLoading={saving}
      okButtonProps={{ disabled: !name.trim() }}
      width={420}
      destroyOnHidden
    >
      <Form layout="vertical" requiredMark={false}>
        <Form.Item label="Nome" required>
          <Input
            autoFocus
            value={name}
            placeholder={placeholder}
            onChange={(event) => setName(event.target.value)}
            onPressEnter={() => void submit()}
          />
        </Form.Item>
        <Form.Item label="Cor" style={{ marginBottom: 0 }}>
          <ColorSwatches value={color} onChange={setColor} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
