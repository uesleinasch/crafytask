import { describe, expect, it } from 'vitest'
import type { ProjectMilestone } from '@shared/types'
import {
  milestoneDue,
  milestoneOptionLabel,
  nextOpenMilestone,
  readyToClose,
  takenKinds
} from './milestoneView'

const milestone = (patch: Partial<ProjectMilestone>): ProjectMilestone => ({
  id: 1,
  project_id: 1,
  name: 'Entrega',
  kind: 'desenvolvimento',
  due_date: null,
  description: null,
  done_at: null,
  created_at: '2026-11-01 10:00:00',
  updated_at: '2026-11-01 10:00:00',
  task_count: 0,
  done_task_count: 0,
  ...patch
})

describe('milestoneView', () => {
  it('diz quanto falta e pinta como o prazo do projeto', () => {
    const today = '2026-11-23'
    expect(milestoneDue(milestone({}), today)).toBeNull()
    expect(milestoneDue(milestone({ due_date: '2026-12-10' }), today)).toEqual({
      label: '10/12 · faltam 17d',
      tone: null
    })
    expect(milestoneDue(milestone({ due_date: '2026-11-28' }), today)?.tone).toBe('soon')
    expect(milestoneDue(milestone({ due_date: '2026-11-23' }), today)?.label).toBe('23/11 · hoje')
    expect(milestoneDue(milestone({ due_date: '2026-11-20' }), today)).toEqual({
      label: '20/11 · venceu há 3d',
      tone: 'overdue'
    })
    expect(
      milestoneDue(milestone({ due_date: '2026-11-20', done_at: '2026-11-19 10:00:00' }), today)
    ).toEqual({ label: '20/11', tone: null })
  })

  it('acha o próximo marco aberto e os tipos já tomados', () => {
    const list = [
      milestone({ id: 1, kind: 'inicio', done_at: '2026-11-10 10:00:00' }),
      milestone({ id: 2 }),
      milestone({ id: 3, kind: 'fim' })
    ]
    expect(nextOpenMilestone(list)?.id).toBe(2)
    expect(nextOpenMilestone([list[0]])).toBeNull()
    expect(takenKinds(list)).toEqual(['inicio', 'fim'])
    expect(takenKinds(list, 3)).toEqual(['inicio'])
  })

  it('sugere concluir quando todas as tarefas fecharam', () => {
    expect(readyToClose(milestone({ task_count: 2, done_task_count: 2 }))).toBe(true)
    expect(readyToClose(milestone({ task_count: 2, done_task_count: 1 }))).toBe(false)
    expect(readyToClose(milestone({}))).toBe(false)
    expect(
      readyToClose(milestone({ task_count: 1, done_task_count: 1, done_at: '2026-11-20 10:00:00' }))
    ).toBe(false)
  })

  it('monta o rótulo do seletor', () => {
    expect(milestoneOptionLabel(milestone({ kind: 'fim', due_date: '2026-12-15' }))).toBe(
      'Entrega · Fim · 15/12'
    )
  })
})
