import { useState, useEffect, useCallback, useMemo } from 'react'
import { Flex, Grid, Input as AntInput, Segmented, Select, Tabs } from 'antd'
import { useNavigate } from 'react-router-dom'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { SearchableSelect } from '@renderer/components/ui/searchable-select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@renderer/components/ui/alert-dialog'
import { toast } from '@renderer/components/ui/sonner'
import { TaskList } from '@renderer/components/TaskList'
import { TaskTable } from '@renderer/components/TaskTable'
import { TaskDialog } from '@renderer/components/TaskDialog'
import { useTasks } from '@renderer/hooks/useTasks'
import { usePersistedState } from '@renderer/hooks/usePersistedState'
import { useIncrementalList } from '@renderer/hooks/useIncrementalList'
import { TaskGroups, type TaskGroup } from '@renderer/components/TaskGroups'
import { applyGroupOrder, moveGroupKey } from '@renderer/lib/groupOrder'
import { buildTaskGroups, JIRA_GROUP_MODES, type GroupBy } from '@renderer/lib/taskGrouping'
import { TaskKanban } from '@renderer/components/TaskKanban'
import { TaskMenuChangedContext } from '@renderer/components/taskMenuContext'
import { onNewTaskRequest } from '@renderer/lib/newTaskRequest'
import { cn } from '@renderer/lib/utils'
import { StatusTabLabel } from '@renderer/components/tasks/StatusTabLabel'
import { PageContainer } from '@renderer/components/shell/PageContainer'
import { TaskFilters } from '@renderer/components/tasks/TaskFilters'
import {
  EMPTY_TASK_FILTERS,
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
import {
  STATUS_LABELS,
  type TaskStatus,
  type CreateTaskInput,
  type Tag,
  type Context,
  type Project,
  type TaskListFilters
} from '../../../shared/types'
import {
  ListTodo,
  LayoutGrid,
  Search,
  Trash2,
  Archive,
  FolderInput,
  CheckCheck,
  Loader2,
  Columns3,
  Table2
} from 'lucide-react'

type FilterStatus = TaskStatus | 'all'
type BulkAction =
  | { type: 'delete' }
  | { type: 'archive' }
  | { type: 'status'; status: TaskStatus }
  | { type: 'project'; projectId: number | null }

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
  const view = effectiveListView(listView, statusFilter)
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
  const [bulkStatusValue, setBulkStatusValue] = useState<TaskStatus | 'none'>('none')
  const [bulkProjectValue, setBulkProjectValue] = useState<string>('none')
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)

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
  const screens = Grid.useBreakpoint()
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
  const selectedCount = selectedTaskIds.length

  useEffect(() => {
    setSelectedTaskIds((current) => {
      const allowedIds = new Set(filteredTaskIds)
      const next = current.filter((id) => allowedIds.has(id))
      return next.length === current.length ? current : next
    })
  }, [filteredTaskIds])

  const handleScheduleForToday = useCallback(
    async (taskId: number): Promise<void> => {
      const today = new Date().toISOString().split('T')[0]
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

  const openConfirm = (action: BulkAction): void => {
    if (selectedCount === 0) {
      toast.error('Selecione pelo menos uma tarefa')
      return
    }
    setBulkAction(action)
    setConfirmOpen(true)
  }

  const handleBulkActionConfirm = useCallback(async (): Promise<void> => {
    if (!bulkAction || selectedCount === 0) return

    setBulkLoading(true)
    try {
      if (bulkAction.type === 'delete') {
        await window.api.bulkDeleteTasks(selectedTaskIds)
        toast.success(`${selectedCount} tarefa(s) deletada(s) com sucesso`)
      }

      if (bulkAction.type === 'archive') {
        await window.api.bulkSetArchived(selectedTaskIds, true)
        toast.success(`${selectedCount} tarefa(s) arquivada(s)`)
      }

      if (bulkAction.type === 'status') {
        await window.api.bulkUpdateStatus(selectedTaskIds, bulkAction.status)
        toast.success(
          `${selectedCount} tarefa(s) marcadas como ${STATUS_LABELS[bulkAction.status]}`
        )
      }

      if (bulkAction.type === 'project') {
        await window.api.bulkMoveToProject(selectedTaskIds, bulkAction.projectId)
        const targetProjectName =
          bulkAction.projectId === null
            ? 'sem projeto'
            : availableProjects.find((project) => project.id === bulkAction.projectId)?.name ||
              'projeto selecionado'
        toast.success(`${selectedCount} tarefa(s) movidas para ${targetProjectName}`)
      }

      setSelectedTaskIds([])
      setConfirmOpen(false)
      setBulkAction(null)
      await refreshTasks()
    } catch (error) {
      console.error('Erro ao executar ação em massa:', error)
      toast.error('Não foi possível aplicar a ação em massa')
    } finally {
      setBulkLoading(false)
    }
  }, [bulkAction, selectedCount, selectedTaskIds, refreshTasks, availableProjects])

  const confirmDialogContent = useMemo(() => {
    if (!bulkAction) {
      return {
        title: 'Confirmar ação em massa',
        description: 'Confirme para continuar.',
        actionLabel: 'Confirmar'
      }
    }

    if (bulkAction.type === 'delete') {
      return {
        title: `Deletar ${selectedCount} tarefa(s)?`,
        description:
          'Essa ação remove as tarefas selecionadas localmente e também no Notion quando a sincronização automática estiver ativa.',
        actionLabel: 'Deletar'
      }
    }

    if (bulkAction.type === 'archive') {
      return {
        title: `Arquivar ${selectedCount} tarefa(s)?`,
        description:
          'As tarefas selecionadas saem das listagens e vão para o Arquivo Morto, de onde podem ser desarquivadas.',
        actionLabel: 'Arquivar'
      }
    }

    if (bulkAction.type === 'status') {
      return {
        title: `Marcar ${selectedCount} tarefa(s)?`,
        description: `As tarefas selecionadas terão o status alterado para ${STATUS_LABELS[bulkAction.status]}.`,
        actionLabel: 'Marcar'
      }
    }

    return {
      title: `Mover ${selectedCount} tarefa(s)?`,
      description:
        bulkAction.projectId === null
          ? 'As tarefas selecionadas serão desvinculadas de qualquer projeto.'
          : 'As tarefas selecionadas serão movidas para o projeto escolhido.',
      actionLabel: 'Mover'
    }
  }, [bulkAction, selectedCount])

  const bulkStatusOptions = useMemo(
    () => [
      { value: 'none', label: 'Marcar como...' },
      { value: 'inbox', label: STATUS_LABELS.inbox },
      { value: 'aguardando', label: STATUS_LABELS.aguardando },
      { value: 'proximas', label: STATUS_LABELS.proximas },
      { value: 'executando', label: STATUS_LABELS.executando },
      { value: 'finalizada', label: STATUS_LABELS.finalizada },
      { value: 'someday', label: STATUS_LABELS.someday }
    ],
    []
  )

  const bulkProjectOptions = useMemo(
    () => [
      { value: 'none', label: 'Mover para projeto...' },
      { value: 'no-project', label: 'Sem projeto' },
      ...availableProjects.map((project) => ({ value: String(project.id), label: project.name }))
    ],
    [availableProjects]
  )

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      <PageContainer padBlock="top">
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
              {
                value: 'table',
                icon: <Table2 size={16} strokeWidth={1.75} />,
                label: screens.lg ? 'Tabela' : undefined,
                title: 'Tabela'
              },
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
      </PageContainer>

      {/* Content */}
      <TaskMenuChangedContext.Provider value={handleMenuChanged}>
      <ScrollArea className="flex-1 h-0">
        <PageContainer padBlock="bottom" style={{ paddingTop: 12 }}>
          {!loading && tasks.length > 0 && (
            <div
              className={cn(
                'mb-4 bg-white border border-slate-200 rounded-sm p-4',
                selectedCount > 0 && 'sticky top-0 z-20 border-slate-300'
              )}
            >
              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-slate-800">
                    {selectedCount} selecionada(s)
                  </span>
                  <button
                    onClick={() => toggleSelectAllVisible(true)}
                    disabled={tasks.length === selectedCount}
                    className="text-slate-600 hover:text-slate-900 disabled:text-slate-300"
                  >
                    Selecionar todas visíveis ({tasks.length})
                  </button>
                  <button
                    onClick={() => setSelectedTaskIds([])}
                    disabled={selectedCount === 0}
                    className="text-slate-600 hover:text-slate-900 disabled:text-slate-300"
                  >
                    Limpar seleção
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="min-w-[180px]">
                    <SearchableSelect
                      value={bulkStatusValue}
                      onChange={(value) => setBulkStatusValue(value as TaskStatus | 'none')}
                      options={bulkStatusOptions}
                      placeholder="Marcar como..."
                      searchPlaceholder="Buscar status..."
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (bulkStatusValue === 'none') {
                        toast.error('Selecione um status para marcar')
                        return
                      }
                      openConfirm({ type: 'status', status: bulkStatusValue })
                    }}
                    disabled={selectedCount === 0 || bulkLoading}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <CheckCheck size={15} />
                    Marcar
                  </button>

                  <div className="min-w-[200px]">
                    <SearchableSelect
                      value={bulkProjectValue}
                      onChange={setBulkProjectValue}
                      options={bulkProjectOptions}
                      placeholder="Mover para projeto..."
                      searchPlaceholder="Buscar projeto..."
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (bulkProjectValue === 'none') {
                        toast.error('Selecione um projeto para mover')
                        return
                      }
                      openConfirm({
                        type: 'project',
                        projectId:
                          bulkProjectValue === 'no-project' ? null : Number(bulkProjectValue)
                      })
                    }}
                    disabled={selectedCount === 0 || bulkLoading}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <FolderInput size={15} />
                    Mover
                  </button>

                  <button
                    onClick={() => openConfirm({ type: 'archive' })}
                    disabled={selectedCount === 0 || bulkLoading}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Archive size={15} />
                    Arquivar
                  </button>

                  <button
                    onClick={() => openConfirm({ type: 'delete' })}
                    disabled={selectedCount === 0 || bulkLoading}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    <Trash2 size={15} />
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <p>Carregando...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <div className="bg-slate-100 p-4 rounded-full mb-4">
                <ListTodo size={32} />
              </div>
              <p>
                {statusFilter === 'all'
                  ? 'Nenhuma tarefa ainda. Crie uma nova!'
                  : `Nenhuma tarefa com status "${statusFilter}"`}
              </p>
            </div>
          ) : kanbanActive ? (
            <TaskKanban
              columns={taskGroups}
              onTaskClick={handleTaskClick}
              selectedTaskIds={selectedTaskIdSet}
              onToggleTaskSelection={toggleTaskSelection}
              onScheduleForToday={handleScheduleForToday}
              onReorderColumns={handleReorderGroups}
            />
          ) : groupingEnabled ? (
            <TaskGroups
              groups={taskGroups}
              viewMode={viewMode}
              onTaskClick={handleTaskClick}
              selectedTaskIds={selectedTaskIdSet}
              onToggleTaskSelection={toggleTaskSelection}
              onToggleGroupSelection={toggleGroupSelection}
              onScheduleForToday={handleScheduleForToday}
              onReorderGroups={handleReorderGroups}
            />
          ) : viewMode === 'cards' ? (
            <TaskList
              tasks={renderedTasks}
              onTaskClick={handleTaskClick}
              selectedTaskIds={selectedTaskIdSet}
              onToggleTaskSelection={toggleTaskSelection}
              onScheduleForToday={handleScheduleForToday}
            />
          ) : (
            <TaskTable
              tasks={renderedTasks}
              onTaskClick={handleTaskClick}
              selectedTaskIds={selectedTaskIdSet}
              onToggleTaskSelection={toggleTaskSelection}
              onToggleSelectAll={toggleSelectAllVisible}
              onScheduleForToday={handleScheduleForToday}
            />
          )}

          {hasMore && !showGroups && (
            <div ref={sentinelRef} className="py-6 text-center text-xs text-slate-400">
              Carregando mais {remaining} {remaining === 1 ? 'tarefa' : 'tarefas'}...
            </div>
          )}
        </PageContainer>
      </ScrollArea>
      </TaskMenuChangedContext.Provider>

      {/* Create Task Dialog */}
      <TaskDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={handleCreateTask} />

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open)
          if (!open && !bulkLoading) {
            setBulkAction(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialogContent.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialogContent.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                void handleBulkActionConfirm()
              }}
              disabled={bulkLoading}
              className={
                bulkAction?.type === 'delete' ? 'bg-destructive hover:bg-destructive/90' : ''
              }
            >
              {bulkLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  Aplicando...
                </span>
              ) : (
                confirmDialogContent.actionLabel
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
