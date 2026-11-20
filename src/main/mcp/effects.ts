import type { BrowserWindow } from 'electron'
import type { DrawingRenderPayload, DrawingRenderResult } from '@shared/drawingRender'
import type { TaskStatus } from '@shared/types'

export interface IntegrationActions {
  setGcalSync: (taskId: number, enabled: boolean) => Promise<void>
  syncNotion: (taskId: number) => Promise<unknown>
  jiraImport: () => Promise<unknown>
  jiraTransitions: (taskId: number) => Promise<unknown>
  jiraTransition: (taskId: number, transitionId: string) => Promise<void>
  createBackup: () => Promise<unknown>
  exportTask: (taskId: number) => Promise<boolean>
}

interface WriteEffectDeps {
  getMainWindow: () => BrowserWindow | null
  autoSync: (id: number) => void
  changeStatus: (id: number, status: TaskStatus) => void
  renderDrawing: (payload: DrawingRenderPayload) => Promise<DrawingRenderResult>
  resetTaskTime: (id: number) => void
  editTimeEntry: (entryId: number, startIso: string, endIso: string) => number
  removeTimeEntry: (entryId: number) => number
  integrations: IntegrationActions
  syncTagChange: (taskIds: number[]) => void
  syncCalendar: (taskIds: number[]) => void
  disposeTerminals: (taskIds: number[]) => void
  disposeProjectTerminals: (projectIds: number[]) => void
  recordHistory: (taskId: number, summary: string) => void
}

// Injetado no boot em vez de importado direto: as tools de escrita (ainda a criar) vão importar
// daqui, e index.ts importa as tools — um import direto deste módulo para index.ts fecharia o ciclo.
let deps: WriteEffectDeps | null = null

function warnDepsMissing(action: string): void {
  console.warn(`[mcp] registerWriteEffects ainda não foi chamado; ${action} foi ignorado.`)
}

export function registerWriteEffects(next: WriteEffectDeps): void {
  deps = next
}

export function broadcastRefresh(): void {
  if (!deps) {
    warnDepsMissing('o refresh da janela principal')
    return
  }
  const window = deps.getMainWindow()
  if (window && !window.isDestroyed()) {
    window.webContents.send('tasks:refresh')
  }
}

export function afterTaskWrite(id: number): void {
  if (!deps) {
    warnDepsMissing(`o efeito de escrita da tarefa ${id}`)
    return
  }
  deps.autoSync(id)
  broadcastRefresh()
}

export function changeTaskStatus(id: number, status: TaskStatus): void {
  if (!deps) throw new Error('O CrafyTask ainda está iniciando; tente de novo em instantes.')
  deps.changeStatus(id, status)
  broadcastRefresh()
}

export function recordOperation(taskId: number, summary: string | null): void {
  if (!summary) return
  if (!deps) {
    warnDepsMissing(`o registro no histórico da tarefa ${taskId}`)
    return
  }
  try {
    deps.recordHistory(taskId, summary)
  } catch (error) {
    console.warn(
      `[mcp] não foi possível registrar a operação no histórico da tarefa ${taskId}:`,
      error
    )
  }
}

export function renderDrawing(payload: DrawingRenderPayload): Promise<DrawingRenderResult> {
  if (!deps) {
    return Promise.resolve({ ok: false, error: 'O CrafyTask ainda está iniciando.' })
  }
  return deps.renderDrawing(payload)
}

function ready(): WriteEffectDeps {
  if (!deps) throw new Error('O CrafyTask ainda está iniciando; tente de novo em instantes.')
  return deps
}

export function integrations(): IntegrationActions {
  return ready().integrations
}

export function resetTaskTime(id: number): void {
  ready().resetTaskTime(id)
  broadcastRefresh()
}

export function editTimeEntry(entryId: number, startIso: string, endIso: string): number {
  const taskId = ready().editTimeEntry(entryId, startIso, endIso)
  broadcastRefresh()
  return taskId
}

export function removeTimeEntry(entryId: number): number {
  const taskId = ready().removeTimeEntry(entryId)
  broadcastRefresh()
  return taskId
}

export function afterTagChange(taskIds: number[]): void {
  if (!deps) {
    warnDepsMissing('a ressincronização de tasks após mudança de tag')
    return
  }
  if (taskIds.length === 0) return
  deps.syncTagChange(taskIds)
}

export function afterCalendarChange(taskIds: number[]): void {
  if (!deps) {
    warnDepsMissing('o sync da agenda do Google')
    return
  }
  if (taskIds.length === 0) return
  deps.syncCalendar([...new Set(taskIds)])
}

export function afterProjectDeleted(projectId: number): void {
  if (!deps) {
    warnDepsMissing('o encerramento dos terminais do projeto apagado')
    return
  }
  deps.disposeProjectTerminals([projectId])
}

export function afterTasksDeleted(taskIds: number[]): void {
  if (!deps) {
    warnDepsMissing('o encerramento dos terminais das tasks apagadas')
    return
  }
  if (taskIds.length === 0) return
  deps.disposeTerminals(taskIds)
}
