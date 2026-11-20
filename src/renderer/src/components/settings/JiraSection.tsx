import { useEffect, useState } from 'react'
import {
  App,
  Button,
  Checkbox,
  Flex,
  Input,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Typography,
  theme
} from 'antd'
import { Download, LogOut, RefreshCw } from 'lucide-react'
import {
  type JiraBoardSummary,
  type JiraStatus,
  type Project,
  type TaskStatus
} from '@shared/types'
import { StatusChip } from '@renderer/components/chips/StatusChip'
import { ProjectLabel } from '@renderer/components/tasks/ProjectLabel'
import { SettingRow, SettingsCard } from './SettingsLayout'
import { errorMessage } from './settingsStatus'

const ICON = { size: 16, strokeWidth: 1.75, 'aria-hidden': true } as const
const FIELD_WIDTH = 280

const LOCAL_STATUSES: TaskStatus[] = [
  'inbox',
  'proximas',
  'aguardando',
  'executando',
  'finalizada',
  'someday'
]

const CATEGORY_LABELS = { new: 'A fazer', indeterminate: 'Em andamento', done: 'Concluído' }

const AUTO_IMPORT_OPTIONS = [
  { value: 0, label: 'Desligada' },
  { value: 15, label: 'A cada 15 min' },
  { value: 30, label: 'A cada 30 min' },
  { value: 60, label: 'A cada hora' }
]

const DEFAULT_PROJECT_ROW = '__default__'

interface BoardGroup {
  key: string | null
  name: string
  boards: JiraBoardSummary[]
}

function groupBoardsBySpace(boards: JiraBoardSummary[]): BoardGroup[] {
  const groups = new Map<string, BoardGroup>()
  for (const board of boards) {
    const name = board.spaceName ?? 'Sem espaço'
    const group = groups.get(name) ?? { key: board.spaceKey ?? null, name, boards: [] }
    group.boards.push(board)
    groups.set(name, group)
  }
  return [...groups.values()].sort((a, b) => {
    if (!a.key !== !b.key) return a.key ? -1 : 1
    return a.name.localeCompare(b.name, 'pt-BR')
  })
}

export function JiraSection({
  status,
  onStatusChange
}: {
  status: JiraStatus
  onStatusChange: (status: JiraStatus) => void
}): React.JSX.Element {
  const { token } = theme.useToken()
  const { message } = App.useApp()
  const [site, setSite] = useState(status.site)
  const [email, setEmail] = useState(status.email)
  const [apiToken, setApiToken] = useState('')
  const [busy, setBusy] = useState<'save' | 'boards' | 'import' | 'disconnect' | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const mono = { fontFamily: token.fontFamilyCode }
  const otherBusy = (own: typeof busy): boolean => busy !== null && busy !== own

  useEffect(() => {
    window.api.listProjects().then(setProjects).catch(console.error)
  }, [])

  async function save(patch: Parameters<typeof window.api.jiraSaveOptions>[0]): Promise<void> {
    try {
      onStatusChange(await window.api.jiraSaveOptions(patch))
    } catch (error) {
      message.error(errorMessage(error))
    }
  }

  async function handleSave(): Promise<void> {
    setBusy('save')
    try {
      const saved = await window.api.jiraSaveCredentials({ site, email, apiToken })
      setApiToken('')
      onStatusChange(saved)
      const me = await window.api.jiraTest()
      message.success(`Jira conectado como ${me.displayName}.`)
    } catch (error) {
      message.error(errorMessage(error))
      onStatusChange(await window.api.jiraGetStatus())
    } finally {
      setBusy(null)
    }
  }

  async function handleLoadBoards(): Promise<void> {
    setBusy('boards')
    try {
      await window.api.jiraListBoards()
      onStatusChange(await window.api.jiraGetStatus())
    } catch (error) {
      message.error(errorMessage(error))
    } finally {
      setBusy(null)
    }
  }

  async function handleImport(): Promise<void> {
    setBusy('import')
    try {
      const result = await window.api.jiraImportNow()
      if (result) {
        message.success(
          `Jira: ${result.created} novas, ${result.updated} atualizadas, ${result.unchanged} sem mudança.`
        )
      }
    } catch {
      /* o erro já aparece pelo evento jira:syncError */
    } finally {
      onStatusChange(await window.api.jiraGetStatus())
      setBusy(null)
    }
  }

  async function changeMapping(jiraStatus: string, local: TaskStatus | undefined): Promise<void> {
    const mapping = { ...status.statusMapping }
    if (local) mapping[jiraStatus] = local
    else delete mapping[jiraStatus]
    try {
      onStatusChange(await window.api.jiraSaveMapping(mapping))
    } catch (error) {
      message.error(errorMessage(error))
    }
  }

  async function changeSpaceProject(spaceKey: string, projectId: number | null): Promise<void> {
    if (spaceKey === DEFAULT_PROJECT_ROW) return save({ projectId })
    const spaceProjects = { ...status.spaceProjects }
    if (projectId) spaceProjects[spaceKey] = projectId
    else delete spaceProjects[spaceKey]
    return save({ spaceProjects })
  }

  async function toggleBoard(boardId: number): Promise<void> {
    const next = status.boardIds.includes(boardId)
      ? status.boardIds.filter((id) => id !== boardId)
      : [...status.boardIds, boardId]
    try {
      onStatusChange(await window.api.jiraSaveBoards(next))
    } catch (error) {
      message.error(errorMessage(error))
    }
  }

  async function handleDisconnect(): Promise<void> {
    setBusy('disconnect')
    try {
      const next = await window.api.jiraDisconnect()
      setSite(next.site)
      setEmail(next.email)
      setApiToken('')
      onStatusChange(next)
      message.success('Jira desconectado.')
    } catch (error) {
      message.error(errorMessage(error))
    } finally {
      setBusy(null)
    }
  }

  const credentialsChanged =
    site.trim() !== status.site || email.trim() !== status.email || apiToken.trim() !== ''
  const canSave = !!site.trim() && !!email.trim() && !!(apiToken.trim() || status.hasToken)

  const projectOptions = projects.map((project) => ({
    value: project.id,
    label: <ProjectLabel name={project.name} color={project.color} />,
    title: project.name
  }))

  const spaceRows = [
    { key: DEFAULT_PROJECT_ROW, name: 'Projeto padrão', projectId: status.projectId },
    ...status.knownSpaces.map((space) => ({
      key: space.key,
      name: space.name,
      projectId: status.spaceProjects[space.key] ?? null
    }))
  ]

  return (
    <Flex vertical gap={16}>
      <SettingsCard title="Conta">
        <SettingRow title="Site" description="Jira Cloud">
          <Input
            aria-label="Site do Jira Cloud"
            value={site}
            onChange={(e) => setSite(e.target.value)}
            placeholder="sua-empresa.atlassian.net"
            style={{ ...mono, width: FIELD_WIDTH, maxWidth: '100%' }}
          />
        </SettingRow>
        <SettingRow title="E-mail" description="Da conta Atlassian.">
          <Input
            aria-label="E-mail da conta Atlassian"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@empresa.com"
            style={{ width: FIELD_WIDTH, maxWidth: '100%' }}
          />
        </SettingRow>
        <SettingRow
          title="API token"
          description="Gere em id.atlassian.com → Segurança → Criar token de API. Fica criptografado no seu computador e nunca volta para a tela."
        >
          <Space.Compact style={{ maxWidth: '100%' }}>
            <Input.Password
              aria-label="API token do Jira"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              placeholder={status.hasToken ? '•••••••• (salvo)' : 'Cole o token'}
              style={{ ...mono, width: 180 }}
            />
            <Button
              type={status.connected ? 'default' : 'primary'}
              loading={busy === 'save'}
              disabled={otherBusy('save') || !canSave}
              onClick={handleSave}
            >
              {credentialsChanged || !status.connected ? 'Salvar e testar' : 'Testar conexão'}
            </Button>
          </Space.Compact>
        </SettingRow>
        {status.connected && (
          <SettingRow
            title="Desconectar"
            description="Apaga o acesso salvo e para a importação. As tasks importadas continuam."
          >
            <Popconfirm
              title="Desconectar o Jira?"
              description="O site, o e-mail, o token e os boards marcados saem do CrafyTask, e a importação e o worklog param. As tasks já importadas e as issues no Jira continuam como estão."
              okText="Desconectar"
              okButtonProps={{ danger: true }}
              cancelText="Cancelar"
              onConfirm={handleDisconnect}
            >
              <Button
                danger
                icon={<LogOut {...ICON} />}
                loading={busy === 'disconnect'}
                disabled={otherBusy('disconnect')}
              >
                Desconectar
              </Button>
            </Popconfirm>
          </SettingRow>
        )}
      </SettingsCard>

      {status.connected && (
        <>
          <SettingsCard
            title="Boards"
            extra={
              <Button
                size="small"
                type="link"
                icon={<RefreshCw size={14} strokeWidth={1.75} aria-hidden />}
                loading={busy === 'boards'}
                disabled={otherBusy('boards')}
                onClick={handleLoadBoards}
              >
                Carregar boards
              </Button>
            }
          >
            <SettingRow
              title="Boards que alimentam o app"
              description={
                status.boards.length === 0
                  ? 'Carregue os boards do seu Jira e marque os que devem alimentar o CrafyTask.'
                  : undefined
              }
              vertical
            >
              {status.boards.length > 0 && (
                <Flex vertical gap={12}>
                  {groupBoardsBySpace(status.boards).map((group) => (
                    <Flex key={group.name} vertical gap={6}>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {group.name}
                        {group.key && <span style={{ ...mono, marginLeft: 6 }}>{group.key}</span>}
                      </Typography.Text>
                      {group.boards.map((board) => (
                        <Checkbox
                          key={board.id}
                          checked={status.boardIds.includes(board.id)}
                          onChange={() => void toggleBoard(board.id)}
                        >
                          {board.name}
                        </Checkbox>
                      ))}
                    </Flex>
                  ))}
                </Flex>
              )}
            </SettingRow>
            <SettingRow
              title="Importar agora"
              description={
                status.lastImportAt
                  ? `Issues atribuídas a você nos boards marcados. Última tentativa em ${new Date(status.lastImportAt).toLocaleString('pt-BR')}.`
                  : 'Issues atribuídas a você nos boards marcados. Ainda não importado.'
              }
            >
              <Button
                type="primary"
                icon={<Download {...ICON} />}
                loading={busy === 'import'}
                disabled={otherBusy('import') || status.boardIds.length === 0}
                onClick={handleImport}
              >
                Importar
              </Button>
            </SettingRow>
            <SettingRow title="Importação automática">
              <Select
                aria-label="Importação automática"
                value={status.autoImportMinutes}
                onChange={(value: number) => void save({ autoImportMinutes: value })}
                options={AUTO_IMPORT_OPTIONS}
                style={{ width: 160 }}
              />
            </SettingRow>
          </SettingsCard>

          <SettingsCard title="Destino das tasks importadas">
            <SettingRow
              title="Projeto por espaço"
              description="Task nova vai para o projeto do espaço; sem escolha, para o projeto padrão. Na importação, task já vinculada e sem projeto também recebe o projeto do espaço."
              vertical
            >
              <Table
                size="small"
                pagination={false}
                rowKey="key"
                dataSource={spaceRows}
                columns={[
                  {
                    title: 'Espaço',
                    key: 'space',
                    render: (_, row) =>
                      row.key === DEFAULT_PROJECT_ROW ? (
                        <Typography.Text strong style={{ fontWeight: 500 }}>
                          {row.name}
                        </Typography.Text>
                      ) : (
                        <span>
                          {row.name}{' '}
                          <Typography.Text type="secondary" style={{ ...mono, fontSize: 12 }}>
                            {row.key}
                          </Typography.Text>
                        </span>
                      )
                  },
                  {
                    title: 'Projeto',
                    key: 'project',
                    width: 220,
                    render: (_, row) => (
                      <Select
                        size="small"
                        aria-label={`Projeto de ${row.name}`}
                        allowClear
                        value={row.projectId ?? undefined}
                        placeholder={
                          row.key === DEFAULT_PROJECT_ROW ? 'Sem projeto' : 'Projeto padrão'
                        }
                        onChange={(value?: number) =>
                          void changeSpaceProject(row.key, value ?? null)
                        }
                        options={projectOptions}
                        optionFilterProp="title"
                        showSearch
                        style={{ width: 200 }}
                      />
                    )
                  }
                ]}
              />
              {status.knownSpaces.length === 0 && (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Os espaços aparecem aqui ao marcar boards ou depois da primeira importação.
                </Typography.Text>
              )}
            </SettingRow>
            {status.knownStatuses.length > 0 && (
              <SettingRow
                title="Status inicial das tasks novas"
                description="Vale só quando a importação cria a task. Depois disso o status da task e o do Jira andam separados. Sem escolha, segue a categoria do Jira."
                vertical
              >
                <Table
                  size="small"
                  pagination={false}
                  rowKey="name"
                  dataSource={status.knownStatuses}
                  columns={[
                    {
                      title: 'Status no Jira',
                      key: 'jira',
                      render: (_, known) => (
                        <span>
                          {known.name}{' '}
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            ({CATEGORY_LABELS[known.category]})
                          </Typography.Text>
                        </span>
                      )
                    },
                    {
                      title: 'Status inicial',
                      key: 'local',
                      width: 220,
                      render: (_, known) => (
                        <Select
                          size="small"
                          aria-label={`Status inicial para ${known.name}`}
                          allowClear
                          value={status.statusMapping[known.name]}
                          placeholder="Padrão da categoria"
                          onChange={(value?: TaskStatus) => void changeMapping(known.name, value)}
                          options={LOCAL_STATUSES.map((local) => ({
                            value: local,
                            label: <StatusChip status={local} />
                          }))}
                          style={{ width: 200 }}
                        />
                      )
                    }
                  ]}
                />
              </SettingRow>
            )}
          </SettingsCard>

          <SettingsCard title="Opções">
            <SettingRow
              title="Registrar o tempo no Jira (worklog)"
              description="Cada sessão de 1 min ou mais em task vinculada vira um worklog na issue. Vale só para o tempo contado depois de ligar; zerar o timer apaga os worklogs criados pelo app."
            >
              <Switch
                aria-label="Registrar o tempo no Jira"
                checked={status.syncWorklogs}
                onChange={(checked) => void save({ syncWorklogs: checked })}
              />
            </SettingRow>
            <SettingRow
              title="Sincronizar tasks do Jira com o Notion"
              description="Envia as tasks vinculadas ao Jira para o banco do Notion, junto com as demais."
            >
              <Switch
                aria-label="Sincronizar tasks do Jira com o Notion"
                checked={status.syncToNotion}
                onChange={(checked) => void save({ syncToNotion: checked })}
              />
            </SettingRow>
          </SettingsCard>
        </>
      )}
    </Flex>
  )
}
