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
import { CirclePause, LayoutGrid, Plus, Search, Table2, TriangleAlert, Trophy } from 'lucide-react'
import type { Area, CreateProjectInput, Goal, Project } from '@shared/types'
import { localDateString } from '@shared/dueState'
import { HEALTH_LIMITS } from '@shared/healthLimits'
import { HorizonChip } from '@renderer/components/horizons/HorizonChip'
import { NewProjectModal } from '@renderer/components/projects/NewProjectModal'
import { ProjectCard } from '@renderer/components/projects/ProjectCard'
import { ProjectGroupHeader, ProjectTabLabel } from '@renderer/components/projects/ProjectCells'
import { ProjectTable } from '@renderer/components/projects/ProjectTable'
import {
  PROJECT_TABS,
  SORT_OPTIONS,
  groupByArea,
  isStalled,
  lacksNextAction,
  noNextActionNotice,
  stalledNotice,
  statusCounts,
  visibleProjects,
  type ProjectSort,
  type ProjectTab,
  type ProjectView
} from '@renderer/components/projects/projectList'
import { goalIdFromSearch } from '@renderer/components/projects/projectGoals'
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
  const [goals, setGoals] = useState<Goal[]>([])
  const [params, setParams] = useSearchParams()
  const [goalId, setGoalId] = useState(() => goalIdFromSearch(params))
  const [tab, setTab] = useState<ProjectTab>(() => (goalIdFromSearch(params) ? 'all' : 'active'))
  const [search, setSearch] = useState(() => params.get('q') ?? '')
  const [onlyWithoutNext, setOnlyWithoutNext] = useState(() => params.get('semProxima') === '1')
  const [onlyStalled, setOnlyStalled] = useState(() => params.get('parados') === '1')
  const [storedView, setView] = usePersistedState<ProjectView | 'list'>(
    'ticktask:projectListViewMode',
    'cards'
  )
  const [storedSort, setSort] = usePersistedState<ProjectSort>('ticktask:projects-sort', 'due')
  const [sortOverride, setSortOverride] = useState<ProjectSort | null>(() =>
    params.get('parados') === '1' ? 'activity' : null
  )
  const sort = sortOverride ?? storedSort
  const [byArea, setByArea] = usePersistedState<boolean>('ticktask:projects-by-area', false)
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  const [creating, setCreating] = useState<Pick<CreateProjectInput, 'area_id' | 'goal_id'> | null>(
    null
  )
  const today = localDateString(new Date())
  const view: ProjectView = narrow ? 'cards' : storedView === 'cards' ? 'cards' : 'table'

  useEffect(() => {
    const fromGoal = goalIdFromSearch(params)
    if (!fromGoal) return
    setGoalId(fromGoal)
    setTab('all')
  }, [params])

  useEffect(() => {
    const withoutNextParam = params.get('semProxima') === '1'
    const stalledParam = params.get('parados') === '1'
    if (!withoutNextParam && !stalledParam) return
    setTab('active')
    setOnlyWithoutNext(withoutNextParam)
    setOnlyStalled(stalledParam)
    setSortOverride(stalledParam ? 'activity' : null)
  }, [params])

  const load = useCallback(() => {
    Promise.all([window.api.listProjects(), window.api.listAreas(), window.api.listGoals()])
      .then(([list, areaList, goalList]) => {
        setProjects(list)
        setAreas(areaList)
        setGoals(goalList)
      })
      .catch(showBoundary)
  }, [showBoundary])

  useEffect(() => {
    load()
    return window.api.onTasksRefresh(load)
  }, [load])

  const menuFor = useProjectMenu(areas, goals, load)
  const all = useMemo(() => projects ?? [], [projects])
  const counts = useMemo(() => statusCounts(all), [all])
  const withoutNext = all.filter(lacksNextAction).length
  const now = new Date()
  const stalled = all.filter((p) => isStalled(p, now)).length
  const rows = visibleProjects(all, {
    tab,
    search,
    onlyWithoutNext,
    onlyStalled,
    goalId,
    now,
    sort
  })
  const goal = goalId ? goals.find((g) => g.id === goalId) : undefined
  const clearGoal = (): void => {
    setGoalId(null)
    if (params.has('meta')) {
      const next = new URLSearchParams(params)
      next.delete('meta')
      setParams(next, { replace: true })
    }
  }
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
  const otherFilters = search.trim() !== '' || onlyWithoutNext || onlyStalled
  const filtered = otherFilters || goalId !== null

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
  } else if (rows.length === 0 && goal && !otherFilters) {
    body = (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="Nenhum projeto serve a esta meta ainda."
        style={{ padding: '32px 0' }}
      >
        <Button
          type="primary"
          icon={<Plus size={14} strokeWidth={1.75} />}
          onClick={() => setCreating({ goal_id: goal.id, area_id: goal.area_id })}
        >
          Criar projeto para esta meta
        </Button>
      </Empty>
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
              setOnlyStalled(false)
              clearGoal()
            }}
          >
            Limpar filtros
          </Button>
        ) : (
          <Button
            type="primary"
            icon={<Plus size={14} strokeWidth={1.75} />}
            onClick={() => setCreating({})}
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
            onChange={(value) => {
              setSortOverride(null)
              setSort(value)
            }}
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
            onClick={() => setCreating({})}
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
        {goal && (
          <Alert
            showIcon
            type="info"
            icon={<Trophy size={16} strokeWidth={1.75} aria-hidden />}
            style={{ marginBottom: 12 }}
            title={
              <Flex align="center" gap={8} wrap>
                <HorizonChip h={goal.horizon} />
                <Typography.Text strong>Projetos que servem a “{goal.name}”</Typography.Text>
              </Flex>
            }
            action={
              <Button size="small" onClick={clearGoal}>
                Mostrar todos
              </Button>
            }
          />
        )}
        {onlyStalled && (
          <Alert
            showIcon
            type="info"
            icon={<CirclePause size={16} strokeWidth={1.75} aria-hidden />}
            style={{ marginBottom: 12 }}
            title={
              <span>
                <Typography.Text strong>{stalledNotice(stalled)}</Typography.Text> Sem sessão nem
                tarefa concluída há mais de {HEALTH_LIMITS.stalledProjectDays} dias.
              </span>
            }
            action={
              <Button size="small" onClick={() => setOnlyStalled(false)}>
                Mostrar todos
              </Button>
            }
          />
        )}
        {body}
      </PageContainer>
      <NewProjectModal
        open={creating !== null}
        areas={areas}
        goals={goals}
        initial={creating ?? undefined}
        onCancel={() => setCreating(null)}
        onCreated={(project) => {
          setCreating(null)
          navigate(`/project/${project.id}`)
        }}
      />
    </div>
  )
}
