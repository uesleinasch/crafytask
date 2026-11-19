import { describe, expect, it } from 'vitest'
import type { WeeklyReview } from '@shared/types'
import { emptyReviewCounters, REVIEW_STEP_KEYS } from '@shared/reviewSteps'
import {
  REVIEW_PHASES,
  averageMinutes,
  lastReviewHeadline,
  openReviewSummary,
  reviewMinutes,
  reviewStepCount,
  reviewWeeks,
  skippedText
} from './reviewEntryState'

const utc = (d: Date): string => d.toISOString().slice(0, 19).replace('T', ' ')

function review(
  start: Date,
  minutes: number | null,
  patch: Partial<WeeklyReview> = {}
): WeeklyReview {
  return {
    id: start.getTime(),
    started_at: utc(start),
    completed_at: minutes === null ? undefined : utc(new Date(start.getTime() + minutes * 60_000)),
    inbox_cleared: false,
    steps: {},
    current_step: null,
    step_total: 10,
    counters: emptyReviewCounters(),
    captured: [],
    start_health: null,
    ...patch
  }
}

const NOW = new Date(2026, 10, 19, 15, 0, 0)

describe('REVIEW_PHASES', () => {
  it('cobre os dez passos na ordem do fluxo', () => {
    expect(REVIEW_PHASES.flatMap((p) => p.steps)).toEqual(REVIEW_STEP_KEYS)
  })
})

describe('reviewMinutes e averageMinutes', () => {
  it('mede a duração das concluídas e faz a média das últimas', () => {
    const a = review(new Date(2026, 10, 16, 9, 0), 48)
    const b = review(new Date(2026, 10, 9, 9, 0), 62)
    expect(reviewMinutes(a)).toBe(48)
    expect(reviewMinutes(review(NOW, null))).toBeNull()
    expect(averageMinutes([a, b])).toBe(55)
    expect(averageMinutes([])).toBeNull()
  })

  it('lê completed_at antigo em ISO', () => {
    const r = review(new Date(2026, 10, 16, 9, 0), null, {
      completed_at: new Date(2026, 10, 16, 9, 30).toISOString()
    })
    expect(reviewMinutes(r)).toBe(30)
  })
})

describe('reviewWeeks', () => {
  it('marca as semanas com revisão concluída, começando na segunda', () => {
    const weeks = reviewWeeks(
      [
        review(new Date(2026, 10, 16, 9, 0), 40),
        review(new Date(2026, 10, 1, 9, 0), 40),
        review(new Date(2026, 10, 18, 9, 0), null)
      ],
      NOW,
      'monday'
    )
    expect(weeks).toHaveLength(12)
    expect(weeks[11].start).toBe('2026-11-16')
    expect(weeks[0].start).toBe('2026-08-31')
    expect(weeks.filter((w) => w.review).map((w) => w.start)).toEqual(['2026-10-26', '2026-11-16'])
  })
})

describe('lastReviewHeadline', () => {
  it('diz se está em dia ou atrasada, sem cobrança antes dos 7 dias', () => {
    expect(lastReviewHeadline(null).title).toBe('Nenhuma revisão ainda')
    expect(lastReviewHeadline(0).title).toBe('Em dia: a última foi hoje')
    expect(lastReviewHeadline(1).title).toBe('Em dia: a última foi há 1 dia')
    expect(lastReviewHeadline(7).detail).not.toMatch('Passou')
    expect(lastReviewHeadline(9)).toEqual({
      title: 'A última foi há 9 dias',
      detail: expect.stringMatching(/^Passou de uma semana/)
    })
  })
})

describe('passos', () => {
  it('conta feitos e pulados sobre o total da revisão', () => {
    const r = review(NOW, 30, {
      step_total: 8,
      steps: { collect: 'done', inbox: 'done', waiting: 'skipped' }
    })
    const count = reviewStepCount(r)
    expect(count).toEqual({ done: 2, total: 8, skipped: ['waiting'] })
    expect(skippedText(count)).toBe('Pulados: Revisar aguardando')
    expect(skippedText({ done: 10, total: 10, skipped: [] })).toBe('Todos os passos feitos')
  })

  it('resume a revisão em andamento com o próximo passo', () => {
    const r = review(NOW, null, {
      steps: { collect: 'done', inbox: 'skipped' },
      current_step: 'mind'
    })
    expect(openReviewSummary(r)).toBe('2 de 10 passos · próximo: esvaziar a cabeça')
    expect(openReviewSummary({ ...r, current_step: null })).toMatch('fechar a revisão')
  })
})
