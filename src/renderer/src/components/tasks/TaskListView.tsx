import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Alert,
  App,
  Button,
  Empty,
  Flex,
  Grid,
  Input as AntInput,
  Segmented,
  Select,
  Spin,
  Tabs,
  Typography
} from 'antd'
import { useLocation, useNavigate } from 'react-router-dom'
import { TaskTable } from '@renderer/components/tasks/TaskTable'
import { STATUS_ICONS } from '@renderer/components/chips/statusMeta'
import { errorMessage } from '@renderer/components/settings/settingsStatus'
import { STATUS_COLORS } from '@renderer/theme/semantic'
import { useThemeSettings } from '@renderer/theme/themeSettings'
import { useTasks } from '@renderer/hooks/useTasks'
import { usePersistedState } from '@renderer/hooks/usePersistedState'
import { useIncrementalList } from '@renderer/hooks/useIncrementalList'
import { applyGroupOrder, moveGroupKey } from '@renderer/lib/groupOrder'
import {
  buildTaskGroups,
  JIRA_GROUP_MODES,
  type GroupBy,
  type TaskGroup
} from '@renderer/lib/taskGrouping'
import { TaskCardGrid, TaskCardGroups, TaskKanban } from '@renderer/components/tasks/TaskCardViews'
import {
  TaskMenuChangedContext,
  TaskMenuDataContext,
  type TaskMenuData
} from '@renderer/components/taskMenuContext'
import { BulkActionBar } from '@renderer/components/tasks/BulkActionBar'
import { plural } from '@renderer/components/tasks/bulkActionText'
import { StatusTabLabel } from '@renderer/components/tasks/StatusTabLabel'
import { RegionBoundary } from '@renderer/components/shell/RegionBoundary'
import { TaskFilters } from '@renderer/components/tasks/TaskFilters'
import {
  EMPTY_TASK_FILTERS,
  listIntentFromSearch,
  type FilterStatus,
  activeFilterCount,
  type TaskFiltersValue
} from '@renderer/components/tasks/taskFilterState'
import { useDebouncedValue } from '@renderer/hooks/useDebouncedValue'
import {
  LIST_GROUP_KEY,
  LIST_VIEW_KEY,
  PROJECT_GROUP_KEY,
  PROJECT_VIEW_KEY,
  effectiveListView,
  kanbanGroup,
  legacyListPrefs,
  type ListGroup,
  type ListView
} from '@renderer/lib/taskListView'
import { TASK_STATUSES, type TaskStatusCounts } from '@shared/taskStatusCounts'
import { localDateString } from '@shared/dueState'
import {
  STATUS_LABELS,
  type Task,
  type TaskStatus,
  type Tag,
  type Context,
  type Project,
  type TaskListFilters
} from '@shared/types'
import { Copy, LayoutGrid, Plus, Search, Columns3, Table2 } from 'lucide-react'

const STATUS_TABS: FilterStatus[] = ['all', ...TASK_STATUSES]
const SEARCH_DEBOUNCE_MS = 250

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

const GROUP_BY_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'project', label: 'Projeto' },
  { value: 'context', label: 'Contexto' },
  { value: 'jira_space', label: 'Espaço Jira' },
  { value: 'jira_parent', label: 'Pai Jira' }
]

interface TaskListViewProps {
  project?: { id: number; name: string }
  onChanged?: () => void
}

function statusColumns(tasks: Task[]): TaskGroup[] {
  return TASK_STATUSES.map((status) => ({
    key: status,
    label: STATUS_LABELS[status],
    tasks: tasks.filter((task) => task.status === status)
  }))
}

function StatusColumnIcon({ status }: { status: TaskStatus }): React.JSX.Element {
  const { mode } = useThemeSettings()
  const Icon = STATUS_ICONS[status]
  return <Icon size={14} strokeWidth={1.75} aria-hidden color={STATUS_COLORS[status][mode].fg} />
}

export function TaskListView({ project, onChanged }: TaskListViewProps): React.JSX.Element {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const inProject = !!project
  const projectId = project?.id
  const [storedStatus, setStoredStatus] = usePersistedState<FilterStatus>(
    'ticktask:taskListStatusFilter',
    'inbox'
  )
  const [projectStatus, setProjectStatus] = useState<FilterStatus>('all')
  const statusFilter = inProject ? projectStatus : storedStatus
  const setStatusFilter = inProject ? setProjectStatus : setStoredStatus
  const { search } = useLocation()
  const [filterValue, setFilterValue] = useState<TaskFiltersValue>(
    () => (inProject ? null : listIntentFromSearch(search)?.filters) ?? EMPTY_TASK_FILTERS
  )
  useEffect(() => {
    if (inProject) return
    const intent = listIntentFromSearch(search)
    if (!intent) return
    setFilterValue(intent.filters)
    setStoredStatus(intent.status)
  }, [search, setStoredStatus, inProject])
  const [newName, setNewName] = useState('')
  const {
    category: categoryFilter,
    contextId: contextFilter,
    projectId: projectFilter,
    energy: energyFilter,
    tagId: tagFilter,
    blockedOnly: blockedFilter,
    overdue: overdueFilter,
    staleDays: staleFilter,
    sort: sortMode
  } = filterValue
  const today = localDateString(new Date())
  const [searchInput, setSearchInput] = useState('')
  const searchQuery = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS)
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [availableContexts, setAvailableContexts] = useState<Context[]>([])
  const [availableProjects, setAvailableProjects] = useState<Project[]>([])
  const legacyPrefs = useMemo(() => legacyListPrefs(readStorage), [])
  const [listView, setListView] = usePersistedState<ListView>(
    inProject ? PROJECT_VIEW_KEY : LIST_VIEW_KEY,
    inProject ? 'table' : legacyPrefs.view
  )
  const [listGroup, setListGroup] = usePersistedState<ListGroup>(
    inProject ? PROJECT_GROUP_KEY : LIST_GROUP_KEY,
    inProject ? 'none' : legacyPrefs.group
  )
  const [groupOrder, setGroupOrder] = usePersistedState<Partial<Record<GroupBy, string[]>>>(
    inProject ? 'ticktask:projectTaskGroupOrder' : 'ticktask:taskListGroupOrder',
    {}
  )
  const screens = Grid.useBreakpoint()
  const narrow = screens.md === false
  const view = effectiveListView(listView, statusFilter, narrow, inProject)
  const kanbanActive = view === 'kanban'
  const groupingEnabled =
    !kanbanActive && listGroup !== 'none' && !(inProject && listGroup === 'project')
  const showGroups = kanbanActive || groupingEnabled
  const activeGroupBy: GroupBy = inProject
    ? listGroup === 'none' || listGroup === 'project'
      ? 'context'
      : listGroup
    : kanbanActive
      ? kanbanGroup(listGroup)
      : listGroup === 'none'
        ? 'project'
        : listGroup
  const viewMode: 'cards' | 'table' = view === 'cards' ? 'cards' : 'table'
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([])
  const [loadedSubtasks, setLoadedSubtasks] = useState<Task[]>([])
  const contentRef = useRef<HTMLDivElement>(null)

  const filters = useMemo<TaskListFilters>(
    () => ({
      archived: false,
      status: statusFilter,
      category: categoryFilter,
      projectId: projectId ?? (projectFilter === -1 ? 'none' : projectFilter),
      energy: energyFilter ?? undefined,
      tagId: tagFilter,
      contextId: contextFilter,
      search: searchQuery,
      blockedOnly: blockedFilter,
      ...(overdueFilter && { overdueAt: { date: today, time: '00:00' } }),
      ...((overdueFilter || staleFilter !== null) && {
        excludeStatus: ['finalizada' as const]
      }),
      staleDays: staleFilter ?? undefined,
      sort: sortMode
    }),
    [
      today,
      overdueFilter,
      staleFilter,
      projectId,
      statusFilter,
      categoryFilter,
      projectFilter,
      energyFilter,
      tagFilter,
      contextFilter,
      searchQuery,
      blockedFilter,
      sortMode
    ]
  )

  const { tasks, loading, error, createTask, refreshTasks } = useTasks(filters)
  const [statusCounts, setStatusCounts] = useState<TaskStatusCounts | null>(null)

  useEffect(() => {
    window.api.getTaskStatusCounts(filters).then(setStatusCounts).catch(console.error)
  }, [filters, tasks])
  const [totalTasks, setTotalTasks] = useState(0)
  const {
    visible: renderedTasks,
    hasMore,
    remaining,
    sentinelRef
  } = useIncrementalList(tasks, JSON.stringify(filters))

  useEffect(() => {
    window.api.listTags().then(setAvailableTags).catch(console.error)
    window.api.listContexts().then(setAvailableContexts).catch(console.error)
    window.api.listProjects().then(setAvailableProjects).catch(console.error)
  }, [])

  useEffect(() => {
    window.api
      .countTasks(projectId ? { archived: false, projectId } : { archived: false })
      .then(setTotalTasks)
      .catch(console.error)
  }, [tasks, projectId])

  useEffect(() => {
    if (error) message.error(error)
  }, [error, message])

  useEffect(() => {
    const unsubscribe = window.api.onTasksRefresh(() => {
      refreshTasks()
    })
    return unsubscribe
  }, [refreshTasks])

  const filteredTaskIds = useMemo(() => tasks.map((task) => task.id), [tasks])

  const defaultTaskGroups = useMemo<TaskGroup[]>(
    () =>
      inProject && kanbanActive
        ? statusColumns(tasks)
        : showGroups
          ? buildTaskGroups(tasks, activeGroupBy)
          : [],
    [inProject, kanbanActive, showGroups, activeGroupBy, tasks]
  )
  const hasJiraTasks = useMemo(() => tasks.some((task) => task.jira_key), [tasks])
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  useEffect(() => setCollapsedGroups(new Set()), [activeGroupBy])
  const toggleCollapsedGroup = useCallback((key: string): void => {
    setCollapsedGroups((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])
  const tasksById = useMemo(
    () => new Map([...loadedSubtasks, ...tasks].map((task) => [task.id, task])),
    [tasks, loadedSubtasks]
  )
  const taskById = useCallback((id: number) => tasksById.get(id), [tasksById])
  const menuData = useMemo<TaskMenuData>(
    () => ({
      projects: availableProjects,
      contexts: availableContexts,
      selectedIds: selectedTaskIds,
      taskById
    }),
    [availableProjects, availableContexts, selectedTaskIds, taskById]
  )
  const filtering = searchQuery.trim() !== '' || activeFilterCount(filterValue) > 0
  const contextGroupingRepeats =
    !loading &&
    showGroups &&
    activeGroupBy === 'context' &&
    tasks.some((task) => (task.contexts?.length ?? 0) > 1)

  const taskGroups = useMemo(
    () => applyGroupOrder(defaultTaskGroups, groupOrder[activeGroupBy] ?? []),
    [defaultTaskGroups, groupOrder, activeGroupBy]
  )

  const handleReorderGroups = useCallback(
    (activeKey: string, overKey: string): void => {
      setGroupOrder({
        ...groupOrder,
        [activeGroupBy]: moveGroupKey(
          groupOrder[activeGroupBy] ?? [],
          taskGroups.map((group) => group.key),
          activeKey,
          overKey
        )
      })
    },
    [groupOrder, activeGroupBy, taskGroups, setGroupOrder]
  )
  const selectedTaskIdSet = useMemo(() => new Set(selectedTaskIds), [selectedTaskIds])

  useEffect(() => {
    setSelectedTaskIds((current) => {
      const allowedIds = new Set([...filteredTaskIds, ...loadedSubtasks.map((t) => t.id)])
      const next = current.filter((id) => allowedIds.has(id))
      return next.length === current.length ? current : next
    })
  }, [filteredTaskIds, loadedSubtasks])

  const hadSelection = useRef(false)
  useEffect(() => {
    const hasSelection = selectedTaskIds.length > 0
    if (hadSelection.current && !hasSelection && document.activeElement === document.body) {
      contentRef.current?.focus()
    }
    hadSelection.current = hasSelection
  }, [selectedTaskIds])

  const handleScheduleForToday = useCallback(
    async (taskId: number): Promise<void> => {
      const today = localDateString(new Date())
      const task = tasks.find((t) => t.id === taskId)
      const isAlreadyToday = task?.scheduled_date === today
      try {
        await window.api.scheduleTaskForDate(taskId, isAlreadyToday ? null : today)
        await refreshTasks()
        message.success(isAlreadyToday ? 'Fora do plano de hoje' : 'No plano de hoje')
      } catch (err) {
        console.error('Erro ao programar tarefa:', err)
        message.error('Erro ao atualizar agendamento')
      }
    },
    [refreshTasks, tasks, message]
  )

  const addToProject = async (): Promise<void> => {
    const name = newName.trim()
    if (!project || !name) return
    try {
      const task = await createTask({ name, project_id: project.id })
      await window.api.updateStatus(task.id, 'proximas')
      await refreshTasks()
      onChanged?.()
      setNewName('')
      message.success(`Tarefa criada em ${project.name}`)
    } catch (err) {
      message.error(errorMessage(err))
    }
  }

  const handleMenuChanged = useCallback((): void => {
    void refreshTasks()
    onChanged?.()
  }, [refreshTasks, onChanged])

  const handleTaskClick = (taskId: number): void => {
    navigate(`/task/${taskId}`)
  }

  const toggleTaskSelection = useCallback((taskId: number, selected: boolean): void => {
    setSelectedTaskIds((current) => {
      if (selected) {
        if (current.includes(taskId)) return current
        return [...current, taskId]
      }
      return current.filter((id) => id !== taskId)
    })
  }, [])

  const toggleSelectAllVisible = useCallback(
    (selected: boolean): void => {
      if (!selected) {
        setSelectedTaskIds([])
        return
      }
      setSelectedTaskIds(filteredTaskIds)
    },
    [filteredTaskIds]
  )

  const toggleGroupSelection = useCallback((taskIds: number[], selected: boolean): void => {
    setSelectedTaskIds((current) => {
      if (selected) {
        const next = new Set(current)
        for (const id of taskIds) next.add(id)
        return Array.from(next)
      }
      const removed = new Set(taskIds)
      return current.filter((id) => !removed.has(id))
    })
  }, [])

  return (
    <>
      {screens.md === false ? (
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: '100%', marginBottom: 12 }}
          aria-label="Status"
          options={STATUS_TABS.map((status) => ({
            value: status,
            label: <StatusTabLabel status={status} count={statusCounts?.[status]} />
          }))}
        />
      ) : (
        <Tabs
          activeKey={statusFilter}
          onChange={(key) => setStatusFilter(key as FilterStatus)}
          items={STATUS_TABS.map((status) => ({
            key: status,
            label: <StatusTabLabel status={status} count={statusCounts?.[status]} />
          }))}
        />
      )}
      <Flex gap={8} wrap="wrap" align="center">
        <AntInput
          allowClear
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Buscar em nome e descrição"
          aria-label="Buscar tarefas"
          prefix={<Search size={16} strokeWidth={1.75} aria-hidden />}
          style={{ flex: '1 1 220px', maxWidth: 360 }}
        />
        <TaskFilters
          value={filterValue}
          onChange={(patch) => setFilterValue((current) => ({ ...current, ...patch }))}
          contexts={availableContexts}
          projects={availableProjects}
          tags={availableTags}
          shown={tasks.length}
          total={totalTasks}
          hideProject={inProject}
        />
        <div style={{ flex: 1 }} />
        <Segmented<ListView>
          value={view}
          onChange={setListView}
          aria-label="Visão"
          options={[
            ...(narrow
              ? []
              : [
                  {
                    value: 'table' as const,
                    icon: <Table2 size={16} strokeWidth={1.75} />,
                    label: screens.lg ? 'Tabela' : undefined,
                    title: 'Tabela'
                  }
                ]),
            {
              value: 'cards',
              icon: <LayoutGrid size={16} strokeWidth={1.75} />,
              label: screens.lg ? 'Cards' : undefined,
              title: 'Cards'
            },
            ...(statusFilter === 'executando' || inProject
              ? [
                  {
                    value: 'kanban' as const,
                    icon: <Columns3 size={16} strokeWidth={1.75} />,
                    label: screens.lg ? 'Kanban' : undefined,
                    title: 'Kanban'
                  }
                ]
              : [])
          ]}
        />
        {!(inProject && kanbanActive) && (
          <Select<ListGroup>
            value={
              kanbanActive
                ? activeGroupBy
                : inProject && listGroup === 'project'
                  ? 'none'
                  : listGroup
            }
            onChange={setListGroup}
            style={{ width: 200 }}
            aria-label={kanbanActive ? 'Colunas do Kanban' : 'Agrupar'}
            options={[
              ...(kanbanActive ? [] : [{ value: 'none' as const, label: 'Sem agrupamento' }]),
              ...GROUP_BY_OPTIONS.filter(
                (option) =>
                  !(inProject && option.value === 'project') &&
                  (!JIRA_GROUP_MODES.includes(option.value) ||
                    hasJiraTasks ||
                    activeGroupBy === option.value)
              ).map((option) => ({
                value: option.value,
                label: `${kanbanActive ? 'Colunas por' : 'Agrupar por'} ${option.label.toLowerCase()}`
              }))
            ]}
          />
        )}
      </Flex>
      {project && (
        <AntInput
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onPressEnter={() => void addToProject()}
          placeholder={`Adicionar tarefa a ${project.name}…`}
          aria-label="Adicionar tarefa ao projeto"
          prefix={<Plus size={14} strokeWidth={1.75} aria-hidden />}
          suffix={
            <Typography.Text
              type="secondary"
              style={{ fontSize: 12, fontFamily: 'var(--ant-font-family-code)' }}
            >
              Enter
            </Typography.Text>
          }
          style={{ marginTop: 12 }}
        />
      )}

      <TaskMenuChangedContext.Provider value={handleMenuChanged}>
        <TaskMenuDataContext.Provider value={menuData}>
          <div
            ref={contentRef}
            tabIndex={-1}
            aria-label="Tarefas"
            style={{ paddingTop: 12, outline: 'none' }}
          >
            {!loading && !inProject && statusFilter === 'inbox' && tasks.length > 0 && (
              <Alert
                showIcon
                type="info"
                style={{ marginBottom: 12 }}
                title={
                  <span>
                    <strong>
                      {plural(tasks.length, 'item para processar.', 'itens para processar.')}
                    </strong>{' '}
                    Para cada um: é acionável? Leva menos de 2 minutos? É de um projeto?
                  </span>
                }
              />
            )}

            {contextGroupingRepeats && (
              <Typography.Text
                type="secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  marginBottom: 8
                }}
              >
                <Copy size={12} strokeWidth={1.75} aria-hidden />
                Tarefas com mais de um contexto aparecem em cada grupo; a soma dos grupos passa do
                total.
              </Typography.Text>
            )}

            {loading ? (
              <Flex justify="center" style={{ paddingBlock: 48 }}>
                <Spin description="Carregando tarefas" />
              </Flex>
            ) : tasks.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  filtering
                    ? 'Nenhuma tarefa com esses filtros.'
                    : statusFilter === 'inbox'
                      ? 'Inbox zerado. Tudo processado.'
                      : 'Nenhuma tarefa aqui.'
                }
              >
                {filtering && (
                  <Button
                    onClick={() => {
                      setFilterValue(EMPTY_TASK_FILTERS)
                      setSearchInput('')
                    }}
                  >
                    Limpar filtros
                  </Button>
                )}
              </Empty>
            ) : kanbanActive ? (
              <RegionBoundary region="kanban de tarefas">
                <TaskKanban
                  columns={inProject ? defaultTaskGroups : taskGroups}
                  groupBy={inProject ? 'project' : activeGroupBy}
                  columnIcon={
                    inProject
                      ? (col) => <StatusColumnIcon status={col.key as TaskStatus} />
                      : undefined
                  }
                  emptyText={inProject ? 'Nada aqui' : undefined}
                  hideProject={inProject}
                  onTaskClick={handleTaskClick}
                  selectedTaskIds={selectedTaskIdSet}
                  onToggleTaskSelection={toggleTaskSelection}
                  onScheduleForToday={handleScheduleForToday}
                  showStatus={statusFilter === 'all'}
                  contexts={availableContexts}
                  onReorderColumns={inProject ? undefined : handleReorderGroups}
                />
              </RegionBoundary>
            ) : groupingEnabled && viewMode === 'cards' ? (
              <RegionBoundary region="cards de tarefas">
                <TaskCardGroups
                  groups={taskGroups}
                  groupBy={activeGroupBy}
                  onTaskClick={handleTaskClick}
                  selectedTaskIds={selectedTaskIdSet}
                  onToggleTaskSelection={toggleTaskSelection}
                  onScheduleForToday={handleScheduleForToday}
                  showStatus={statusFilter === 'all'}
                  contexts={availableContexts}
                  onToggleGroupSelection={toggleGroupSelection}
                  onReorderGroups={handleReorderGroups}
                  collapsedGroups={collapsedGroups}
                  onToggleGroup={toggleCollapsedGroup}
                  hideProject={inProject}
                />
              </RegionBoundary>
            ) : viewMode === 'cards' ? (
              <RegionBoundary region="cards de tarefas">
                <TaskCardGrid
                  tasks={renderedTasks}
                  onTaskClick={handleTaskClick}
                  selectedTaskIds={selectedTaskIdSet}
                  onToggleTaskSelection={toggleTaskSelection}
                  onScheduleForToday={handleScheduleForToday}
                  showStatus={statusFilter === 'all'}
                  contexts={availableContexts}
                  hideProject={inProject}
                />
              </RegionBoundary>
            ) : (
              <RegionBoundary region="tabela de tarefas">
                <TaskTable
                  tasks={renderedTasks}
                  groups={groupingEnabled ? taskGroups : null}
                  groupBy={groupingEnabled ? activeGroupBy : null}
                  status={statusFilter}
                  contexts={availableContexts}
                  onTaskClick={handleTaskClick}
                  selectedTaskIds={selectedTaskIdSet}
                  onToggleTaskSelection={toggleTaskSelection}
                  onToggleSelectAll={toggleSelectAllVisible}
                  onToggleGroupSelection={toggleGroupSelection}
                  onScheduleForToday={handleScheduleForToday}
                  onSubtasksChange={setLoadedSubtasks}
                  collapsedGroups={collapsedGroups}
                  onToggleGroup={toggleCollapsedGroup}
                  hideProject={inProject}
                />
              </RegionBoundary>
            )}

            {hasMore && !showGroups && (
              <div ref={sentinelRef} style={{ padding: '24px 0', textAlign: 'center' }}>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Carregando mais {remaining} {remaining === 1 ? 'tarefa' : 'tarefas'}...
                </Typography.Text>
              </div>
            )}
            <BulkActionBar
              selectedIds={selectedTaskIds}
              taskById={taskById}
              projects={availableProjects}
              visibleCount={tasks.length}
              selectedVisibleCount={tasks.filter((task) => selectedTaskIdSet.has(task.id)).length}
              onSelectAll={() =>
                setSelectedTaskIds((current) => [...new Set([...current, ...filteredTaskIds])])
              }
              onClear={() => setSelectedTaskIds([])}
            />
          </div>
        </TaskMenuDataContext.Provider>
      </TaskMenuChangedContext.Provider>
    </>
  )
}
