import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { getTask } from '../../database'
import { broadcastRefresh, integrations, recordOperation } from '../effects'
import { exportSummary, gcalSyncSummary, jiraTransitionSummary } from '../operationSummary'
import { fail, ok } from '../reply'
import type { ToolContext } from '../toolContext'

const TASK_ACTIONS = [
  'gcal_sync',
  'notion_sync',
  'jira_transitions',
  'jira_transition',
  'export_task'
] as const

export function registerIntegrationTools(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    'integrations',
    {
      title: 'Integrações',
      description:
        'Aciona as integrações já configuradas no app. gcal_sync liga ou desliga a task na agenda do Google (task_id, enabled). notion_sync envia a task ao Notion agora (task_id). jira_import importa as issues agora. jira_transitions lista as transições possíveis da issue da task (task_id); jira_transition aplica uma (task_id, transition_id) — muda o status no Jira, não o da task, e sempre exige confirm_token. export_task regrava o arquivo Markdown local da task (task_id; a task precisa já ter um arquivo escolhido no app). backup cria um snapshot agora. Integração não configurada devolve app_state.',
      inputSchema: {
        action: z.enum([...TASK_ACTIONS, 'jira_import', 'backup']),
        task_id: z.number().int().positive().optional(),
        enabled: z.boolean().optional(),
        transition_id: z.string().min(1).optional(),
        confirm_token: z.string().optional()
      }
    },
    async ({ action, task_id, enabled, transition_id, confirm_token }) => {
      try {
        const api = integrations()
        if (action === 'jira_import') return ok({ imported: await api.jiraImport() })
        if (action === 'backup') return ok({ backup: await api.createBackup() })

        if (task_id === undefined) return fail('validation', `action=${action} exige task_id.`)
        const task = getTask(task_id)
        if (!task) return fail('not_found', `Task ${task_id} não existe.`)

        switch (action) {
          case 'gcal_sync':
            if (enabled === undefined) return fail('validation', 'gcal_sync exige enabled.')
            await api.setGcalSync(task_id, enabled)
            recordOperation(task_id, gcalSyncSummary(enabled))
            broadcastRefresh()
            return ok({ task_id, gcal_sync: enabled })
          case 'notion_sync':
            return ok({ task_id, notion: await api.syncNotion(task_id) })
          case 'jira_transitions':
            return ok({
              task_id,
              jira_key: task.jira_key ?? null,
              jira_status: task.jira_status ?? null,
              transitions: await api.jiraTransitions(task_id)
            })
          case 'jira_transition': {
            if (!transition_id) return fail('validation', 'jira_transition exige transition_id.')
            const operation = { kind: 'jira_transition', payload: { task_id, transition_id } }
            if (!confirm_token) {
              return fail(
                'needs_confirmation',
                `Isto muda o status da issue ${task.jira_key ?? ''} no Jira. Confirme com o usuário.`,
                {
                  confirm_token: ctx.confirmStore.issue(operation),
                  jira_key: task.jira_key ?? null,
                  jira_status: task.jira_status ?? null,
                  transition_id
                }
              )
            }
            const consumed = ctx.confirmStore.consume(confirm_token, operation)
            if (!consumed.ok) return fail(consumed.code, consumed.message)
            await api.jiraTransition(task_id, transition_id)
            const jiraStatus = getTask(task_id)?.jira_status ?? null
            recordOperation(task_id, jiraTransitionSummary(jiraStatus))
            broadcastRefresh()
            return ok({ task_id, jira_status: jiraStatus })
          }
          case 'export_task': {
            const exported = await api.exportTask(task_id)
            if (!exported) {
              return fail(
                'app_state',
                'A task ainda não tem arquivo local: escolha o arquivo uma vez pelo app.'
              )
            }
            recordOperation(task_id, exportSummary())
            broadcastRefresh()
            return ok({ task_id, exported: task.local_export_path })
          }
        }
      } catch (error) {
        return fail('app_state', error instanceof Error ? error.message : String(error))
      }
    }
  )
}
