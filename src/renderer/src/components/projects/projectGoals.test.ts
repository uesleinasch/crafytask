import { describe, expect, it } from 'vitest'
import type { Goal, Project } from '@shared/types'
import {
  deleteGoalWarning,
  goalIdFromSearch,
  goalMenuGroups,
  goalProjectsSummary,
  goalSelectOptions
} from './projectGoals'

const goal = (id: number, horizon: 3 | 4 | 5, name: string, project_count = 0): Goal => ({
  id,
  horizon,
  name,
  project_count,
  created_at: '',
  updated_at: ''
})

const goals = [
  goal(1, 3, 'Lançar o 4.0', 2),
  goal(2, 5, 'Devolver tempo'),
  goal(3, 3, 'Correr 10 km')
]

const linked = (
  id: number,
  goal_id: number | null,
  status: Project['status'] = 'active'
): Project => ({
  id,
  name: `P${id}`,
  status,
  color: '',
  goal_id,
  created_at: '',
  updated_at: ''
})

describe('goalSelectOptions', () => {
  it('agrupa por horizonte e pula nível vazio', () => {
    expect(goalSelectOptions(goals)).toEqual([
      {
        label: 'H3 · Metas',
        options: [
          { value: 1, label: '🎯 Lançar o 4.0' },
          { value: 3, label: '🎯 Correr 10 km' }
        ]
      },
      { label: 'H5 · Propósito', options: [{ value: 2, label: '✨ Devolver tempo' }] }
    ])
  })
})

describe('goalMenuGroups', () => {
  it('marca a meta atual', () => {
    const [h3] = goalMenuGroups(goals, 3)
    expect(h3.children).toEqual([
      { key: 'goal:1', label: 'Lançar o 4.0' },
      { key: 'goal:3', label: '✓ Correr 10 km' }
    ])
  })
})

describe('goalIdFromSearch', () => {
  it('lê ?meta= e recusa valor inválido', () => {
    expect(goalIdFromSearch(new URLSearchParams('meta=7'))).toBe(7)
    expect(goalIdFromSearch(new URLSearchParams('meta=abc'))).toBeNull()
    expect(goalIdFromSearch(new URLSearchParams(''))).toBeNull()
  })
})

describe('textos', () => {
  it('resume e avisa a exclusão', () => {
    expect(goalProjectsSummary(0)).toBe('Nenhum projeto')
    expect(goalProjectsSummary(1)).toBe('1 projeto')
    expect(goalProjectsSummary(3)).toBe('3 projetos')
    const projects = [linked(1, 1), linked(2, 1, 'archived'), linked(3, 3), linked(4, null)]
    expect(deleteGoalWarning(goals[0], projects)).toBe(
      '2 projetos ficam sem meta. Nada mais é apagado.'
    )
    expect(deleteGoalWarning(goals[2], projects)).toBe(
      '1 projeto fica sem meta. Nada mais é apagado.'
    )
    expect(deleteGoalWarning(goals[1], projects)).toBe('Nenhum projeto serve a esta meta.')
  })
})

describe('metas concluídas nos seletores', () => {
  const withDone = [
    ...goals,
    { ...goal(4, 3, 'Playbook em inglês'), done_at: '2026-10-30 10:00:00' }
  ]

  it('somem dos seletores, menos a que o projeto já tem', () => {
    const names = (groups: ReturnType<typeof goalSelectOptions>): string[] =>
      groups.flatMap((g) => g.options.map((o) => o.label))
    expect(names(goalSelectOptions(withDone))).not.toContain('🎯 Playbook em inglês')
    expect(names(goalSelectOptions(withDone, 4))).toContain('🎯 Playbook em inglês (concluída)')
  })

  it('no menu, a atual aparece marcada e com o aviso', () => {
    const labels = (current: number | null): string[] =>
      goalMenuGroups(withDone, current).flatMap((g) => g.children.map((c) => c.label))
    expect(labels(null)).not.toContain('Playbook em inglês')
    expect(labels(4)).toContain('✓ Playbook em inglês (concluída)')
  })
})
