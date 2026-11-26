import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { ProjectMilestone } from '@shared/types'
import {
  createProjectMilestone,
  deleteProjectMilestone,
  getProjectMilestone,
  listProjectMilestones,
  listProjects,
  setProjectMilestoneDone,
  updateProjectMilestone
} from '../../database'
import {
  MILESTONE_DESCRIPTION_LIMIT,
  MILESTONE_KINDS,
  MILESTONE_NAME_LIMIT
} from '../../milestoneQueries'
import { broadcastRefresh } from '../effects'
import { fail, ok } from '../reply'
import { resolveByName } from '../resolve'
import type { ToolContext } from '../toolContext'

const KIND = z.enum(MILESTONE_KINDS as [string, ...string[]])
const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

function view(milestone: ProjectMilestone): Record<string, unknown> {
  return {
    id: milestone.id,
    name: milestone.name,
    kind: milestone.kind,
    due_date: milestone.due_date,
    description: milestone.description,
    done_at: milestone.done_at,
    tasks: `${milestone.done_task_count}/${milestone.task_count}`
  }
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function registerMilestoneTools(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    'project_milestones',
    {
      title: 'Marcos de um projeto',
      description:
        'Marcos dão início, meio e fim a um projeto. Cada marco tem nome, kind (inicio, desenvolvimento, fim; no máximo um inicio e um fim por projeto), due_date opcional, description (o que fica pronto) e done_at. action=list devolve os marcos do projeto em ordem (inicio, desenvolvimento por data, fim) com tasks feitas/total. create exige project, name e kind. update, complete, reopen e delete exigem id. Concluir é manual: complete marca done_at, reopen limpa. delete pede confirmação (confirm_token) e deixa as tasks no projeto, sem marco. Para pôr uma task num marco use create_task ou update_task com milestone.',
      inputSchema: {
        action: z.enum(['list', 'create', 'update', 'complete', 'reopen', 'delete']),
        project: z
          .union([z.string(), z.number()])
          .optional()
          .describe('list/create: projeto (nome ou id).'),
        id: z.number().int().positive().optional().describe('update/complete/reopen/delete.'),
        name: z.string().min(1).max(MILESTONE_NAME_LIMIT).optional(),
        kind: KIND.optional(),
        due_date: z.union([DATE, z.null()]).optional().describe('AAAA-MM-DD; null remove.'),
        description: z.union([z.string().max(MILESTONE_DESCRIPTION_LIMIT), z.null()]).optional(),
        confirm_token: z.string().optional()
      }
    },
    async (args) => {
      if (args.action === 'list' || args.action === 'create') {
        if (args.project === undefined)
          return fail('validation', `action=${args.action} exige project.`)
        const project = resolveByName(listProjects(), args.project)
        if (!project.ok) {
          return fail(project.code, 'Projeto não encontrado ou ambíguo.', {
            candidates: project.candidates
          })
        }
        if (args.action === 'list') {
          return ok({
            project_id: project.id,
            milestones: listProjectMilestones(project.id).map(view)
          })
        }
        if (!args.name || !args.kind) return fail('validation', 'action=create exige name e kind.')
        try {
          const created = createProjectMilestone({
            project_id: project.id,
            name: args.name,
            kind: args.kind as ProjectMilestone['kind'],
            due_date: args.due_date,
            description: args.description
          })
          broadcastRefresh()
          return ok({ created: created.id, milestone: view(created) })
        } catch (error) {
          return fail('validation', errorText(error))
        }
      }

      if (args.id === undefined) return fail('validation', `action=${args.action} exige id.`)
      const current = getProjectMilestone(args.id)
      if (!current) return fail('not_found', `Marco ${args.id} não existe.`)

      if (args.action === 'delete') {
        const operation = {
          kind: 'delete_structure',
          payload: { entity: 'milestone', id: args.id }
        }
        if (!args.confirm_token) {
          return fail(
            'needs_confirmation',
            `Excluir o marco "${current.name}" é permanente; as ${current.task_count} tasks dele ficam no projeto, sem marco. Confirme com o usuário.`,
            { confirm_token: ctx.confirmStore.issue(operation), preview: view(current) }
          )
        }
        const consumed = ctx.confirmStore.consume(args.confirm_token, operation)
        if (!consumed.ok) return fail(consumed.code, consumed.message)
        const released = deleteProjectMilestone(args.id)
        broadcastRefresh()
        return ok({ deleted: args.id, tasks_released: released })
      }

      try {
        const milestone =
          args.action === 'update'
            ? updateProjectMilestone(args.id, {
                name: args.name,
                kind: args.kind as ProjectMilestone['kind'] | undefined,
                due_date: args.due_date,
                description: args.description
              })
            : setProjectMilestoneDone(args.id, args.action === 'complete')
        broadcastRefresh()
        return ok({ updated: args.id, milestone: view(milestone) })
      } catch (error) {
        return fail('validation', errorText(error))
      }
    }
  )
}
