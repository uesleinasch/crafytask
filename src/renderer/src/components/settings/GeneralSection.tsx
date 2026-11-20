import { useEffect, useRef, useState } from 'react'
import { App, Button, Flex, Popconfirm, Space, Switch, Tag, Tooltip, Typography } from 'antd'
import { Info, Monitor, TriangleAlert } from 'lucide-react'
import {
  ACCELERATOR_RULE,
  DEFAULT_CAPTURE_SHORTCUT,
  acceleratorFromEvent,
  acceleratorKeys,
  isModifierCode
} from '@shared/accelerator'
import type { AppPrefsStatus } from '@shared/appPrefs'
import { KeyCombo } from '@renderer/components/shell/Kbd'
import { SettingRow, SettingsCard } from './SettingsLayout'
import { errorMessage } from './settingsStatus'

const RECORD_HINT_ID = 'capture-shortcut-hint'

function CaptureShortcutRows(): React.JSX.Element {
  const { message } = App.useApp()
  const [prefs, setPrefs] = useState<AppPrefsStatus | null>(null)
  const [failed, setFailed] = useState(false)
  const [recording, setRecording] = useState(false)
  const [invalid, setInvalid] = useState(false)
  const [saving, setSaving] = useState(false)
  const [announce, setAnnounce] = useState('')
  const recordRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    window.api
      .getAppPrefs()
      .then(setPrefs)
      .catch((error) => {
        setFailed(true)
        message.error(errorMessage(error))
      })
  }, [message])

  const shortcut = prefs?.captureShortcut ?? DEFAULT_CAPTURE_SHORTCUT
  const gnome = prefs?.captureShortcutMode === 'gnome'

  async function removeFromGnome(): Promise<void> {
    setSaving(true)
    try {
      setPrefs(await window.api.removeGnomeShortcut())
      message.success('Atalho removido do GNOME')
    } catch (error) {
      message.error(errorMessage(error))
    } finally {
      setSaving(false)
      recordRef.current?.focus()
    }
  }

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
      const next = await window.api.setCaptureShortcut(accelerator)
      setPrefs(next)
      const label = acceleratorKeys(next.captureShortcut).join('+')
      message.success(`Atalho da captura: ${label}`)
      setAnnounce(`Atalho da captura: ${label}`)
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
    : failed
      ? 'Não foi possível ler o atalho salvo.'
      : gnome
        ? 'No GNOME com Wayland o app não registra atalho sozinho: ele fica nos atalhos personalizados do sistema. Gravar aqui cria ou atualiza lá.'
        : 'Troca a combinação que abre a captura.'

  const status = !prefs
    ? null
    : gnome
      ? prefs.captureShortcutActive
        ? {
            warn: false,
            label: 'No GNOME',
            tip: 'Atalho personalizado do GNOME criado pelo CrafyTask.'
          }
        : prefs.gnomeKeybindingExists
          ? {
              warn: true,
              label: 'Diferente no GNOME',
              tip: 'O atalho no GNOME não bate com o salvo aqui. Atualize para usar este.'
            }
          : {
              warn: true,
              label: 'Não criado no GNOME',
              tip: 'Ainda não existe atalho no GNOME. Crie para a combinação funcionar.'
            }
      : prefs.captureShortcutActive
        ? null
        : {
            warn: true,
            label: 'Não registrado',
            tip: 'O sistema não aceitou este atalho. Escolha outro.'
          }

  return (
    <>
      <SettingRow
        title="Captura rápida"
        description="Abre de qualquer lugar do sistema e manda direto para o Inbox."
      >
        <Flex align="center" gap={8} wrap>
          <KeyCombo keys={acceleratorKeys(shortcut)} />
          {status && (
            <Tooltip title={status.tip}>
              <Tag
                bordered={false}
                color={status.warn ? 'warning' : undefined}
                icon={
                  status.warn ? (
                    <TriangleAlert size={12} strokeWidth={1.75} aria-hidden />
                  ) : (
                    <Monitor size={12} strokeWidth={1.75} aria-hidden />
                  )
                }
                style={{ margin: 0 }}
              >
                {status.label}
              </Tag>
            </Tooltip>
          )}
        </Flex>
      </SettingRow>
      <SettingRow
        title="Atalho da captura rápida"
        description={
          <Typography.Text
            id={RECORD_HINT_ID}
            type={invalid || failed ? 'danger' : 'secondary'}
            style={{ fontSize: 13 }}
          >
            {hint}
          </Typography.Text>
        }
      >
        <Space wrap>
          {gnome && prefs?.gnomeKeybindingExists && !recording && (
            <Popconfirm
              title="Remover o atalho do GNOME?"
              description="Some dos atalhos personalizados do sistema. A combinação salva aqui continua, e você pode criar de novo."
              okText="Remover"
              cancelText="Cancelar"
              onConfirm={() => removeFromGnome()}
            >
              <Button type="link" disabled={saving}>
                Remover do GNOME
              </Button>
            </Popconfirm>
          )}
          {gnome && !prefs?.captureShortcutActive && !recording && (
            <Button disabled={saving} onClick={() => void save(shortcut)}>
              {prefs?.gnomeKeybindingExists ? 'Atualizar no GNOME' : 'Criar no GNOME'}
            </Button>
          )}
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
            ref={recordRef}
            type={recording ? 'primary' : 'default'}
            loading={saving}
            disabled={!prefs}
            aria-pressed={recording}
            aria-describedby={RECORD_HINT_ID}
            onClick={() => (recording ? stopRecording() : startRecording())}
            onKeyDown={onKeyDown}
            onBlur={stopRecording}
          >
            {recording ? 'Pressione as teclas…' : 'Alterar atalho'}
          </Button>
        </Space>
        <span className="sr-only" aria-live="polite">
          {announce}
        </span>
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
