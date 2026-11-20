import type { CalendarPrefs, WeekStart } from './calendarPrefs'

export interface DueNotices {
  eve: boolean
  day: boolean
  soon: boolean
  atTime: boolean
}

export interface WorkflowPrefs {
  workdayHours: number
  weekStart: WeekStart
  timeLeakLevels: [number, number, number]
  timeLeakRepeatMinutes: number
  calendarStartHour: number
  calendarEndHour: number
  dueNotices: DueNotices
  notesSyncInterval: number
}

export type WorkflowPrefsPatch = Partial<Omit<WorkflowPrefs, 'dueNotices'>> & {
  dueNotices?: Partial<DueNotices>
}

export const DEFAULT_WORKFLOW_PREFS: WorkflowPrefs = {
  workdayHours: 8,
  weekStart: 'monday',
  timeLeakLevels: [30, 60, 120],
  timeLeakRepeatMinutes: 5,
  calendarStartHour: 0,
  calendarEndHour: 24,
  dueNotices: { eve: true, day: true, soon: true, atTime: true },
  notesSyncInterval: 60
}

export const WORKDAY_HOURS_RANGE = { min: 1, max: 16, step: 0.5 } as const
export const TIME_LEAK_LEVEL_RANGE = { min: 5, max: 720 } as const
export const TIME_LEAK_REPEAT_OPTIONS = [5, 10, 15, 30] as const
export const NOTES_SYNC_INTERVAL_OPTIONS = [30, 60, 300] as const

type Raw = Record<string, unknown>

function isRecord(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function workdayHours(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  const { min, max, step } = WORKDAY_HOURS_RANGE
  if (value < min || value > max || (value / step) % 1 !== 0) return fallback
  return value
}

function timeLeakLevels(
  value: unknown,
  fallback: WorkflowPrefs['timeLeakLevels']
): WorkflowPrefs['timeLeakLevels'] {
  if (!Array.isArray(value) || value.length !== 3) return fallback
  const { min, max } = TIME_LEAK_LEVEL_RANGE
  const valid = value.every(
    (level, index) =>
      Number.isInteger(level) &&
      level >= min &&
      level <= max &&
      (index === 0 || level > value[index - 1])
  )
  return valid ? [value[0], value[1], value[2]] : fallback
}

function oneOf<T>(options: readonly T[], value: unknown, fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback
}

function calendarRange(
  start: unknown,
  end: unknown,
  fallback: WorkflowPrefs
): Pick<WorkflowPrefs, 'calendarStartHour' | 'calendarEndHour'> {
  const valid =
    Number.isInteger(start) &&
    Number.isInteger(end) &&
    (start as number) >= 0 &&
    (end as number) <= 24 &&
    (end as number) > (start as number)
  return valid
    ? { calendarStartHour: start as number, calendarEndHour: end as number }
    : { calendarStartHour: fallback.calendarStartHour, calendarEndHour: fallback.calendarEndHour }
}

function dueNotices(value: unknown, fallback: DueNotices): DueNotices {
  const raw = isRecord(value) ? value : {}
  const pick = (key: keyof DueNotices): boolean =>
    typeof raw[key] === 'boolean' ? (raw[key] as boolean) : fallback[key]
  return { eve: pick('eve'), day: pick('day'), soon: pick('soon'), atTime: pick('atTime') }
}

export function sanitizeWorkflowPrefs(
  raw: unknown,
  fallback: WorkflowPrefs = DEFAULT_WORKFLOW_PREFS
): WorkflowPrefs {
  const value = isRecord(raw) ? raw : {}
  return {
    workdayHours: workdayHours(value.workdayHours, fallback.workdayHours),
    weekStart: oneOf<WeekStart>(['monday', 'sunday'], value.weekStart, fallback.weekStart),
    timeLeakLevels: timeLeakLevels(value.timeLeakLevels, fallback.timeLeakLevels),
    timeLeakRepeatMinutes: oneOf(
      TIME_LEAK_REPEAT_OPTIONS,
      value.timeLeakRepeatMinutes,
      fallback.timeLeakRepeatMinutes
    ),
    ...calendarRange(value.calendarStartHour, value.calendarEndHour, fallback),
    dueNotices: dueNotices(value.dueNotices, fallback.dueNotices),
    notesSyncInterval: oneOf(
      NOTES_SYNC_INTERVAL_OPTIONS,
      value.notesSyncInterval,
      fallback.notesSyncInterval
    )
  }
}

export function mergeWorkflowPrefs(current: WorkflowPrefs, patch: unknown): WorkflowPrefs {
  const value = isRecord(patch) ? patch : {}
  const merged = {
    ...current,
    ...value,
    dueNotices: { ...current.dueNotices, ...(isRecord(value.dueNotices) ? value.dueNotices : {}) }
  }
  return sanitizeWorkflowPrefs(merged, current)
}

export function calendarPrefsFrom(prefs: WorkflowPrefs): CalendarPrefs {
  return {
    journeyMinutes: Math.round(prefs.workdayHours * 60),
    dayStartHour: prefs.calendarStartHour,
    dayEndHour: prefs.calendarEndHour,
    weekStart: prefs.weekStart
  }
}

export function timeLeakThresholds(prefs: WorkflowPrefs): number[] {
  return prefs.timeLeakLevels.map((minutes) => minutes * 60)
}

export function timeLeakNoticeStep(seconds: number, prefs: WorkflowPrefs): number | null {
  const start = prefs.timeLeakLevels[1] * 60
  if (seconds < start) return null
  return Math.floor((seconds - start) / (prefs.timeLeakRepeatMinutes * 60))
}
