import { createContext, useContext } from 'react'
import {
  Button,
  Dropdown,
  Flex,
  Grid,
  Table,
  Tooltip,
  Typography,
  theme,
  type MenuProps,
  type TableColumnsType,
  type TableProps
} from 'antd'
import { Ellipsis, Target } from 'lucide-react'
import type { Project } from '@shared/types'
import { ProjectStatusChip } from '@renderer/components/chips/ProjectStatusChip'
import { formatShortDuration } from '@renderer/components/tasks/taskTableFormat'
import { NextActionCell, ProjectDue, ProjectGroupHeader, ProjectProgress } from './ProjectCells'
import type { ProjectGroup } from './projectList'

type Row =
  | { kind: 'project'; key: string; project: Project }
  | { kind: 'group'; key: string; group: ProjectGroup }

interface ProjectTableProps {
  projects: Project[]
  groups: ProjectGroup[] | null
  collapsed: Set<string>
  onToggleGroup: (key: string) => void
  showStatus: boolean
  today: string
  menuFor: (project: Project) => MenuProps
  onOpen: (id: number) => void
}

const MenuContext = createContext<((key: string) => MenuProps | null) | null>(null)

function MenuRow(
  props: React.HTMLAttributes<HTMLTableRowElement> & { 'data-row-key'?: string | number }
): React.JSX.Element {
  const menuOf = useContext(MenuContext)
  const menu = menuOf?.(String(props['data-row-key']))
  if (!menu) return <tr {...props} />
  return (
    <Dropdown menu={menu} trigger={['contextMenu']}>
      <tr {...props} />
    </Dropdown>
  )
}

const COMPONENTS: TableProps<Row>['components'] = { body: { row: MenuRow } }
const ICON = { size: 14, strokeWidth: 1.75, 'aria-hidden': true } as const

export function ProjectTable({
  projects,
  groups,
  collapsed,
  onToggleGroup,
  showStatus,
  today,
  menuFor,
  onOpen
}: ProjectTableProps): React.JSX.Element {
  const { token } = theme.useToken()
  const screens = Grid.useBreakpoint()
  const mono: React.CSSProperties = {
    fontFamily: token.fontFamilyCode,
    fontVariantNumeric: 'tabular-nums'
  }

  const rows: Row[] = groups
    ? groups.flatMap((group) => [
        { kind: 'group' as const, key: `g:${group.key}`, group },
        ...(collapsed.has(group.key)
          ? []
          : group.projects.map((project) => ({
              kind: 'project' as const,
              key: `p:${project.id}`,
              project
            })))
      ])
    : projects.map((project) => ({ kind: 'project' as const, key: `p:${project.id}`, project }))
  const byKey = new Map(projects.map((p) => [`p:${p.id}`, p]))

  interface Column {
    key: string
    title: React.ReactNode
    width?: number
    align?: 'right'
    render: (p: Project) => React.ReactNode
  }

  const base: Column[] = [
    {
      title: 'Projeto',
      key: 'name',
      render: (p) => (
        <Flex align="center" gap={8} style={{ minWidth: 0 }}>
          <span
            aria-hidden
            style={{ width: 8, height: 8, borderRadius: 999, flex: 'none', background: p.color }}
          />
          <Typography.Link
            href={`#/project/${p.id}`}
            onClick={(e) => {
              e.preventDefault()
              onOpen(p.id)
            }}
            ellipsis
            style={{ color: token.colorText, fontWeight: 500, minWidth: 0 }}
          >
            {p.name}
          </Typography.Link>
          {p.outcome && (
            <Tooltip title={`Resultado desejado: ${p.outcome}`}>
              <Target
                size={12}
                strokeWidth={1.75}
                role="img"
                tabIndex={0}
                aria-label={`Resultado desejado: ${p.outcome}`}
                style={{ flex: 'none', color: token.colorTextTertiary }}
              />
            </Tooltip>
          )}
        </Flex>
      )
    },
    ...(showStatus
      ? [
          {
            title: 'Status',
            key: 'status',
            width: 128,
            render: (p: Project) => <ProjectStatusChip status={p.status} />
          }
        ]
      : []),
    ...(screens.lg && !groups
      ? [
          {
            title: 'Área',
            key: 'area',
            width: 150,
            render: (p: Project) => (
              <Typography.Text type="secondary" ellipsis>
                {p.area_name || '—'}
              </Typography.Text>
            )
          }
        ]
      : []),
    {
      title: 'Próxima ação',
      key: 'next',
      width: screens.xl ? 280 : 200,
      render: (p) => <NextActionCell project={p} />
    },
    {
      title: 'Progresso',
      key: 'progress',
      width: 150,
      render: (p) => <ProjectProgress project={p} width={64} />
    },
    ...(screens.md
      ? [
          {
            title: 'Prazo',
            key: 'due',
            width: 96,
            render: (p: Project) => <ProjectDue project={p} today={today} />
          }
        ]
      : []),
    ...(screens.xl
      ? [
          {
            title: 'Tempo',
            key: 'time',
            width: 84,
            align: 'right' as const,
            render: (p: Project) => (
              <span style={mono}>{formatShortDuration(p.total_seconds ?? 0)}</span>
            )
          }
        ]
      : []),
    {
      title: <span className="sr-only">Ações</span>,
      key: 'actions',
      width: 48,
      render: (p) => (
        <Dropdown menu={menuFor(p)} trigger={['click']} placement="bottomRight">
          <Button
            size="small"
            type="text"
            aria-label={`Mais ações de ${p.name}`}
            icon={<Ellipsis {...ICON} />}
          />
        </Dropdown>
      )
    }
  ]

  const columns: TableColumnsType<Row> = base.map((col, index) => ({
    key: col.key,
    title: col.title,
    width: col.width,
    align: col.align,
    render: (_: unknown, row: Row) => {
      if (row.kind === 'group') {
        return index === 0 ? (
          <ProjectGroupHeader
            name={row.group.name}
            count={row.group.projects.length}
            collapsed={collapsed.has(row.group.key)}
            onToggle={() => onToggleGroup(row.group.key)}
          />
        ) : null
      }
      return col.render(row.project)
    },
    onCell: (row: Row) => (row.kind === 'group' ? { colSpan: index === 0 ? base.length : 0 } : {})
  }))

  return (
    <MenuContext.Provider
      value={(key) => {
        const project = byKey.get(key)
        return project ? menuFor(project) : null
      }}
    >
      <Table<Row>
        rowKey="key"
        size={screens.xxl ? 'middle' : 'small'}
        columns={columns}
        dataSource={rows}
        pagination={false}
        scroll={{ x: 'max-content' }}
        components={COMPONENTS}
        rowClassName={(row) => (row.kind === 'group' ? 'ct-table-grouprow' : '')}
      />
    </MenuContext.Provider>
  )
}
