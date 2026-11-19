import type { ReviewStepKey, WeeklyReview } from '@shared/types'
import { HEALTH_LIMITS, parseSqlTime } from '@shared/healthLimits'
import { localDateString } from '@shared/dueState'
import { addDays, weekStartOf, type WeekStart } from '@shared/calendarPrefs'
import { REVIEW_STEP_KEYS, reviewStepsWith } from '@shared/reviewSteps'

export interface ReviewPhase {
  key: 'clear' | 'current' | 'creative'
  label: string
  sub: string
  steps: ReviewStepKey[]
}

export const REVIEW_PHASES: readonly ReviewPhase[] = [
  {
    key: 'clear',
    label: 'Clarear',
    sub: 'Tirar tudo da cabeça e zerar o Inbox',
    steps: ['collect', 'inbox', 'mind']
  },
  {
    key: 'current',
    label: 'Atualizar',
    sub: 'Pôr as listas em dia',
    steps: ['next', 'past', 'upcoming', 'waiting', 'projects']
  },
  { key: 'creative', label: 'Criar', sub: 'Olhar adiante', steps: ['someday', 'creative'] }
]

export const REVIEW_STEP_LABELS: Record<ReviewStepKey, string> = {
  collect: 'Coletar itens soltos',
  inbox: 'Processar o Inbox',
  mind: 'Esvaziar a cabeça',
  next: 'Revisar próximas ações',
  past: 'Olhar a semana que passou',
  upcoming: 'Olhar as próximas duas semanas',
  waiting: 'Revisar aguardando',
  projects: 'Revisar projetos',
  someday: 'Revisar someday',
  creative: 'Pensar adiante'
}

export const RHYTHM_WEEKS = 12

export function reviewStartedAt(review: WeeklyReview): Date {
  return parseSqlTime(review.started_at)
}

export function reviewMinutes(review: WeeklyReview): number | null {
  if (!review.completed_at) return null
  const ms = parseSqlTime(review.completed_at).getTime() - reviewStartedAt(review).getTime()
  return Math.max(1, Math.round(ms / 60_000))
}

export interface ReviewWeek {
  start: string
  review?: WeeklyReview
}

export function reviewWeeks(
  reviews: readonly WeeklyReview[],
  now: Date,
  weekStart: WeekStart,
  count = RHYTHM_WEEKS
): ReviewWeek[] {
  const current = weekStartOf(now, weekStart)
  return Array.from({ length: count }, (_, i) => {
    const start = addDays(current, -7 * (count - 1 - i))
    const end = addDays(start, 7)
    const review = reviews.find((r) => {
      if (!r.completed_at) return false
      const day = localDateString(reviewStartedAt(r))
      return day >= start && day < end
    })
    return review ? { start, review } : { start }
  })
}

export function averageMinutes(reviews: readonly WeeklyReview[], sample = 8): number | null {
  const minutes = reviews
    .map(reviewMinutes)
    .filter((m): m is number => m !== null)
    .slice(0, sample)
  if (minutes.length === 0) return null
  return Math.round(minutes.reduce((sum, m) => sum + m, 0) / minutes.length)
}

export function lastReviewHeadline(days: number | null): { title: string; detail: string } {
  const pace = 'Leva uns 45 minutos e dá para pausar no meio.'
  if (days === null) return { title: 'Nenhuma revisão ainda', detail: pace }
  if (days > HEALTH_LIMITS.reviewDays) {
    return {
      title: `A última foi há ${days} dias`,
      detail: `Passou de uma semana: as listas começam a ficar velhas e a confiança no sistema cai. ${pace}`
    }
  }
  const when = days === 0 ? 'hoje' : `há ${days} dia${days === 1 ? '' : 's'}`
  return { title: `Em dia: a última foi ${when}`, detail: pace }
}

export interface ReviewStepCount {
  done: number
  total: number
  skipped: ReviewStepKey[]
}

export function reviewStepCount(review: WeeklyReview): ReviewStepCount {
  return {
    done: reviewStepsWith(review.steps, 'done').length,
    total: review.step_total,
    skipped: reviewStepsWith(review.steps, 'skipped')
  }
}

export function openReviewSummary(review: WeeklyReview): string {
  const marked = REVIEW_STEP_KEYS.filter((key) => review.steps[key]).length
  const next = review.current_step
    ? REVIEW_STEP_LABELS[review.current_step].toLowerCase()
    : 'fechar a revisão'
  return `${marked} de ${review.step_total} passos · próximo: ${next}`
}

export function skippedText(count: ReviewStepCount): string {
  if (count.skipped.length === 0) return 'Todos os passos feitos'
  return `Pulados: ${count.skipped.map((key) => REVIEW_STEP_LABELS[key]).join(', ')}`
}
