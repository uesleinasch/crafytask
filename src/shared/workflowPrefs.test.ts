import { describe, expect, it } from 'vitest'
import {
  DEFAULT_WORKFLOW_PREFS,
  calendarPrefsFrom,
  mergeWorkflowPrefs,
  sanitizeWorkflowPrefs,
  timeLeakNoticeStep,
  timeLeakThresholds
} from './workflowPrefs'

describe('sanitizeWorkflowPrefs', () => {
  it('cai nos padrões sem nada salvo', () => {
    expect(sanitizeWorkflowPrefs(null)).toEqual(DEFAULT_WORKFLOW_PREFS)
    expect(sanitizeWorkflowPrefs('lixo')).toEqual(DEFAULT_WORKFLOW_PREFS)
  })

  it('aceita valores válidos', () => {
    const prefs = sanitizeWorkflowPrefs({
      workdayHours: 7.5,
      weekStart: 'sunday',
      timeLeakLevels: [15, 45, 90],
      timeLeakRepeatMinutes: 15,
      calendarStartHour: 7,
      calendarEndHour: 22,
      dueNotices: { eve: false },
      notesSyncInterval: 300
    })
    expect(prefs).toEqual({
      workdayHours: 7.5,
      weekStart: 'sunday',
      timeLeakLevels: [15, 45, 90],
      timeLeakRepeatMinutes: 15,
      calendarStartHour: 7,
      calendarEndHour: 22,
      dueNotices: { eve: false, day: true, soon: true, atTime: true },
      notesSyncInterval: 300
    })
  })

  it('recusa campo por campo o que estiver fora da regra', () => {
    const prefs = sanitizeWorkflowPrefs({
      workdayHours: 7.3,
      weekStart: 'friday',
      timeLeakLevels: [60, 30, 120],
      timeLeakRepeatMinutes: 7,
      calendarStartHour: 22,
      calendarEndHour: 7,
      notesSyncInterval: 1
    })
    expect(prefs).toEqual(DEFAULT_WORKFLOW_PREFS)
    expect(sanitizeWorkflowPrefs({ workdayHours: 17 }).workdayHours).toBe(8)
    expect(sanitizeWorkflowPrefs({ timeLeakLevels: [1, 60, 120] }).timeLeakLevels).toEqual([
      30, 60, 120
    ])
  })
})

describe('mergeWorkflowPrefs', () => {
  it('aplica só o que mudou e mantém o atual no que for inválido', () => {
    const current = { ...DEFAULT_WORKFLOW_PREFS, calendarStartHour: 7, calendarEndHour: 22 }
    const next = mergeWorkflowPrefs(current, {
      workdayHours: 6,
      calendarEndHour: 5,
      dueNotices: { soon: false },
      extra: 1
    })
    expect(next.workdayHours).toBe(6)
    expect(next.calendarStartHour).toBe(7)
    expect(next.calendarEndHour).toBe(22)
    expect(next.dueNotices).toEqual({ eve: true, day: true, soon: false, atTime: true })
    expect(next).not.toHaveProperty('extra')
  })
})

describe('derivados', () => {
  it('monta as preferências do calendário e os limiares do time leak', () => {
    expect(calendarPrefsFrom({ ...DEFAULT_WORKFLOW_PREFS, workdayHours: 7.5 })).toEqual({
      journeyMinutes: 450,
      dayStartHour: 0,
      dayEndHour: 24,
      weekStart: 'monday'
    })
    expect(timeLeakThresholds(DEFAULT_WORKFLOW_PREFS)).toEqual([1800, 3600, 7200])
  })

  it('o aviso de time leak começa no segundo nível e repete no intervalo', () => {
    expect(timeLeakNoticeStep(3599, DEFAULT_WORKFLOW_PREFS)).toBeNull()
    expect(timeLeakNoticeStep(3600, DEFAULT_WORKFLOW_PREFS)).toBe(0)
    expect(timeLeakNoticeStep(3600 + 299, DEFAULT_WORKFLOW_PREFS)).toBe(0)
    expect(timeLeakNoticeStep(3600 + 300, DEFAULT_WORKFLOW_PREFS)).toBe(1)
    const slow = { ...DEFAULT_WORKFLOW_PREFS, timeLeakRepeatMinutes: 30 }
    expect(timeLeakNoticeStep(3600 + 1799, slow)).toBe(0)
  })
})
