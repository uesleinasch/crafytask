import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { getTask, listProjects, notebookDb } from '../../database'
import { getPage } from '../../notebookQueries'
import { APP_SCREEN_KEYS, appRoute, notifyWaitMs } from '../appRoute'
import { navigateApp, notifyUser } from '../effects'
import { fail, ok } from '../reply'

let lastNotifyAt: number | null = null

export function registerAppTools(server: McpServer): void {
  server.registerTool(
    'notify',
    {
      title: 'Notificar o usuário',
      description:
        'Mostra uma notificação do sistema, mesmo com o app na bandeja. Use ao terminar um trabalho longo ou quando precisar de uma decisão do usuário; não use para progresso. Com task_id, clicar na notificação abre a task. No máximo uma a cada 10 segundos.',
      inputSchema: {
        title: z.string().trim().min(1).max(80),
        body: z.string().trim().max(300).optional(),
        task_id: z.number().int().positive().optional()
      }
    },
    async ({ title, body, task_id }) => {
      if (task_id !== undefined && !getTask(task_id)) {
        return fail('not_found', `Task ${task_id} não existe.`)
      }
      const now = Date.now()
      const wait = notifyWaitMs(lastNotifyAt, now)
      if (wait > 0) {
        return fail(
          'app_state',
          `Notificação recusada: aguarde ${Math.ceil(wait / 1000)} s entre uma e outra.`,
          { retry_after_seconds: Math.ceil(wait / 1000) }
        )
      }
      try {
        notifyUser(title, body ?? '', task_id)
      } catch (error) {
        return fail('app_state', error instanceof Error ? error.message : String(error))
      }
      lastNotifyAt = now
      return ok({ notified: true, task_id: task_id ?? null })
    }
  )

  server.registerTool(
    'open_in_app',
    {
      title: 'Abrir no app',
      description:
        'Traz a janela do CrafyTask para frente numa task, projeto, página de caderno (target + id) ou tela (target=screen + screen). Use para levar o usuário ao que você acabou de mexer.',
      inputSchema: {
        target: z.enum(['task', 'project', 'page', 'screen']),
        id: z.number().int().positive().optional(),
        screen: z.enum(APP_SCREEN_KEYS).optional()
      }
    },
    async ({ target, id, screen }) => {
      const resolved = appRoute({ target, id, screen })
      if (!resolved.ok) return fail('validation', resolved.message)

      if (target === 'task' && !getTask(id!)) return fail('not_found', `Task ${id} não existe.`)
      if (target === 'project' && !listProjects().some((project) => project.id === id)) {
        return fail('not_found', `Projeto ${id} não existe.`)
      }
      if (target === 'page' && !getPage(notebookDb(), id!)) {
        return fail('not_found', `Página ${id} não existe.`)
      }

      try {
        navigateApp(resolved.route)
      } catch (error) {
        return fail('app_state', error instanceof Error ? error.message : String(error))
      }
      return ok({ opened: resolved.route })
    }
  )
}
