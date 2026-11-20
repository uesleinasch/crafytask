import { describe, expect, it } from 'vitest'
import type { ActiveTimer } from '@renderer/stores/timerStore'
import { sortByLatestStart } from './runningTimers'

const timer = (id: number, start: string): ActiveTimer =>
  ({
    task: { id, name: `t${id}` },
    entry: { id, task_id: id, start_time: start },
    displaySeconds: 0
  }) as unknown as ActiveTimer

describe('timers em execução', () => {
  it('põe o iniciado por último na frente', () => {
    const sorted = sortByLatestStart([
      timer(1, '2026-11-18T09:00:00.000Z'),
      timer(2, '2026-11-18T11:00:00.000Z'),
      timer(3, '2026-11-18T10:00:00.000Z')
    ])
    expect(sorted.map((t) => t.task.id)).toEqual([2, 3, 1])
  })
})
