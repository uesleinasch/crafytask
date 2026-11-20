import { useEffect, useState } from 'react'
import {
  Alert,
  Badge,
  Flex,
  Grid,
  Input,
  Menu,
  Select,
  Space,
  Spin,
  Tooltip,
  Typography
} from 'antd'
import {
  BookOpen,
  Cable,
  Calendar,
  DatabaseBackup,
  Info,
  Palette,
  Plug,
  Search,
  Settings,
  SquareTerminal,
  type LucideIcon
} from 'lucide-react'
import type { GcalStatus, JiraStatus, McpStatus } from '@shared/types'
import { usePersistedState } from '@renderer/hooks/usePersistedState'
import { PageContainer } from '@renderer/components/shell/PageContainer'
import { RegionBoundary } from '@renderer/components/shell/RegionBoundary'
import { AboutSection } from '@renderer/components/settings/AboutSection'
import { AppearanceSection } from '@renderer/components/settings/AppearanceSection'
import { BackupSection } from '@renderer/components/settings/BackupSection'
import { GeneralSection } from '@renderer/components/settings/GeneralSection'
import { GoogleCalendarSection } from '@renderer/components/settings/GoogleCalendarSection'
import { JiraSection } from '@renderer/components/settings/JiraSection'
import { McpSection } from '@renderer/components/settings/McpSection'
import { NotionSection } from '@renderer/components/settings/NotionSection'
import { TerminalSection } from '@renderer/components/settings/TerminalSection'
import { SettingsHeader } from '@renderer/components/settings/SettingsLayout'
import {
  gcalStatusInfo,
  jiraStatusInfo,
  mcpStatusInfo,
  notionStatus,
  STATUS_BADGE,
  type NotionConfig,
  type StatusInfo
} from '@renderer/components/settings/settingsStatus'

type SectionId =
  | 'geral'
  | 'aparencia'
  | 'terminal'
  | 'backup'
  | 'notion'
  | 'google'
  | 'jira'
  | 'mcp'
  | 'sobre'

interface NavItem {
  id: SectionId
  label: string
  icon: LucideIcon
  keywords: string
  description: string
  status?: StatusInfo
}

const ICON = { size: 16, strokeWidth: 1.75, 'aria-hidden': true } as const
const CONTENT_MAX_WIDTH = 780
const NAV_WIDTH = 232

export function SettingsPage(): React.JSX.Element {
  const screens = Grid.useBreakpoint()
  const [section, setSection] = usePersistedState<SectionId>('settings.section', 'geral')
  const [query, setQuery] = useState('')
  const [notion, setNotion] = useState<NotionConfig | null>(null)
  const [gcal, setGcal] = useState<GcalStatus | null>(null)
  const [jira, setJira] = useState<JiraStatus | null>(null)
  const [mcp, setMcp] = useState<McpStatus | null>(null)
  const [autostart, setAutostart] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [failed, setFailed] = useState<SectionId[]>([])
  const statusOf = (id: SectionId, info: StatusInfo): StatusInfo | undefined =>
    isLoading ? undefined : failed.includes(id) ? { tone: 'error', label: 'Erro ao ler' } : info

  useEffect(() => {
    Promise.allSettled([
      window.api.notionGetConfig(),
      window.api.gcalGetStatus(),
      window.api.mcpGetStatus(),
      window.api.appGetAutostart(),
      window.api.jiraGetStatus()
    ]).then(([notionConfig, gcalStatus, mcpStatus, autostartEnabled, jiraStatus]) => {
      const failures: SectionId[] = []
      if (notionConfig.status === 'fulfilled') setNotion(notionConfig.value)
      else failures.push('notion')
      if (gcalStatus.status === 'fulfilled') setGcal(gcalStatus.value)
      else failures.push('google')
      if (mcpStatus.status === 'fulfilled') setMcp(mcpStatus.value)
      else failures.push('mcp')
      if (autostartEnabled.status === 'fulfilled') setAutostart(autostartEnabled.value)
      else failures.push('geral')
      if (jiraStatus.status === 'fulfilled') setJira(jiraStatus.value)
      else failures.push('jira')
      setFailed(failures)
      setIsLoading(false)
    })
  }, [])

  const groups: { label: string; items: NavItem[] }[] = [
    {
      label: 'Aplicativo',
      items: [
        {
          id: 'geral',
          label: 'Geral',
          icon: Settings,
          keywords: 'iniciar sistema bandeja fechar captura atalho',
          description: 'Como o CrafyTask abre, fecha e captura.'
        },
        {
          id: 'aparencia',
          label: 'Aparência',
          icon: Palette,
          keywords: 'tema escuro claro sistema densidade compacta confortável',
          description: 'Tema e densidade. Valem para as três janelas.'
        },
        {
          id: 'terminal',
          label: 'Terminal',
          icon: SquareTerminal,
          keywords: 'shell timer comando atalho',
          description: 'Shell e comportamento do terminal embutido.'
        },
        {
          id: 'backup',
          label: 'Backup',
          icon: DatabaseBackup,
          keywords: 'restaurar pasta snapshot cópia',
          description: 'Cópias do banco, das imagens das notas, dos desenhos e das configurações.'
        }
      ]
    },
    {
      label: 'Integrações',
      items: [
        {
          id: 'notion',
          label: 'Notion',
          icon: BookOpen,
          keywords: 'sincronizar banco api key cadernos',
          description:
            'Envia as tarefas para um banco "GTD APP" no Notion. Só ida: o Notion não altera o app.',
          status: statusOf('notion', notionStatus(notion))
        },
        {
          id: 'google',
          label: 'Google Calendar',
          icon: Calendar,
          keywords: 'agenda oauth client eventos',
          description:
            'Coloca tarefas marcadas numa agenda "TickTask" criada pelo app no seu Google Calendar.',
          status: statusOf('google', gcalStatusInfo(gcal))
        },
        {
          id: 'jira',
          label: 'Jira',
          icon: Plug,
          keywords: 'boards worklog importar token issues',
          description: 'Importa as issues atribuídas a você e devolve tempo, descrição e status.',
          status: statusOf('jira', jiraStatusInfo(jira))
        },
        {
          id: 'mcp',
          label: 'Servidor MCP',
          icon: Cable,
          keywords: 'token claude porta assistente',
          description:
            'Deixa assistentes como o Claude Code lerem e alterarem suas tarefas, só nesta máquina.',
          status: statusOf('mcp', mcpStatusInfo(mcp))
        }
      ]
    },
    {
      label: '',
      items: [
        {
          id: 'sobre',
          label: 'Sobre',
          icon: Info,
          keywords: 'versão electron chromium node documentação',
          description: 'Versões e links do projeto.'
        }
      ]
    }
  ]

  const all = groups.flatMap((g) => g.items)
  const current = all.find((item) => item.id === section) ?? all[0]
  const needle = query.trim().toLowerCase()
  const matches = (item: NavItem): boolean =>
    !needle || `${item.label} ${item.keywords}`.toLowerCase().includes(needle)

  const navLabel = (item: NavItem): React.ReactNode => (
    <Flex justify="space-between" align="center" gap={8}>
      <span className="ct-ellipsis">{item.label}</span>
      {item.status && (
        <Tooltip title={item.status.label} placement="right">
          <Badge
            status={STATUS_BADGE[item.status.tone]}
            text={<span className="sr-only">{item.status.label}</span>}
          />
        </Tooltip>
      )}
    </Flex>
  )

  const nav = (
    <div style={{ width: NAV_WIDTH, flex: 'none', position: 'sticky', top: 0 }}>
      <Input
        allowClear
        size="small"
        placeholder="Buscar configuração"
        aria-label="Buscar configuração"
        prefix={<Search {...ICON} />}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ marginBottom: 8 }}
      />
      <Menu
        mode="inline"
        selectedKeys={[current.id]}
        onClick={({ key }) => setSection(key as SectionId)}
        style={{ borderInlineEnd: 0, background: 'transparent' }}
        items={groups
          .map((group) => ({
            type: 'group' as const,
            key: group.label || 'outros',
            label: group.label || null,
            children: group.items.filter(matches).map((item) => {
              const Icon = item.icon
              return { key: item.id, icon: <Icon {...ICON} />, label: navLabel(item) }
            })
          }))
          .filter((group) => group.children.length > 0)}
      />
      {needle && !all.some(matches) && (
        <Typography.Text type="secondary" style={{ fontSize: 12, padding: '0 8px' }}>
          Nada encontrado para &quot;{query}&quot;.
        </Typography.Text>
      )}
    </div>
  )

  const body = isLoading ? (
    <Flex justify="center" style={{ padding: 48 }}>
      <Spin />
    </Flex>
  ) : failed.includes(current.id) ? (
    <Alert
      type="error"
      showIcon
      title={`Não foi possível ler o estado de ${current.label}.`}
      description="Feche e abra Configurações de novo. Se continuar, veja o log do app."
    />
  ) : (
    <RegionBoundary region={`configurações de ${current.label}`} resetKeys={[current.id]}>
      {current.id === 'geral' && (
        <GeneralSection autostart={autostart} onAutostartChange={setAutostart} />
      )}
      {current.id === 'aparencia' && <AppearanceSection />}
      {current.id === 'terminal' && <TerminalSection />}
      {current.id === 'backup' && <BackupSection />}
      {current.id === 'notion' && <NotionSection config={notion} onConfigChange={setNotion} />}
      {current.id === 'google' && gcal && (
        <GoogleCalendarSection status={gcal} onStatusChange={setGcal} />
      )}
      {current.id === 'jira' && jira && <JiraSection status={jira} onStatusChange={setJira} />}
      {current.id === 'mcp' && mcp && <McpSection status={mcp} onStatusChange={setMcp} />}
      {current.id === 'sobre' && <AboutSection />}
    </RegionBoundary>
  )

  const content = (
    <div style={{ maxWidth: CONTENT_MAX_WIDTH, minWidth: 0, flex: 1 }}>
      <SettingsHeader
        icon={current.icon}
        title={current.label}
        description={current.description}
        status={current.status}
      />
      {body}
    </div>
  )

  return (
    <div className="h-full overflow-y-auto">
      <PageContainer>
        {screens.md !== false ? (
          <Flex gap={24} align="start">
            {nav}
            {content}
          </Flex>
        ) : (
          <>
            <Select
              aria-label="Seção"
              value={current.id}
              onChange={(value: SectionId) => setSection(value)}
              style={{ width: '100%', marginBottom: 16 }}
              options={groups.map((group) => ({
                label: group.label || 'Outros',
                options: group.items.map((item) => {
                  const Icon = item.icon
                  return {
                    value: item.id,
                    label: (
                      <Space>
                        <Icon {...ICON} />
                        {item.label}
                        {item.status && (
                          <Badge
                            status={STATUS_BADGE[item.status.tone]}
                            text={<span className="sr-only">{item.status.label}</span>}
                          />
                        )}
                      </Space>
                    )
                  }
                })
              }))}
            />
            {content}
          </>
        )}
      </PageContainer>
    </div>
  )
}
