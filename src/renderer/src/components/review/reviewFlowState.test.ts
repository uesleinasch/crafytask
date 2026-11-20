import { describe, expect, it } from 'vitest'
import type { ReviewHealthIndicators, WeeklyReview } from '@shared/types'
import { emptyReviewCounters, REVIEW_STEP_KEYS } from '@shared/reviewSteps'
import {
  REVIEW_STEP_META,
  reviewStepRoute,
  chaseText,
  elapsedMinutes,
  ideaLines,
  markedCount,
  phaseOf,
  previousStep,
  reviewView,
  shortDuration,
  staleDays,
  stepNumber,
  summaryRows,
  systemRows,
  unmarkedSteps,
  unmarkedText
} from './reviewFlowState'

const NOW = new Date(2026, 10, 19, 15, 0, 0)
const utc = (d: Date): string => d.toISOString().slice(0, 19).replace('T', ' ')

const health = (inbox: number): ReviewHealthIndicators => ({
  inboxCount: inbox,
  oldestInboxDays: null,
  projectsWithoutNextAction: 2,
  stalledProjects: 0,
  staleWaitingTasks: 1,
  staleNextTasks: 0,
  overdueTasks: 0,
  somedayCount: 0,
  daysSinceLastReview: null
})

function review(patch: Partial<WeeklyReview> = {}): WeeklyReview {
  return {
    id: 1,
    started_at: utc(new Date(2026, 10, 19, 14, 20, 0)),
    inbox_cleared: false,
    steps: {},
    current_step: 'collect',
    step_total: 10,
    counters: emptyReviewCounters(),
    captured: [],
    start_health: health(5),
    ...patch
  }
}

describe('navegação entre passos', () => {
  it('mostra o passo atual ou o fechamento', () => {
    expect(reviewView(review(), false)).toBe('collect')
    expect(reviewView(review(), true)).toBe('finish')
    expect(reviewView(review({ current_step: null }), false)).toBe('finish')
  })

  it('numera, acha a fase e o passo anterior', () => {
    expect(stepNumber('collect')).toBe(1)
    expect(stepNumber('creative')).toBe(10)
    expect(phaseOf('past').label).toBe('Atualizar')
    expect(previousStep('collect')).toBeNull()
    expect(previousStep('inbox')).toBe('collect')
  })

  it('tem pergunta para todo passo e só Esvaziar a cabeça fica sem tela', () => {
    expect(REVIEW_STEP_KEYS.every((key) => REVIEW_STEP_META[key].question)).toBe(true)
    expect(REVIEW_STEP_KEYS.filter((key) => !REVIEW_STEP_META[key].open)).toEqual(['mind'])
  })
})

describe('progresso e fechamento', () => {
  it('conta marcados e lista o que não foi feito', () => {
    const r = review({ steps: { collect: 'done', inbox: 'skipped' } })
    expect(markedCount(r)).toBe(2)
    expect(unmarkedSteps(r)).toHaveLength(9)
    expect(unmarkedSteps(r)[0]).toBe('inbox')
    expect(unmarkedText(['inbox', 'mind'])).toBe(
      '2 passos sem marcar: processar o inbox, esvaziar a cabeça.'
    )
    expect(unmarkedText(['mind'])).toBe('1 passo sem marcar: esvaziar a cabeça.')
  })

  it('mede há quanto tempo começou', () => {
    expect(elapsedMinutes(review(), NOW)).toBe(40)
  })

  it('resume a sessão com o Inbox do começo e de agora', () => {
    const r = review({ counters: { ...emptyReviewCounters(), collected: 3, processed: 4 } })
    const rows = summaryRows(r, health(1))
    expect(rows[0]).toEqual({ label: 'Inbox', value: '5 → 1' })
    expect(rows[1].value).toBe('3')
    expect(rows[2].value).toBe('4')
    expect(summaryRows(review({ start_health: null }), health(0))[0].value).toBe('— → 0')
  })

  it('compara os indicadores do começo com os de agora', () => {
    const rows = systemRows(health(5), health(2))
    expect(rows.map((row) => [row.label, row.start, row.now])).toEqual([
      ['Inbox', 5, 2],
      ['Projetos sem próxima ação', 2, 2],
      ['Aguardando > 7 dias', 1, 1],
      ['Próximas > 14 dias', 0, 0]
    ])
    expect(systemRows(null, health(2))[0].start).toBeNull()
  })
})

describe('ações dos passos', () => {
  it('conta dias desde a mudança de status', () => {
    expect(
      staleDays(
        { status_changed_at: '2026-11-09 12:00:00', updated_at: '2026-11-01 12:00:00' },
        NOW
      )
    ).toBe(10)
    expect(staleDays({ status_changed_at: null, updated_at: '2026-11-18 12:00:00' }, NOW)).toBe(1)
  })

  it('separa as ideias por linha e monta a cobrança', () => {
    expect(ideaLines(' a \n\n b\n')).toEqual(['a', 'b'])
    expect(chaseText({ name: 'Contrato', waiting_for: 'Ana' })).toBe('Cobrar Ana: Contrato')
    expect(chaseText({ name: 'Contrato', waiting_for: null })).toBe('Cobrar resposta: Contrato')
  })
})

describe('shortDuration', () => {
  it('mostra minutos e horas', () => {
    expect(shortDuration(900)).toBe('15 min')
    expect(shortDuration(9130)).toBe('2h 32min')
    expect(shortDuration(7200)).toBe('2h')
  })
})

describe('reviewStepRoute', () => {
  const route = (key: 'past' | 'upcoming' | 'inbox'): string =>
    reviewStepRoute(REVIEW_STEP_META[key].open!, '2026-11-20')

  it('abre o calendário na semana passada e na agenda de hoje', () => {
    expect(route('past')).toBe('/calendar?visao=semana&semana=2026-11-13')
    expect(route('upcoming')).toBe('/calendar?visao=agenda&semana=2026-11-20')
  })

  it('mantém as rotas fixas', () => {
    expect(route('inbox')).toBe('/?status=inbox')
  })
})
