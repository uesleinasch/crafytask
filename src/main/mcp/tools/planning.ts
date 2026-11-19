import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import {
  createTimeBlock,
  createWeeklyReview,
  deleteTimeBlock,
  filterGcalSyncedIds,
  getLastWeeklyReview,
  getReviewHealthIndicators,
  getTask,
  getTasksForDate,
  getTimeBlock,
  getTimeBlocksForDate,
  getTimeBlocksForMonth,
  getTimeBlocksForWeek,
  getWeeklySchedule,
  listWeeklyReviews,
  completeWeeklyReview,
  getReviewPastWeek,
  setWeeklyReviewStep,
  updateDayOrder,
  updateTask,
  updateWeeklyReviewNotes
} from '../../database'
import { REVIEW_STEP_KEYS } from '@shared/reviewSteps'
import type { ReviewStepKey } from '@shared/types'
import { mergeTaskTimes, taskTimeError } from '@shared/taskTime'
import { needsConfirmation } from '../confirmGuard'
import { afterCalendarChange, afterTaskWrite, broadcastRefresh } from '../effects'
import { fail, ok } from '../reply'
import type { ToolContext } from '../toolContext'

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD.')
const TIME = z.string().regex(/^\d{2}:\d{2}$/, 'Use o formato HH:MM.')

export function registerPlanningTools(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    'agenda',
    {
      title: 'Agenda',
      description: 'Tasks agendadas e blocos de tempo de um dia, semana ou mês.',
      inputSchema: {
        range: z.enum(['day', 'week', 'month']),
        date: z
          .string()
          .describe('Data de referência: AAAA-MM-DD (para range=month, AAAA-MM também vale)')
      }
    },
    async ({ range, date }) => {
      if (range === 'day') {
        return ok({ date, tasks: getTasksForDate(date), time_blocks: getTimeBlocksForDate(date) })
      }
      if (range === 'week') {
        return ok({
          date,
          schedule: getWeeklySchedule(date),
          time_blocks: getTimeBlocksForWeek(date)
        })
      }
      const yearMonth = date.slice(0, 7)
      return ok({ date: yearMonth, time_blocks: getTimeBlocksForMonth(yearMonth) })
    }
  )

  server.registerTool(
    'plan_day',
    {
      title: 'Planejar o dia',
      description: `Agenda tasks numa data, ordena o dia e cria ou remove blocos de tempo. Acima de ${ctx.bulkThreshold} itens alterados de uma vez exige confirm_token.`,
      inputSchema: {
        schedule: z
          .array(
            z.object({
              task_id: z.number().int().positive(),
              date: z.union([DATE, z.null()]),
              start_time: TIME.optional().describe('Hora de início na task (scheduled_time).'),
              end_time: TIME.optional().describe('Hora de fim na task (exige start_time).'),
              order: z.number().int().min(0).optional()
            })
          )
          .optional(),
        create_blocks: z
          .array(
            z.object({
              task_id: z.number().int().positive(),
              date: DATE,
              start_time: TIME,
              end_time: TIME
            })
          )
          .optional(),
        delete_block_ids: z.array(z.number().int().positive()).optional(),
        confirm_token: z.string().optional()
      }
    },
    async ({ schedule, create_blocks, delete_block_ids, confirm_token }) => {
      // Ordenado por task_id: o hash de confirmação depende da ordem do array, e o cliente pode
      // reconstruir `schedule` numa ordem diferente entre o preview e a chamada de confirmação.
      const scheduleItems = [...(schedule ?? [])].sort((a, b) => a.task_id - b.task_id)
      const blocks = create_blocks ?? []
      const removals = delete_block_ids ?? []

      if (scheduleItems.length === 0 && blocks.length === 0 && removals.length === 0) {
        return fail('validation', 'Informe schedule, create_blocks ou delete_block_ids.')
      }
      for (const item of scheduleItems) {
        const current = getTask(item.task_id)
        if (!current) return fail('not_found', `Task ${item.task_id} não existe.`)
        const timeError = taskTimeError(
          mergeTaskTimes(current, {
            scheduled_date: item.date,
            scheduled_time: item.start_time,
            scheduled_end_time: item.end_time
          })
        )
        if (timeError) return fail('validation', `Task ${item.task_id}: ${timeError}`)
      }

      const referencedTaskIds = [
        ...scheduleItems.map((item) => item.task_id),
        ...blocks.map((block) => block.task_id)
      ]
      const missingTasks = [...new Set(referencedTaskIds.filter((id) => !getTask(id)))]
      if (missingTasks.length > 0) {
        return fail('not_found', `Tasks inexistentes: ${missingTasks.join(', ')}.`)
      }

      const missingBlocks = removals.filter((id) => !getTimeBlock(id))
      if (missingBlocks.length > 0) {
        return fail('not_found', `Blocos de tempo inexistentes: ${missingBlocks.join(', ')}.`)
      }

      const invertedBlock = blocks.find((block) => block.end_time <= block.start_time)
      if (invertedBlock) {
        return fail(
          'validation',
          `Bloco da task ${invertedBlock.task_id}: end_time (${invertedBlock.end_time}) deve ser depois de start_time (${invertedBlock.start_time}).`
        )
      }

      const touched = scheduleItems.length + blocks.length + removals.length
      const operation = {
        kind: 'plan_day',
        payload: { schedule: scheduleItems, create_blocks: blocks, delete_block_ids: removals }
      }

      if (needsConfirmation('plan_day', touched, ctx.bulkThreshold)) {
        if (!confirm_token) {
          return fail(
            'needs_confirmation',
            `Esta operação mexe em ${touched} itens do planejamento. Mostre o preview ao usuário e repita a chamada com o confirm_token.`,
            {
              confirm_token: ctx.confirmStore.issue(operation),
              preview: {
                schedule: scheduleItems.map((item) => ({
                  task_id: item.task_id,
                  name: getTask(item.task_id)?.name,
                  date: item.date
                })),
                create_blocks: blocks,
                delete_block_ids: removals
              }
            }
          )
        }
        const consumed = ctx.confirmStore.consume(confirm_token, operation)
        if (!consumed.ok) return fail(consumed.code, consumed.message)
      }

      for (const item of scheduleItems) {
        updateTask(item.task_id, {
          scheduled_date: item.date,
          ...(item.start_time !== undefined && { scheduled_time: item.start_time }),
          ...(item.end_time !== undefined && { scheduled_end_time: item.end_time })
        })
        if (item.order !== undefined) updateDayOrder(item.task_id, item.order)
        afterTaskWrite(item.task_id)
      }

      const created = blocks.map((block) =>
        createTimeBlock({
          task_id: block.task_id,
          date: block.date,
          start_time: block.start_time,
          end_time: block.end_time
        })
      )
      const removedOwners = removals.flatMap((id) => getTimeBlock(id)?.task_id ?? [])
      removals.forEach((id) => deleteTimeBlock(id))
      if (blocks.length > 0 || removals.length > 0) broadcastRefresh()
      afterCalendarChange(
        filterGcalSyncedIds([...blocks.map((block) => block.task_id), ...removedOwners])
      )

      return ok({
        scheduled: scheduleItems.map((item) => item.task_id),
        created_blocks: created,
        deleted_blocks: removals
      })
    }
  )

  server.registerTool(
    'weekly_review',
    {
      title: 'Revisão semanal',
      description:
        'Revisão semanal: status (revisão em andamento, última e indicadores de saúde), list, ' +
        'past_week (sessões, conclusões e blocos dos últimos 7 dias), start (abre a revisão ou ' +
        'devolve a que está em andamento), step (marca um passo como feito, pulado ou pendente), ' +
        'notes e complete (conclui; passos pendentes ficam como pulados).',
      inputSchema: {
        action: z.enum(['status', 'list', 'past_week', 'start', 'step', 'notes', 'complete']),
        step: z.enum(REVIEW_STEP_KEYS as [ReviewStepKey, ...ReviewStepKey[]]).optional(),
        step_status: z.enum(['done', 'skipped', 'pending']).optional(),
        notes: z.string().optional()
      }
    },
    async ({ action, step, step_status, notes }) => {
      if (action === 'status') {
        const last = getLastWeeklyReview()
        return ok({
          open: last && !last.completed_at ? last : null,
          last,
          health: getReviewHealthIndicators()
        })
      }
      if (action === 'list') return ok({ reviews: listWeeklyReviews() })
      if (action === 'past_week') return ok(getReviewPastWeek())

      if (action === 'start') {
        const review = createWeeklyReview()
        if (notes !== undefined) updateWeeklyReviewNotes(review.id, notes)
        broadcastRefresh()
        return ok({ review: getLastWeeklyReview() })
      }

      const open = getLastWeeklyReview()
      if (!open || open.completed_at) {
        return fail('app_state', 'Nenhuma revisão em andamento. Use action=start.')
      }
      if (action === 'step') {
        if (!step || !step_status) return fail('validation', 'Informe step e step_status.')
        const review = setWeeklyReviewStep(
          open.id,
          step,
          step_status === 'pending' ? null : step_status
        )
        broadcastRefresh()
        return ok({ review })
      }
      if (action === 'notes') {
        if (notes === undefined) return fail('validation', 'Informe notes.')
        updateWeeklyReviewNotes(open.id, notes)
        broadcastRefresh()
        return ok({ updated: open.id })
      }
      const review = completeWeeklyReview(open.id, notes)
      broadcastRefresh()
      return ok({ completed: review })
    }
  )
}
