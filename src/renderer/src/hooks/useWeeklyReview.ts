import { useState, useEffect, useCallback } from 'react'
import type {
  ReviewCounterKey,
  ReviewHealthIndicators,
  ReviewStepKey,
  ReviewStepStatus,
  WeeklyReview
} from '@shared/types'

interface UseWeeklyReviewReturn {
  currentReview: WeeklyReview | null
  reviews: WeeklyReview[]
  healthIndicators: ReviewHealthIndicators | null
  loading: boolean
  startReview: () => Promise<WeeklyReview>
  saveNotes: (notes: string) => Promise<void>
  setStep: (key: ReviewStepKey, status: ReviewStepStatus | null) => Promise<void>
  bumpCounter: (key: ReviewCounterKey, taskId?: number) => Promise<void>
  completeReview: (notes?: string) => Promise<void>
  refreshData: () => Promise<void>
}

export function useWeeklyReview(): UseWeeklyReviewReturn {
  const [currentReview, setCurrentReview] = useState<WeeklyReview | null>(null)
  const [reviews, setReviews] = useState<WeeklyReview[]>([])
  const [healthIndicators, setHealthIndicators] = useState<ReviewHealthIndicators | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshData = useCallback(async () => {
    setLoading(true)
    try {
      const [lastReview, allReviews, health] = await Promise.all([
        window.api.getLastWeeklyReview(),
        window.api.listWeeklyReviews(),
        window.api.getReviewHealthIndicators()
      ])
      setCurrentReview(lastReview && !lastReview.completed_at ? lastReview : null)
      setReviews(allReviews)
      setHealthIndicators(health)
    } catch (error) {
      console.error('Failed to load review data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshData()
  }, [refreshData])

  const startReview = useCallback(async (): Promise<WeeklyReview> => {
    const review = await window.api.createWeeklyReview()
    setCurrentReview(review)
    await refreshData()
    return review
  }, [refreshData])

  const reviewId = currentReview?.id

  const saveNotes = useCallback(
    async (notes: string): Promise<void> => {
      if (!reviewId) return
      await window.api.updateWeeklyReviewNotes(reviewId, notes)
      setCurrentReview((review) => (review?.id === reviewId ? { ...review, notes } : review))
    },
    [reviewId]
  )

  const setStep = useCallback(
    async (key: ReviewStepKey, status: ReviewStepStatus | null): Promise<void> => {
      if (!reviewId) return
      setCurrentReview(await window.api.setWeeklyReviewStep(reviewId, key, status))
    },
    [reviewId]
  )

  const bumpCounter = useCallback(
    async (key: ReviewCounterKey, taskId?: number): Promise<void> => {
      if (!reviewId) return
      setCurrentReview(await window.api.bumpWeeklyReviewCounter(reviewId, key, taskId))
    },
    [reviewId]
  )

  const completeReview = useCallback(
    async (notes?: string): Promise<void> => {
      if (!reviewId) return
      await window.api.completeWeeklyReview(reviewId, notes)
      setCurrentReview(null)
      await refreshData()
    },
    [reviewId, refreshData]
  )

  return {
    currentReview,
    reviews,
    healthIndicators,
    loading,
    startReview,
    saveNotes,
    setStep,
    bumpCounter,
    completeReview,
    refreshData
  }
}
