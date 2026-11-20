import { useState } from 'react'
import {
  Alert,
  App,
  Button,
  Collapse,
  Flex,
  Input,
  Popconfirm,
  Space,
  Switch,
  Typography,
  theme
} from 'antd'
import { Database, ExternalLink, Link2, RefreshCw, Trash2 } from 'lucide-react'
import { SettingRow, SettingsCard } from './SettingsLayout'
import { GuideField, GuideLink, SetupGuide, type SetupStep } from './SetupGuide'
import { errorMessage, type NotionConfig } from './settingsStatus'

const ICON = { size: 16, strokeWidth: 1.75, 'aria-hidden': true } as const
const STEPS_KEY = 'settings.notion.steps'

export function NotionSection({
  config,
  onConfigChange
}: {
  config: NotionConfig | null
  onConfigChange: (config: NotionConfig | null) => void
}): React.JSX.Element {
  const { token } = theme.useToken()
  const { message } = App.useApp()
  const [apiKey, setApiKey] = useState(config?.apiKey ?? '')
  const [pageId, setPageId] = useState(config?.pageId ?? '')
  const [busy, setBusy] = useState<'test' | 'database' | 'sync' | 'auto' | null>(null)
  const [tested, setTested] = useState(false)
  const mono = { fontFamily: token.fontFamilyCode, fontVariantNumeric: 'tabular-nums' as const }

  const draft: NotionConfig = {
    ...config,
    apiKey: apiKey.trim(),
    pageId: pageId.trim() || undefined,
    autoSync: config?.autoSync ?? false
  }
  const apiKeyChanged = apiKey.trim() !== (config?.apiKey ?? '')

  async function reload(): Promise<void> {
    onConfigChange(await window.api.notionGetConfig())
  }

  async function handleTest(): Promise<void> {
    setBusy('test')
    try {
      await window.api.notionSaveConfig(draft)
      await reload()
      const result = await window.api.notionTestConnection()
      setTested(result.success)
      if (result.success) message.success(result.message)
      else message.error(result.message)
    } catch (error) {
      setTested(false)
      message.error(errorMessage(error))
    } finally {
      setBusy(null)
    }
  }

  async function handleCreateDatabase(): Promise<void> {
    setBusy('database')
    try {
      await window.api.notionSaveConfig(draft)
      await window.api.notionCreateDatabase()
      await reload()
      message.success('Banco GTD APP criado.')
    } catch (error) {
      message.error(`Erro ao criar o banco: ${errorMessage(error)}`)
    } finally {
      setBusy(null)
    }
  }

  async function handleSyncAll(): Promise<void> {
    setBusy('sync')
    try {
      const result = await window.api.notionSyncAllTasks()
      if (result.failed > 0) {
        message.warning(`${result.success} tarefas enviadas, ${result.failed} com erro.`)
      } else {
        message.success(`${result.success} tarefas enviadas ao Notion.`)
      }
      await reload()
    } catch (error) {
      message.error(`Erro na sincronização: ${errorMessage(error)}`)
    } finally {
      setBusy(null)
    }
  }

  async function handleToggleAutoSync(checked: boolean): Promise<void> {
    if (!config) return
    setBusy('auto')
    try {
      const next = { ...config, autoSync: checked }
      await window.api.notionSaveConfig(next)
      onConfigChange(next)
    } catch (error) {
      message.error(errorMessage(error))
    } finally {
      setBusy(null)
    }
  }

  async function handleClear(): Promise<void> {
    try {
      await window.api.notionClearConfig()
      setApiKey('')
      setPageId('')
      setTested(false)
      onConfigChange(null)
      message.success('Configuração do Notion removida.')
    } catch (error) {
      message.error(`Erro ao limpar a configuração: ${errorMessage(error)}`)
    }
  }

  const steps: SetupStep[] = [
    {
      id: 'integracao',
      title: 'Criar a integração no Notion',
      content: (
        <span>
          Em{' '}
          <GuideLink href="https://www.notion.so/my-integrations">
            notion.so/my-integrations
          </GuideLink>
          , crie uma integração <strong>Internal</strong> e copie o{' '}
          <em>Internal Integration Secret</em>.
        </span>
      )
    },
    {
      id: 'apikey',
      title: 'Colar a API key e testar',
      autoDone: !!config?.apiKey && !apiKeyChanged && (tested || !!config.databaseId),
      content: (
        <Space.Compact style={{ width: '100%', maxWidth: 420 }}>
          <Input.Password
            aria-label="API key do Notion"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value)
              setTested(false)
            }}
            placeholder="ntn_xxxxxxxxxxxx"
            style={mono}
          />
          <Button
            icon={<Link2 {...ICON} />}
            loading={busy === 'test'}
            disabled={(busy !== null && busy !== 'test') || !apiKey.trim()}
            onClick={handleTest}
          >
            Testar conexão
          </Button>
        </Space.Compact>
      )
    },
    {
      id: 'pagina',
      title: 'Conectar a integração a uma página',
      content: (
        <>
          <span>
            No Notion, abra a página onde o banco deve ficar e clique em <strong>⋯</strong> (canto
            superior direito) → <strong>Conexões</strong> → <strong>Adicionar conexões</strong>.
            Escolha a sua integração.
          </span>
          <Alert
            type="warning"
            showIcon
            title="A integração só enxerga páginas conectadas a ela. Erros de “página não encontrada” vêm daqui."
          />
        </>
      )
    },
    {
      id: 'banco',
      title: 'Criar o banco GTD APP',
      autoDone: !!config?.databaseId,
      content: (
        <>
          <GuideField label="Page ID (opcional)">
            <Input
              value={pageId}
              onChange={(e) => setPageId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              style={{ ...mono, maxWidth: 420 }}
            />
          </GuideField>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Em branco, o banco é criado na primeira página conectada à integração.
          </Typography.Text>
          <Button
            type="primary"
            icon={<Database {...ICON} />}
            loading={busy === 'database'}
            disabled={(busy !== null && busy !== 'database') || !apiKey.trim()}
            onClick={handleCreateDatabase}
            style={{ alignSelf: 'start' }}
          >
            Criar banco GTD APP
          </Button>
        </>
      )
    }
  ]

  if (!config?.databaseId) {
    return (
      <SettingsCard title="Configurar a conexão">
        <div style={{ padding: '12px 0' }}>
          <SetupGuide storageKey={STEPS_KEY} steps={steps} />
        </div>
      </SettingsCard>
    )
  }

  const databaseId = config.databaseId
  return (
    <Flex vertical gap={16}>
      <SettingsCard title="Banco conectado">
        <SettingRow
          title="Banco GTD APP"
          description={
            <span>
              <span style={mono}>{databaseId.substring(0, 8)}…</span> ·{' '}
              {config.lastSync
                ? `última sincronização em ${new Date(config.lastSync).toLocaleString('pt-BR')}`
                : 'ainda não sincronizado'}
            </span>
          }
        >
          <Button
            icon={<ExternalLink {...ICON} />}
            onClick={() =>
              void window.api.appOpenExternal(
                `https://www.notion.so/${databaseId.replace(/-/g, '')}`
              )
            }
          >
            Abrir no Notion
          </Button>
        </SettingRow>
        <SettingRow
          title="Sincronizar automaticamente"
          description="Cada tarefa criada, editada ou excluída vai ao Notion logo depois de salva."
        >
          <Switch
            aria-label="Sincronizar automaticamente"
            checked={config.autoSync}
            loading={busy === 'auto'}
            onChange={(checked) => void handleToggleAutoSync(checked)}
          />
        </SettingRow>
        <SettingRow
          title="Sincronizar todas as tarefas"
          description="Envia de novo tudo o que não está arquivado."
        >
          <Button
            icon={<RefreshCw {...ICON} />}
            loading={busy === 'sync'}
            disabled={busy !== null && busy !== 'sync'}
            onClick={handleSyncAll}
          >
            Sincronizar agora
          </Button>
        </SettingRow>
        <SettingRow
          title="Limpar configurações"
          description="Apaga só a configuração local. Nada é apagado no Notion."
        >
          <Popconfirm
            title="Limpar a configuração do Notion?"
            description="A API key e o vínculo com o banco saem do CrafyTask e a sincronização para. O banco GTD APP e as páginas continuam no Notion."
            okText="Limpar"
            okButtonProps={{ danger: true }}
            cancelText="Cancelar"
            onConfirm={handleClear}
          >
            <Button danger icon={<Trash2 {...ICON} />}>
              Limpar
            </Button>
          </Popconfirm>
        </SettingRow>
      </SettingsCard>
      <Collapse
        items={[
          {
            key: 'guia',
            label: 'Guia de configuração e troca da API key',
            children: <SetupGuide storageKey={STEPS_KEY} steps={steps} />
          }
        ]}
      />
    </Flex>
  )
}
