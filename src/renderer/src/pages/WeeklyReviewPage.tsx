import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { App, Flex, Spin } from 'antd'
import { useErrorBoundary } from 'react-error-boundary'
import { useWeeklyReview } from '@renderer/hooks/useWeeklyReview'
import { PageContainer } from '@renderer/components/shell/PageContainer'
import { ReviewEntry } from '@renderer/components/review/ReviewEntry'
import { ReviewFlow } from '@renderer/components/review/ReviewFlow'

const ACTIVE_KEY = 'ticktask:review-active'

function readActive(): number | null {
  try {
    const value = Number(sessionStorage.getItem(ACTIVE_KEY))
    return Number.isInteger(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

function writeActive(id: number | null): void {
  try {
    if (id === null) sessionStorage.removeItem(ACTIVE_KEY)
    else sessionStorage.setItem(ACTIVE_KEY, String(id))
  } catch {
    return
  }
}

export function WeeklyReviewPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const { showBoundary } = useErrorBoundary()
  const {
    currentReview,
    reviews,
    healthIndicators,
    loading,
    startReview,
    saveNotes,
    setStep,
    goToStep,
    bumpCounter,
    discardReview,
    completeReview,
    refreshHealth
  } = useWeeklyReview()
  const [activeId, setActiveIdState] = useState<number | null>(readActive)

  const setActiveId = useCallback((id: number | null): void => {
    writeActive(id)
    setActiveIdState(id)
  }, [])

  const handleStart = useCallback(async (): Promise<void> => {
    const review = await startReview()
    setActiveId(review.id)
    message.success('Revisão semanal iniciada')
  }, [startReview, setActiveId, message])

  const handleDiscard = useCallback(async (): Promise<void> => {
    await discardReview()
    setActiveId(null)
    message.success('Revisão descartada')
  }, [discardReview, setActiveId, message])

  const handleComplete = useCallback(
    async (notes: string): Promise<void> => {
      await completeReview(notes)
      setActiveId(null)
    },
    [completeReview, setActiveId]
  )

  if (loading && !currentReview) {
    return (
      <Flex justify="center" align="center" className="h-full">
        <Spin />
      </Flex>
    )
  }

  const active = currentReview !== null && activeId === currentReview.id

  return (
    <div className="h-full overflow-y-auto">
      <PageContainer>
        {active && currentReview ? (
          <ReviewFlow
            review={currentReview}
            health={healthIndicators}
            onSetStep={setStep}
            onGoToStep={goToStep}
            onBump={bumpCounter}
            onSaveNotes={saveNotes}
            onRefreshHealth={refreshHealth}
            onPause={() => setActiveId(null)}
            onComplete={handleComplete}
          />
        ) : (
          <ReviewEntry
            openReview={currentReview}
            reviews={reviews}
            health={healthIndicators}
            onStart={() => void handleStart().catch(showBoundary)}
            onResume={() => currentReview && setActiveId(currentReview.id)}
            onDiscard={() => handleDiscard().catch(showBoundary)}
            onOpenHealth={(route) => void navigate(route)}
          />
        )}
      </PageContainer>
    </div>
  )
}
