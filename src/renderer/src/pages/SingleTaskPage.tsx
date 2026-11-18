import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { App, Button, Card, Drawer, Empty, Flex, Grid, Spin } from 'antd'
import { ArrowLeft } from 'lucide-react'
import type { TaskStatus, UpdateTaskInput } from '@shared/types'
import { useTaskDetail } from '@renderer/hooks/useTaskDetail'
import { useTimerStore } from '@renderer/stores/timerStore'
import { useNotification } from '@renderer/hooks/useNotification'
import { usePersistedState } from '@renderer/hooks/usePersistedState'
import { PageContainer } from '@renderer/components/shell/PageContainer'
import { JiraFieldsSheet } from '@renderer/components/jira/JiraFieldsSheet'
import type { TaskNotesEditorHandle } from '@renderer/components/editor/TaskNotesEditor'
import type { TaskDrawingEditorHandle } from '@renderer/components/editor/TaskDrawingEditor'
import type { NotesTab } from '@renderer/components/editor/NotesPanel'
import { parseNotes } from '@renderer/components/editor/notesFormat'
import { NotesActions } from '@renderer/components/editor/NotesActions'
import { TaskHeader, type InspectorPlacement } from '@renderer/components/tasks/TaskHeader'
import { TaskWorkspace } from '@renderer/components/tasks/TaskWorkspace'
import {
  TaskDetailTabs,
  TaskInspector,
  type DetailTab,
  type InspectorTab
} from '@renderer/components/tasks/TaskInspector'
import { TaskTimePanel } from '@renderer/components/tasks/TaskTimePanel'
import { TaskDetailsPanel } from '@renderer/components/tasks/TaskDetailsPanel'
import { TaskRelationsPanel } from '@renderer/components/tasks/TaskRelationsPanel'

export function SingleTaskPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const { id } = useParams<{ id: string }>()
  const taskId = parseInt(id || '0', 10)
  const screens = Grid.useBreakpoint()
  const narrow = screens.md === false
  const placement: InspectorPlacement = narrow ? 'tabs' : screens.xl ? 'side' : 'drawer'

  const {
    task,
    timeEntries,
    loading,
    refreshTask,
    updateTask,
    updateStatus,
    archiveTask,
    unarchiveTask,
    deleteTask
  } = useTaskDetail(taskId)

  const { timers, startTimer, stopTimer, resetTimer, syncWithDatabase } = useTimerStore()
  const { notify } = useNotification()

  const isRunning = !!timers[taskId]
  const displaySeconds = isRunning ? timers[taskId].displaySeconds : task?.total_seconds || 0
  const timeLimit = task?.time_limit_seconds
  const overLimit = !!timeLimit && displaySeconds >= timeLimit
  const notifiedRef = useRef(false)

  const [inspectorOpen, setInspectorOpen] = usePersistedState('ticktask:taskInspectorOpen', true)
  const [inspectorDrawer, setInspectorDrawer] = useState(false)
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('tempo')
  const [narrowTab, setNarrowTab] = useState<DetailTab>('notas')
  const [focus, setFocus] = useState(false)
  const [jiraFieldsOpen, setJiraFieldsOpen] = useState(false)

  const [syncingNotes, setSyncingNotes] = useState(false)
  const notesEditorRef = useRef<TaskNotesEditorHandle>(null)
  const drawingEditorRef = useRef<TaskDrawingEditorHandle>(null)
  const notesDirtyRef = useRef(false)
  const notesSyncingRef = useRef(false)
  const [localExportPath, setLocalExportPath] = useState<string | null>(null)
  const [exportingLocal, setExportingLocal] = useState(false)
  const localExportRef = useRef<string | null>(null)
  localExportRef.current = localExportPath

  // O editor grava direto pelo IPC, sem passar pelo useTaskDetail: `task.notes` envelhece enquanto
  // a página vive, e uma remontagem do editor (trocar de largura) voltaria ao conteúdo da entrada.
  const [savedNotes, setSavedNotes] = useState<string | null>(null)
  const [savedDrawing, setSavedDrawing] = useState<string | null>(null)
  const [notesTab, setNotesTab] = useState<NotesTab>('notes')

  useEffect(() => {
    setSavedNotes(null)
    setSavedDrawing(null)
    setNotesTab('notes')
    setFocus(false)
    notifiedRef.current = false
  }, [taskId])

  useEffect(() => {
    if (placement === 'side') setInspectorDrawer(false)
  }, [placement])

  const initialNotes = useMemo(
    () => parseNotes(savedNotes ?? task?.notes),
    [savedNotes, task?.notes]
  )

  useEffect(() => {
    setLocalExportPath(task?.local_export_path ?? null)
  }, [task?.local_export_path])

  useEffect(() => {
    if (task?.is_running) syncWithDatabase()
  }, [task?.is_running, syncWithDatabase])

  useEffect(() => {
    if (timeLimit && displaySeconds >= timeLimit && !notifiedRef.current) {
      notifiedRef.current = true
      notify('Tempo Limite!', `A tarefa "${task?.name}" atingiu o limite de tempo`)
    }
  }, [displaySeconds, timeLimit, task?.name, notify])

  const run = useCallback(
    async (action: () => Promise<unknown>, success?: string): Promise<void> => {
      try {
        await action()
        if (success) message.success(success)
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Não foi possível concluir')
      }
    },
    [message]
  )

  const update = useCallback(
    (data: UpdateTaskInput): Promise<void> => run(() => updateTask(data)),
    [run, updateTask]
  )

  const handleStart = useCallback(() => run(() => startTimer(taskId)), [run, startTimer, taskId])

  const handlePause = useCallback(
    () =>
      run(async () => {
        await stopTimer(taskId)
        await refreshTask()
      }),
    [run, stopTimer, taskId, refreshTask]
  )

  const handleFinish = useCallback(
    () =>
      run(async () => {
        if (useTimerStore.getState().timers[taskId]) await stopTimer(taskId)
        await updateStatus('finalizada')
      }, 'Tarefa finalizada'),
    [run, stopTimer, taskId, updateStatus]
  )

  const handleResetTime = useCallback(
    () =>
      run(async () => {
        await resetTimer(taskId)
        notifiedRef.current = false
        await refreshTask()
      }, 'Tempo zerado'),
    [run, resetTimer, taskId, refreshTask]
  )

  const handleStatusChange = useCallback(
    (status: TaskStatus) => run(() => updateStatus(status), 'Status alterado'),
    [run, updateStatus]
  )

  const handleArchive = useCallback(
    () =>
      run(async () => {
        await archiveTask()
        await refreshTask()
      }, 'Tarefa arquivada'),
    [run, archiveTask, refreshTask]
  )

  const handleUnarchive = useCallback(
    () => run(unarchiveTask, 'Tarefa desarquivada'),
    [run, unarchiveTask]
  )

  const handleDelete = useCallback(
    () =>
      run(async () => {
        await deleteTask()
        navigate('/')
      }, 'Tarefa excluída'),
    [run, deleteTask, navigate]
  )

  const handleAddTime = useCallback(
    async (seconds: number): Promise<void> => {
      await window.api.addManualTime(taskId, seconds)
      await refreshTask()
    },
    [taskId, refreshTask]
  )

  const handleSetTotal = useCallback(
    async (seconds: number): Promise<void> => {
      await window.api.setTotalTime(taskId, seconds)
      await refreshTask()
    },
    [taskId, refreshTask]
  )

  const handleNotesChange = useCallback((): void => {
    notesDirtyRef.current = true
  }, [])

  const handleSaveAndSync = useCallback(async (): Promise<void> => {
    if (notesSyncingRef.current) return
    notesSyncingRef.current = true
    setSyncingNotes(true)
    try {
      await notesEditorRef.current?.flushSave()
      await window.api.syncTaskNotes(taskId)
      notesDirtyRef.current = false
      message.success('Notas sincronizadas com o Notion')
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Erro ao sincronizar')
    } finally {
      notesSyncingRef.current = false
      setSyncingNotes(false)
    }
  }, [taskId, message])

  const handleExportLocalChoose = useCallback(async (): Promise<void> => {
    if (exportingLocal) return
    setExportingLocal(true)
    try {
      await notesEditorRef.current?.flushSave()
      const filePath = await window.api.exportNotesLocalChoose(taskId)
      if (filePath) {
        setLocalExportPath(filePath)
        message.success('Nota salva localmente')
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Erro ao salvar localmente')
    } finally {
      setExportingLocal(false)
    }
  }, [taskId, exportingLocal, message])

  const reexportLocal = useCallback((): void => {
    if (!localExportRef.current) return
    window.api.exportNotesLocal(taskId).catch((e) => console.error('Export local falhou:', e))
  }, [taskId])

  const handleNotesSaved = useCallback(
    (notes: string): void => {
      setSavedNotes(notes)
      reexportLocal()
    },
    [reexportLocal]
  )

  const handleDrawingSaved = useCallback(
    (drawing: string): void => {
      setSavedDrawing(drawing)
      reexportLocal()
    },
    [reexportLocal]
  )

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!notesDirtyRef.current || notesSyncingRef.current) return
      const config = await window.api.notionGetConfig()
      if (!config?.apiKey || !config?.databaseId) return
      notesSyncingRef.current = true
      try {
        await notesEditorRef.current?.flushSave()
        await window.api.syncTaskNotes(taskId)
        notesDirtyRef.current = false
      } catch (e) {
        console.error('Auto-sync de notas falhou:', e)
      } finally {
        notesSyncingRef.current = false
      }
    }, 60_000)
    return () => clearInterval(interval)
  }, [taskId])

  const showRelations = useCallback((): void => {
    setInspectorTab('relacoes')
    setNarrowTab('relacoes')
    if (placement === 'side') setInspectorOpen(true)
    else if (placement === 'drawer') setInspectorDrawer(true)
  }, [placement, setInspectorOpen])

  const toggleInspector = useCallback((): void => {
    if (placement === 'side') setInspectorOpen(!inspectorOpen)
    else setInspectorDrawer(true)
  }, [placement, inspectorOpen, setInspectorOpen])

  if (!task || task.id !== taskId) {
    return loading ? (
      <Flex align="center" justify="center" className="h-full">
        <Spin />
      </Flex>
    ) : (
      <Flex vertical align="center" justify="center" gap={16} className="h-full">
        <Empty description="Tarefa não encontrada" />
        <Button icon={<ArrowLeft size={16} strokeWidth={1.75} />} onClick={() => navigate('/')}>
          Voltar para Tarefas
        </Button>
      </Flex>
    )
  }

  const startBlocked = !!task.is_blocked && !isRunning

  const header = (
    <TaskHeader
      task={task}
      displaySeconds={displaySeconds}
      isRunning={isRunning}
      overLimit={overLimit}
      compact={narrow}
      showTimerLabel={!!screens.lg}
      inspector={placement}
      inspectorOpen={inspectorOpen}
      onToggleInspector={toggleInspector}
      onRename={(name) => update({ name })}
      onDescribe={(description) => update({ description })}
      onStatusChange={handleStatusChange}
      onStart={handleStart}
      onPause={handlePause}
      onFinish={handleFinish}
      onResetTime={handleResetTime}
      onArchive={handleArchive}
      onUnarchive={handleUnarchive}
      onDelete={handleDelete}
      onOpenJiraFields={() => setJiraFieldsOpen(true)}
      onWorkingDirChange={refreshTask}
      onUpdate={update}
      onShowRelations={showRelations}
    />
  )

  const workspace = (
    <TaskWorkspace
      owner={{ kind: 'task', id: task.id }}
      taskName={task.name}
      fill={!narrow}
      showLabels={!!screens.sm}
      tab={notesTab}
      onTabChange={setNotesTab}
      focus={focus}
      onFocusChange={setFocus}
      notesActions={
        <NotesActions
          localExportPath={localExportPath}
          exportingLocal={exportingLocal}
          onExportLocal={handleExportLocalChoose}
          syncingNotes={syncingNotes}
          onSaveAndSync={handleSaveAndSync}
          showFile={!!screens.lg}
        />
      }
      displaySeconds={displaySeconds}
      isRunning={isRunning}
      startBlocked={startBlocked}
      onToggleTimer={() => void (isRunning ? handlePause() : handleStart())}
      initialContent={initialNotes}
      editorRef={notesEditorRef}
      onChange={handleNotesChange}
      onSaved={handleNotesSaved}
      initialDrawing={savedDrawing ?? task.drawing ?? null}
      drawingRef={drawingEditorRef}
      onDrawingChange={handleNotesChange}
      onDrawingSaved={handleDrawingSaved}
    />
  )

  const panels = {
    tempo: (
      <TaskTimePanel
        task={task}
        displaySeconds={displaySeconds}
        timeEntries={timeEntries}
        onAddTime={handleAddTime}
        onSetTotal={handleSetTotal}
        onSetLimit={(seconds) => update({ time_limit_seconds: seconds })}
      />
    ),
    detalhes: (
      <TaskDetailsPanel
        task={task}
        refreshTask={refreshTask}
        onOpenJiraFields={() => setJiraFieldsOpen(true)}
      />
    ),
    relacoes: <TaskRelationsPanel task={task} refreshTask={refreshTask} />
  }

  const inspector = (
    <TaskInspector
      task={task}
      activeKey={inspectorTab}
      onChange={setInspectorTab}
      panels={panels}
    />
  )

  const jiraSheet = task.jira_key ? (
    <JiraFieldsSheet taskId={task.id} open={jiraFieldsOpen} onOpenChange={setJiraFieldsOpen} />
  ) : null

  if (placement === 'tabs') {
    return (
      <div className="h-full" style={{ overflowY: 'auto' }}>
        <PageContainer>
          {header}
          <TaskDetailTabs
            task={task}
            activeKey={narrowTab}
            onChange={setNarrowTab}
            notes={workspace}
            panels={panels}
          />
        </PageContainer>
        {jiraSheet}
      </div>
    )
  }

  return (
    <div className="h-full" style={{ overflowY: 'auto' }}>
      <PageContainer
        style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        {header}
        <Flex gap={16} style={{ flex: 1, minHeight: 520 }}>
          <div style={{ flex: '1 1 0', minWidth: 0 }}>{workspace}</div>
          {placement === 'side' && inspectorOpen && (
            <Card
              size="small"
              style={{
                flex: `0 0 ${screens.xxl ? 420 : 380}px`,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column'
              }}
              styles={{ body: { paddingTop: 4, flex: 1, minHeight: 0, overflowY: 'auto' } }}
            >
              {inspector}
            </Card>
          )}
        </Flex>
      </PageContainer>
      {placement === 'drawer' && (
        <Drawer
          open={inspectorDrawer}
          onClose={() => setInspectorDrawer(false)}
          size={400}
          title={task.name}
          styles={{ body: { paddingTop: 0 } }}
        >
          {inspector}
        </Drawer>
      )}
      {jiraSheet}
    </div>
  )
}
