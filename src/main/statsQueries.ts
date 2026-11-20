import type {
  EnergyLevel,
  PeriodStats,
  StatsBucket,
  StatsCategoryRow,
  StatsEnergyRow,
  StatsGranularity,
  StatsPeriod,
  StatsTimeRow,
  TaskCategory
} from '@shared/types'
import { localDateString } from '@shared/dueState'
import type { SqliteLike, SqliteParam } from './tagQueries'

const HOUR_MS = 60 * 60 * 1000
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TOP_TASKS = 8
const MAX_PERIOD_DAYS = 366
const CATEGORIES: TaskCategory[] = ['urgente', 'prioridade', 'normal', 'time_leak']
const ENERGIES: EnergyLevel[] = ['alto', 'medio', 'baixo']

interface SessionRow {
  task_id: number
  start_time: string
  end_time: string | null
  name: string
  category: TaskCategory | null
  energy_level: EnergyLevel | null
  project_id: number | null
}

interface TaskTotals {
  name: string
  category: TaskCategory
  energy: EnergyLevel | null
  projectId: number | null
  seconds: number
}

function parseDate(value: string): Date {
  if (!DATE_RE.test(value)) throw new Error(`Data inválida: ${value}`)
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

function daysBetween(start: Date, endExclusive: Date): number {
  return Math.round((endExclusive.getTime() - start.getTime()) / (24 * HOUR_MS))
}

export function granularityFor(days: number): StatsGranularity {
  if (days <= 31) return 'day'
  if (days <= 120) return 'week'
  return 'month'
}

function mondayOf(date: Date): Date {
  return addDays(date, -((date.getDay() + 6) % 7))
}

function bucketKey(date: Date, granularity: StatsGranularity): string {
  if (granularity === 'day') return localDateString(date)
  if (granularity === 'week') return localDateString(mondayOf(date))
  return localDateString(date).slice(0, 7)
}

export function previousPeriod(period: StatsPeriod): { start: string; end: string } {
  const start = parseDate(period.start)
  const days = daysBetween(start, addDays(parseDate(period.end), 1))
  return {
    start: localDateString(addDays(start, -days)),
    end: localDateString(addDays(start, -1))
  }
}

function workdays(start: Date, endExclusive: Date): number {
  let count = 0
  for (let day = start; day < endExclusive; day = addDays(day, 1)) {
    if (day.getDay() !== 0 && day.getDay() !== 6) count++
  }
  return count
}

function addTo<K>(map: Map<K, number>, key: K, seconds: number): void {
  map.set(key, (map.get(key) ?? 0) + seconds)
}

function sortRows(rows: StatsTimeRow[]): StatsTimeRow[] {
  return rows.filter((r) => r.seconds > 0).sort((a, b) => b.seconds - a.seconds)
}

export function periodStatsQuery(db: SqliteLike, period: StatsPeriod, now: Date): PeriodStats {
  const start = parseDate(period.start)
  const endExclusive = addDays(parseDate(period.end), 1)
  if (endExclusive <= start) throw new Error('O fim do período precisa ser depois do início.')
  if (daysBetween(start, endExclusive) > MAX_PERIOD_DAYS)
    throw new Error('O período vai até 366 dias.')
  const days = daysBetween(start, endExclusive)
  const prevStart = addDays(start, -days)
  const nowMs = now.getTime()
  const granularity = granularityFor(days)
  const project = period.projectId ?? null
  const projectFilter = 'AND (? IS NULL OR COALESCE(t.project_id, parent.project_id) = ?)'
  const projectParams: SqliteParam[] = [project, project]

  const sessions = db
    .prepare(
      `SELECT e.task_id,
         strftime('%Y-%m-%dT%H:%M:%fZ', e.start_time) AS start_time,
         strftime('%Y-%m-%dT%H:%M:%fZ', e.end_time) AS end_time,
         t.name, t.category, t.energy_level,
         COALESCE(t.project_id, parent.project_id) AS project_id
       FROM time_entries e
       JOIN tasks t ON t.id = e.task_id
       LEFT JOIN tasks parent ON parent.id = t.parent_task_id
       WHERE julianday(e.start_time) < julianday(?)
         AND (e.end_time IS NULL OR julianday(e.end_time) > julianday(?))
         ${projectFilter}`
    )
    .all(endExclusive.toISOString(), prevStart.toISOString(), ...projectParams) as SessionRow[]

  let focus = 0
  let focusPrev = 0
  let sessionCount = 0
  let sessionPrev = 0
  const daily = new Map<string, number>()
  const hourly = new Map<string, number>()
  const tasks = new Map<number, TaskTotals>()

  for (const row of sessions) {
    const begin = Date.parse(row.start_time)
    const finish = Math.min(row.end_time ? Date.parse(row.end_time) : nowMs, nowMs)
    if (!Number.isFinite(begin) || finish <= begin) continue

    const prevBegin = Math.max(begin, prevStart.getTime())
    const prevEnd = Math.min(finish, start.getTime())
    if (prevEnd > prevBegin) focusPrev += (prevEnd - prevBegin) / 1000
    if (begin >= prevStart.getTime() && begin < start.getTime()) sessionPrev++

    const from = Math.max(begin, start.getTime())
    const to = Math.min(finish, endExclusive.getTime())
    if (to <= from) continue
    if (begin >= start.getTime()) sessionCount++
    const seconds = (to - from) / 1000
    focus += seconds

    const totals = tasks.get(row.task_id) ?? {
      name: row.name,
      category: row.category ?? 'normal',
      energy: row.energy_level,
      projectId: row.project_id,
      seconds: 0
    }
    totals.seconds += seconds
    tasks.set(row.task_id, totals)

    for (let cursor = from; cursor < to; ) {
      const at = new Date(cursor)
      const nextHour = new Date(
        at.getFullYear(),
        at.getMonth(),
        at.getDate(),
        at.getHours() + 1
      ).getTime()
      const sliceEnd = Math.min(nextHour, to)
      const slice = (sliceEnd - cursor) / 1000
      addTo(daily, localDateString(at), slice)
      addTo(hourly, `${at.getDay()}:${at.getHours()}`, slice)
      cursor = sliceEnd
    }
  }

  const today = localDateString(now)
  const bucketMap = new Map<string, StatsBucket>()
  for (let day = start; day < endExclusive; day = addDays(day, 1)) {
    const key = bucketKey(day, granularity)
    if (!bucketMap.has(key)) bucketMap.set(key, { key, seconds: 0, current: false })
  }
  const currentKey = bucketKey(parseDate(today), granularity)
  for (const bucket of bucketMap.values()) bucket.current = bucket.key === currentKey
  for (const [date, seconds] of daily) {
    const bucket = bucketMap.get(bucketKey(parseDate(date), granularity))
    if (bucket) bucket.seconds += seconds
  }

  const completed = (from: Date, to: Date): number =>
    (
      db
        .prepare(
          `SELECT COUNT(*) AS n FROM tasks t
           LEFT JOIN tasks parent ON parent.id = t.parent_task_id
           WHERE t.status = 'finalizada' AND t.status_changed_at IS NOT NULL
             AND julianday(t.status_changed_at) >= julianday(?)
             AND julianday(t.status_changed_at) < julianday(?)
             ${projectFilter}`
        )
        .get(from.toISOString(), to.toISOString(), ...projectParams) as { n: number }
    ).n

  const projects = db.prepare('SELECT id, name, color, area_id FROM projects').all() as {
    id: number
    name: string
    color: string | null
    area_id: number | null
  }[]
  const projectById = new Map(projects.map((p) => [p.id, p]))
  const areas = new Map(
    (db.prepare('SELECT id, name FROM areas').all() as { id: number; name: string }[]).map((a) => [
      a.id,
      a.name
    ])
  )

  const byProject = new Map<number | null, number>()
  const byArea = new Map<number | null, number>()
  const byCategory = new Map<TaskCategory, { seconds: number; taskCount: number }>()
  const byEnergy = new Map<EnergyLevel, { seconds: number; taskCount: number }>()
  for (const totals of tasks.values()) {
    const project = totals.projectId === null ? undefined : projectById.get(totals.projectId)
    addTo(byProject, project ? project.id : null, totals.seconds)
    addTo(byArea, project?.area_id ?? null, totals.seconds)
    const category = byCategory.get(totals.category) ?? { seconds: 0, taskCount: 0 }
    category.seconds += totals.seconds
    category.taskCount++
    byCategory.set(totals.category, category)
    if (totals.energy) {
      const energy = byEnergy.get(totals.energy) ?? { seconds: 0, taskCount: 0 }
      energy.seconds += totals.seconds
      energy.taskCount++
      byEnergy.set(totals.energy, energy)
    }
  }

  const taskIds = [...tasks.keys()]
  const contextRows = taskIds.length
    ? (db
        .prepare(
          `SELECT tc.task_id, c.id, c.name, c.color FROM task_contexts tc
           JOIN contexts c ON c.id = tc.context_id
           WHERE tc.task_id IN (${taskIds.map(() => '?').join(',')})`
        )
        .all(...taskIds) as { task_id: number; id: number; name: string; color: string | null }[])
    : []
  const contextsOf = new Map<number, { id: number; name: string; color: string | null }[]>()
  for (const row of contextRows) {
    const list = contextsOf.get(row.task_id) ?? []
    list.push(row)
    contextsOf.set(row.task_id, list)
  }
  const byContext = new Map<number | null, StatsTimeRow>()
  for (const [taskId, totals] of tasks) {
    const list = contextsOf.get(taskId) ?? []
    const targets = list.length ? list : [{ id: null, name: 'Sem contexto', color: null }]
    for (const context of targets) {
      const row = byContext.get(context.id) ?? { ...context, seconds: 0 }
      row.seconds += totals.seconds
      byContext.set(context.id, row)
    }
  }

  const round = (seconds: number): number => Math.round(seconds)
  const roundRows = (rows: StatsTimeRow[]): StatsTimeRow[] =>
    sortRows(rows).map((r) => ({ ...r, seconds: round(r.seconds) }))
  const avg = (total: number, count: number): number => (count > 0 ? round(total / count) : 0)
  const elapsedEnd = new Date(
    Math.min(endExclusive.getTime(), addDays(parseDate(today), 1).getTime())
  )

  return {
    period: { start: period.start, end: period.end, projectId: project },
    previous: previousPeriod(period),
    granularity,
    focusSeconds: { value: round(focus), previous: round(focusPrev) },
    workdayAvgSeconds: avg(focus, Math.max(1, workdays(start, elapsedEnd))),
    buckets: [...bucketMap.values()].map((b) => ({ ...b, seconds: round(b.seconds) })),
    completedTasks: {
      value: completed(start, endExclusive),
      previous: completed(prevStart, start)
    },
    sessions: { value: sessionCount, previous: sessionPrev },
    avgSessionSeconds: { value: avg(focus, sessionCount), previous: avg(focusPrev, sessionPrev) },
    byProject: roundRows(
      [...byProject].map(([id, seconds]) => {
        const p = id === null ? undefined : projectById.get(id)
        return { id, name: p?.name ?? 'Sem projeto', color: p?.color ?? null, seconds }
      })
    ),
    byArea: roundRows(
      [...byArea].map(([id, seconds]) => ({
        id,
        name: id === null ? 'Sem área' : (areas.get(id) ?? 'Sem área'),
        color: null,
        seconds
      }))
    ),
    byContext: roundRows([...byContext.values()]),
    topTasks: [...tasks]
      .sort((a, b) => b[1].seconds - a[1].seconds)
      .slice(0, TOP_TASKS)
      .map(([taskId, t]) => ({
        taskId,
        name: t.name,
        projectName: t.projectId === null ? null : (projectById.get(t.projectId)?.name ?? null),
        projectColor: t.projectId === null ? null : (projectById.get(t.projectId)?.color ?? null),
        seconds: round(t.seconds)
      })),
    byCategory: CATEGORIES.filter((c) => byCategory.has(c))
      .map((category): StatsCategoryRow => {
        const row = byCategory.get(category)!
        return { category, seconds: round(row.seconds), taskCount: row.taskCount }
      })
      .sort((a, b) => b.seconds - a.seconds),
    byEnergy: ENERGIES.filter((e) => byEnergy.has(e)).map((energy): StatsEnergyRow => {
      const row = byEnergy.get(energy)!
      return {
        energy,
        seconds: round(row.seconds),
        taskCount: row.taskCount,
        avgSeconds: avg(row.seconds, row.taskCount)
      }
    }),
    hourly: [...hourly].map(([key, seconds]) => {
      const [weekday, hour] = key.split(':').map(Number)
      return { weekday, hour, seconds: round(seconds) }
    }),
    daily: [...daily]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, seconds]) => ({ date, seconds: round(seconds) }))
  }
}
