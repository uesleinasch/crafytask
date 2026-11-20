import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import {
  addManualTimeEntry,
  getActiveTimeEntry,
  getGeneralStats,
  getPeriodStats,
  getTask,
  getTaskTimeStats,
  getTimeEntries,
  getWeeklyStats,
  listRunningTasks,
  startTask,
  stopTask
} from '../../database'
import { BLOCKED_TASK_MESSAGE } from '../../taskStatusService'
import type { StatsPeriod } from '@shared/types'
import { afterTaskWrite, editTimeEntry, removeTimeEntry, resetTaskTime } from '../effects'
import { fail, ok } from '../reply'
import type { ToolContext } from '../toolContext'

const DAY = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD.')
const ISO = z.string().datetime({ offset: true })

export function registerTimerTools(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    'timer',
    {
      title: 'Controlar o timer',
      description:
        'Inicia ou para o timer de uma task, mostra o que está rodando, ou lança tempo manualmente.',
      inputSchema: {
        action: z.enum(['start', 'stop', 'status', 'add_manual_time']),
        task_id: z.number().int().positive().optional(),
        minutes: z.number().int().positive().optional()
      }
    },
    async ({ action, task_id, minutes }) => {
      if (action === 'status') {
        return ok({ running: listRunningTasks() })
      }

      if (task_id === undefined) {
        return fail('validation', 'Informe task_id para esta ação.')
      }
      if (!getTask(task_id)) {
        return fail('not_found', `Task ${task_id} não existe.`)
      }

      if (action === 'start') {
        if (getActiveTimeEntry(task_id)) {
          return fail('app_state', `A task ${task_id} já tem timer rodando.`)
        }
        if (getTask(task_id)?.is_blocked) return fail('app_state', BLOCKED_TASK_MESSAGE)
        startTask(task_id)
        afterTaskWrite(task_id)
        return ok({ started: task_id })
      }

      if (action === 'stop') {
        if (!getActiveTimeEntry(task_id)) {
          return fail('app_state', `A task ${task_id} não tem timer rodando.`)
        }
        stopTask(task_id)
        afterTaskWrite(task_id)
        return ok({ stopped: task_id, entries: getTimeEntries(task_id) })
      }

      if (minutes === undefined) {
        return fail('validation', 'Informe minutes para lançar tempo manual.')
      }
      addManualTimeEntry(task_id, minutes * 60)
      afterTaskWrite(task_id)
      return ok({ added_minutes: minutes, task_id })
    }
  )

  server.registerTool(
    'time_report',
    {
      title: 'Relatório de tempo',
      description:
        'Tempo gasto: geral, por semana, por task, os registros de uma task, ou as estatísticas de um período (scope=period, com start e end): total, por dia, por hora, por projeto e comparação com o período anterior.',
      inputSchema: {
        scope: z.enum(['general', 'weekly', 'by_task', 'task_entries', 'period']),
        task_id: z.number().int().positive().optional(),
        start: DAY.optional().describe('period: primeiro dia (AAAA-MM-DD).'),
        end: DAY.optional().describe('period: último dia (AAAA-MM-DD).'),
        project_id: z.number().int().positive().optional().describe('period: só este projeto.')
      }
    },
    async ({ scope, task_id, start, end, project_id }) => {
      if (scope === 'period') {
        if (!start || !end) return fail('validation', 'scope=period exige start e end.')
        if (end < start) return fail('validation', 'end não pode ser antes de start.')
        const period: StatsPeriod = { start, end, projectId: project_id ?? null }
        return ok(getPeriodStats(period))
      }
      if (scope === 'general') return ok(getGeneralStats())
      if (scope === 'weekly') return ok(getWeeklyStats())
      if (scope === 'by_task') return ok(getTaskTimeStats())

      if (task_id === undefined) {
        return fail('validation', 'Informe task_id para scope=task_entries.')
      }
      if (!getTask(task_id)) return fail('not_found', `Task ${task_id} não existe.`)
      return ok({ task_id, entries: getTimeEntries(task_id) })
    }
  )

  server.registerTool(
    'time_entries',
    {
      title: 'Corrigir sessões de tempo',
      description:
        'Corrige o tempo registrado. action=update muda início e fim de uma sessão encerrada (entry_id de time_report scope=task_entries; start e end em ISO 8601 com fuso). action=delete apaga uma sessão. action=reset zera todo o tempo da task. delete e reset não têm volta e exigem confirm_token. O worklog do Jira acompanha a mudança.',
      inputSchema: {
        action: z.enum(['update', 'delete', 'reset']),
        entry_id: z.number().int().positive().optional(),
        task_id: z.number().int().positive().optional(),
        start: ISO.optional(),
        end: ISO.optional(),
        confirm_token: z.string().optional()
      }
    },
    async ({ action, entry_id, task_id, start, end, confirm_token }) => {
      if (action === 'reset') {
        if (task_id === undefined) return fail('validation', 'action=reset exige task_id.')
        const task = getTask(task_id)
        if (!task) return fail('not_found', `Task ${task_id} não existe.`)
        const operation = { kind: 'reset_task_time', payload: { task_id } }
        if (!confirm_token) {
          return fail(
            'needs_confirmation',
            `Zerar apaga todo o tempo registrado da task "${task.name}". Mostre ao usuário antes de confirmar.`,
            {
              confirm_token: ctx.confirmStore.issue(operation),
              total_seconds: task.total_seconds,
              entries: getTimeEntries(task_id).length
            }
          )
        }
        const consumed = ctx.confirmStore.consume(confirm_token, operation)
        if (!consumed.ok) return fail(consumed.code, consumed.message)
        resetTaskTime(task_id)
        return ok({ reset: task_id })
      }

      if (entry_id === undefined) return fail('validation', `action=${action} exige entry_id.`)

      try {
        if (action === 'update') {
          if (!start || !end) return fail('validation', 'action=update exige start e end.')
          const taskId = editTimeEntry(
            entry_id,
            new Date(start).toISOString(),
            new Date(end).toISOString()
          )
          return ok({ updated: entry_id, task_id: taskId, entries: getTimeEntries(taskId) })
        }

        const operation = { kind: 'delete_time_entry', payload: { entry_id } }
        if (!confirm_token) {
          return fail(
            'needs_confirmation',
            'Apagar a sessão não tem volta. Mostre a sessão ao usuário antes de confirmar.',
            { confirm_token: ctx.confirmStore.issue(operation), entry_id }
          )
        }
        const consumed = ctx.confirmStore.consume(confirm_token, operation)
        if (!consumed.ok) return fail(consumed.code, consumed.message)
        const taskId = removeTimeEntry(entry_id)
        return ok({ deleted: entry_id, task_id: taskId })
      } catch (error) {
        return fail('validation', error instanceof Error ? error.message : String(error))
      }
    }
  )
}
