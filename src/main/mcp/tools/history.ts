import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import {
  addTaskHistory,
  getTask,
  getTaskHistory,
  getTaskLastCheckpoint,
  setTaskGitLink
} from '../../database'
import {
  TASK_HISTORY_DEFAULT_LIMIT,
  TASK_HISTORY_MAX_LIMIT,
  TASK_HISTORY_TEXT_LIMIT
} from '../../taskHistoryQueries'
import { broadcastRefresh } from '../effects'
import { GIT_BRANCH, SESSION_ID } from '../gitLinkSchema'
import { fail, ok } from '../reply'

const text = z.string().max(TASK_HISTORY_TEXT_LIMIT)

export function registerHistoryTools(server: McpServer): void {
  server.registerTool(
    'task_history',
    {
      title: 'Histórico e memória de uma task',
      description:
        'Histórico de uma task: mudanças de status (automáticas) e entradas escritas. action=read devolve as entradas mais recentes primeiro e o último checkpoint; leia antes de retomar uma task. action=add grava uma entrada: kind=checkpoint (padrão) é a memória para retomar — summary diz o estado atual, done o que foi feito, remaining o que falta; kind=operation registra uma operação pontual; kind=note é uma anotação livre. Grave um checkpoint a cada etapa concluída e antes de encerrar a sessão. Numa task com subtarefas, include_subtasks=true junta o histórico delas.',
      inputSchema: {
        action: z.enum(['read', 'add']),
        task_id: z.number().int().positive(),
        include_subtasks: z.boolean().optional(),
        limit: z.number().int().min(1).max(TASK_HISTORY_MAX_LIMIT).optional(),
        before: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
          .optional()
          .describe('Paginação: created_at (UTC) da entrada mais antiga já lida.'),
        kind: z.enum(['checkpoint', 'operation', 'note']).optional(),
        summary: text.optional(),
        done: text.optional(),
        remaining: text.optional(),
        session_id: SESSION_ID.optional().describe(
          'add: id da sessão do cliente, gravado na entrada.'
        ),
        git_branch: GIT_BRANCH.optional().describe('add: branch atual; fica na task.')
      }
    },
    async ({
      action,
      task_id,
      include_subtasks,
      limit,
      before,
      kind,
      summary,
      done,
      remaining,
      session_id,
      git_branch
    }) => {
      const task = getTask(task_id)
      if (!task) return fail('not_found', `Task ${task_id} não existe.`)

      if (action === 'add') {
        if (!summary?.trim()) return fail('validation', 'action=add exige summary.')
        const id = addTaskHistory({ task_id, kind, summary, done, remaining, session_id }, 'mcp')
        if (git_branch !== undefined) setTaskGitLink(task_id, { git_branch })
        broadcastRefresh()
        return ok({ added: id, task_id, kind: kind ?? 'checkpoint', task_status: task.status })
      }

      const entries = getTaskHistory({
        taskId: task_id,
        includeSubtasks: include_subtasks,
        limit: limit ?? TASK_HISTORY_DEFAULT_LIMIT,
        before
      })
      return ok({
        task: { id: task.id, name: task.name, status: task.status },
        last_checkpoint: getTaskLastCheckpoint(task_id, include_subtasks),
        entries
      })
    }
  )
}
