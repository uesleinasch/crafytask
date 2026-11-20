import { describe, expect, it } from 'vitest'
import type { Task, TaskHistoryItem, TimeBlock } from '@shared/types'
import {
  BRIEFING_SECTION_LIMIT,
  buildBriefing,
  sqliteUtcMs,
  type BriefingInput
} from './briefingPlan'

const NOW = new Date('2026-11-20T15:00:00Z')

function task(id: number, overrides: Partial<Task> = {}): Task {
  return {
    id,
    name: `Task ${id}`,
    total_seconds: 0,
    status: 'proximas',
    category: 'normal',
    is_running: false,
    is_archived: false,
    created_at: '2026-11-01 10:00:00',
    updated_at: '2026-11-01 10:00:00',
    ...overrides
  }
}

function checkpoint(
  taskId: number,
  at: string,
  extra: Partial<TaskHistoryItem> = {}
): TaskHistoryItem {
  return {
    id: taskId * 10,
    task_id: taskId,
    task_name: `Task ${taskId}`,
    kind: 'checkpoint',
    origin: 'mcp',
    summary: 'metade feita',
    done: null,
    remaining: 'testes',
    from_status: null,
    to_status: 'executando',
    created_at: at,
    ...extra
  }
}

function input(overrides: Partial<BriefingInput> = {}): BriefingInput {
  return {
    date: '2026-11-20',
    now: NOW,
    running: [],
    executando: [],
    checkpoints: new Map(),
    today: [],
    timeBlocks: [],
    overdue: { total: 0, sample: [] },
    waiting: [],
    inboxCount: 0,
    ...overrides
  }
}

describe('sqliteUtcMs', () => {
  it('lê o carimbo do SQLite como UTC e aceita ISO com fuso', () => {
    expect(sqliteUtcMs('2026-11-20 15:00:00')).toBe(NOW.getTime())
    expect(sqliteUtcMs('2026-11-20T12:00:00-03:00')).toBe(NOW.getTime())
    expect(sqliteUtcMs(null)).toBeNull()
    expect(sqliteUtcMs('lixo')).toBeNull()
  })
})

describe('buildBriefing', () => {
  it('junta o último checkpoint em cada task em executando', () => {
    const briefing = buildBriefing(
      input({
        executando: [task(1, { status: 'executando' }), task(2, { status: 'executando' })],
        checkpoints: new Map([[1, checkpoint(1, '2026-11-20 14:00:00')]])
      })
    )
    expect(briefing.executando.items[0].checkpoint).toEqual({
      summary: 'metade feita',
      remaining: 'testes',
      at: '2026-11-20 14:00:00'
    })
    expect(briefing.executando.items[1]).not.toHaveProperty('checkpoint')
  })

  it('corta cada seção no limite e guarda o total', () => {
    const many = Array.from({ length: 25 }, (_, index) => task(index + 1))
    const briefing = buildBriefing(
      input({ today: many, waiting: many, overdue: { total: 40, sample: many } })
    )
    expect(briefing.today.items).toHaveLength(BRIEFING_SECTION_LIMIT)
    expect(briefing.today.total).toBe(25)
    expect(briefing.overdue.total).toBe(40)
    expect(briefing.waiting.items).toHaveLength(BRIEFING_SECTION_LIMIT)
  })

  it('conta há quantos dias a task aguarda', () => {
    const briefing = buildBriefing(
      input({
        waiting: [
          task(1, {
            status: 'aguardando',
            waiting_for: 'Revisor',
            status_changed_at: '2026-11-17 14:00:00'
          })
        ]
      })
    )
    expect(briefing.waiting.items[0]).toMatchObject({ waiting_for: 'Revisor', waiting_days: 3 })
  })

  it('ordena os blocos de tempo pelo início', () => {
    const block = (id: number, start: string): TimeBlock =>
      ({
        id,
        task_id: id,
        task_name: `T${id}`,
        date: '2026-11-20',
        start_time: start,
        end_time: '23:00'
      }) as TimeBlock
    const briefing = buildBriefing(input({ timeBlocks: [block(1, '14:00'), block(2, '09:00')] }))
    expect(briefing.today.time_blocks.map((item) => item.start)).toEqual(['09:00', '14:00'])
    expect(briefing.today.time_blocks[0]).toEqual({
      id: 2,
      task_id: 2,
      task: 'T2',
      start: '09:00',
      end: '23:00'
    })
  })

  it('avisa de timer ligado em task fora de executando', () => {
    const briefing = buildBriefing(
      input({ running: [task(1, { status: 'proximas', is_running: true })] })
    )
    expect(briefing.warnings).toEqual(['Timer ligado na task #1 (Task 1), que está em proximas.'])
  })

  it('avisa de task em executando parada há mais de um dia, sem timer', () => {
    const stale = task(1, { status: 'executando', status_changed_at: '2026-11-18 10:00:00' })
    const fresh = task(2, { status: 'executando', status_changed_at: '2026-11-18 10:00:00' })
    const timed = task(3, { status: 'executando', status_changed_at: '2026-11-18 10:00:00' })
    const parent = task(4, { status: 'executando', status_changed_at: '2026-11-18 10:00:00' })
    const child = task(5, {
      status: 'executando',
      parent_task_id: 4,
      status_changed_at: '2026-11-20 14:00:00'
    })
    const briefing = buildBriefing(
      input({
        running: [timed],
        executando: [stale, fresh, timed, parent, child],
        checkpoints: new Map([[2, checkpoint(2, '2026-11-20 14:30:00')]])
      })
    )
    expect(briefing.warnings).toHaveLength(1)
    expect(briefing.warnings[0]).toContain('#1 (Task 1)')
  })

  it('inclui here só quando a pasta veio', () => {
    expect(buildBriefing(input())).not.toHaveProperty('here')
    const briefing = buildBriefing(
      input({ here: { directory: '/repo', project: { id: 3, name: 'App' }, tasks: [task(1)] } })
    )
    expect(briefing.here).toMatchObject({
      directory: '/repo',
      project: { id: 3, name: 'App' },
      total: 1
    })
  })

  it('fica abaixo de 10 KB com as listas cheias e checkpoints longos', () => {
    const many = Array.from({ length: 30 }, (_, index) =>
      task(index + 1, {
        name: `Task ${index + 1} com um nome de tamanho comum para medir`,
        status: 'executando',
        project_name: 'CrafyTask',
        due_date: '2026-11-25'
      })
    )
    const checkpoints = new Map(
      many.map((item) => [
        item.id,
        checkpoint(item.id, '2026-11-20 14:00:00', {
          summary: 'x'.repeat(4000),
          remaining: 'y'.repeat(4000)
        })
      ])
    )
    const briefing = buildBriefing(
      input({
        running: many.slice(0, 2),
        executando: many.slice(0, 5),
        checkpoints,
        today: many,
        overdue: { total: 30, sample: many },
        waiting: many.map((item) => ({ ...item, waiting_for: 'Alguém' })),
        here: { directory: '/repo', project: null, tasks: many }
      })
    )
    expect(JSON.stringify(briefing).length).toBeLessThan(10_000)
  })
})
