import { useState } from 'react'
import { Alert, App, Button, Flex, Progress, Switch, Tooltip, theme } from 'antd'
import { Download, ExternalLink, RefreshCw } from 'lucide-react'
import type { HandyStatus, HandyUpdateInfo } from '@shared/types'
import { SettingRow, SettingsCard } from './SettingsLayout'
import { ShortcutRow } from './ShortcutRow'
import { errorMessage } from './settingsStatus'

const ICON = { size: 16, strokeWidth: 1.75, 'aria-hidden': true } as const

export function HandySection({
  status,
  onStatusChange
}: {
  status: HandyStatus
  onStatusChange: (status: HandyStatus) => void
}): React.JSX.Element {
  const { message } = App.useApp()
  const { token } = theme.useToken()
  const [update, setUpdate] = useState<HandyUpdateInfo | null>(null)
  const [checking, setChecking] = useState(false)
  const [switching, setSwitching] = useState(false)
  const mono = { fontFamily: token.fontFamilyCode, fontVariantNumeric: 'tabular-nums' as const }
  const ready = status.enabled && status.installed && status.running

  async function install(): Promise<void> {
    try {
      const next = await window.api.handyInstall()
      onStatusChange(next)
      setUpdate(null)
      message.success(`Handy ${next.version ?? ''} instalado`)
    } catch (error) {
      message.error(errorMessage(error))
    }
  }

  async function checkUpdate(): Promise<void> {
    setChecking(true)
    try {
      const info = await window.api.handyCheckUpdate()
      setUpdate(info)
      if (!info.available) message.success('É a versão mais recente.')
    } catch (error) {
      message.error(errorMessage(error))
    } finally {
      setChecking(false)
    }
  }

  async function toggle(checked: boolean): Promise<void> {
    setSwitching(true)
    try {
      onStatusChange(await window.api.handySetEnabled(checked))
      message.success(checked ? 'Ditado ligado' : 'Ditado desligado')
    } catch (error) {
      message.error(errorMessage(error))
    } finally {
      setSwitching(false)
    }
  }

  async function open(): Promise<void> {
    try {
      await window.api.handyOpen()
    } catch (error) {
      message.error(errorMessage(error))
    }
  }

  async function saveShortcut(accelerator: string): Promise<string> {
    const next = await window.api.handySetShortcut(accelerator)
    onStatusChange(next)
    return next.shortcut
  }

  const versionRow = status.installing ? (
    <SettingRow
      title="Instalando o Handy"
      description={
        status.installing === 'download'
          ? 'Baixando a versão mais recente.'
          : 'Conferida a assinatura. Preparando os arquivos.'
      }
    >
      <Progress
        percent={status.installing === 'download' ? (status.progress ?? 0) : 100}
        status="active"
        showInfo={status.installing === 'download'}
        size="small"
        style={{ width: 200, margin: 0 }}
      />
    </SettingRow>
  ) : !status.installed ? (
    <SettingRow
      title="Handy não instalado"
      description="Baixa a versão oficial do Handy, de código aberto, direto do GitHub."
    >
      <Button
        type="primary"
        icon={<Download {...ICON} />}
        disabled={!status.supported}
        onClick={() => void install()}
      >
        Instalar
      </Button>
    </SettingRow>
  ) : (
    <SettingRow
      title={
        <span>
          Versão <span style={mono}>{status.version}</span>
        </span>
      }
      description={
        update?.available ? (
          <span>
            A versão <span style={mono}>{update.latest}</span> está disponível.
          </span>
        ) : update ? (
          'É a versão mais recente.'
        ) : (
          'Versão oficial, baixada do GitHub.'
        )
      }
    >
      {update?.available ? (
        <Button type="primary" icon={<Download {...ICON} />} onClick={() => void install()}>
          Atualizar
        </Button>
      ) : (
        <Button
          icon={<RefreshCw {...ICON} />}
          loading={checking}
          onClick={() => void checkUpdate()}
        >
          Procurar atualização
        </Button>
      )}
    </SettingRow>
  )

  return (
    <Flex vertical gap={16}>
      {!status.supported && (
        <Alert type="info" showIcon title="O Handy só roda aqui no Linux, em x86_64 ou ARM64." />
      )}
      {status.error && !status.installing && <Alert type="error" showIcon title={status.error} />}
      <SettingsCard title="Handy">
        {versionRow}
        <SettingRow title="Ditado por voz" description="Liga o Handy junto com o CrafyTask.">
          <Tooltip title={status.installed ? undefined : 'Instale o Handy primeiro.'}>
            <Switch
              checked={status.enabled && status.installed}
              disabled={!status.installed || !!status.installing}
              loading={switching}
              aria-label="Ditado por voz"
              onChange={(checked) => void toggle(checked)}
            />
          </Tooltip>
        </SettingRow>
      </SettingsCard>
      <SettingsCard title="Atalho">
        <ShortcutRow
          hintId="dictation-shortcut-hint"
          title="Ditar"
          idleHint="Aperte para começar a falar e de novo para parar. O texto entra no campo com o cursor; com outro programa em foco, vai para a área de transferência."
          successLabel="Atalho do ditado"
          shortcut={status.shortcut}
          inactive={status.enabled && status.installed && !status.shortcutActive}
          disabled={!status.supported}
          onSave={saveShortcut}
        />
      </SettingsCard>
      <SettingsCard title="Modelo, microfone e idioma">
        <SettingRow
          title="Configurações do Handy"
          description="Modelo de transcrição, microfone, idioma e sons ficam no próprio Handy."
        >
          <Tooltip title={ready ? undefined : 'Ligue o ditado primeiro.'}>
            <Button icon={<ExternalLink {...ICON} />} disabled={!ready} onClick={() => void open()}>
              Abrir o Handy
            </Button>
          </Tooltip>
        </SettingRow>
      </SettingsCard>
    </Flex>
  )
}
