import { describe, expect, it } from 'vitest'
import {
  EMPTY_DRAFT,
  draftForAnother,
  draftProblem,
  draftToCreateInput,
  parseTimeLimit,
  type NewTaskDraft
} from './newTaskDraft'

const draft = (patch: Partial<NewTaskDraft>): NewTaskDraft => ({ ...EMPTY_DRAFT, ...patch })

describe('parseTimeLimit', () => {
  it('vazio é sem limite', () => {
    expect(parseTimeLimit('  ')).toBeUndefined()
  })

  it('aceita minutos, MM:SS e HH:MM:SS', () => {
    expect(parseTimeLimit('45')).toBe(45 * 60)
    expect(parseTimeLimit('10:30')).toBe(10 * 60 + 30)
    expect(parseTimeLimit('1:30:00')).toBe(5400)
  })

  it('recusa texto, zero e minuto ou segundo acima de 59', () => {
    expect(parseTimeLimit('uma hora')).toBeNull()
    expect(parseTimeLimit('0')).toBeNull()
    expect(parseTimeLimit('1:75:00')).toBeNull()
    expect(parseTimeLimit('10:60')).toBeNull()
  })
})

describe('draftProblem', () => {
  it('pede nome, limite válido e link http', () => {
    expect(draftProblem(draft({ name: '  ' }))).toMatch(/nome/)
    expect(draftProblem(draft({ name: 'A', timeLimit: 'x' }))).toMatch(/Limite/)
    expect(draftProblem(draft({ name: 'A', externalUrl: 'ftp://x' }))).toMatch(/http/)
    expect(draftProblem(draft({ name: 'A', externalUrl: 'https://x.dev' }))).toBeNull()
  })
})

describe('draftToCreateInput', () => {
  it('sem problema vira o input do createTask, com tags por nome', () => {
    const input = draftToCreateInput(
      draft({
        name: '  Revisar PR ',
        description: ' ',
        category: 'prioridade',
        projectId: 13,
        contextIds: [2],
        dueDate: '2026-11-21',
        dueTime: '18:00',
        energy: 'medio',
        tags: ['jira', 'nova'],
        timeLimit: '1:00:00'
      })
    )
    expect(input).toEqual({
      name: 'Revisar PR',
      description: undefined,
      category: 'prioridade',
      project_id: 13,
      contextIds: [2],
      due_date: '2026-11-21',
      due_time: '18:00',
      energy_level: 'medio',
      scheduled_date: undefined,
      scheduled_time: null,
      scheduled_end_time: null,
      recurrence_rule: undefined,
      tagNames: ['jira', 'nova'],
      external_url: null,
      time_limit_seconds: 3600
    })
  })

  it('hora sem data não vai, e fim sem início também não', () => {
    const input = draftToCreateInput(
      draft({ name: 'A', dueTime: '10:00', scheduledDate: '2026-11-20', scheduledEndTime: '11:00' })
    )
    expect(input?.due_time).toBeNull()
    expect(input?.scheduled_end_time).toBeNull()
  })

  it('com problema devolve null', () => {
    expect(draftToCreateInput(draft({ name: '' }))).toBeNull()
  })
})

describe('draftForAnother', () => {
  it('mantém categoria, projeto e contextos e limpa o resto', () => {
    const next = draftForAnother(
      draft({
        name: 'A',
        category: 'urgente',
        projectId: 4,
        contextIds: [1],
        tags: ['x'],
        dueDate: '2026-11-21',
        energy: 'alto',
        timeLimit: '30'
      })
    )
    expect(next).toEqual({ ...EMPTY_DRAFT, category: 'urgente', projectId: 4, contextIds: [1] })
  })
})
