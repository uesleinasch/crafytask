import type { CreateTaskInput, EnergyLevel, TaskCategory } from '@shared/types'

export const MAX_SUBTASKS = 30

export interface SubtaskDraft {
  name: string
  description?: string
  category?: TaskCategory
  energy?: EnergyLevel
  due_date?: string
  project_id?: number
  tags?: string[]
}

export function planSubtasks(
  parent: Pick<CreateTaskInput, 'project_id' | 'tagNames'>,
  drafts: SubtaskDraft[]
): CreateTaskInput[] {
  return drafts.map((draft) => ({
    name: draft.name,
    description: draft.description,
    category: draft.category,
    energy_level: draft.energy,
    due_date: draft.due_date,
    project_id: draft.project_id ?? parent.project_id,
    tagNames: draft.tags ?? parent.tagNames
  }))
}
