import type { Goal, Project } from '@shared/types'
import { GOAL_HORIZONS } from '@renderer/components/horizons/horizonLevels'

export const NO_GOAL = 'Sem meta'
export const GOAL_FIELD_HINT = 'A que meta, visão ou propósito este projeto serve?'

export interface GoalOptionGroup {
  label: string
  options: { value: number; label: string }[]
}

export function goalSelectOptions(goals: Goal[]): GoalOptionGroup[] {
  return GOAL_HORIZONS.map((lv) => ({
    label: `H${lv.h} · ${lv.label}`,
    options: goals
      .filter((g) => g.horizon === lv.h)
      .map((g) => ({ value: g.id, label: `${lv.emoji} ${g.name}` }))
  })).filter((group) => group.options.length > 0)
}

export interface GoalMenuGroup {
  type: 'group'
  key: string
  label: string
  children: { key: string; label: string }[]
}

export function goalMenuGroups(
  goals: Goal[],
  currentId: number | null | undefined
): GoalMenuGroup[] {
  return GOAL_HORIZONS.map((lv) => ({
    type: 'group' as const,
    key: `goal-h${lv.h}`,
    label: `H${lv.h} · ${lv.label}`,
    children: goals
      .filter((g) => g.horizon === lv.h)
      .map((g) => ({ key: `goal:${g.id}`, label: currentId === g.id ? `✓ ${g.name}` : g.name }))
  })).filter((group) => group.children.length > 0)
}

export function goalIdFromSearch(params: URLSearchParams): number | null {
  const id = Number(params.get('meta'))
  return Number.isInteger(id) && id > 0 ? id : null
}

export function goalProjectsPath(goalId: number): string {
  return `/projects?meta=${goalId}`
}

export function goalProjectsSummary(count: number): string {
  if (count === 0) return 'Nenhum projeto'
  return `${count} ${count === 1 ? 'projeto' : 'projetos'}`
}

export function deleteGoalWarning(goal: Goal, projects: Project[]): string {
  const count = projects.filter((p) => p.goal_id === goal.id).length
  if (count === 0) return 'Nenhum projeto serve a esta meta.'
  return `${count} ${count === 1 ? 'projeto fica' : 'projetos ficam'} sem meta. Nada mais é apagado.`
}
