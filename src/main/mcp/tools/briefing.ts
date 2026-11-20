import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { homedir } from 'node:os'
import { z } from 'zod'
import { currentTime, localDateString } from '@shared/dueState'
import type { TaskListFilters } from '@shared/types'
import {
  countTasks,
  getLastCheckpointsFor,
  getTasksForDate,
  getTimeBlocksForDate,
  listOpenTasksWithWorkingDir,
  listProjects,
  listRunningTasks,
  listTasks,
  listTasksInProgress
} from '../../database'
import { BRIEFING_SECTION_LIMIT, buildBriefing } from '../briefingPlan'
import { ok } from '../reply'
import { matchByDirectory } from '../workDirMatch'

export function registerBriefingTools(server: McpServer): void {
  server.registerTool(
    'briefing',
    {
      title: 'Briefing de início de sessão',
      description:
        'Uma chamada com o retrato do momento: timers ligados (running), tasks em executando com o último checkpoint de cada uma, o que é de hoje (tasks e blocos de tempo), atrasadas, aguardando (com há quantos dias), tamanho do inbox e warnings de incoerência. Com directory, traz também here: o projeto e as tasks daquela pasta. Cada seção vem com total e até 10 itens no formato compacto. Chame no começo da sessão.',
      inputSchema: {
        directory: z
          .string()
          .refine(
            (value) => value.startsWith('/') || value.startsWith('~'),
            'Use um caminho absoluto.'
          )
          .optional()
          .describe('Pasta de trabalho atual.'),
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD.')
          .optional()
          .describe('Dia de referência; padrão: hoje.')
      }
    },
    async ({ directory, date }) => {
      const now = new Date()
      const today = localDateString(now)
      const day = date ?? today
      const overdueFilters: TaskListFilters = {
        overdueAt: { date: day, time: day === today ? currentTime(now) : '00:00' },
        excludeStatus: ['finalizada']
      }
      const executando = listTasksInProgress()

      let here
      if (directory) {
        const match = matchByDirectory(
          directory,
          listOpenTasksWithWorkingDir(),
          listProjects(),
          homedir()
        )
        here = {
          directory,
          project: match.project ? { id: match.project.id, name: match.project.name } : null,
          tasks: match.tasks
        }
      }

      return ok(
        buildBriefing({
          date: day,
          now,
          running: listRunningTasks(),
          executando,
          checkpoints: getLastCheckpointsFor(
            executando.slice(0, BRIEFING_SECTION_LIMIT).map((task) => task.id)
          ),
          today: getTasksForDate(day),
          timeBlocks: getTimeBlocksForDate(day),
          overdue: {
            total: countTasks(overdueFilters),
            sample: listTasks({
              ...overdueFilters,
              sort: 'due_date',
              limit: BRIEFING_SECTION_LIMIT
            })
          },
          waiting: listTasks({ status: 'aguardando', archived: false }),
          inboxCount: countTasks({ status: 'inbox' }),
          here
        })
      )
    }
  )
}
