import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Alert,
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
import { useNavigate } from 'react-router-dom'
import { toast } from '@renderer/components/ui/sonner'
import { TaskTable } from '@renderer/components/tasks/TaskTable'
import { TaskDialog } from '@renderer/components/TaskDialog'
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
import { onNewTaskRequest } from '@renderer/lib/newTaskRequest'
import { StatusTabLabel } from '@renderer/components/tasks/StatusTabLabel'
import { PageContainer } from '@renderer/components/shell/PageContainer'
import { RegionBoundary } from '@renderer/components/shell/RegionBoundary'
import { TaskFilters } from '@renderer/components/tasks/TaskFilters'
import {
  EMPTY_TASK_FILTERS,
  activeFilterCount,
  type TaskFiltersValue
} from '@renderer/components/tasks/taskFilterState'
import { useDebouncedValue } from '@renderer/hooks/useDebouncedValue'
import {
  LIST_GROUP_KEY,
  LIST_VIEW_KEY,
  effectiveListView,
  kanbanGroup,
  legacyListPrefs,
  type ListGroup,
  type ListView
} from '@renderer/lib/taskListView'
import { TASK_STATUSES, type TaskStatusCounts } from '@shared/taskStatusCounts'
import { localDateString } from '@shared/dueState'
import {
  type TaskStatus,
  type CreateTaskInput,
  type Tag,
  type Context,
  type Project,
  type TaskListFilters
} from '../../../shared/types'
import { Copy, LayoutGrid, Search, Columns3, Table2 } from 'lucide-react'

type FilterStatus = TaskStatus | 'all'

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

export function TaskListPage(): React.JSX.Element {
  const navigate = useNavigate()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [statusFilter, setStatusFilter] = usePersistedState<FilterStatus>(
    'ticktask:taskListStatusFilter',
    'inbox'
  )
  const [filterValue, setFilterValue] = useState<TaskFiltersValue>(EMPTY_TASK_FILTERS)
  const {
    category: categoryFilter,
    contextId: contextFilter,
    projectId: projectFilter,
    tagId: tagFilter,
    blockedOnly: blockedFilter,
    sort: sortMode
  } = filterValue
  const [searchInput, setSearchInput] = useState('')
  const searchQuery = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS)
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [availableContexts, setAvailableContexts] = useState<Context[]>([])
  const [availableProjects, setAvailableProjects] = useState<Project[]>([])
  const legacyPrefs = useMemo(() => legacyListPrefs(readStorage), [])
  const [listView, setListView] = usePersistedState<ListView>(LIST_VIEW_KEY, legacyPrefs.view)
  const [listGroup, setListGroup] = usePersistedState<ListGroup>(LIST_GROUP_KEY, legacyPrefs.group)
  const [groupOrder, setGroupOrder] = usePersistedState<Partial<Record<GroupBy, string[]>>>(
    'ticktask:taskListGroupOrder',
    {}
  )
  const screens = Grid.useBreakpoint()
  const narrow = screens.md === false
  const view = effectiveListView(listView, statusFilter, narrow)
  const kanbanActive = view === 'kanban'
  const groupingEnabled = !kanbanActive && listGroup !== 'none'
  const showGroups = kanbanActive || groupingEnabled
  const activeGroupBy: GroupBy = kanbanActive
    ? kanbanGroup(listGroup)
    : listGroup === 'none'
      ? 'project'
      : listGroup
  const viewMode: 'cards' | 'table' = view === 'cards' ? 'cards' : 'table'
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([])
  const [loadedSubtaskIds, setLoadedSubtaskIds] = useState<number[]>([])

  const filters = useMemo<TaskListFilters>(
    () => ({
      archived: false,
      status: statusFilter,
      category: categoryFilter,
      projectId: projectFilter === -1 ? 'none' : projectFilter,
      tagId: tagFilter,
      contextId: contextFilter,
      search: searchQuery,
      blockedOnly: blockedFilter,
      sort: sortMode
    }),
    [
      statusFilter,
      categoryFilter,
      projectFilter,
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

  // Carregar dados de filtros
  useEffect(() => {
    window.api.listTags().then(setAvailableTags).catch(console.error)
    window.api.listContexts().then(setAvailableContexts).catch(console.error)
    window.api.listProjects().then(setAvailableProjects).catch(console.error)
  }, [])

  // Total sem filtros, para o rodapé "mostrando N de M"
  useEffect(() => {
    window.api.countTasks({ archived: false }).then(setTotalTasks).catch(console.error)
  }, [tasks])

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  // Listener para refresh vindo do quick capture
  useEffect(() => {
    const unsubscribe = window.api.onTasksRefresh(() => {
      refreshTasks()
    })
    return unsubscribe
  }, [refreshTasks])

  const filteredTaskIds = useMemo(() => tasks.map((task) => task.id), [tasks])

  const defaultTaskGroups = useMemo<TaskGroup[]>(
    () => (showGroups ? buildTaskGroups(tasks, activeGroupBy) : []),
    [showGroups, activeGroupBy, tasks]
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
  const taskById = useCallback((id: number) => tasks.find((task) => task.id === id), [tasks])
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
      const allowedIds = new Set([...filteredTaskIds, ...loadedSubtaskIds])
      const next = current.filter((id) => allowedIds.has(id))
      return next.length === current.length ? current : next
    })
  }, [filteredTaskIds, loadedSubtaskIds])

  const handleScheduleForToday = useCallback(
    async (taskId: number): Promise<void> => {
      const today = localDateString(new Date())
      const task = tasks.find((t) => t.id === taskId)
      const isAlreadyToday = task?.scheduled_date === today
      try {
        await window.api.scheduleTaskForDate(taskId, isAlreadyToday ? null : today)
        await refreshTasks()
        toast.success(isAlreadyToday ? 'Removido do plano de hoje' : 'Adicionado ao plano de hoje')
      } catch (err) {
        console.error('Erro ao programar tarefa:', err)
        toast.error('Erro ao atualizar agendamento')
      }
    },
    [refreshTasks, tasks]
  )

  useEffect(() => onNewTaskRequest(() => setDialogOpen(true)), [])

  const handleCreateTask = useCallback(
    async (data: CreateTaskInput): Promise<void> => {
      const task = await createTask(data)
      navigate(`/task/${task.id}`)
    },
    [createTask, navigate]
  )

  const handleMenuChanged = useCallback((): void => {
    void refreshTasks()
  }, [refreshTasks])

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
    <div className="h-full overflow-y-auto">
      <PageContainer>
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
              ...(statusFilter === 'executando'
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
          <Select<ListGroup>
            value={kanbanActive ? activeGroupBy : listGroup}
            onChange={setListGroup}
            style={{ width: 200 }}
            aria-label={kanbanActive ? 'Colunas do Kanban' : 'Agrupar'}
            options={[
              ...(kanbanActive ? [] : [{ value: 'none' as const, label: 'Sem agrupamento' }]),
              ...GROUP_BY_OPTIONS.filter(
                (option) =>
                  !JIRA_GROUP_MODES.includes(option.value) ||
                  hasJiraTasks ||
                  activeGroupBy === option.value
              ).map((option) => ({
                value: option.value,
                label: `${kanbanActive ? 'Colunas por' : 'Agrupar por'} ${option.label.toLowerCase()}`
              }))
            ]}
          />
        </Flex>

        <TaskMenuChangedContext.Provider value={handleMenuChanged}>
          <TaskMenuDataContext.Provider value={menuData}>
            <div style={{ paddingTop: 12 }}>
              {!loading && statusFilter === 'inbox' && tasks.length > 0 && (
                <Alert
                  showIcon
                  type="info"
                  style={{ marginBottom: 12 }}
                  title={
                    <span>
                      <strong>
                        {tasks.length === 1
                          ? '1 item para processar.'
                          : `${tasks.length} itens para processar.`}
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
                    columns={taskGroups}
                    groupBy={activeGroupBy}
                    onTaskClick={handleTaskClick}
                    selectedTaskIds={selectedTaskIdSet}
                    onToggleTaskSelection={toggleTaskSelection}
                    onScheduleForToday={handleScheduleForToday}
                    showStatus={statusFilter === 'all'}
                    contexts={availableContexts}
                    onReorderColumns={handleReorderGroups}
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
                    onSubtaskIdsChange={setLoadedSubtaskIds}
                    collapsedGroups={collapsedGroups}
                    onToggleGroup={toggleCollapsedGroup}
                  />
                </RegionBoundary>
              )}

              {hasMore && !showGroups && (
                <div ref={sentinelRef} className="py-6 text-center text-xs text-slate-400">
                  Carregando mais {remaining} {remaining === 1 ? 'tarefa' : 'tarefas'}...
                </div>
              )}
              <BulkActionBar
                selectedIds={selectedTaskIds}
                taskById={taskById}
                projects={availableProjects}
                visibleCount={tasks.length}
                onSelectAll={() => toggleSelectAllVisible(true)}
                onClear={() => setSelectedTaskIds([])}
              />
            </div>
          </TaskMenuDataContext.Provider>
        </TaskMenuChangedContext.Provider>
      </PageContainer>

      {/* Create Task Dialog */}
      <TaskDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={handleCreateTask} />
    </div>
  )
}
