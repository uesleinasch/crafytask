import { createContext } from 'react'
import type { Context, Project, ProjectMilestone, Task } from '@shared/types'

export const TaskMenuChangedContext = createContext<() => void>(() => {})

export interface TaskMenuData {
  projects: Project[]
  contexts: Context[]
  milestones: ProjectMilestone[]
  selectedIds: number[]
  taskById: (id: number) => Task | undefined
}

export const TaskMenuDataContext = createContext<TaskMenuData>({
  projects: [],
  contexts: [],
  milestones: [],
  selectedIds: [],
  taskById: () => undefined
})
