import { useState, useEffect, useCallback } from 'react'
import { useErrorBoundary } from 'react-error-boundary'
import type {
  Task,
  TimeBlock,
  TimeEntrySpan,
  CreateTimeBlockInput,
  UpdateTimeBlockInput
} from '@shared/types'
import { localDaysToIsoRange } from '@shared/calendarPrefs'

// ===================== GRID DATA =====================

export interface CalendarRangeData {
  blocks: TimeBlock[]
  tasks: Task[]
  sessions: TimeEntrySpan[]
}

interface UseCalendarRangeReturn {
  data: CalendarRangeData | null
  refresh: () => Promise<void>
  createTimeBlock: (data: CreateTimeBlockInput) => Promise<TimeBlock>
  updateTimeBlock: (id: number, data: UpdateTimeBlockInput) => Promise<TimeBlock>
  deleteTimeBlock: (id: number) => Promise<TimeBlock | null>
}

export function useCalendarRange(from: string, to: string): UseCalendarRangeReturn {
  const { showBoundary } = useErrorBoundary()
  const [data, setData] = useState<CalendarRangeData | null>(null)

  const refresh = useCallback(async () => {
    const { fromIso, toIso } = localDaysToIsoRange(from, to)
    const [blocks, tasks, sessions] = await Promise.all([
      window.api.getTimeBlocksForRange(from, to),
      window.api.getCalendarTasks(from, to),
      window.api.listTimeEntriesRange(fromIso, toIso)
    ])
    setData({ blocks, tasks, sessions })
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
  }, [refresh, showBoundary])

  const createTimeBlock = useCallback(
    async (input: CreateTimeBlockInput): Promise<TimeBlock> => {
      const block = await window.api.createTimeBlock(input)
      await refresh()
      return block
    },
    [refresh]
  )

  const updateTimeBlock = useCallback(
    async (id: number, patch: UpdateTimeBlockInput): Promise<TimeBlock> => {
      const before = await window.api.updateTimeBlock(id, patch)
      await refresh()
      return before
    },
    [refresh]
  )

  const deleteTimeBlock = useCallback(
    async (id: number): Promise<TimeBlock | null> => {
      const removed = await window.api.deleteTimeBlock(id)
      await refresh()
      return removed
    },
    [refresh]
  )

  return { data, refresh, createTimeBlock, updateTimeBlock, deleteTimeBlock }
}

// ===================== MONTH DATA =====================

interface UseCalendarMonthReturn {
  timeBlocks: TimeBlock[]
  scheduledTasks: Task[]
  loading: boolean
  refresh: () => Promise<void>
  scheduleTask: (taskId: number, date: string | null) => Promise<void>
  createTimeBlock: (data: CreateTimeBlockInput) => Promise<TimeBlock>
  deleteTimeBlock: (id: number) => Promise<void>
}

export function useCalendarMonth(yearMonth: string): UseCalendarMonthReturn {
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([])
  const [scheduledTasks, setScheduledTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      // Build the range for the month
      const [year, month] = yearMonth.split('-').map(Number)
      const firstDay = `${yearMonth}-01`
      const lastDay = new Date(year, month, 0)
      const lastDayStr = lastDay.toISOString().split('T')[0]

      // Load tasks for each day of month via weekly schedule calls
      const allTasks: Task[] = []
      let current = new Date(firstDay + 'T12:00:00')
      const end = new Date(lastDayStr + 'T12:00:00')

      // Collect 4-5 week ranges
      const weekStarts: string[] = []
      const seen = new Set<string>()
      const cursor = new Date(current)
      while (cursor <= end) {
        const weekStr = cursor.toISOString().split('T')[0]
        if (!seen.has(weekStr)) {
          seen.add(weekStr)
          weekStarts.push(weekStr)
        }
        cursor.setDate(cursor.getDate() + 7)
      }

      const [blocks, ...weekSchedules] = await Promise.all([
        window.api.getTimeBlocksForMonth(yearMonth),
        ...weekStarts.map((ws) => window.api.getWeeklySchedule(ws))
      ])

      for (const week of weekSchedules) {
        for (const day of week) {
          if (day.date >= firstDay && day.date <= lastDayStr) {
            for (const t of day.tasks) {
              if (!allTasks.find((x) => x.id === t.id)) allTasks.push(t)
            }
          }
        }
      }

      setTimeBlocks(blocks as TimeBlock[])
      setScheduledTasks(allTasks)
      current = end // stop loop
      void current
    } catch (error) {
      console.error('Failed to load month data:', error)
    } finally {
      setLoading(false)
    }
  }, [yearMonth])

  useEffect(() => {
    refresh()
  }, [refresh])

  const scheduleTask = useCallback(
    async (taskId: number, date: string | null) => {
      await window.api.scheduleTaskForDate(taskId, date)
      await refresh()
    },
    [refresh]
  )

  const createTimeBlock = useCallback(
    async (data: CreateTimeBlockInput): Promise<TimeBlock> => {
      const block = await window.api.createTimeBlock(data)
      await refresh()
      return block
    },
    [refresh]
  )

  const deleteTimeBlock = useCallback(
    async (id: number): Promise<void> => {
      await window.api.deleteTimeBlock(id)
      await refresh()
    },
    [refresh]
  )

  return {
    timeBlocks,
    scheduledTasks,
    loading,
    refresh,
    scheduleTask,
    createTimeBlock,
    deleteTimeBlock
  }
}
