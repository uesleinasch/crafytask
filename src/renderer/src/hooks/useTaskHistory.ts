import { useCallback, useEffect, useState } from 'react'
import { useErrorBoundary } from 'react-error-boundary'
import type { TaskHistoryView } from '@shared/types'

const EMPTY: TaskHistoryView = { entries: [], lastCheckpoint: null }

interface UseTaskHistoryReturn extends TaskHistoryView {
  loading: boolean
  addNote: (summary: string) => Promise<void>
}

export function useTaskHistory(taskId: number, includeSubtasks: boolean): UseTaskHistoryReturn {
  const { showBoundary } = useErrorBoundary()
  const [view, setView] = useState<TaskHistoryView>(EMPTY)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setView(await window.api.getTaskHistory(taskId, includeSubtasks))
    } catch (error) {
      showBoundary(error)
    } finally {
      setLoading(false)
    }
  }, [taskId, includeSubtasks, showBoundary])

  useEffect(() => {
    void load()
    return window.api.onTasksRefresh(() => void load())
  }, [load])

  const addNote = useCallback(
    async (summary: string) => {
      await window.api.addTaskHistory(taskId, summary)
      await load()
    },
    [taskId, load]
  )

  return { ...view, loading, addNote }
}
