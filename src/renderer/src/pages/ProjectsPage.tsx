import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useErrorBoundary } from 'react-error-boundary'
import {
  Alert,
  Button,
  Empty,
  Flex,
  Grid,
  Input,
  Segmented,
  Select,
  Spin,
  Tabs,
  Typography
} from 'antd'
import { LayoutGrid, Plus, Search, Table2, TriangleAlert } from 'lucide-react'
import type { Area, Project } from '@shared/types'
import { localDateString } from '@shared/dueState'
import { NewProjectModal } from '@renderer/components/projects/NewProjectModal'
import { ProjectCard } from '@renderer/components/projects/ProjectCard'
import { ProjectGroupHeader, ProjectTabLabel } from '@renderer/components/projects/ProjectCells'
import { ProjectTable } from '@renderer/components/projects/ProjectTable'
import {
  PROJECT_TABS,
  SORT_OPTIONS,
  groupByArea,
  lacksNextAction,
  noNextActionNotice,
  statusCounts,
  visibleProjects,
  type ProjectSort,
  type ProjectTab,
  type ProjectView
} from '@renderer/components/projects/projectList'
import { useProjectMenu } from '@renderer/components/projects/useProjectMenu'
import { PageContainer } from '@renderer/components/shell/PageContainer'
import { usePersistedState } from '@renderer/hooks/usePersistedState'

const CARD_GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))',
  gap: 16
}

export function ProjectsPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { showBoundary } = useErrorBoundary()
  const screens = Grid.useBreakpoint()
  const narrow = screens.md === false
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [areas, setAreas] = useState<Area[]>([])
  const [tab, setTab] = useState<ProjectTab>('active')
  const [params] = useSearchParams()
  const [search, setSearch] = useState(() => params.get('q') ?? '')
  const [onlyWithoutNext, setOnlyWithoutNext] = useState(false)
  const [storedView, setView] = usePersistedState<ProjectView | 'list'>(
    'ticktask:projectListViewMode',
    'cards'
  )
  const [sort, setSort] = usePersistedState<ProjectSort>('ticktask:projects-sort', 'due')
  const [byArea, setByArea] = usePersistedState<boolean>('ticktask:projects-by-area', false)
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  const [creating, setCreating] = useState(false)
  const today = localDateString(new Date())
  const view: ProjectView = narrow ? 'cards' : storedView === 'cards' ? 'cards' : 'table'

  const load = useCallback(() => {
    Promise.all([window.api.listProjects(), window.api.listAreas()])
      .then(([list, areaList]) => {
        setProjects(list)
        setAreas(areaList)
      })
      .catch(showBoundary)
  }, [showBoundary])

  useEffect(() => {
    load()
    return window.api.onTasksRefresh(load)
  }, [load])

  const menuFor = useProjectMenu(areas, load)
  const all = useMemo(() => projects ?? [], [projects])
  const counts = useMemo(() => statusCounts(all), [all])
  const withoutNext = all.filter(lacksNextAction).length
  const rows = visibleProjects(all, { tab, search, onlyWithoutNext, sort })
  const groups = byArea ? groupByArea(rows, areas) : null
  const open = (id: number): void => {
    void navigate(`/project/${id}`)
  }
  const toggleGroup = (key: string): void =>
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const tabItems = PROJECT_TABS.map(({ key, label }) => ({
    key,
    label: <ProjectTabLabel tab={key} label={label} count={counts[key]} />
  }))
  const filtered = search.trim() !== '' || onlyWithoutNext

  const cards = (list: Project[]): React.ReactNode => (
    <div style={CARD_GRID}>
      {list.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          today={today}
          showStatus={tab === 'all'}
          menu={menuFor(project)}
          onOpen={() => open(project.id)}
        />
      ))}
    </div>
  )

  let body: React.ReactNode
  if (!projects) {
    body = (
      <Flex justify="center" style={{ padding: 48 }}>
        <Spin />
      </Flex>
    )
  } else if (rows.length === 0) {
    body = (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={filtered ? 'Nenhum projeto com esses filtros.' : 'Nenhum projeto aqui.'}
        style={{ padding: '32px 0' }}
      >
        {filtered ? (
          <Button
            onClick={() => {
              setSearch('')
              setOnlyWithoutNext(false)
            }}
          >
            Limpar filtros
          </Button>
        ) : (
          <Button
            type="primary"
            icon={<Plus size={14} strokeWidth={1.75} />}
            onClick={() => setCreating(true)}
          >
            Criar projeto
          </Button>
        )}
      </Empty>
    )
  } else if (view === 'table') {
    body = (
      <ProjectTable
        projects={rows}
        groups={groups}
        collapsed={collapsed}
        onToggleGroup={toggleGroup}
        showStatus={tab === 'all'}
        today={today}
        menuFor={menuFor}
        onOpen={open}
      />
    )
  } else if (groups) {
    body = groups.map((group) => (
      <section key={group.key} aria-label={group.name} style={{ marginBottom: 16 }}>
        <div className="ct-groupbar">
          <ProjectGroupHeader
            name={group.name}
            count={group.projects.length}
            collapsed={collapsed.has(group.key)}
            onToggle={() => toggleGroup(group.key)}
          />
        </div>
        {!collapsed.has(group.key) && cards(group.projects)}
      </section>
    ))
  } else {
    body = cards(rows)
  }

  return (
    <div className="h-full overflow-y-auto">
      <PageContainer>
        {narrow ? (
          <Select
            value={tab}
            onChange={setTab}
            style={{ width: '100%', marginBottom: 12 }}
            aria-label="Status do projeto"
            options={tabItems.map((item) => ({ value: item.key, label: item.label }))}
          />
        ) : (
          <Tabs
            activeKey={tab}
            onChange={(key) => setTab(key as ProjectTab)}
            items={tabItems}
            style={{ marginBottom: 4 }}
          />
        )}
        <Flex gap={8} wrap="wrap" align="center" style={{ marginBottom: 12 }}>
          <Input
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar em nome, resultado e área"
            aria-label="Buscar projetos"
            prefix={<Search size={16} strokeWidth={1.75} aria-hidden />}
            style={{ flex: '1 1 220px', maxWidth: 360 }}
          />
          <Select
            value={sort}
            onChange={setSort}
            options={SORT_OPTIONS}
            style={{ width: 170 }}
            aria-label="Ordenar"
          />
          <div style={{ flex: 1 }} />
          {!narrow && (
            <Segmented<ProjectView>
              value={view}
              onChange={setView}
              aria-label="Visão"
              options={[
                {
                  value: 'cards',
                  icon: <LayoutGrid size={14} strokeWidth={1.75} aria-hidden />,
                  label: screens.lg ? 'Cards' : undefined,
                  title: 'Cards'
                },
                {
                  value: 'table',
                  icon: <Table2 size={14} strokeWidth={1.75} aria-hidden />,
                  label: screens.lg ? 'Tabela' : undefined,
                  title: 'Tabela'
                }
              ]}
            />
          )}
          <Select
            value={byArea ? 'area' : 'none'}
            onChange={(value) => setByArea(value === 'area')}
            style={{ width: 170 }}
            aria-label="Agrupar"
            options={[
              { value: 'none', label: 'Sem agrupamento' },
              { value: 'area', label: 'Agrupar por área' }
            ]}
          />
          <Button
            type="primary"
            icon={<Plus size={14} strokeWidth={1.75} />}
            aria-label="Novo projeto"
            onClick={() => setCreating(true)}
          >
            {screens.sm ? 'Novo projeto' : null}
          </Button>
        </Flex>
        {withoutNext > 0 && (tab === 'active' || tab === 'all') && (
          <Alert
            showIcon
            type="warning"
            icon={<TriangleAlert size={16} strokeWidth={1.75} aria-hidden />}
            style={{ marginBottom: 12 }}
            title={
              <span>
                <Typography.Text strong>{noNextActionNotice(withoutNext)}</Typography.Text> Projeto
                sem próxima ação fica parado: defina o próximo passo concreto.
              </span>
            }
            action={
              <Button
                size="small"
                type={onlyWithoutNext ? 'primary' : 'default'}
                onClick={() => setOnlyWithoutNext((v) => !v)}
              >
                {onlyWithoutNext ? 'Mostrar todos' : 'Mostrar só esses'}
              </Button>
            }
          />
        )}
        {body}
      </PageContainer>
      <NewProjectModal
        open={creating}
        areas={areas}
        onCancel={() => setCreating(false)}
        onCreated={(project) => {
          setCreating(false)
          navigate(`/project/${project.id}`)
        }}
      />
    </div>
  )
}
