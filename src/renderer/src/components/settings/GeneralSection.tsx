import { useEffect, useState } from 'react'
import { App, Flex, Switch, Tag } from 'antd'
import { Info } from 'lucide-react'
import { DEFAULT_CAPTURE_SHORTCUT } from '@shared/accelerator'
import type { AppPrefsStatus } from '@shared/appPrefs'
import { SettingRow, SettingsCard } from './SettingsLayout'
import { ShortcutRow } from './ShortcutRow'
import { errorMessage } from './settingsStatus'

function CaptureShortcutRow(): React.JSX.Element {
  const { message } = App.useApp()
  const [prefs, setPrefs] = useState<AppPrefsStatus | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    window.api
      .getAppPrefs()
      .then(setPrefs)
      .catch((error) => {
        setFailed(true)
        message.error(errorMessage(error))
      })
  }, [message])

  async function save(accelerator: string): Promise<string> {
    const next = await window.api.setCaptureShortcut(accelerator)
    setPrefs(next)
    return next.captureShortcut
  }

  return (
    <ShortcutRow
      hintId="capture-shortcut-hint"
      title="Captura rápida"
      idleHint={
        failed
          ? 'Não foi possível ler o atalho salvo.'
          : 'Abre de qualquer lugar do sistema e manda direto para o Inbox.'
      }
      idleHintDanger={failed}
      successLabel="Atalho da captura"
      shortcut={prefs?.captureShortcut ?? DEFAULT_CAPTURE_SHORTCUT}
      inactive={!!prefs && !prefs.captureShortcutActive}
      disabled={!prefs}
      onSave={save}
    />
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
        <CaptureShortcutRow />
      </SettingsCard>
    </Flex>
  )
}
