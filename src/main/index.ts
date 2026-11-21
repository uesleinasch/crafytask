import { isIsoDate } from '@shared/archiveAge'
import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  Notification,
  screen,
  globalShortcut,
  dialog,
  nativeTheme,
  protocol
} from 'electron'
import { copyFileSync } from 'fs'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/512.png?asset'
import { HIDDEN_FLAG, QUICK_CAPTURE_FLAG, shouldStartHidden, wantsQuickCapture } from './launchArgs'
import { execFile } from 'child_process'
import {
  isGnomeKeybindingCurrent,
  readGnomeKeybinding,
  shellQuote,
  writeGnomeKeybinding,
  type GnomeKeybinding,
  type GsettingsRun
} from './gnomeKeybinding'
import { createTray, destroyTray } from './tray'
import { isAutostartEnabled, setAutostartEnabled } from './autostart'
import { isSafeHttpUrl } from '@shared/externalUrl'
import { isThemePreference } from '@shared/themePreference'
import type { RendererErrorReport } from '@shared/rendererError'
import { guardRenderer } from './rendererGuard'
import {
  initDatabase,
  closeDatabase,
  createTask,
  listTasks,
  countTasks,
  countTasksByStatus,
  listActiveTasksLight,
  listRunningTasks,
  listTasksForSync,
  getTask,
  updateTask,
  updateTaskNotes,
  updateTaskDrawing,
  searchMentions,
  setTaskLocalExportPath,
  deleteTask,
  deleteTasks,
  getChildTaskIds,
  archiveTask,
  listTaskIds,
  restoreArchived,
  taskTotals,
  unarchiveTask,
  setTasksArchived,
  updateTaskStatus,
  moveTasksToProject,
  startTask,
  stopTask,
  updateTimer,
  getTimeEntries,
  getActiveTimeEntry,
  resetTaskTimer,
  addManualTimeEntry,
  setTaskTotalTime,
  updateTimeEntry,
  deleteTimeEntry,
  listTimeEntriesRange,
  getPeriodStats,
  // Tags
  createTag,
  listTags,
  listTagsWithUsage,
  listTaskIdsWithTag,
  updateTag,
  mergeTags,
  getOrCreateTag,
  deleteTag,
  getTaskTags,
  setTaskTags,
  // Projects
  createProject,
  getProject,
  listProjects,
  updateProject,
  deleteProject,
  getProjectTasks,
  // Contexts
  createContext,
  listContexts,
  listContextsWithUsage,
  mergeContexts,
  updateContext,
  deleteContext,
  getTaskContexts,
  setTaskContexts,
  // Weekly Reviews
  createWeeklyReview,
  getWeeklyReview,
  listWeeklyReviews,
  getLastWeeklyReview,
  updateWeeklyReviewNotes,
  setWeeklyReviewStep,
  setWeeklyReviewCurrentStep,
  discardWeeklyReview,
  bumpWeeklyReviewCounter,
  completeWeeklyReview,
  getReviewPastWeek,
  getReviewHealthIndicators,
  // FASE 4.3: Blocos de Tempo
  createTimeBlock,
  getTimeBlocksForDate,
  getTimeBlocksForWeek,
  getTimeBlocksForRange,
  listCalendarTasks,
  listUnscheduledTasks,
  updateTimeBlock,
  deleteTimeBlock,
  // FASE 4: Horizontes GTD
  createArea,
  getArea,
  listAreas,
  updateArea,
  deleteArea,
  createGoal,
  getGoal,
  listGoals,
  updateGoal,
  deleteGoal,
  // FASE 2
  getSubtasks,
  completeSubtasksCheck,
  addTaskHistory,
  getTaskHistory,
  getTaskLastCheckpoint,
  getTaskDependencies,
  getTaskDependents,
  addTaskDependency,
  removeTaskDependency,
  getTasksForDate,
  createNextRecurrence,
  deleteNextRecurrence,
  getTasksDueForNotification,
  getTimeBlock,
  filterGcalSyncedIds,
  getNextRecurrenceIds,
  getWorkflowPrefs,
  setWorkflowPrefs,
  getAppPrefs,
  setAppPrefs
} from './database'
import { mergeTimeBlock, timeBlockError } from './calendarQueries'
import {
  connectGcal,
  disconnectGcal,
  getGcalStatus,
  isGcalAutoSyncOn,
  isGcalConnected,
  saveGcalCredentials,
  setGcalAutoSync,
  syncAllToGoogle,
  syncTaskToGoogle
} from './googleCalendar'
import {
  disconnectJira,
  getJiraIssueFields,
  getJiraStatus,
  importJiraIssues,
  jiraNotionFilter,
  listJiraBoards,
  listJiraTransitions,
  onJiraBackgroundError,
  scheduleJiraDescriptionPush,
  scheduleJiraWorklogPush,
  getJiraChildren,
  captureJiraWorklogs,
  deleteJiraWorklogs,
  syncEditedTimeEntry,
  syncDeletedTimeEntry,
  searchJiraUsers,
  startJiraScheduler,
  saveJiraBoards,
  saveJiraCredentials,
  saveJiraMapping,
  saveJiraOptions,
  testJiraConnection,
  transitionJiraIssue,
  updateJiraIssueField
} from './jira'
import type {
  JiraCredentialsInput,
  JiraFieldInput,
  JiraImportResult,
  JiraOptionsInput,
  NotesOwner,
  ReviewCounterKey,
  ReviewStepKey,
  ReviewStepStatus,
  StatsPeriod
} from '@shared/types'
import type { StatusMapping } from './jiraPlan'
import {
  // Notion
  getNotionConfig,
  saveNotionConfig,
  clearNotionConfig,
  testNotionConnection,
  syncTaskToNotion,
  syncTaskNotesToNotion,
  syncAllTasks,
  findOrCreateDatabase,
  deleteTaskFromNotion,
  type NotionConfig
} from './notion'
import { saveNoteImage, registerAssetProtocol, ASSET_SCHEME } from './notesAssets'
import { deleteDrawingPreview, saveDrawingPreview } from './drawingAssets'
import { exportTaskToLocal } from './localExport'
import {
  chooseBackupFolder,
  chooseSnapshotFolder,
  createBackup,
  getBackupStatus,
  inspectSnapshot,
  isBackupRunning,
  lockBackups,
  restoreSnapshot,
  runAutoBackupIfDue,
  unlockBackups
} from './backup'
import { pickDueNotifications } from './dueNotifications'
import { localDateString } from '../shared/dueState'
import {
  ACCELERATOR_RULE,
  DEFAULT_CAPTURE_SHORTCUT,
  isValidAccelerator
} from '../shared/accelerator'
import type { AppPrefsStatus } from '../shared/appPrefs'
import { readMcpConfig, writeMcpConfig } from './mcp/store'
import { isMcpRunning, startMcpServer, stopMcpServer } from './mcp/transport'
import { generateToken } from './mcp/config'
import { registerWriteEffects } from './mcp/effects'
import { createDrawingRenderBridge } from './drawingRenderBridge'
import { TASK_HISTORY_MAX_LIMIT } from './taskHistoryQueries'
import type { TaskHistoryView } from '@shared/types'
import type { DrawingRenderResult } from '@shared/drawingRender'
import {
  applyStatusChange as applyTaskStatusChange,
  type StatusChangeDeps
} from './taskStatusService'
import {
  disposeTerminalsForProjects,
  disposeTerminalsForTasks,
  killAllTerminals,
  registerTerminalIpc
} from './terminal'
import { registerNotebookIpc } from './notebookIpc'
import { resolveUserDataOverride } from './devUserData'
import type {
  CreateTaskInput,
  UpdateTaskInput,
  TaskStatus,
  TaskListFilters,
  UpdateTagInput,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectStatus,
  McpStatus,
  CreateTimeBlockInput,
  UpdateTimeBlockInput,
  UnscheduledTaskFilters,
  FloatTimerData
} from '../shared/types'

// Protocolo custom para servir imagens locais das notas ao renderer.
// Precisa ser registrado como privilegiado ANTES do app 'ready'.
protocol.registerSchemesAsPrivileged([
  {
    scheme: ASSET_SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true }
  }
])

// Precisa vir antes da trava de instância única, que é por pasta de dados, e de qualquer leitura
// de app.getPath('userData').
const userDataOverride = resolveUserDataOverride({
  isPackaged: app.isPackaged,
  env: process.env,
  appData: app.getPath('appData')
})
if (userDataOverride) app.setPath('userData', userDataOverride)

// Uma segunda instância abriria o mesmo SQLite e disputaria a porta do MCP. Sair aqui, antes
// de qualquer inicialização, é o que mantém a instância viva como dona única desses recursos.
const hasSingleInstanceLock = app.requestSingleInstanceLock()
if (!hasSingleInstanceLock) {
  app.quit()
}

let mainWindow: BrowserWindow | null = null
let floatWindow: BrowserWindow | null = null
let quickCaptureWindow: BrowserWindow | null = null
let currentTimers: FloatTimerData[] = []
let isQuitting = false
let startHidden = shouldStartHidden(process.argv) || wantsQuickCapture(process.argv)

// Dimensões da janela flutuante (lista com altura dinâmica)
const FLOAT_WIDTH = 300
const FLOAT_ROW_HEIGHT = 44
const FLOAT_FOOTER_HEIGHT = 44
const FLOAT_BORDERS = 2
const FLOAT_MAX_ROWS = 5

function floatHeightFor(count: number): number {
  const rows = Math.min(Math.max(count, 1), FLOAT_MAX_ROWS)
  return rows * FLOAT_ROW_HEIGHT + FLOAT_FOOTER_HEIGHT + FLOAT_BORDERS
}

let captureShortcut = DEFAULT_CAPTURE_SHORTCUT

function normalizeTaskIds(ids: number[]): number[] {
  const unique = new Set<number>()
  for (const id of ids) {
    if (Number.isInteger(id) && id > 0) {
      unique.add(id)
    }
  }
  return [...unique]
}

// Helper para sincronização automática com Notion
async function autoSyncToNotion(taskId: number): Promise<void> {
  const config = getNotionConfig()
  if (config?.autoSync && config.databaseId) {
    try {
      const task = getTask(taskId)
      if (task && jiraNotionFilter()(task)) {
        mainWindow?.webContents.send('notion:syncStart', task.name)
        await syncTaskToNotion(task)
        console.log('Tarefa sincronizada automaticamente:', task.name)
        mainWindow?.webContents.send('notion:syncSuccess', task.name)
      }
    } catch (error) {
      console.error('Erro na sincronização automática:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      mainWindow?.webContents.send('notion:syncError', errorMessage)
    }
  }
}

let jiraImporting = false

async function runJiraImport(): Promise<JiraImportResult | null> {
  if (jiraImporting) return null
  jiraImporting = true
  mainWindow?.webContents.send('jira:syncStart')
  try {
    const result = await importJiraIssues()
    for (const taskId of result.taskIds) {
      autoSyncToGoogle(taskId)
      await autoSyncToNotion(taskId)
    }
    mainWindow?.webContents.send('tasks:refresh')
    mainWindow?.webContents.send('jira:syncSuccess')
    return result
  } catch (error) {
    console.error('[jira] erro na importação:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    mainWindow?.webContents.send('jira:syncError', errorMessage)
    throw error
  } finally {
    jiraImporting = false
  }
}

async function runGoogleSync(taskId: number): Promise<void> {
  const label = getTask(taskId)?.name ?? `Tarefa #${taskId}`
  mainWindow?.webContents.send('gcal:syncStart', label)
  try {
    await syncTaskToGoogle(taskId)
    mainWindow?.webContents.send('gcal:syncSuccess', label)
  } catch (error) {
    console.error('[gcal] erro na sincronização:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    mainWindow?.webContents.send('gcal:syncError', errorMessage)
    throw error
  }
}

// Recebe só ids já filtrados por gcal_sync: depois de uma exclusão a task não existe mais para
// consultar, e o sync com a task ausente é justamente o que apaga os eventos dela. Exclusões vão
// mesmo com o auto-sync desligado — nenhum "Ressincronizar" alcança uma task que não existe mais.
function pushToGoogle(taskIds: number[]): void {
  if (taskIds.length === 0 || !isGcalConnected()) return
  const autoSync = isGcalAutoSyncOn()
  for (const id of taskIds) {
    if (autoSync || !getTask(id)) runGoogleSync(id).catch(() => undefined)
  }
}

function autoSyncToGoogle(...taskIds: number[]): void {
  pushToGoogle(filterGcalSyncedIds(taskIds))
}

function autoSyncTask(taskId: number): Promise<void> {
  autoSyncToGoogle(taskId)
  scheduleJiraDescriptionPush(taskId)
  scheduleJiraWorklogPush(taskId)
  return autoSyncToNotion(taskId)
}

onJiraBackgroundError((error) => {
  console.error('[jira] erro na sincronização em segundo plano:', error)
  const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
  mainWindow?.webContents.send('jira:syncError', errorMessage)
})

async function afterJiraIssueChange(taskId: number): Promise<void> {
  mainWindow?.webContents.send('tasks:refresh')
  await autoSyncTask(taskId)
}

async function deleteTasksWithEffects(taskIds: number[]): Promise<void> {
  if (taskIds.length === 0) return

  const allIds = [...taskIds, ...taskIds.flatMap((id) => getChildTaskIds(id))]
  const calendarIds = filterGcalSyncedIds(allIds)
  const config = getNotionConfig()
  if (config?.autoSync && config.databaseId) {
    await Promise.all(
      allIds.map(async (id) => {
        try {
          await deleteTaskFromNotion(id)
        } catch (error) {
          console.error(`Erro ao deletar tarefa ${id} do Notion:`, error)
        }
      })
    )
  }

  disposeTerminalsForTasks(allIds)
  deleteTasks(taskIds)
  pushToGoogle(calendarIds)
}

// Renomear, mesclar ou excluir uma tag muda o multi_select das tarefas no Notion, que só é
// reescrito quando a tarefa inteira é sincronizada de novo.
async function syncTasksAfterTagChange(taskIds: number[]): Promise<void> {
  if (taskIds.length === 0) return
  const config = getNotionConfig()
  if (!config?.autoSync || !config.databaseId) return

  const label = `${taskIds.length} ${taskIds.length === 1 ? 'tarefa' : 'tarefas'}`
  mainWindow?.webContents.send('notion:syncStart', label)
  try {
    const allowed = jiraNotionFilter()
    for (const id of taskIds) {
      const task = getTask(id)
      if (task && allowed(task)) {
        await syncTaskToNotion(task)
      }
    }
    mainWindow?.webContents.send('notion:syncSuccess', label)
  } catch (error) {
    console.error('Erro ao ressincronizar tarefas após mudança de tag:', error)
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    mainWindow?.webContents.send('notion:syncError', message)
  }
}

// ===================== FLOAT WINDOW =====================

function createFloatWindow(): void {
  if (floatWindow) {
    floatWindow.show()
    return
  }

  const display = screen.getPrimaryDisplay()
  const { width } = display.workAreaSize

  floatWindow = new BrowserWindow({
    width: FLOAT_WIDTH,
    height: floatHeightFor(currentTimers.length),
    x: width - FLOAT_WIDTH - 20,
    y: 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: true,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })
  guardRenderer(floatWindow, 'float')

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    floatWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/float`)
  } else {
    floatWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/float' })
  }

  floatWindow.on('closed', () => {
    floatWindow = null
  })
}

function showFloatWindow(): void {
  if (!floatWindow) {
    createFloatWindow()
  }
  if (!floatWindow || floatWindow.isVisible()) return

  const pushState = (): void => {
    if (!floatWindow || floatWindow.isDestroyed()) return
    floatWindow.setSize(FLOAT_WIDTH, floatHeightFor(currentTimers.length))
    if (currentTimers.length > 0) {
      floatWindow.webContents.send('float:update', currentTimers)
    } else {
      floatWindow.webContents.send('float:clear')
    }
  }

  if (floatWindow.webContents.isLoading()) {
    floatWindow.once('ready-to-show', () => {
      floatWindow?.show()
      pushState()
    })
  } else {
    floatWindow.show()
    pushState()
  }
}

function hideFloatWindow(): void {
  if (floatWindow) {
    floatWindow.hide()
  }
}

function clearFloatWindowState(): void {
  currentTimers = []
  if (floatWindow && !floatWindow.isDestroyed()) {
    floatWindow.destroy()
    floatWindow = null
  }
}

function updateFloatWindow(timers: FloatTimerData[]): void {
  currentTimers = timers
  if (floatWindow && !floatWindow.isDestroyed() && floatWindow.isVisible()) {
    // Redimensionar a cada tick repinta a janela transparente sem necessidade.
    const [, currentHeight] = floatWindow.getSize()
    const nextHeight = floatHeightFor(timers.length)
    if (currentHeight !== nextHeight) {
      floatWindow.setSize(FLOAT_WIDTH, nextHeight)
    }
    floatWindow.webContents.send('float:update', timers)
  }
}

// ===================== QUICK CAPTURE WINDOW =====================

function createQuickCaptureWindow(): void {
  if (quickCaptureWindow && !quickCaptureWindow.isDestroyed()) {
    quickCaptureWindow.focus()
    return
  }

  const display = screen.getPrimaryDisplay()
  const { width, height } = display.workAreaSize

  quickCaptureWindow = new BrowserWindow({
    width: 400,
    height: 140,
    x: Math.round(width / 2 - 200),
    y: Math.round(height / 3),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: true,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })
  guardRenderer(quickCaptureWindow, 'captura')

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    quickCaptureWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/quick-capture`)
  } else {
    quickCaptureWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: '/quick-capture'
    })
  }

  quickCaptureWindow.once('ready-to-show', () => {
    quickCaptureWindow?.show()
  })

  quickCaptureWindow.on('blur', () => {
    if (quickCaptureWindow && !quickCaptureWindow.isDestroyed()) {
      quickCaptureWindow.close()
    }
  })

  quickCaptureWindow.on('closed', () => {
    quickCaptureWindow = null
  })
}

function tryRegisterCapture(accelerator: string): boolean {
  try {
    return globalShortcut.register(accelerator, () => {
      createQuickCaptureWindow()
    })
  } catch (error) {
    console.error('Erro ao registrar atalho global:', error)
    return false
  }
}

function usesGnomeKeybinding(): boolean {
  return (
    process.platform === 'linux' &&
    process.env.XDG_SESSION_TYPE === 'wayland' &&
    /gnome/i.test(process.env.XDG_CURRENT_DESKTOP ?? '')
  )
}

const runGsettings: GsettingsRun = (args) =>
  new Promise((resolve, reject) => {
    execFile('gsettings', args, { timeout: 5000 }, (error, stdout, stderr) => {
      if (error) reject(new Error(stderr.trim() || error.message))
      else resolve(stdout)
    })
  })

function quickCaptureCommand(): string {
  const parts = app.isPackaged
    ? [shellQuote(process.env.APPIMAGE || process.execPath)]
    : [
        'env',
        'ELECTRON_DISABLE_SANDBOX=1',
        shellQuote(process.execPath),
        shellQuote(app.getAppPath())
      ]
  return [...parts, QUICK_CAPTURE_FLAG].join(' ')
}

function registerGlobalShortcut(): void {
  captureShortcut = getAppPrefs().captureShortcut
  if (usesGnomeKeybinding()) return
  if (!tryRegisterCapture(captureShortcut)) {
    console.error(`Atalho da captura recusado pelo sistema: ${captureShortcut}`)
  }
}

async function appPrefsStatus(): Promise<AppPrefsStatus> {
  const prefs = getAppPrefs()
  if (!usesGnomeKeybinding()) {
    return { ...prefs, captureShortcutActive: globalShortcut.isRegistered(captureShortcut) }
  }
  let current: GnomeKeybinding | null = null
  try {
    current = await readGnomeKeybinding(runGsettings)
  } catch (error) {
    console.error('[atalho] não foi possível ler os atalhos do GNOME:', error)
  }
  return {
    ...prefs,
    captureShortcutActive: isGnomeKeybindingCurrent(
      current,
      prefs.captureShortcut,
      quickCaptureCommand()
    )
  }
}

async function changeCaptureShortcut(accelerator: unknown): Promise<AppPrefsStatus> {
  if (!isValidAccelerator(accelerator)) {
    throw new Error(`Atalho inválido. ${ACCELERATOR_RULE}`)
  }
  if (usesGnomeKeybinding()) {
    try {
      await writeGnomeKeybinding(runGsettings, accelerator, quickCaptureCommand())
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      throw new Error(`Não foi possível definir o atalho no sistema: ${detail}`)
    }
  } else if (accelerator !== captureShortcut) {
    const previous = captureShortcut
    if (globalShortcut.isRegistered(previous)) globalShortcut.unregister(previous)
    if (!tryRegisterCapture(accelerator)) {
      tryRegisterCapture(previous)
      throw new Error('O sistema recusou esse atalho. Ele pode estar em uso por outro programa.')
    }
  } else if (!globalShortcut.isRegistered(accelerator) && !tryRegisterCapture(accelerator)) {
    throw new Error('O sistema recusou esse atalho. Ele pode estar em uso por outro programa.')
  }
  captureShortcut = accelerator
  setAppPrefs({ captureShortcut: accelerator })
  return appPrefsStatus()
}

// ===================== MAIN WINDOW =====================

function revealMainWindow(route?: string): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    startHidden = false
    createWindow(route)
    return
  }

  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
  hideFloatWindow()
}

function navigateMainWindow(route: string): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    revealMainWindow(route)
    return
  }
  revealMainWindow()
  mainWindow.webContents.send('app:navigate', route)
}

// O Electron não segura a Notification: sem esta referência ela pode ser coletada antes do clique.
const liveNotifications = new Set<Notification>()

function showNotification(title: string, body: string, taskId?: number): void {
  if (!Notification.isSupported()) {
    throw new Error('Este sistema não aceita notificações.')
  }
  const notification = new Notification({ title, body })
  liveNotifications.add(notification)
  const release = (): void => {
    liveNotifications.delete(notification)
  }
  notification.on('close', release)
  notification.on('failed', release)
  notification.on('click', () => {
    release()
    if (taskId !== undefined) navigateMainWindow(`/task/${taskId}`)
  })
  notification.show()
}

// Em AppImage o process.execPath aponta para o volume temporário montado, que some quando este
// processo sai; APPIMAGE guarda o caminho real do arquivo distribuído.
function relaunchApp(): void {
  const args = process.argv.slice(1).filter((arg) => arg !== HIDDEN_FLAG)
  app.relaunch(process.env.APPIMAGE ? { execPath: process.env.APPIMAGE, args } : { args })
  app.exit(0)
}

function quitApp(): void {
  isQuitting = true
  app.quit()
}

function createWindow(route?: string): void {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 700,
    minWidth: 400,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: 'CrafyTask',
    icon: icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })
  guardRenderer(mainWindow, 'principal')

  mainWindow.on('ready-to-show', () => {
    if (startHidden) {
      startHidden = false
      return
    }
    mainWindow?.show()
  })

  mainWindow.on('close', (event) => {
    if (isQuitting) return
    event.preventDefault()
    mainWindow?.hide()
    // hide() não emite 'minimize', então o float precisa ser acionado aqui — é justamente
    // ao esconder a janela com um timer rodando que ele importa.
    if (currentTimers.length > 0) {
      showFloatWindow()
    }
  })

  mainWindow.on('minimize', () => {
    if (currentTimers.length > 0) {
      showFloatWindow()
    }
  })

  mainWindow.on('restore', () => {
    hideFloatWindow()
  })

  mainWindow.on('focus', () => {
    hideFloatWindow()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    const url = process.env['ELECTRON_RENDERER_URL']
    mainWindow.loadURL(route ? `${url}#${route}` : url)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'), route ? { hash: route } : {})
  }
}

// ===================== MCP SERVER =====================

const BRIDGE_FILE = 'mcp-bridge.js'

// A ponte é registrada no cliente MCP por caminho absoluto, então ele precisa sobreviver a
// atualizações do app e, no AppImage, ao volume temporário onde a instalação vive. Copiar para
// o userData a cada boot resolve os dois casos.
function ensureBridgeScript(): string {
  const target = join(app.getPath('userData'), BRIDGE_FILE)
  try {
    copyFileSync(join(__dirname, BRIDGE_FILE), target)
  } catch (error) {
    console.error('[mcp] falha ao publicar a ponte stdio:', error)
  }
  return target
}

function buildMcpStatus(): McpStatus {
  const config = readMcpConfig()
  const bridge = join(app.getPath('userData'), BRIDGE_FILE)
  return {
    enabled: config.enabled,
    running: isMcpRunning(),
    port: config.port,
    token: config.token,
    command: `claude mcp add crafytask --scope user --env ELECTRON_RUN_AS_NODE=1 -- "${process.execPath}" "${bridge}"`
  }
}

// ===================== IPC HANDLERS =====================

const drawingRenderBridge = createDrawingRenderBridge((requestId, payload) => {
  if (!mainWindow || mainWindow.isDestroyed() || mainWindow.webContents.isLoading()) return false
  mainWindow.webContents.send('drawing:renderRequest', requestId, payload)
  return true
})

const statusChangeDeps: StatusChangeDeps = {
  getTask,
  updateTaskStatus,
  stopTimer: (id) => {
    stopTask(id)
    mainWindow?.webContents.send('timer:stopped', id)
  },
  createNextRecurrence,
  getNextRecurrenceIds,
  deleteNextRecurrence,
  completeSubtasksCheck,
  getTaskDependents,
  filterGcalSyncedIds,
  syncCalendar: (ids) => autoSyncToGoogle(...ids),
  pushCalendar: (ids) => pushToGoogle(ids),
  autoSync: (id) => {
    autoSyncTask(id)
  },
  notifyUnblocked: (id, name) => mainWindow?.webContents.send('task:unblocked', id, name)
}

function applyStatusChange(id: number, status: TaskStatus): void {
  applyTaskStatusChange(statusChangeDeps, id, status)
}

async function setGcalSync(taskId: number, enabled: boolean): Promise<void> {
  updateTask(taskId, { gcal_sync: enabled })
  await runGoogleSync(taskId)
}

async function syncTaskToNotionNow(taskId: number): Promise<unknown> {
  const task = getTask(taskId)
  if (!task) throw new Error('Tarefa não encontrada')
  return syncTaskToNotion(task)
}

async function transitionJira(taskId: number, transitionId: string): Promise<void> {
  await transitionJiraIssue(taskId, transitionId)
  await afterJiraIssueChange(taskId)
}

async function exportTaskLocal(taskId: number): Promise<boolean> {
  const task = getTask(taskId)
  if (!task || !task.local_export_path) return false
  await exportTaskToLocal(task, task.local_export_path)
  return true
}

function resetTaskTime(id: number): void {
  const worklogs = captureJiraWorklogs(id)
  resetTaskTimer(id)
  deleteJiraWorklogs(worklogs)
  autoSyncTask(id)
}

function editTimeEntry(id: number, startIso: string, endIso: string): number {
  const { taskId, worklogId } = updateTimeEntry(id, startIso, endIso)
  syncEditedTimeEntry(taskId, id, worklogId)
  autoSyncTask(taskId)
  return taskId
}

function removeTimeEntry(id: number): number {
  const { taskId, worklogId } = deleteTimeEntry(id)
  syncDeletedTimeEntry(taskId, worklogId)
  autoSyncTask(taskId)
  return taskId
}

function setupIpcHandlers(): void {
  registerTerminalIpc(() => mainWindow)
  registerNotebookIpc(() => mainWindow)
  // Window controls
  ipcMain.handle('window:minimize', () => mainWindow?.minimize())
  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })
  ipcMain.handle('window:close', () => mainWindow?.close())

  // Task CRUD
  ipcMain.handle('task:create', (_, data: CreateTaskInput) => {
    const task = createTask(data)
    autoSyncTask(task.id)
    mainWindow?.webContents.send('tasks:refresh')
    return task
  })
  ipcMain.handle('task:list', (_, filters?: TaskListFilters) => listTasks(filters))
  ipcMain.handle('task:count', (_, filters?: TaskListFilters) => countTasks(filters))
  ipcMain.handle('task:statusCounts', (_, filters?: TaskListFilters) => countTasksByStatus(filters))
  ipcMain.handle('task:listActiveLight', () => listActiveTasksLight())
  ipcMain.handle('task:listRunning', () => listRunningTasks())
  ipcMain.handle('task:get', (_, id: number) => getTask(id))
  ipcMain.handle('task:update', (_, id: number, data: UpdateTaskInput) => {
    updateTask(id, data)
    autoSyncTask(id)
  })
  ipcMain.handle('task:updateNotes', (_, id: number, notes: string | null) => {
    updateTaskNotes(id, notes)
    scheduleJiraDescriptionPush(id)
  })
  // O PNG alimenta MCP, Notion e export local. Gravá-lo junto do JSON evita que essas três
  // saídas passem a servir um preview defasado quando só uma das escritas falha.
  ipcMain.handle(
    'drawing:save',
    async (_, taskId: number, drawing: string | null, preview: Uint8Array | null) => {
      const owner = { kind: 'task', id: taskId } as const
      if (drawing === null) {
        updateTaskDrawing(taskId, null)
        await deleteDrawingPreview(owner)
        return
      }
      if (preview) await saveDrawingPreview(owner, preview)
      updateTaskDrawing(taskId, drawing)
    }
  )
  ipcMain.handle('drawing:renderResult', (_, requestId: string, result: DrawingRenderResult) =>
    drawingRenderBridge.resolve(requestId, result)
  )
  ipcMain.handle('notes:searchMentions', (_, query: string) => searchMentions(query))
  ipcMain.handle(
    'notes:saveImage',
    (_, owner: NotesOwner, bytes: Uint8Array, filename: string, mime: string) =>
      saveNoteImage(owner, bytes, filename, mime)
  )
  // Escolhe (via diálogo) o arquivo de exportação local, persiste o caminho e exporta.
  ipcMain.handle('notes:exportLocalChoose', async (_, taskId: number) => {
    const task = getTask(taskId)
    if (!task) return null
    const safeName = (task.name || 'task').replace(/[^\w\-. ]+/g, '_').trim() || 'task'
    const result = await dialog.showSaveDialog({
      title: 'Salvar nota localmente',
      defaultPath: task.local_export_path || `${safeName}.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    })
    if (result.canceled || !result.filePath) return null
    setTaskLocalExportPath(taskId, result.filePath)
    await exportTaskToLocal({ ...task, local_export_path: result.filePath }, result.filePath)
    return result.filePath
  })
  // Reexporta silenciosamente se a task já tem um caminho local configurado.
  ipcMain.handle('notes:exportLocal', (_, taskId: number) => exportTaskLocal(taskId))
  ipcMain.handle('task:delete', (_, id: number) => {
    const calendarIds = filterGcalSyncedIds([id, ...getChildTaskIds(id)])
    const config = getNotionConfig()
    if (config?.autoSync && config.databaseId) {
      // Excluir também as subtarefas do Notion
      for (const childId of getChildTaskIds(id)) {
        deleteTaskFromNotion(childId).catch((error) => {
          console.error('Erro ao deletar subtarefa do Notion:', error)
        })
      }
      deleteTaskFromNotion(id).catch((error) => {
        console.error('Erro ao deletar do Notion:', error)
      })
    }
    disposeTerminalsForTasks([id, ...getChildTaskIds(id)])
    deleteTask(id)
    pushToGoogle(calendarIds)
  })
  ipcMain.handle('task:bulkDelete', async (_, ids: number[]) => {
    await deleteTasksWithEffects(normalizeTaskIds(ids))
  })
  ipcMain.handle('task:countArchivedBefore', (_, cutoff: string) =>
    isIsoDate(cutoff) ? countTasks({ archived: true, archivedBefore: cutoff }) : 0
  )
  ipcMain.handle('task:deleteArchivedBefore', async (_, cutoff: string) => {
    if (!isIsoDate(cutoff)) throw new Error('Data de corte inválida.')
    const taskIds = listTaskIds({ archived: true, archivedBefore: cutoff })
    await deleteTasksWithEffects(taskIds)
    return taskIds.length
  })
  ipcMain.handle('task:bulkUpdateStatus', (_, ids: number[], status: TaskStatus) => {
    const refused: string[] = []
    for (const id of normalizeTaskIds(ids)) {
      try {
        applyStatusChange(id, status)
      } catch (error) {
        refused.push(`#${id}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    if (refused.length > 0) {
      throw new Error(`Não foi possível mudar ${refused.length} tarefa(s). ${refused.join('; ')}`)
    }
  })
  ipcMain.handle('task:bulkMoveToProject', (_, ids: number[], projectId: number | null) => {
    const taskIds = normalizeTaskIds(ids)
    if (taskIds.length === 0) return

    moveTasksToProject(taskIds, projectId)
    for (const id of taskIds) {
      autoSyncTask(id)
    }
  })

  // Archive
  ipcMain.handle('task:archive', (_, id: number) => {
    archiveTask(id)
    autoSyncTask(id)
  })
  ipcMain.handle('task:unarchive', (_, id: number) => {
    unarchiveTask(id)
    autoSyncTask(id)
  })
  ipcMain.handle('task:totals', (_, filters: TaskListFilters) => taskTotals(filters ?? {}))
  ipcMain.handle(
    'task:restoreArchived',
    (_, entries: { id: number; archived_at: string | null }[]) => {
      const valid = (Array.isArray(entries) ? entries : []).filter(
        (entry) => Number.isInteger(entry?.id) && entry.id > 0
      )
      restoreArchived(
        valid.map((entry) => ({
          id: entry.id,
          archived_at: typeof entry.archived_at === 'string' ? entry.archived_at : null
        }))
      )
      for (const entry of valid) autoSyncTask(entry.id)
    }
  )
  ipcMain.handle('task:bulkSetArchived', (_, ids: number[], archived: boolean) => {
    const taskIds = normalizeTaskIds(ids)
    if (taskIds.length === 0) return

    setTasksArchived(taskIds, archived === true)
    for (const id of taskIds) {
      autoSyncTask(id)
    }
  })

  // Timer
  ipcMain.handle('task:start', (_, id: number) => {
    const task = getTask(id)
    if (task?.is_blocked) {
      throw new Error('Tarefa bloqueada por dependências não concluídas')
    }
    startTask(id)
  })
  ipcMain.handle('task:stop', (_, id: number) => {
    const result = stopTask(id)
    autoSyncTask(id)
    return result
  })
  ipcMain.handle('task:updateTimer', (_, id: number, seconds: number) => updateTimer(id, seconds))
  ipcMain.handle('task:reset', (_, id: number) => resetTaskTime(id))
  ipcMain.handle('task:addManualTime', (_, id: number, seconds: number) => {
    addManualTimeEntry(id, seconds)
    autoSyncTask(id)
  })
  ipcMain.handle('task:setTotalTime', (_, id: number, seconds: number) => {
    setTaskTotalTime(id, seconds)
    autoSyncTask(id)
  })

  // Status
  ipcMain.handle('task:updateStatus', (_, id: number, status: TaskStatus) =>
    applyStatusChange(id, status)
  )

  // Time Entries
  ipcMain.handle('task:getTimeEntries', (_, taskId: number) => getTimeEntries(taskId))
  ipcMain.handle(
    'task:history',
    (_, taskId: number, includeSubtasks: boolean): TaskHistoryView => ({
      entries: getTaskHistory({ taskId, includeSubtasks, limit: TASK_HISTORY_MAX_LIMIT }),
      lastCheckpoint: getTaskLastCheckpoint(taskId)
    })
  )
  ipcMain.handle('task:addHistory', (_, taskId: number, summary: string) =>
    addTaskHistory({ task_id: taskId, kind: 'note', summary: String(summary ?? '') }, 'app')
  )
  ipcMain.handle('timeEntry:update', (_, id: number, startIso: string, endIso: string) => {
    editTimeEntry(id, startIso, endIso)
  })
  ipcMain.handle('timeEntry:listRange', (_, fromIso: string, toIso: string) =>
    listTimeEntriesRange(fromIso, toIso)
  )
  ipcMain.handle('timeEntry:delete', (_, id: number) => {
    removeTimeEntry(id)
  })
  ipcMain.handle('task:getActiveTimeEntry', (_, taskId: number) => getActiveTimeEntry(taskId))

  // Notifications
  ipcMain.handle('notification:show', (_, title: string, body: string) => {
    if (Notification.isSupported()) showNotification(title, body)
  })

  // Float window controls
  ipcMain.handle('float:updateTimer', (_, timers: FloatTimerData[]) => {
    updateFloatWindow(timers)
  })
  ipcMain.handle('float:clearTimer', () => {
    clearFloatWindowState()
    hideFloatWindow()
  })
  ipcMain.handle('float:restore', () => revealMainWindow())
  ipcMain.handle('float:stopTimer', async (_, taskId: number) => {
    const result = await stopTask(taskId)
    autoSyncTask(taskId)
    mainWindow?.webContents.send('timer:stopped', taskId)
    return result
  })
  ipcMain.handle('float:openTask', (_, taskId: number) => {
    if (!Number.isInteger(taskId) || taskId <= 0) return
    navigateMainWindow(`/task/${taskId}`)
  })
  ipcMain.handle('float:stopAll', async () => {
    const ids = currentTimers.map((t) => t.taskId)
    for (const id of ids) {
      await stopTask(id)
      autoSyncTask(id)
      mainWindow?.webContents.send('timer:stopped', id)
    }
  })

  // Statistics
  ipcMain.handle('stats:period', (_, period: StatsPeriod) =>
    getPeriodStats({
      start: String(period?.start ?? ''),
      end: String(period?.end ?? ''),
      projectId: Number.isInteger(period?.projectId) ? Number(period.projectId) : null
    })
  )
  ipcMain.handle('report:weeklyPDF', async (_, range?: { start?: unknown; end?: unknown }) => {
    if (!mainWindow) return false
    const day = (value: unknown): string | null =>
      typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null
    const start = day(range?.start)
    const end = day(range?.end)
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      defaultPath:
        start && end
          ? `crafytask-dashboard-${start}_${end}.pdf`
          : `crafytask-relatorio-${new Date().toISOString().split('T')[0]}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })
    if (!filePath) return false
    const data = await mainWindow.webContents.printToPDF({
      printBackground: true,
      landscape: true
    })
    const { writeFile } = await import('fs/promises')
    await writeFile(filePath, data)
    shell.openPath(filePath)
    return true
  })

  // Tags
  ipcMain.handle('tag:create', (_, name: string, color?: string) => createTag(name, color))
  ipcMain.handle('tag:list', () => listTags())
  ipcMain.handle('tag:getOrCreate', (_, name: string) => getOrCreateTag(name))
  ipcMain.handle('tag:listWithUsage', () => listTagsWithUsage())
  ipcMain.handle('tag:update', (_, id: number, data: UpdateTagInput) => {
    updateTag(id, data)
    syncTasksAfterTagChange(listTaskIdsWithTag(id))
  })
  ipcMain.handle('tag:merge', (_, sourceId: number, targetId: number) => {
    const affected = mergeTags(sourceId, targetId)
    syncTasksAfterTagChange(affected)
    return affected.length
  })
  ipcMain.handle('tag:delete', (_, id: number) => {
    const affected = listTaskIdsWithTag(id)
    deleteTag(id)
    syncTasksAfterTagChange(affected)
  })
  ipcMain.handle('tag:getTaskTags', (_, taskId: number) => getTaskTags(taskId))
  ipcMain.handle('tag:setTaskTags', (_, taskId: number, tagIds: number[]) => {
    setTaskTags(taskId, tagIds)
    autoSyncTask(taskId)
  })

  // ===================== PROJECTS =====================
  ipcMain.handle('project:create', (_, data: CreateProjectInput) => createProject(data))
  ipcMain.handle('project:get', (_, id: number) => getProject(id))
  ipcMain.handle('project:list', (_, status?: ProjectStatus) => listProjects(status))
  ipcMain.handle('project:update', (_, id: number, data: UpdateProjectInput) =>
    updateProject(id, data)
  )
  ipcMain.handle('project:delete', (_, id: number) => {
    deleteProject(id)
    disposeTerminalsForProjects([id])
  })
  ipcMain.handle('project:getTasks', (_, projectId: number) => getProjectTasks(projectId))

  // ===================== CONTEXTS =====================
  ipcMain.handle('context:create', (_, name: string, icon?: string, color?: string) =>
    createContext(name, icon, color)
  )
  ipcMain.handle('context:list', () => listContexts())
  ipcMain.handle('context:listWithUsage', () => listContextsWithUsage())
  ipcMain.handle('context:merge', (_, sourceId: number, targetId: number) => {
    const affected = mergeContexts(sourceId, targetId)
    syncTasksAfterTagChange(affected)
    return affected.length
  })
  ipcMain.handle(
    'context:update',
    (_, id: number, data: { name?: string; icon?: string; color?: string }) =>
      updateContext(id, data)
  )
  ipcMain.handle('context:delete', (_, id: number) => deleteContext(id))
  ipcMain.handle('context:getTaskContexts', (_, taskId: number) => getTaskContexts(taskId))
  ipcMain.handle('context:setTaskContexts', (_, taskId: number, contextIds: number[]) =>
    setTaskContexts(taskId, contextIds)
  )

  // ===================== WEEKLY REVIEWS =====================
  ipcMain.handle('review:create', () => createWeeklyReview())
  ipcMain.handle('review:get', (_, id: number) => getWeeklyReview(id))
  ipcMain.handle('review:list', () => listWeeklyReviews())
  ipcMain.handle('review:getLast', () => getLastWeeklyReview())
  ipcMain.handle('review:updateNotes', (_, id: number, notes: string) =>
    updateWeeklyReviewNotes(id, notes)
  )
  ipcMain.handle(
    'review:setStep',
    (_, id: number, key: ReviewStepKey, status: ReviewStepStatus | null) =>
      setWeeklyReviewStep(id, key, status)
  )
  ipcMain.handle('review:setCurrentStep', (_, id: number, key: ReviewStepKey) =>
    setWeeklyReviewCurrentStep(id, key)
  )
  ipcMain.handle('review:discard', (_, id: number) => discardWeeklyReview(id))
  ipcMain.handle('review:bumpCounter', (_, id: number, key: ReviewCounterKey, taskId?: number) =>
    bumpWeeklyReviewCounter(id, key, taskId)
  )
  ipcMain.handle('review:complete', (_, id: number, notes?: string) =>
    completeWeeklyReview(id, notes)
  )
  ipcMain.handle('review:pastWeek', () => getReviewPastWeek())
  ipcMain.handle('review:healthIndicators', () => getReviewHealthIndicators())

  // ===================== QUICK CAPTURE =====================
  ipcMain.handle('quickCapture:open', () => {
    createQuickCaptureWindow()
  })
  ipcMain.handle('quickCapture:capture', (_, name: string) => {
    const task = createTask({ name })
    // Notificar a janela principal para atualizar
    mainWindow?.webContents.send('tasks:refresh')
    // Mostrar notificação
    new Notification({
      title: 'CrafyTask',
      body: `"${name}" capturado para Inbox`
    }).show()
    return task
  })
  ipcMain.handle('quickCapture:close', () => {
    if (quickCaptureWindow && !quickCaptureWindow.isDestroyed()) {
      quickCaptureWindow.close()
    }
  })

  // Notion Integration
  ipcMain.handle('notion:getConfig', () => getNotionConfig())
  ipcMain.handle('notion:saveConfig', (_, config: NotionConfig) => saveNotionConfig(config))
  ipcMain.handle('notion:clearConfig', () => clearNotionConfig())
  ipcMain.handle('notion:testConnection', () => testNotionConnection())
  ipcMain.handle('notion:syncTask', (_, taskId: number) => syncTaskToNotionNow(taskId))
  ipcMain.handle('notion:syncTaskNotes', async (_, taskId: number) => {
    const task = getTask(taskId)
    if (!task) throw new Error('Tarefa não encontrada')
    mainWindow?.webContents.send('notion:syncStart', task.name)
    try {
      await syncTaskNotesToNotion(task)
      mainWindow?.webContents.send('notion:syncSuccess', task.name)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      mainWindow?.webContents.send('notion:syncError', errorMessage)
      throw error
    }
  })
  ipcMain.handle('notion:syncAllTasks', async () => {
    const tasks = listTasksForSync().filter(jiraNotionFilter())
    return syncAllTasks(tasks)
  })
  ipcMain.handle('notion:createDatabase', () => findOrCreateDatabase())

  // ===================== FASE 2: Subtarefas =====================
  ipcMain.handle('subtask:list', (_, parentId: number) => getSubtasks(parentId))
  ipcMain.handle('subtask:create', async (_, data: { name: string; parent_task_id: number }) => {
    const task = createTask({ name: data.name, parent_task_id: data.parent_task_id })
    // Sincroniza a pai primeiro (garante a página no Notion) e depois a subtarefa,
    // para que a relação "Tarefa Pai" encontre a página da pai.
    await autoSyncTask(data.parent_task_id)
    autoSyncTask(task.id)
    return task
  })

  // ===================== FASE 2: Dependências =====================
  ipcMain.handle('dependency:get', (_, taskId: number) => getTaskDependencies(taskId))
  ipcMain.handle('dependency:add', (_, taskId: number, dependsOnId: number) =>
    addTaskDependency(taskId, dependsOnId)
  )
  ipcMain.handle('dependency:remove', (_, taskId: number, dependsOnId: number) =>
    removeTaskDependency(taskId, dependsOnId)
  )

  // ===================== FASE 2: Agendamento =====================
  ipcMain.handle('schedule:getForDate', (_, date: string) => getTasksForDate(date))
  ipcMain.handle('task:scheduleForDate', (_, taskId: number, date: string | null) => {
    updateTask(taskId, { scheduled_date: date })
    autoSyncToGoogle(taskId)
  })

  // ===================== FASE 4.3: Blocos de Tempo =====================
  ipcMain.handle('timeBlock:create', (_, data: CreateTimeBlockInput) => {
    const error = timeBlockError(data)
    if (error) throw new Error(error)
    const block = createTimeBlock(data)
    autoSyncToGoogle(block.task_id)
    return block
  })
  ipcMain.handle('timeBlock:getForDate', (_, date: string) => getTimeBlocksForDate(date))
  ipcMain.handle('timeBlock:getForWeek', (_, startDate: string) => getTimeBlocksForWeek(startDate))
  ipcMain.handle('timeBlock:update', (_, id: number, data: UpdateTimeBlockInput) => {
    const before = getTimeBlock(id)
    if (!before) throw new Error('Bloco não encontrado.')
    const error = timeBlockError(mergeTimeBlock(before, data))
    if (error) throw new Error(error)
    updateTimeBlock(id, data)
    autoSyncToGoogle(before.task_id, data.task_id ?? before.task_id)
    return before
  })
  ipcMain.handle('timeBlock:getForRange', (_, from: string, to: string) =>
    getTimeBlocksForRange(from, to)
  )
  ipcMain.handle('schedule:getRange', (_, from: string, to: string) => listCalendarTasks(from, to))
  ipcMain.handle(
    'schedule:listUnscheduled',
    (_, from: string, to: string, filters?: UnscheduledTaskFilters) =>
      listUnscheduledTasks(from, to, filters)
  )
  ipcMain.handle('timeBlock:delete', (_, id: number) => {
    const before = getTimeBlock(id)
    deleteTimeBlock(id)
    if (before) autoSyncToGoogle(before.task_id)
    return before ?? null
  })

  // Jira
  ipcMain.handle('jira:getStatus', () => getJiraStatus())
  ipcMain.handle('jira:importNow', () => runJiraImport())
  ipcMain.handle('jira:saveCredentials', (_, input: JiraCredentialsInput) =>
    saveJiraCredentials(input)
  )
  ipcMain.handle('jira:test', () => testJiraConnection())
  ipcMain.handle('jira:listBoards', () => listJiraBoards())
  ipcMain.handle('jira:saveBoards', (_, boardIds: number[]) => saveJiraBoards(boardIds))
  ipcMain.handle('jira:saveMapping', (_, mapping: StatusMapping) => saveJiraMapping(mapping))
  ipcMain.handle('jira:saveOptions', (_, input: JiraOptionsInput) => saveJiraOptions(input))
  ipcMain.handle('jira:disconnect', () => disconnectJira())
  ipcMain.handle('jira:listTransitions', (_, taskId: number) => listJiraTransitions(taskId))
  ipcMain.handle('jira:transition', (_, taskId: number, transitionId: string) =>
    transitionJira(taskId, transitionId)
  )
  ipcMain.handle('jira:getFields', (_, taskId: number) => getJiraIssueFields(taskId))
  ipcMain.handle('jira:getChildren', (_, taskId: number) => getJiraChildren(taskId))
  ipcMain.handle(
    'jira:updateField',
    async (_, taskId: number, fieldId: string, value: JiraFieldInput) => {
      const fields = await updateJiraIssueField(taskId, fieldId, value)
      await afterJiraIssueChange(taskId)
      return fields
    }
  )
  ipcMain.handle('jira:searchUsers', (_, taskId: number, fieldId: string, query: string) =>
    searchJiraUsers(taskId, fieldId, query)
  )

  // Google Calendar
  ipcMain.handle('gcal:getStatus', () => getGcalStatus())
  ipcMain.handle('gcal:saveCredentials', (_, clientId: string, clientSecret: string) =>
    saveGcalCredentials(clientId, clientSecret)
  )
  ipcMain.handle('gcal:connect', () => connectGcal())
  ipcMain.handle('gcal:disconnect', () => disconnectGcal())
  ipcMain.handle('gcal:setAutoSync', (_, enabled: boolean) => setGcalAutoSync(enabled))
  ipcMain.handle('gcal:setTaskSync', (_, taskId: number, enabled: boolean) =>
    setGcalSync(taskId, enabled)
  )
  ipcMain.handle('gcal:syncTask', (_, taskId: number) => runGoogleSync(taskId))
  ipcMain.handle('gcal:syncAll', async () => {
    mainWindow?.webContents.send('gcal:syncStart')
    try {
      const result = await syncAllToGoogle()
      mainWindow?.webContents.send('gcal:syncSuccess')
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      mainWindow?.webContents.send('gcal:syncError', errorMessage)
      throw error
    }
  })

  // ===================== FASE 4: Áreas de Foco =====================
  ipcMain.handle('area:create', (_, data) => createArea(data))
  ipcMain.handle('area:get', (_, id: number) => getArea(id))
  ipcMain.handle('area:list', () => listAreas())
  ipcMain.handle('area:update', (_, id: number, data) => updateArea(id, data))
  ipcMain.handle('area:delete', (_, id: number) => deleteArea(id))

  // ===================== FASE 4: Objetivos (Goals) =====================
  ipcMain.handle('goal:create', (_, data) => createGoal(data))
  ipcMain.handle('goal:get', (_, id: number) => getGoal(id))
  ipcMain.handle('goal:list', (_, areaId?: number) => listGoals(areaId))
  ipcMain.handle('goal:update', (_, id: number, data) => updateGoal(id, data))
  ipcMain.handle('goal:delete', (_, id: number) => deleteGoal(id))

  // ===================== INICIALIZAÇÃO =====================
  ipcMain.handle('app:getVersion', () => app.getVersion())
  ipcMain.handle('app:getAutostart', () => isAutostartEnabled())
  ipcMain.handle('app:openExternal', (_, url: string) => {
    if (!isSafeHttpUrl(url)) throw new Error('URL inválida')
    return shell.openExternal(url)
  })
  ipcMain.handle('app:setAutostart', (_, enabled: boolean) => setAutostartEnabled(enabled))
  ipcMain.handle('app:logRendererError', (event, report: RendererErrorReport) => {
    const where = report.region ? ` em "${report.region}"` : ''
    console.error(
      `[renderer] erro ${report.kind === 'caught' ? 'capturado' : 'não capturado'}${where}: ${report.message}`,
      report.stack ?? '',
      report.componentStack ?? '',
      `(janela ${event.sender.id})`
    )
  })
  ipcMain.handle('app:setThemeSource', (_, preference: unknown) => {
    if (!isThemePreference(preference)) throw new Error('Tema inválido')
    nativeTheme.themeSource = preference
  })

  ipcMain.handle('prefs:getWorkflow', () => getWorkflowPrefs())
  ipcMain.handle('prefs:setWorkflow', (_, patch: unknown) => {
    const prefs = setWorkflowPrefs(patch)
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed()) window.webContents.send('prefs:workflowChanged', prefs)
    }
    return prefs
  })

  ipcMain.handle('prefs:getApp', () => appPrefsStatus())
  ipcMain.handle('prefs:setCaptureShortcut', (_, accelerator: unknown) =>
    changeCaptureShortcut(accelerator)
  )
  ipcMain.handle('prefs:setAutoBackup', (_, enabled: unknown) => {
    if (typeof enabled !== 'boolean') throw new Error('Valor inválido')
    setAppPrefs({ autoBackup: enabled })
    if (enabled) void checkAutoBackup()
    return appPrefsStatus()
  })

  ipcMain.handle('backup:getStatus', () => getBackupStatus())
  ipcMain.handle('backup:chooseFolder', () => chooseBackupFolder(mainWindow))
  ipcMain.handle('backup:create', () => createBackup())
  ipcMain.handle('backup:chooseSnapshot', () => chooseSnapshotFolder(mainWindow))
  ipcMain.handle('backup:inspect', (_, dir: string) => inspectSnapshot(dir))
  ipcMain.handle('backup:restore', async (_, dir: string) => {
    if (isBackupRunning()) throw new Error('Um backup está em andamento. Espere terminar.')
    lockBackups()
    try {
      await inspectSnapshot(dir)
    } catch (error) {
      unlockBackups()
      throw error
    }
    isQuitting = true
    destroyTray()
    if (notificationInterval) clearInterval(notificationInterval)
    stopAutoBackupScheduler()
    await stopMcpServer()
    closeDatabase()
    try {
      await restoreSnapshot(dir)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      dialog.showErrorBox(
        'Falha ao restaurar o backup',
        `${message}\n\nOs dados anteriores foram mantidos. O CrafyTask vai reiniciar.`
      )
    }
    relaunchApp()
  })

  // ===================== MCP SERVER =====================
  ipcMain.handle('mcp:getStatus', () => buildMcpStatus())
  ipcMain.handle('mcp:setEnabled', async (_, enabled: boolean) => {
    const config = writeMcpConfig({ enabled })
    if (enabled) {
      await startMcpServer(config).catch((error) => {
        console.error('[mcp] falha ao iniciar:', error)
      })
    } else {
      await stopMcpServer()
    }
    return buildMcpStatus()
  })
  ipcMain.handle('mcp:regenerateToken', async () => {
    const config = writeMcpConfig({ token: generateToken() })
    if (config.enabled) {
      await stopMcpServer()
      await startMcpServer(config).catch((error) => {
        console.error('[mcp] falha ao reiniciar após regenerar token:', error)
      })
    }
    return buildMcpStatus()
  })
}

// ===================== APP LIFECYCLE =====================

// ===================== NOTIFICATION SCHEDULER =====================

const notifiedToday = new Set<string>() // 'taskId-type' keys to avoid spam
let notificationInterval: NodeJS.Timeout | null = null
let autoBackupInterval: NodeJS.Timeout | null = null
let autoBackupFirstCheck: NodeJS.Timeout | null = null

const AUTO_BACKUP_CHECK_MS = 60 * 60 * 1000
const AUTO_BACKUP_FIRST_CHECK_MS = 2 * 60 * 1000

async function checkAutoBackup(): Promise<void> {
  try {
    const snapshot = await runAutoBackupIfDue()
    if (snapshot && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('backup:changed')
    }
  } catch (error) {
    console.error('[backup] backup automático falhou:', error)
  }
}

function startAutoBackupScheduler(): void {
  autoBackupFirstCheck = setTimeout(() => void checkAutoBackup(), AUTO_BACKUP_FIRST_CHECK_MS)
  autoBackupInterval = setInterval(() => void checkAutoBackup(), AUTO_BACKUP_CHECK_MS)
}

function stopAutoBackupScheduler(): void {
  if (autoBackupFirstCheck) clearTimeout(autoBackupFirstCheck)
  if (autoBackupInterval) clearInterval(autoBackupInterval)
  autoBackupFirstCheck = null
  autoBackupInterval = null
}

function checkDueDateNotifications(): void {
  const now = new Date()
  const dayKey = `day-${localDateString(now)}`
  if (!notifiedToday.has(dayKey)) {
    notifiedToday.clear()
    notifiedToday.add(dayKey)
  }

  for (const notification of pickDueNotifications(
    getTasksDueForNotification(),
    now,
    notifiedToday,
    getWorkflowPrefs().dueNotices
  )) {
    notifiedToday.add(notification.key)
    new Notification({ title: notification.title, body: notification.body }).show()
  }
}

function startNotificationScheduler(): void {
  checkDueDateNotifications()
  notificationInterval = setInterval(checkDueDateNotifications, 60 * 1000)
}

app.whenReady().then(() => {
  if (!hasSingleInstanceLock) return

  initDatabase()

  registerWriteEffects({
    getMainWindow: () => mainWindow,
    autoSync: (id) => autoSyncTask(id),
    changeStatus: (id, status) => applyStatusChange(id, status),
    renderDrawing: (payload) => drawingRenderBridge.request(payload),
    resetTaskTime,
    editTimeEntry,
    removeTimeEntry,
    integrations: {
      setGcalSync,
      syncNotion: syncTaskToNotionNow,
      jiraImport: () => runJiraImport(),
      jiraTransitions: (taskId) => listJiraTransitions(taskId),
      jiraTransition: transitionJira,
      createBackup: () => createBackup(),
      exportTask: exportTaskLocal
    },
    syncTagChange: (ids) => syncTasksAfterTagChange(ids),
    syncCalendar: (ids) => pushToGoogle(ids),
    disposeTerminals: (ids) => disposeTerminalsForTasks(ids),
    disposeProjectTerminals: (ids) => disposeTerminalsForProjects(ids),
    showNotification,
    navigate: navigateMainWindow,
    recordHistory: (taskId, summary) => {
      addTaskHistory({ task_id: taskId, summary, kind: 'operation' }, 'mcp')
    }
  })

  // Nenhuma falha do MCP pode impedir createWindow(): esta promise não tem .catch.
  try {
    ensureBridgeScript()
    const mcpConfig = readMcpConfig()
    if (mcpConfig.enabled) {
      startMcpServer(mcpConfig).catch((error) => {
        console.error('[mcp] falha ao iniciar na porta', mcpConfig.port, error)
      })
    }
  } catch (error) {
    console.error('[mcp] falha ao inicializar na abertura do app:', error)
  }

  registerAssetProtocol()
  setupIpcHandlers()
  startNotificationScheduler()
  startAutoBackupScheduler()
  startJiraScheduler(() => {
    runJiraImport().catch(() => undefined)
  })

  electronApp.setAppUserModelId('com.ticktask.app')
  try {
    app.setName('TickTask App')
  } catch {
    // setName isn't available on all platforms/versions
  }

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  createTray({
    showMainWindow: revealMainWindow,
    openQuickCapture: createQuickCaptureWindow,
    quit: quitApp
  })

  // Registrar atalho global para captura rápida
  registerGlobalShortcut()

  if (wantsQuickCapture(process.argv)) createQuickCaptureWindow()

  app.on('second-instance', (_, argv) => {
    if (wantsQuickCapture(argv)) createQuickCaptureWindow()
    else revealMainWindow()
  })

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// O app vive na bandeja: fechar a janela principal não encerra o processo, senão o servidor
// MCP cairia junto. A saída acontece pelo menu do tray (quitApp).
app.on('window-all-closed', () => {})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('before-quit', () => {
  isQuitting = true
  destroyTray()
  killAllTerminals()
  if (notificationInterval) clearInterval(notificationInterval)
  stopAutoBackupScheduler()
  void stopMcpServer()
  closeDatabase()
})
