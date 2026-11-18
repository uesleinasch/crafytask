import { useCallback, useEffect, useState } from 'react'
import { useErrorBoundary } from 'react-error-boundary'
import { contextLabel, tagLabel, type Label } from '@renderer/components/labels/labels'

interface UseLabelsReturn {
  contexts: Label[]
  tags: Label[]
  loading: boolean
  refresh: () => Promise<void>
}

export function useLabels(): UseLabelsReturn {
  const [contexts, setContexts] = useState<Label[]>([])
  const [tags, setTags] = useState<Label[]>([])
  const [loading, setLoading] = useState(true)
  const { showBoundary } = useErrorBoundary()

  const refresh = useCallback(async () => {
    const [contextRows, tagRows] = await Promise.all([
      window.api.listContextsWithUsage(),
      window.api.listTagsWithUsage()
    ])
    setContexts(contextRows.map(contextLabel))
    setTags(tagRows.map(tagLabel))
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh().catch(showBoundary)
    return window.api.onTasksRefresh(() => refresh().catch(showBoundary))
  }, [refresh, showBoundary])

  return { contexts, tags, loading, refresh }
}
