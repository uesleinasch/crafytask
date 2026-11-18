import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useErrorBoundary } from 'react-error-boundary'
import {
  Alert,
  App,
  Button,
  Dropdown,
  Empty,
  Flex,
  Grid,
  Input,
  Modal,
  Select,
  Spin,
  Table,
  Tooltip,
  Typography,
  theme,
  type MenuProps,
  type TableProps
} from 'antd'
import {
  ArchiveRestore,
  CalendarDays,
  Ellipsis,
  Eraser,
  FileText,
  Folder,
  Search,
  Trash2
} from 'lucide-react'
import {
  STATUS_LABELS,
  type Project,
  type Task,
  type TaskSort,
  type TaskStatus
} from '@shared/types'
import { archiveCutoff, ARCHIVE_AGE_MONTHS } from '@shared/archiveAge'
import { PageContainer } from '@renderer/components/shell/PageContainer'
import { Field } from '@renderer/components/shell/SectionHeader'
import { StatusChip } from '@renderer/components/chips/StatusChip'
import { ProjectLabel } from '@renderer/components/tasks/ProjectLabel'
import { FloatingActionBar } from '@renderer/components/tasks/FloatingActionBar'
import { plural } from '@renderer/components/tasks/bulkActionText'
import { formatShortDuration } from '@renderer/components/tasks/taskTableFormat'
import {
  archivedAfterFor,
  formatArchivedLong,
  formatArchivedShort,
  formatHoursMinutes,
  groupArchive,
  type ArchiveAge,
  type ArchiveGroup,
  type ArchiveGroupBy
} from '@renderer/components/tasks/archiveView'
import { errorMessage } from '@renderer/components/settings/settingsStatus'
import { useDebouncedValue } from '@renderer/hooks/useDebouncedValue'

type ArchiveSort = Extract<TaskSort, 'archived' | 'name' | 'total_time'>
type Row =
  | { kind: 'task'; key: string; task: Task }
  | { kind: 'group'; key: string; group: ArchiveGroup }

interface ArchiveColumn {
  title: React.ReactNode
  key: string
  width?: number
  align?: 'right'
  render: (task: Task) => React.ReactNode
}

const ICON = { size: 14, strokeWidth: 1.75, 'aria-hidden': true } as const
const ALL = 'all'
const NO_PROJECT = 'none'
const PURGE_LABELS: Record<number, string> = {
  3: 'mais de 3 meses',
  6: 'mais de 6 meses',
  12: 'mais de 1 ano',
  24: 'mais de 2 anos'
}

const RowMenuContext = createContext<((key: string) => MenuProps | null) | null>(null)

function MenuRow(
  props: React.HTMLAttributes<HTMLTableRowElement> & { 'data-row-key'?: string | number }
): React.JSX.Element {
  const menuOf = useContext(RowMenuContext)
  const menu = menuOf?.(String(props['data-row-key']))
  if (!menu) return <tr {...props} />
  return (
    <Dropdown menu={menu} trigger={['contextMenu']}>
      <tr {...props} />
    </Dropdown>
  )
}

const TABLE_COMPONENTS: TableProps<Row>['components'] = { body: { row: MenuRow } }

export function ArchivePage(): React.JSX.Element {
  const { token } = theme.useToken()
  const { message, modal } = App.useApp()
  const screens = Grid.useBreakpoint()
  const navigate = useNavigate()
  const { showBoundary } = useErrorBoundary()

  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput, 250)
  const [project, setProject] = useState<number | typeof ALL | typeof NO_PROJECT>(ALL)
  const [status, setStatus] = useState<TaskStatus | typeof ALL>(ALL)
  const [age, setAge] = useState<ArchiveAge>('all')
  const [sort, setSort] = useState<ArchiveSort>('archived')
  const [groupBy, setGroupBy] = useState<ArchiveGroupBy>('month')
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [totals, setTotals] = useState({ count: 0, seconds: 0 })
  const [oldCount, setOldCount] = useState(0)
  const [selected, setSelected] = useState<number[]>([])
  const [purge, setPurge] = useState<number | null>(null)
  const [purgeCount, setPurgeCount] = useState(0)

  const wide = screens.lg === true
  const medium = screens.md !== false
  const effectiveStatus = medium ? status : ALL
  const effectiveSort: ArchiveSort = medium ? sort : 'archived'

  const load = useCallback(async () => {
    const [list, archiveTotals, old] = await Promise.all([
      window.api.listTasks({
        archived: true,
        search,
        status: effectiveStatus,
        projectId: project === ALL ? null : project,
        archivedAfter: archivedAfterFor(age, new Date()),
        sort: effectiveSort
      }),
      window.api.taskTotals({ archived: true }),
      window.api.countArchivedBefore(archiveCutoff(12, new Date()))
    ])
    setTasks(list)
    setTotals(archiveTotals)
    setOldCount(old)
    setSelected((current) => current.filter((id) => list.some((task) => task.id === id)))
  }, [search, effectiveStatus, project, age, effectiveSort])

  useEffect(() => {
    load().catch(showBoundary)
    return window.api.onTasksRefresh(() => load().catch(showBoundary))
  }, [load, showBoundary])

  useEffect(() => {
    window.api.listProjects().then(setProjects).catch(showBoundary)
  }, [showBoundary])

  useEffect(() => {
    if (purge === null) return
    window.api
      .countArchivedBefore(archiveCutoff(purge, new Date()))
      .then(setPurgeCount)
      .catch(() => setPurgeCount(0))
  }, [purge])

  const byId = useMemo(() => new Map((tasks ?? []).map((task) => [task.id, task])), [tasks])
  const groups = useMemo(() => groupArchive(tasks ?? [], groupBy), [tasks, groupBy])
  const rows: Row[] = useMemo(
    () =>
      groups
        ? groups.flatMap((group) => [
            { kind: 'group' as const, key: `g:${group.key}`, group },
            ...group.tasks.map((task) => ({ kind: 'task' as const, key: String(task.id), task }))
          ])
        : (tasks ?? []).map((task) => ({ kind: 'task' as const, key: String(task.id), task })),
    [groups, tasks]
  )

  const filtered =
    search.trim() !== '' || project !== ALL || effectiveStatus !== ALL || age !== 'all'
  const mono: React.CSSProperties = {
    fontFamily: token.fontFamilyCode,
    fontVariantNumeric: 'tabular-nums'
  }

  function clearFilters(): void {
    setSearchInput('')
    setProject(ALL)
    setStatus(ALL)
    setAge('all')
  }

  async function restore(ids: number[]): Promise<void> {
    const entries = ids.map((id) => ({ id, archived_at: byId.get(id)?.archived_at ?? null }))
    try {
      await window.api.bulkSetArchived(ids, false)
      await load()
    } catch (error) {
      message.error(errorMessage(error))
      return
    }
    const undo = async (): Promise<void> => {
      message.destroy('archive-restore')
      try {
        await window.api.restoreArchived(entries)
        await load()
      } catch (error) {
        message.error(errorMessage(error))
      }
    }
    message.success({
      key: 'archive-restore',
      duration: 5,
      content: (
        <span>
          {plural(ids.length, 'tarefa voltou', 'tarefas voltaram')} para as listas ·{' '}
          <Typography.Link onClick={() => void undo()}>Desfazer</Typography.Link>
        </span>
      )
    })
  }

  function destroy(ids: number[]): void {
    const doomed = ids.map((id) => byId.get(id)).filter((task): task is Task => !!task)
    const seconds = doomed.reduce((sum, task) => sum + task.total_seconds, 0)
    modal.confirm({
      title:
        doomed.length === 1
          ? `Excluir "${doomed[0].name}" de vez?`
          : `Excluir ${doomed.length} tarefas de vez?`,
      content: `Apaga ${doomed.length === 1 ? 'a tarefa' : 'as tarefas'}, ${seconds ? `${formatHoursMinutes(seconds)} de sessões, ` : ''}notas e desenhos. No Notion e no Google também, se estiverem ligados. Não dá para desfazer.`,
      okText: 'Excluir de vez',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await window.api.bulkDeleteTasks(ids)
          await load()
          message.success(plural(ids.length, 'tarefa excluída', 'tarefas excluídas'))
        } catch (error) {
          message.error(errorMessage(error))
        }
      }
    })
  }

  async function runPurge(): Promise<void> {
    if (purge === null) return
    try {
      const deleted = await window.api.deleteArchivedBefore(archiveCutoff(purge, new Date()))
      setPurge(null)
      await load()
      message.success(`${plural(deleted, 'tarefa excluída', 'tarefas excluídas')} de vez`)
    } catch (error) {
      message.error(errorMessage(error))
    }
  }

  const openTask = (id: number): void => {
    void navigate(`/task/${id}`)
  }

  function menuFor(task: Task): MenuProps {
    return {
      items: [
        { key: 'open', icon: <FileText {...ICON} />, label: 'Abrir (só leitura)' },
        { key: 'restore', icon: <ArchiveRestore {...ICON} />, label: 'Desarquivar' },
        { type: 'divider' },
        { key: 'delete', icon: <Trash2 {...ICON} />, label: 'Excluir de vez…', danger: true }
      ],
      onClick: ({ key, domEvent }) => {
        domEvent.stopPropagation()
        if (key === 'open') openTask(task.id)
        if (key === 'restore') void restore([task.id])
        if (key === 'delete') destroy([task.id])
      }
    }
  }

  const menuByKey = (key: string): MenuProps | null => {
    const task = byId.get(Number(key))
    return task ? menuFor(task) : null
  }

  const projectLabel = (task: Task): React.JSX.Element => (
    <ProjectLabel name={task.project_name ?? 'Sem projeto'} color={task.project_color} />
  )

  const taskColumns: ArchiveColumn[] = [
    {
      title: 'ID',
      key: 'id',
      width: 72,
      render: (task) => (
        <span style={{ ...mono, fontSize: 12, color: token.colorTextTertiary }}>#{task.id}</span>
      )
    },
    {
      title: 'Tarefa',
      key: 'name',
      render: (task) => (
        <Flex vertical gap={2} style={{ minWidth: 0 }}>
          <Typography.Link
            ellipsis
            onClick={() => openTask(task.id)}
            style={{ color: token.colorText, fontWeight: 500 }}
          >
            {task.name}
          </Typography.Link>
          {!wide && (
            <Flex gap={8} wrap style={{ fontSize: 12 }}>
              {projectLabel(task)}
              <Typography.Text type="secondary">
                arquivada {formatArchivedShort(task.archived_at)}
              </Typography.Text>
            </Flex>
          )}
        </Flex>
      )
    },
    {
      title: (
        <Tooltip title="Status que a tarefa tinha ao ser arquivada">
          <span>Status</span>
        </Tooltip>
      ),
      key: 'status',
      width: 140,
      render: (task) => <StatusChip status={task.status} />
    },
    ...(wide && groupBy !== 'project'
      ? [
          {
            title: 'Projeto',
            key: 'project',
            width: 170,
            render: (task: Task) => projectLabel(task)
          }
        ]
      : []),
    ...(wide
      ? [
          {
            title: 'Arquivada em',
            key: 'archived_at',
            width: 120,
            render: (task: Task) => (
              <Tooltip title={formatArchivedLong(task.archived_at)}>
                <span style={mono}>{formatArchivedShort(task.archived_at)}</span>
              </Tooltip>
            )
          }
        ]
      : []),
    ...(medium
      ? [
          {
            title: 'Tempo',
            key: 'time',
            width: 88,
            align: 'right' as const,
            render: (task: Task) => (
              <span style={mono}>{formatShortDuration(task.total_seconds)}</span>
            )
          }
        ]
      : []),
    {
      title: '',
      key: 'actions',
      width: medium ? 148 : 48,
      render: (task) => (
        <Flex gap={4} justify="flex-end">
          {medium && (
            <Button
              size="small"
              icon={<ArchiveRestore {...ICON} />}
              onClick={() => void restore([task.id])}
            >
              Desarquivar
            </Button>
          )}
          <Dropdown menu={menuFor(task)} trigger={['click']} placement="bottomRight">
            <Button
              size="small"
              type="text"
              aria-label="Mais ações"
              icon={<Ellipsis {...ICON} />}
            />
          </Dropdown>
        </Flex>
      )
    }
  ]

  const groupHeader = (group: ArchiveGroup): React.JSX.Element => (
    <Flex align="center" gap={8}>
      {group.kind === 'month' ? (
        <CalendarDays {...ICON} color={token.colorTextTertiary} />
      ) : group.color ? (
        <span
          aria-hidden
          style={{ width: 8, height: 8, borderRadius: 999, background: group.color }}
        />
      ) : (
        <Folder {...ICON} color={token.colorTextTertiary} />
      )}
      <Typography.Text
        strong
        style={{ textTransform: group.kind === 'month' ? 'capitalize' : 'none' }}
      >
        {group.label}
      </Typography.Text>
      <Typography.Text type="secondary" style={mono}>
        {group.tasks.length}
      </Typography.Text>
    </Flex>
  )

  const columns: TableProps<Row>['columns'] = taskColumns.map((column, index) => ({
    title: column.title,
    key: column.key,
    width: column.width,
    align: column.align,
    render: (_: unknown, row: Row) =>
      row.kind === 'group'
        ? index === 0
          ? groupHeader(row.group)
          : null
        : column.render(row.task),
    onCell: (row: Row) =>
      row.kind === 'group' ? { colSpan: index === 0 ? taskColumns.length : 0 } : {}
  }))

  const toolbar = (
    <Flex gap={8} wrap align="center" style={{ marginBottom: 12 }}>
      <Input
        allowClear
        aria-label="Buscar no arquivo"
        placeholder="Buscar por nome ou #id"
        prefix={<Search {...ICON} />}
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        style={{ flex: '1 1 220px', maxWidth: 320 }}
      />
      <Select
        aria-label="Projeto"
        value={project}
        onChange={setProject}
        showSearch={{ optionFilterProp: 'title' }}
        style={{ width: 180 }}
        options={[
          { value: ALL, title: 'Todos os projetos', label: 'Todos os projetos' },
          { value: NO_PROJECT, title: 'Sem projeto', label: 'Sem projeto' },
          ...projects.map((p) => ({
            value: p.id,
            title: p.name,
            label: <ProjectLabel name={p.name} color={p.color} />
          }))
        ]}
      />
      {medium && (
        <Select
          aria-label="Status ao arquivar"
          value={status}
          onChange={setStatus}
          style={{ width: 160 }}
          options={[
            { value: ALL, label: 'Qualquer status' },
            ...(Object.keys(STATUS_LABELS) as TaskStatus[]).map((value) => ({
              value,
              label: STATUS_LABELS[value]
            }))
          ]}
        />
      )}
      <Select<ArchiveAge>
        aria-label="Arquivada em"
        value={age}
        onChange={setAge}
        style={{ width: 170 }}
        options={[
          { value: 'all', label: 'Qualquer data' },
          { value: '30', label: 'Últimos 30 dias' },
          { value: '90', label: 'Últimos 90 dias' },
          { value: '365', label: 'Último ano' }
        ]}
      />
      <div style={{ flex: 1 }} />
      {medium && (
        <Select<ArchiveSort>
          aria-label="Ordenar"
          value={sort}
          onChange={setSort}
          style={{ width: 190 }}
          options={[
            { value: 'archived', label: 'Arquivadas por último' },
            { value: 'name', label: 'Ordenar por nome' },
            { value: 'total_time', label: 'Mais tempo registrado' }
          ]}
        />
      )}
      <Select<ArchiveGroupBy>
        aria-label="Agrupar"
        value={groupBy}
        onChange={setGroupBy}
        style={{ width: 170 }}
        options={[
          { value: 'month', label: 'Agrupar por mês' },
          { value: 'project', label: 'Agrupar por projeto' },
          { value: 'none', label: 'Sem agrupamento' }
        ]}
      />
      <Dropdown
        trigger={['click']}
        menu={{
          items: [
            { key: 'purge', icon: <Eraser {...ICON} />, label: 'Limpar o arquivo…', danger: true }
          ],
          onClick: () => setPurge(12)
        }}
      >
        <Button aria-label="Mais ações do arquivo" icon={<Ellipsis {...ICON} />} />
      </Dropdown>
    </Flex>
  )

  let body: React.ReactNode
  if (tasks === null) {
    body = (
      <Flex justify="center" style={{ padding: 48 }}>
        <Spin />
      </Flex>
    )
  } else if (totals.count === 0) {
    body = (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <span>
            Nada no arquivo.
            <br />
            <Typography.Text type="secondary">
              Arquive pelo menu ⋯ de uma tarefa para tirá-la das listas sem apagar nada.
            </Typography.Text>
          </span>
        }
      />
    )
  } else if (tasks.length === 0) {
    body = (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="Nenhuma tarefa arquivada com esses filtros."
      >
        {filtered && <Button onClick={clearFilters}>Limpar filtros</Button>}
      </Empty>
    )
  } else {
    body = (
      <RowMenuContext.Provider value={menuByKey}>
        <Table<Row>
          rowKey="key"
          size={screens.xxl ? 'middle' : 'small'}
          columns={columns}
          dataSource={rows}
          scroll={{ x: 'max-content' }}
          components={TABLE_COMPONENTS}
          rowClassName={(row) => (row.kind === 'group' ? 'ct-table-grouprow' : '')}
          pagination={groups ? false : { pageSize: 20, hideOnSinglePage: true, size: 'small' }}
          rowSelection={{
            selectedRowKeys: selected.map(String),
            onChange: (keys) =>
              setSelected(keys.map(Number).filter((id) => Number.isInteger(id) && byId.has(id))),
            getCheckboxProps: (row) => ({
              disabled: row.kind === 'group',
              style: row.kind === 'group' ? { display: 'none' } : undefined
            })
          }}
        />
      </RowMenuContext.Provider>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <PageContainer>
        <Flex align="flex-start" gap="8px 16px" wrap style={{ marginBottom: 12 }}>
          <Typography.Text type="secondary" style={{ flex: '1 1 320px', minWidth: 0 }}>
            Arquivar tira a tarefa de todas as listas sem apagar nada: tempo, notas e sessões
            continuam. Projetos arquivados ficam em{' '}
            <Typography.Link onClick={() => void navigate('/projects')}>
              Projetos → Arquivados
            </Typography.Link>
            .
          </Typography.Text>
          <Typography.Text type="secondary" style={{ ...mono, fontSize: 12 }}>
            {plural(totals.count, 'tarefa', 'tarefas')} · {formatHoursMinutes(totals.seconds)}{' '}
            registradas
          </Typography.Text>
        </Flex>
        {oldCount > 0 && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message={`${plural(oldCount, 'tarefa está', 'tarefas estão')} no arquivo há mais de um ano.`}
            action={
              <Button size="small" onClick={() => setPurge(12)}>
                Revisar e limpar
              </Button>
            }
          />
        )}
        {toolbar}
        {body}
        {selected.length > 0 && (
          <FloatingActionBar>
            <Typography.Text strong>
              {plural(selected.length, 'selecionada', 'selecionadas')}
            </Typography.Text>
            <Button size="small" type="link" onClick={() => setSelected([])}>
              Limpar
            </Button>
            <div style={{ flex: 1 }} />
            <Button
              size="small"
              icon={<ArchiveRestore {...ICON} />}
              onClick={() => void restore(selected)}
            >
              Desarquivar
            </Button>
            <Button
              size="small"
              danger
              icon={<Trash2 {...ICON} />}
              onClick={() => destroy(selected)}
            >
              Excluir de vez
            </Button>
          </FloatingActionBar>
        )}
      </PageContainer>
      <Modal
        open={purge !== null}
        title="Limpar o arquivo"
        okText={
          purgeCount ? `Excluir ${plural(purgeCount, 'tarefa', 'tarefas')}` : 'Nada para excluir'
        }
        okButtonProps={{ danger: true, disabled: !purgeCount }}
        cancelText="Cancelar"
        onCancel={() => setPurge(null)}
        onOk={() => void runPurge()}
        destroyOnHidden
      >
        {purge !== null && (
          <Flex vertical gap={12}>
            <Field label="Arquivadas há">
              <Select<number>
                value={purge}
                onChange={setPurge}
                style={{ width: '100%' }}
                options={ARCHIVE_AGE_MONTHS.map((months) => ({
                  value: months,
                  label: PURGE_LABELS[months]
                }))}
              />
            </Field>
            <Typography.Text>
              {purgeCount ? (
                <span>
                  <strong>{plural(purgeCount, 'tarefa', 'tarefas')}</strong>{' '}
                  {purgeCount === 1 ? 'vai ser apagada' : 'vão ser apagadas'} de vez, com sessões,
                  notas e desenhos.
                </span>
              ) : (
                'Nenhuma tarefa arquivada há tanto tempo.'
              )}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Faça um backup antes se quiser guardar o histórico de tempo (Configurações → Backup).
            </Typography.Text>
          </Flex>
        )}
      </Modal>
    </div>
  )
}
