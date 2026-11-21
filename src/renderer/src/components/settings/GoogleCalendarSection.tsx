import { useState } from 'react'
import {
  Alert,
  App,
  Button,
  Collapse,
  Flex,
  Input,
  Popconfirm,
  Switch,
  Tag,
  Typography,
  theme
} from 'antd'
import { Check, LogIn, LogOut, RefreshCw, Save } from 'lucide-react'
import type { GcalStatus, GoogleClientMode, GooglePermission } from '@shared/types'
import { SettingRow, SettingsCard } from './SettingsLayout'
import { GuideField, GuideLink, SetupGuide, type SetupStep } from './SetupGuide'
import { errorMessage } from './settingsStatus'

const ICON = { size: 16, strokeWidth: 1.75, 'aria-hidden': true } as const
const STEPS_KEY = 'settings.gcal.steps'

export function GoogleCalendarSection({
  status,
  onStatusChange
}: {
  status: GcalStatus
  onStatusChange: (status: GcalStatus) => void
}): React.JSX.Element {
  const { token } = theme.useToken()
  const { message } = App.useApp()
  const [clientId, setClientId] = useState(status.clientId)
  const [clientSecret, setClientSecret] = useState('')
  const [busy, setBusy] = useState<
    'save' | 'connect' | 'custom' | 'drive' | 'sync' | 'disconnect' | 'auto' | null
  >(null)
  const mono = { fontFamily: token.fontFamilyCode }

  const credentialsChanged = clientId.trim() !== status.clientId || clientSecret.trim() !== ''
  const credentialsSaved = status.clientId !== '' && status.hasClientSecret
  const canConnect =
    clientId.trim() !== '' && (clientSecret.trim() !== '' || status.hasClientSecret)
  const otherBusy = (own: typeof busy): boolean => busy !== null && busy !== own

  async function saveCredentials(): Promise<GcalStatus> {
    const next = await window.api.gcalSaveCredentials(clientId, clientSecret)
    setClientSecret('')
    onStatusChange(next)
    return next
  }

  async function handleSave(): Promise<void> {
    setBusy('save')
    try {
      await saveCredentials()
      message.success('Credenciais salvas.')
    } catch (error) {
      message.error(errorMessage(error))
    } finally {
      setBusy(null)
    }
  }

  async function connect(
    permission: GooglePermission,
    mode: GoogleClientMode | undefined,
    own: 'connect' | 'custom' | 'drive'
  ): Promise<void> {
    setBusy(own)
    try {
      if (mode === 'custom' && credentialsChanged) await saveCredentials()
      message.info('Conclua no navegador que acabou de abrir.')
      const next = await window.api.gcalConnect(permission, mode)
      onStatusChange(next)
      if (!next.permissions[permission]) {
        message.warning(
          permission === 'drive'
            ? 'O Google Drive não foi permitido. Marque a permissão no Google para usar.'
            : 'A agenda não foi permitida. Marque a permissão no Google para usar.'
        )
      } else if (permission === 'drive') {
        message.success('Google Drive permitido')
      } else {
        message.success(next.email ? `Conectado como ${next.email}` : 'Conta Google conectada')
      }
    } catch (error) {
      message.error(errorMessage(error))
      onStatusChange(await window.api.gcalGetStatus())
    } finally {
      setBusy(null)
    }
  }

  async function handleSyncAll(): Promise<void> {
    setBusy('sync')
    try {
      const result = await window.api.gcalSyncAll()
      if (result.failed > 0) {
        message.warning(`${result.success} tarefas sincronizadas, ${result.failed} com erro.`)
      } else {
        message.success(`${result.success} tarefas sincronizadas com o Google Calendar.`)
      }
    } catch (error) {
      message.error(errorMessage(error))
      onStatusChange(await window.api.gcalGetStatus())
    } finally {
      setBusy(null)
    }
  }

  async function handleToggleAutoSync(checked: boolean): Promise<void> {
    setBusy('auto')
    try {
      onStatusChange(await window.api.gcalSetAutoSync(checked))
    } catch (error) {
      message.error(errorMessage(error))
    } finally {
      setBusy(null)
    }
  }

  async function handleDisconnect(): Promise<void> {
    setBusy('disconnect')
    try {
      onStatusChange(await window.api.gcalDisconnect())
      message.success('Conta desconectada')
    } catch (error) {
      message.error(errorMessage(error))
    } finally {
      setBusy(null)
    }
  }

  const steps: SetupStep[] = [
    {
      id: 'projeto',
      title: 'Criar um projeto no Google Cloud',
      content: (
        <span>
          Em{' '}
          <GuideLink href="https://console.cloud.google.com/projectcreate">Novo projeto</GuideLink>,
          entre com a conta cuja agenda vai receber os eventos e crie um projeto (ex.:{' '}
          <Typography.Text code>CrafyTask</Typography.Text>). Não precisa de faturamento.
        </span>
      )
    },
    {
      id: 'api',
      title: 'Ativar a Google Calendar API',
      content: (
        <span>
          Abra a{' '}
          <GuideLink href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com">
            Google Calendar API
          </GuideLink>{' '}
          com o projeto selecionado no topo e clique em <strong>Ativar</strong>. Faça o mesmo com a{' '}
          <GuideLink href="https://console.cloud.google.com/apis/library/drive.googleapis.com">
            Google Drive API
          </GuideLink>{' '}
          para usar o Drive.
        </span>
      )
    },
    {
      id: 'branding',
      title: 'Branding: nome e e-mail do app',
      content: (
        <>
          <span>
            Em <GuideLink href="https://console.cloud.google.com/auth/branding">Branding</GuideLink>
            , clique em <strong>Get started</strong>: nome{' '}
            <Typography.Text code>CrafyTask</Typography.Text>, seu e-mail de suporte, público{' '}
            <strong>External</strong> e seu e-mail de contato.
          </span>
          <Alert
            type="warning"
            showIcon
            title="Não envie logo: com logo, o Google passa a exigir a verificação do app."
          />
        </>
      )
    },
    {
      id: 'audience',
      title: 'Audience: publicar o app',
      content: (
        <>
          <span>
            Em <GuideLink href="https://console.cloud.google.com/auth/audience">Audience</GuideLink>
            , clique em <strong>Publish app</strong> para o status virar <em>In production</em>. Não
            envie para verificação. Se o botão estiver desabilitado, preencha em Branding a página
            inicial, a política de privacidade e o domínio autorizado.
          </span>
          <Alert
            type="warning"
            showIcon
            title="Em Testing o Google derruba o acesso a cada 7 dias. Se não puder publicar, adicione seu e-mail em Test users e reconecte toda semana."
          />
        </>
      )
    },
    {
      id: 'client',
      title: 'Criar o client “Desktop app” e colar aqui',
      autoDone: credentialsSaved && !credentialsChanged,
      content: (
        <>
          <span>
            Em <GuideLink href="https://console.cloud.google.com/auth/clients">Clients</GuideLink>,
            clique em <strong>Create client</strong>, escolha <strong>Desktop app</strong> (não “Web
            application”) e copie o ID e a chave secreta.
          </span>
          <Alert
            type="info"
            showIcon
            title="O Google mostra a chave secreta completa só nessa hora. Se perder, gere outra no próprio client."
          />
          <Flex vertical gap={8} style={{ maxWidth: 420 }}>
            <GuideField label="Client ID">
              <Input
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="xxxxxxxx.apps.googleusercontent.com"
                style={mono}
              />
            </GuideField>
            <GuideField label="Client Secret">
              <Input.Password
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder={status.hasClientSecret ? '•••••••• (salvo)' : 'GOCSPX-xxxxxxxx'}
                style={mono}
              />
            </GuideField>
          </Flex>
          {credentialsChanged && (
            <Button
              size="small"
              icon={<Save {...ICON} />}
              loading={busy === 'save'}
              disabled={otherBusy('save') || !canConnect}
              onClick={handleSave}
              style={{ alignSelf: 'start' }}
            >
              Salvar credenciais
            </Button>
          )}
        </>
      )
    },
    {
      id: 'conectar',
      title: 'Conectar com o Google',
      autoDone: status.connected && status.mode === 'custom' && !credentialsChanged,
      content: (
        <>
          <span>
            O navegador abre no login do Google. No aviso “O Google não verificou este app”, clique
            em <strong>Avançado</strong> → <strong>Acessar CrafyTask</strong> e permita o acesso à
            agenda.
          </span>
          <Button
            icon={<LogIn {...ICON} />}
            loading={busy === 'custom'}
            disabled={otherBusy('custom') || !canConnect}
            onClick={() => void connect('calendar', 'custom', 'custom')}
            style={{ alignSelf: 'start' }}
          >
            Conectar com o cliente próprio
          </Button>
        </>
      )
    }
  ]

  const allowed = (label: string): React.ReactNode => (
    <Tag bordered={false} color="success" icon={<Check {...ICON} />} style={{ margin: 0 }}>
      {label}
    </Tag>
  )

  return (
    <Flex vertical gap={16}>
      <SettingsCard title="Conta Google">
        {status.connected ? (
          <SettingRow
            title={status.email ?? 'Conta conectada'}
            description={status.mode === 'custom' ? 'Conectado com cliente próprio' : 'Conectado'}
          >
            <Popconfirm
              title="Desconectar a conta Google?"
              description="As tarefas já enviadas continuam na agenda TickTask."
              okText="Desconectar"
              okButtonProps={{ danger: true }}
              cancelText="Cancelar"
              onConfirm={handleDisconnect}
            >
              <Button
                icon={<LogOut {...ICON} />}
                loading={busy === 'disconnect'}
                disabled={otherBusy('disconnect')}
              >
                Desconectar
              </Button>
            </Popconfirm>
          </SettingRow>
        ) : (
          <SettingRow
            title="Não conectado"
            description={
              status.builtinAvailable
                ? 'Abre o navegador para você entrar e liberar a agenda.'
                : 'Esta versão não traz o cliente Google embutido. Use um cliente próprio em Avançado.'
            }
          >
            <Button
              type="primary"
              icon={<LogIn {...ICON} />}
              loading={busy === 'connect'}
              disabled={otherBusy('connect') || !status.builtinAvailable}
              onClick={() => void connect('calendar', 'builtin', 'connect')}
            >
              Conectar com Google
            </Button>
          </SettingRow>
        )}
      </SettingsCard>
      {status.connected && (
        <SettingsCard title="Permissões">
          <SettingRow
            title="Agenda"
            description="Tarefas marcadas vão para uma agenda “TickTask” criada pelo app."
          >
            {status.permissions.calendar ? (
              allowed('Permitida')
            ) : (
              <Button
                loading={busy === 'connect'}
                disabled={otherBusy('connect')}
                onClick={() => void connect('calendar', undefined, 'connect')}
              >
                Permitir
              </Button>
            )}
          </SettingRow>
          <SettingRow
            title="Google Drive"
            description="O CrafyTask só vê os arquivos que ele mesmo cria."
          >
            {status.permissions.drive ? (
              allowed('Permitido')
            ) : (
              <Button
                loading={busy === 'drive'}
                disabled={otherBusy('drive')}
                onClick={() => void connect('drive', undefined, 'drive')}
              >
                Permitir
              </Button>
            )}
          </SettingRow>
        </SettingsCard>
      )}
      {status.connected && status.permissions.calendar && (
        <SettingsCard title="Agenda TickTask">
          <SettingRow
            title="Sincronizar automaticamente"
            description="Atualiza a agenda a cada mudança nas tarefas marcadas. Marque “Google Calendar” na seção Agenda de cada tarefa."
          >
            <Switch
              aria-label="Sincronizar automaticamente"
              checked={status.autoSync}
              loading={busy === 'auto'}
              onChange={(checked) => void handleToggleAutoSync(checked)}
            />
          </SettingRow>
          <SettingRow
            title="Ressincronizar todas"
            description="Recalcula os eventos de todas as tarefas marcadas."
          >
            <Button
              icon={<RefreshCw {...ICON} />}
              loading={busy === 'sync'}
              disabled={otherBusy('sync')}
              onClick={handleSyncAll}
            >
              Ressincronizar
            </Button>
          </SettingRow>
        </SettingsCard>
      )}
      <Collapse
        defaultActiveKey={!status.builtinAvailable && !status.connected ? ['proprio'] : []}
        items={[
          {
            key: 'proprio',
            label: 'Avançado: usar um cliente OAuth próprio',
            children: (
              <Flex vertical gap={12}>
                <Typography.Text type="secondary">
                  Para usar um projeto seu no Google Cloud no lugar do cliente do CrafyTask.
                </Typography.Text>
                <SetupGuide storageKey={STEPS_KEY} steps={steps} />
              </Flex>
            )
          }
        ]}
      />
    </Flex>
  )
}
