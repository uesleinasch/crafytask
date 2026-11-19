import type {
  ReviewCounterKey,
  ReviewCounters,
  ReviewStepKey,
  ReviewStepStatus,
  ReviewSteps
} from './types'

export const REVIEW_STEP_KEYS: readonly ReviewStepKey[] = [
  'collect',
  'inbox',
  'mind',
  'next',
  'past',
  'upcoming',
  'waiting',
  'projects',
  'someday',
  'creative'
]

export const REVIEW_COUNTER_KEYS: readonly ReviewCounterKey[] = [
  'collected',
  'processed',
  'nextSet',
  'chased',
  'cleaned'
]

export const LEGACY_STEP_TOTAL = 8

export function isReviewStepKey(value: unknown): value is ReviewStepKey {
  return REVIEW_STEP_KEYS.includes(value as ReviewStepKey)
}

export function isReviewStepStatus(value: unknown): value is ReviewStepStatus {
  return value === 'done' || value === 'skipped'
}

export function isReviewCounterKey(value: unknown): value is ReviewCounterKey {
  return REVIEW_COUNTER_KEYS.includes(value as ReviewCounterKey)
}

export function emptyReviewCounters(): ReviewCounters {
  return { collected: 0, processed: 0, nextSet: 0, chased: 0, cleaned: 0 }
}

export function nextPendingStep(steps: ReviewSteps): ReviewStepKey | null {
  return REVIEW_STEP_KEYS.find((key) => !steps[key]) ?? null
}

export function reviewStepsWith(steps: ReviewSteps, status: ReviewStepStatus): ReviewStepKey[] {
  return REVIEW_STEP_KEYS.filter((key) => steps[key] === status)
}
