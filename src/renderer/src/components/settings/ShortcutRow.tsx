import { useRef, useState } from 'react'
import { App, Button, Flex, Tag, Tooltip, Typography } from 'antd'
import { TriangleAlert } from 'lucide-react'
import {
  ACCELERATOR_RULE,
  acceleratorFromEvent,
  acceleratorKeys,
  isModifierCode
} from '@shared/accelerator'
import { KeyCombo } from '@renderer/components/shell/Kbd'
import { SettingRow } from './SettingsLayout'
import { errorMessage } from './settingsStatus'

export function ShortcutRow({
  hintId,
  title,
  idleHint,
  idleHintDanger = false,
  successLabel,
  shortcut,
  inactive,
  disabled,
  onSave
}: {
  hintId: string
  title: string
  idleHint: string
  idleHintDanger?: boolean
  successLabel: string
  shortcut: string
  inactive: boolean
  disabled: boolean
  onSave: (accelerator: string) => Promise<string>
}): React.JSX.Element {
  const { message } = App.useApp()
  const [recording, setRecording] = useState(false)
  const [invalid, setInvalid] = useState(false)
  const [saving, setSaving] = useState(false)
  const [announce, setAnnounce] = useState('')
  const recordRef = useRef<HTMLButtonElement>(null)

  function startRecording(): void {
    setInvalid(false)
    setRecording(true)
    setAnnounce('Gravando. Pressione a nova combinação; Esc cancela.')
  }

  function stopRecording(): void {
    setRecording(false)
    setInvalid(false)
  }

  async function save(accelerator: string): Promise<void> {
    stopRecording()
    setSaving(true)
    try {
      const saved = await onSave(accelerator)
      const label = `${successLabel}: ${acceleratorKeys(saved).join('+')}`
      message.success(label)
      setAnnounce(label)
    } catch (error) {
      message.error(errorMessage(error))
      setAnnounce(errorMessage(error))
    } finally {
      setSaving(false)
      recordRef.current?.focus()
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>): void {
    if (!recording || event.key === 'Tab') return
    event.preventDefault()
    event.stopPropagation()
    if (event.key === 'Escape') {
      stopRecording()
      setAnnounce('Gravação cancelada.')
      return
    }
    if (isModifierCode(event.code)) return
    const accelerator = acceleratorFromEvent(event.nativeEvent)
    if (accelerator) {
      void save(accelerator)
    } else {
      setInvalid(true)
      setAnnounce(ACCELERATOR_RULE)
    }
  }

  const hint = recording
    ? invalid
      ? `${ACCELERATOR_RULE} Esc cancela.`
      : 'Pressione a nova combinação. Esc cancela.'
    : idleHint

  return (
    <SettingRow
      title={title}
      description={
        <Typography.Text
          id={hintId}
          type={invalid || (!recording && idleHintDanger) ? 'danger' : 'secondary'}
          style={{ fontSize: 13 }}
        >
          {hint}
        </Typography.Text>
      }
    >
      <Flex align="center" gap={8} wrap>
        <KeyCombo keys={acceleratorKeys(shortcut)} />
        {inactive && !recording && (
          <Tooltip title="Clique em Definir atalho para ativar.">
            <Tag
              bordered={false}
              color="warning"
              icon={<TriangleAlert size={12} strokeWidth={1.75} aria-hidden />}
              style={{ margin: 0 }}
            >
              Inativo
            </Tag>
          </Tooltip>
        )}
        <Button
          ref={recordRef}
          type={recording ? 'primary' : 'default'}
          loading={saving}
          disabled={disabled}
          aria-pressed={recording}
          aria-describedby={hintId}
          onClick={() => (recording ? stopRecording() : startRecording())}
          onKeyDown={onKeyDown}
          onBlur={stopRecording}
        >
          {recording ? 'Pressione as teclas…' : 'Definir atalho'}
        </Button>
      </Flex>
      <span className="sr-only" aria-live="polite">
        {announce}
      </span>
    </SettingRow>
  )
}
