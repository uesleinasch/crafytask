import { useEffect, useState } from 'react'
import { App, Button, Flex, Space, Switch, Tag, Tooltip } from 'antd'
import { Info, TriangleAlert } from 'lucide-react'
import {
  DEFAULT_CAPTURE_SHORTCUT,
  acceleratorFromEvent,
  acceleratorKeys
} from '@shared/accelerator'
import type { AppPrefsStatus } from '@shared/appPrefs'
import { KeyCombo } from '@renderer/components/shell/Kbd'
import { SettingRow, SettingsCard } from './SettingsLayout'
import { errorMessage } from './settingsStatus'

function CaptureShortcutRows(): React.JSX.Element {
  const { message } = App.useApp()
  const [prefs, setPrefs] = useState<AppPrefsStatus | null>(null)
  const [recording, setRecording] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    window.api
      .getAppPrefs()
      .then(setPrefs)
      .catch((error) => message.error(errorMessage(error)))
  }, [message])

  const shortcut = prefs?.captureShortcut ?? DEFAULT_CAPTURE_SHORTCUT

  async function save(accelerator: string): Promise<void> {
    setRecording(false)
    setSaving(true)
    try {
      const next = await window.api.setCaptureShortcut(accelerator)
      setPrefs(next)
      message.success(`Atalho da captura: ${acceleratorKeys(next.captureShortcut).join('+')}`)
    } catch (error) {
      message.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>): void {
    if (!recording) return
    event.preventDefault()
    event.stopPropagation()
    if (event.key === 'Escape') {
      setRecording(false)
      return
    }
    const accelerator = acceleratorFromEvent(event.nativeEvent)
    if (accelerator) void save(accelerator)
  }

  return (
    <>
      <SettingRow
        title="Captura rápida"
        description="Abre de qualquer lugar do sistema e manda direto para o Inbox."
      >
        <Flex align="center" gap={8} wrap>
          <KeyCombo keys={acceleratorKeys(shortcut)} />
          {prefs && !prefs.captureShortcutActive && (
            <Tooltip title="O sistema não aceitou este atalho. Escolha outro.">
              <Tag
                bordered={false}
                color="warning"
                icon={<TriangleAlert size={12} strokeWidth={1.75} aria-hidden />}
                style={{ margin: 0 }}
              >
                Não registrado
              </Tag>
            </Tooltip>
          )}
        </Flex>
      </SettingRow>
      <SettingRow
        title="Atalho da captura rápida"
        description={
          recording
            ? 'Pressione a nova combinação, com Ctrl, Alt ou Super. Esc cancela.'
            : 'Troca a combinação que abre a captura.'
        }
      >
        <Space wrap>
          {shortcut !== DEFAULT_CAPTURE_SHORTCUT && !recording && (
            <Button
              type="link"
              disabled={saving}
              onClick={() => void save(DEFAULT_CAPTURE_SHORTCUT)}
            >
              Restaurar padrão
            </Button>
          )}
          <Button
            type={recording ? 'primary' : 'default'}
            loading={saving}
            disabled={!prefs}
            aria-live="polite"
            onClick={() => setRecording(!recording)}
            onKeyDown={onKeyDown}
            onBlur={() => setRecording(false)}
          >
            {recording ? 'Pressione as teclas…' : 'Alterar atalho'}
          </Button>
        </Space>
      </SettingRow>
    </>
  )
}

export function GeneralSection({
  autostart,
  onAutostartChange
}: {
  autostart: boolean
  onAutostartChange: (enabled: boolean) => void
}): React.JSX.Element {
  const { message } = App.useApp()
  const [saving, setSaving] = useState(false)

  async function toggleAutostart(checked: boolean): Promise<void> {
    setSaving(true)
    try {
      const next = await window.api.appSetAutostart(checked)
      onAutostartChange(next)
      if (next !== checked) message.error('Não foi possível alterar a inicialização automática')
      else message.success(next ? 'Vai iniciar com o sistema' : 'Não inicia mais com o sistema')
    } catch {
      message.error('Não foi possível alterar a inicialização automática')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Flex vertical gap={16}>
      <SettingsCard title="Inicialização">
        <SettingRow
          title="Iniciar o CrafyTask com o sistema"
          description="Abre direto na bandeja, sem janela."
        >
          <Switch
            checked={autostart}
            loading={saving}
            onChange={(checked) => void toggleAutostart(checked)}
            aria-label="Iniciar com o sistema"
          />
        </SettingRow>
      </SettingsCard>
      <SettingsCard title="Janela e bandeja">
        <SettingRow
          title="Fechar a janela não encerra o app"
          description="O CrafyTask continua na bandeja, com os timers e o servidor MCP rodando. Para sair de vez, use Sair no menu da bandeja."
        >
          <Tag bordered={false} icon={<Info size={12} strokeWidth={1.75} aria-hidden />}>
            Comportamento fixo
          </Tag>
        </SettingRow>
        <CaptureShortcutRows />
      </SettingsCard>
    </Flex>
  )
}
