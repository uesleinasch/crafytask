import { useCallback, useEffect, useState } from 'react'
import { localDateString } from '@shared/dueState'
import { isWeeklyReviewOverdue } from './navigation'

export interface NavCounts {
  inbox: number
  today: number
  activeProjects: number
  reviewOverdue: boolean
}

const EMPTY: NavCounts = { inbox: 0, today: 0, activeProjects: 0, reviewOverdue: false }

export function useNavCounts(pathname: string): NavCounts {
  const [counts, setCounts] = useState<NavCounts>(EMPTY)

  const load = useCallback(async (): Promise<void> => {
    try {
      const now = new Date()
      const [inbox, todayTasks, projects, reviews] = await Promise.all([
        window.api.countTasks({ status: 'inbox' }),
        window.api.getTasksForDate(localDateString(now)),
        window.api.listProjects('active'),
        window.api.listWeeklyReviews()
      ])
      setCounts({
        inbox,
        today: todayTasks.filter((task) => task.status !== 'finalizada').length,
        activeProjects: projects.length,
        reviewOverdue: isWeeklyReviewOverdue(reviews, now)
      })
    } catch (error) {
      console.error('Falha ao carregar os contadores da navegação:', error)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, pathname])

  useEffect(() => window.api.onTasksRefresh(() => void load()), [load])

  return counts
}
