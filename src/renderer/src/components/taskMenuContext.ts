import { createContext } from 'react'
import type { Context, Project, Task } from '@shared/types'

export const TaskMenuChangedContext = createContext<() => void>(() => {})

export interface TaskMenuData {
  projects: Project[]
  contexts: Context[]
  selectedIds: number[]
  taskById: (id: number) => Task | undefined
}

export const TaskMenuDataContext = createContext<TaskMenuData>({
  projects: [],
  contexts: [],
  selectedIds: [],
  taskById: () => undefined
})
