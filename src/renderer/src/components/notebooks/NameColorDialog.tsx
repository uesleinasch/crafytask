import { useEffect, useState } from 'react'
import { Flex, Form, Input, Modal, theme } from 'antd'
import { USER_COLORS } from '@renderer/theme/semantic'
import { colorName } from './notebookUi'

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
  const { token } = theme.useToken()
  const [name, setName] = useState(initial.name)
  const [color, setColor] = useState(initial.color)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(initial.name)
    setColor(initial.color)
  }, [open, initial.name, initial.color])

  const colors = USER_COLORS.some((c) => c.toLowerCase() === color.toLowerCase())
    ? USER_COLORS
    : [...USER_COLORS, color]

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
          <Flex gap={8} wrap role="radiogroup" aria-label="Cor">
            {colors.map((option) => {
              const on = option.toLowerCase() === color.toLowerCase()
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={`Cor ${colorName(option)}`}
                  title={colorName(option)}
                  onClick={() => setColor(option)}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: option,
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: on
                      ? `0 0 0 2px ${token.colorBgElevated}, 0 0 0 4px ${token.colorText}`
                      : 'none'
                  }}
                />
              )
            })}
          </Flex>
        </Form.Item>
      </Form>
    </Modal>
  )
}
