import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Task, TaskStatus } from '@shared/types'
import { normalizeWaitingFor } from '@shared/waitingFor'
import { z } from 'zod'
import {
  addTaskHistory,
  getActiveTimeEntry,
  getSubtasks,
  getTask,
  getTaskHistory,
  getTaskLastCheckpoint,
  listRunningTasks,
  listTasks,
  startTask,
  stopTask,
  updateTask
} from '../../database'
import { TASK_HISTORY_TEXT_LIMIT } from '../../taskHistoryQueries'
import { afterTaskWrite, changeTaskStatus } from '../effects'
import { fail, ok } from '../reply'
import { compactTask } from '../taskView'

const RESUME_ENTRIES = 15
const text = z.string().max(TASK_HISTORY_TEXT_LIMIT)

function brief(task: Task): { id: number; name: string; status: TaskStatus } {
  return { id: task.id, name: task.name, status: task.status }
}

function moveTo(id: number, status: TaskStatus): string | null {
  try {
    changeTaskStatus(id, status)
    return null
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}

function stopTimerIfRunning(id: number): void {
  if (getActiveTimeEntry(id)) stopTask(id)
}

export function registerWorkSessionTools(server: McpServer): void {
  server.registerTool(
    'work_session',
    {
      title: 'Sessão de trabalho numa task',
      description:
        'Mantém o CrafyTask igual ao que está sendo feito de verdade. action=start ao começar ou retomar: põe a task (e a task pai) em executando, liga o timer e devolve o último checkpoint, o histórico recente e as subtarefas. action=pause ao parar sem concluir: para o timer, grava um checkpoint (summary obrigatório) e move para aguardando se waiting_for for informado, senão para proximas. action=finish ao concluir: para o timer, grava o checkpoint final e move para finalizada (recusa se houver subtarefa aberta). action=status lista o que está em executando e os timers ligados. Numa task com subtarefas, abra a sessão na subtarefa em andamento.',
      inputSchema: {
        action: z.enum(['start', 'pause', 'finish', 'status']),
        task_id: z.number().int().positive().optional(),
        timer: z.boolean().optional().describe('start: false não liga o timer.'),
        summary: text.optional().describe('pause/finish: estado atual da task.'),
        done: text.optional().describe('pause/finish: o que foi feito.'),
        remaining: text.optional().describe('pause: o que falta.'),
        waiting_for: z
          .string()
          .transform(normalizeWaitingFor)
          .optional()
          .describe('pause: quem ou o quê a task aguarda; move para aguardando.')
      }
    },
    async ({ action, task_id, timer, summary, done, remaining, waiting_for }) => {
      if (action === 'status') {
        return ok({
          executando: listTasks({ status: 'executando', archived: false }).map(compactTask),
          timers: listRunningTasks().map(compactTask)
        })
      }

      if (task_id === undefined) return fail('validation', 'Informe task_id para esta ação.')
      const task = getTask(task_id)
      if (!task) return fail('not_found', `Task ${task_id} não existe.`)

      if (action === 'start') {
        const refusal = task.status === 'executando' ? null : moveTo(task_id, 'executando')
        if (refusal) return fail('app_state', refusal)
        if (timer !== false && !getActiveTimeEntry(task_id)) startTask(task_id)

        const parent = task.parent_task_id ? getTask(task.parent_task_id) : undefined
        if (parent && parent.status !== 'executando') {
          moveTo(parent.id, 'executando')
          afterTaskWrite(parent.id)
        }
        afterTaskWrite(task_id)

        return ok({
          task: brief(getTask(task_id)!),
          parent: parent ? brief(getTask(parent.id)!) : null,
          timer_running: Boolean(getActiveTimeEntry(task_id)),
          last_checkpoint: getTaskLastCheckpoint(task_id, true),
          history: getTaskHistory({
            taskId: task_id,
            includeSubtasks: true,
            limit: RESUME_ENTRIES
          }),
          subtasks: getSubtasks(task_id).map(brief),
          other_timers: listRunningTasks()
            .filter((running) => running.id !== task_id)
            .map(brief)
        })
      }

      if (!summary?.trim()) return fail('validation', `action=${action} exige summary.`)

      if (action === 'finish') {
        const open = getSubtasks(task_id).filter((subtask) => subtask.status !== 'finalizada')
        if (open.length > 0) {
          return fail(
            'app_state',
            'A task tem subtarefas abertas; conclua ou mova cada uma antes.',
            {
              open_subtasks: open.map(brief)
            }
          )
        }
        stopTimerIfRunning(task_id)
        const refusal = task.status === 'finalizada' ? null : moveTo(task_id, 'finalizada')
        if (refusal) {
          afterTaskWrite(task_id)
          return fail('app_state', refusal)
        }
        addTaskHistory({ task_id, summary, done }, 'mcp')
        afterTaskWrite(task_id)
        const parent = task.parent_task_id ? getTask(task.parent_task_id) : undefined
        return ok({
          task: brief(getTask(task_id)!),
          parent: parent ? brief(parent) : null,
          next_subtasks: parent
            ? getSubtasks(parent.id)
                .filter((subtask) => subtask.status !== 'finalizada')
                .map(brief)
            : []
        })
      }

      stopTimerIfRunning(task_id)
      const target: TaskStatus = waiting_for ? 'aguardando' : 'proximas'
      if (task.status !== 'finalizada' && task.status !== target) moveTo(task_id, target)
      if (waiting_for) updateTask(task_id, { waiting_for })
      addTaskHistory({ task_id, summary, done, remaining }, 'mcp')
      afterTaskWrite(task_id)
      return ok({ task: brief(getTask(task_id)!), waiting_for: waiting_for ?? null })
    }
  )
}
