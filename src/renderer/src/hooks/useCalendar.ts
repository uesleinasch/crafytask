import { useState, useEffect, useCallback, useRef } from 'react'
import { useErrorBoundary } from 'react-error-boundary'
import type { Task, TimeBlock, TimeEntrySpan } from '@shared/types'
import { localDaysToIsoRange } from '@shared/calendarPrefs'

export interface CalendarRangeData {
  blocks: TimeBlock[]
  tasks: Task[]
  sessions: TimeEntrySpan[]
}

export function useCalendarRange(from: string, to: string, version = 0): CalendarRangeData | null {
  const { showBoundary } = useErrorBoundary()
  const [data, setData] = useState<CalendarRangeData | null>(null)
  const latest = useRef(0)

  const refresh = useCallback(async () => {
    const request = ++latest.current
    const { fromIso, toIso } = localDaysToIsoRange(from, to)
    const [blocks, tasks, sessions] = await Promise.all([
      window.api.getTimeBlocksForRange(from, to),
      window.api.getCalendarTasks(from, to),
      window.api.listTimeEntriesRange(fromIso, toIso)
    ])
    if (request === latest.current) setData({ blocks, tasks, sessions })
  }, [from, to])

  useEffect(() => {
    const reload = (): void => void refresh().catch(showBoundary)
    reload()
    const offRefresh = window.api.onTasksRefresh(reload)
    const offStopped = window.api.onTimerStopped(reload)
    return () => {
      offRefresh()
      offStopped()
    }
  }, [refresh, showBoundary, version])

  return data
}
