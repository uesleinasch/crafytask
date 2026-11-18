import { App, Input, Typography, theme } from 'antd'
import { Plus } from 'lucide-react'
import { useState } from 'react'

export function HeaderCapture(): React.JSX.Element {
  const { message } = App.useApp()
  const { token } = theme.useToken()
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  const capture = async (): Promise<void> => {
    const name = value.trim()
    if (!name || saving) return
    setSaving(true)
    try {
      await window.api.quickCapture(name)
      setValue('')
      message.success('Capturado no Inbox')
    } catch (error) {
      console.error('Falha na captura:', error)
      message.error('Não foi possível capturar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Input
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onPressEnter={() => void capture()}
      disabled={saving}
      placeholder="Capturar para o Inbox…"
      aria-label="Capturar para o Inbox"
      prefix={<Plus size={16} strokeWidth={1.75} aria-hidden />}
      suffix={
        <Typography.Text
          type="secondary"
          style={{ fontSize: 12, fontFamily: token.fontFamilyCode }}
        >
          Enter
        </Typography.Text>
      }
    />
  )
}
