import type { TimeBlock, UpdateTimeBlockInput } from '@shared/types'
import { isIsoDate } from '@shared/archiveAge'
import { TIME_PATTERN } from '@shared/taskTime'
import type { SqliteLike } from './tagQueries'

export const TIME_BLOCK_SELECT = `
  SELECT tb.*, t.name AS task_name, t.category AS task_category, t.status AS task_status,
    t.is_running AS task_running, t.gcal_sync AS task_gcal_sync, p.color AS project_color
  FROM time_blocks tb
  JOIN tasks t ON t.id = tb.task_id
  LEFT JOIN projects p ON p.id = t.project_id`

export interface DayRangeQuery {
  sql: string
  params: (string | number)[]
}

export function assertDayRange(from: string, to: string): void {
  if (!isIsoDate(from) || !isIsoDate(to)) throw new Error('Data inválida: use AAAA-MM-DD.')
  if (to < from) throw new Error('O fim do intervalo precisa ser igual ou depois do início.')
}

type BlockTimes = Pick<TimeBlock, 'date' | 'start_time' | 'end_time'>

export function timeBlockError(block: BlockTimes): string | null {
  if (!isIsoDate(block.date)) return 'Data inválida: use AAAA-MM-DD.'
  if (!TIME_PATTERN.test(block.start_time) || !TIME_PATTERN.test(block.end_time)) {
    return 'Horário inválido: use HH:MM.'
  }
  if (block.end_time <= block.start_time) return 'O fim do bloco precisa ser depois do início.'
  return null
}

export function mergeTimeBlock(before: BlockTimes, patch: UpdateTimeBlockInput): BlockTimes {
  return {
    date: patch.date ?? before.date,
    start_time: patch.start_time ?? before.start_time,
    end_time: patch.end_time ?? before.end_time
  }
}

export function listTimeBlocksInRange(db: SqliteLike, from: string, to: string): TimeBlock[] {
  assertDayRange(from, to)
  return db
    .prepare(
      `${TIME_BLOCK_SELECT}
       WHERE tb.date >= ? AND tb.date <= ?
       ORDER BY tb.date ASC, tb.start_time ASC, tb.id ASC`
    )
    .all(from, to) as TimeBlock[]
}

const LISTABLE = 't.is_archived = 0 AND t.parent_task_id IS NULL'

export function calendarTasksQuery(columns: string, from: string, to: string): DayRangeQuery {
  assertDayRange(from, to)
  return {
    sql: `SELECT ${columns}
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE ${LISTABLE}
        AND ((t.scheduled_date >= ? AND t.scheduled_date <= ?)
          OR (substr(t.due_date, 1, 10) >= ? AND substr(t.due_date, 1, 10) <= ?))
      ORDER BY COALESCE(t.scheduled_date, substr(t.due_date, 1, 10)),
        t.scheduled_time IS NULL, t.scheduled_time, t.due_time IS NULL, t.due_time,
        COALESCE(t.day_order, 999999), t.created_at, t.id`,
    params: [from, to, from, to]
  }
}

export function unscheduledTasksQuery(
  columns: string,
  from: string,
  to: string,
  limit = 100
): DayRangeQuery {
  assertDayRange(from, to)
  return {
    sql: `SELECT ${columns}
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE ${LISTABLE}
        AND t.status IN ('proximas', 'executando')
        AND NOT EXISTS (
          SELECT 1 FROM time_blocks tb
          WHERE tb.task_id = t.id AND tb.date >= ? AND tb.date <= ?
        )
      ORDER BY t.status = 'executando' DESC, t.due_date IS NULL, substr(t.due_date, 1, 10),
        t.updated_at DESC, t.id
      LIMIT ?`,
    params: [from, to, limit]
  }
}
