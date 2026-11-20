import { useState, useEffect, useCallback } from 'react'
import type { Project, CreateProjectInput, UpdateProjectInput, ProjectStatus } from '@shared/types'

interface UseProjectsReturn {
  projects: Project[]
  loading: boolean
  refreshProjects: () => Promise<void>
  createProject: (data: CreateProjectInput) => Promise<Project>
  updateProject: (id: number, data: UpdateProjectInput) => Promise<void>
  deleteProject: (id: number) => Promise<void>
}

export function useProjects(statusFilter?: ProjectStatus): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const refreshProjects = useCallback(async () => {
    setLoading(true)
    try {
      const result = await window.api.listProjects(statusFilter)
      setProjects(result)
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    refreshProjects()
  }, [refreshProjects])

  const createProject = useCallback(
    async (data: CreateProjectInput): Promise<Project> => {
      const project = await window.api.createProject(data)
      await refreshProjects()
      return project
    },
    [refreshProjects]
  )

  const updateProject = useCallback(
    async (id: number, data: UpdateProjectInput): Promise<void> => {
      await window.api.updateProject(id, data)
      await refreshProjects()
    },
    [refreshProjects]
  )

  const deleteProject = useCallback(
    async (id: number): Promise<void> => {
      await window.api.deleteProject(id)
      await refreshProjects()
    },
    [refreshProjects]
  )

  return {
    projects,
    loading,
    refreshProjects,
    createProject,
    updateProject,
    deleteProject
  }
}
