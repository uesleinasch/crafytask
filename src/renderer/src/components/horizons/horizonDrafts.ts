import type { Area, Goal, GoalHorizon } from '@shared/types'
import { AREA_ICONS } from './horizonLevels'

export type AreaDraft = { id?: number; name: string; icon: string; description: string }

export type GoalDraft = {
  id?: number
  name: string
  horizon: GoalHorizon
  areaId: number | null
  description: string
}

export function areaDraft(area?: Area): AreaDraft {
  return area
    ? {
        id: area.id,
        name: area.name,
        icon: area.icon || AREA_ICONS[0],
        description: area.description ?? ''
      }
    : { name: '', icon: AREA_ICONS[0], description: '' }
}

export function goalDraft(goal: Goal): GoalDraft {
  return {
    id: goal.id,
    name: goal.name,
    horizon: goal.horizon,
    areaId: goal.area_id ?? null,
    description: goal.description ?? ''
  }
}
