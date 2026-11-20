import { describe, expect, it } from 'vitest'
import type { ReviewHealthIndicators } from '@shared/types'
import {
  DASHBOARD_HEALTH,
  HEALTH_TARGETS,
  REVIEW_HEALTH,
  healthItem,
  healthItems
} from './healthItems'
import { listIntentFromSearch } from '@renderer/components/tasks/taskFilterState'

const CLEAN: ReviewHealthIndicators = {
  inboxCount: 0,
  oldestInboxDays: null,
  projectsWithoutNextAction: 0,
  stalledProjects: 0,
  staleWaitingTasks: 0,
  staleNextTasks: 0,
  overdueTasks: 0,
  somedayCount: 0,
  daysSinceLastReview: 2,
  inboxProcessedWeek: 0,
  inboxProcessedRate: null
}

describe('healthItems', () => {
  it('dashboard e revisão mostram seis indicadores cada, do mesmo conjunto', () => {
    expect(DASHBOARD_HEALTH).toHaveLength(6)
    expect(REVIEW_HEALTH).toHaveLength(6)
    expect(DASHBOARD_HEALTH).not.toContain('next')
    expect(DASHBOARD_HEALTH).not.toContain('someday')
    expect(REVIEW_HEALTH).not.toContain('stalled')
    expect(REVIEW_HEALTH).not.toContain('review')
  })

  it('sistema em dia: tudo em tom ok com o texto de em dia, someday neutro', () => {
    const items = healthItems(CLEAN, [...DASHBOARD_HEALTH, 'next', 'someday'])
    expect(items.filter((i) => i.key !== 'someday').every((i) => i.tone === 'ok')).toBe(true)
    expect(healthItem(CLEAN, 'inbox').text).toBe('Inbox zero')
    expect(healthItem(CLEAN, 'someday').tone).toBe('neutral')
    expect(healthItem(CLEAN, 'review')).toMatchObject({ valueText: 'há 2 dias', tone: 'ok' })
    expect(healthItem(CLEAN, 'review').text).toBe('A próxima em até 5 dias')
  })

  it('atenção nos atrasos e erro só para prazo vencido', () => {
    const h = { ...CLEAN, inboxCount: 3, oldestInboxDays: 1, staleWaitingTasks: 2, overdueTasks: 1 }
    expect(healthItem(h, 'inbox')).toMatchObject({
      tone: 'warning',
      valueText: '3',
      text: 'O item mais antigo chegou há 1 dia'
    })
    expect(healthItem(h, 'waiting').tone).toBe('warning')
    expect(healthItem(h, 'overdue').tone).toBe('error')
  })

  it('o Inbox mostra a taxa processada na semana quando há histórico', () => {
    const h = { ...CLEAN, inboxCount: 2, oldestInboxDays: 4, inboxProcessedRate: 82 }
    expect(healthItem(h, 'inbox').text).toBe(
      'O item mais antigo chegou há 4 dias · 82% processado nesta semana'
    )
    expect(healthItem({ ...h, inboxCount: 0, oldestInboxDays: null }, 'inbox').text).toBe(
      'Inbox zero'
    )
  })

  it('revisão atrasada ou nunca feita pede atenção', () => {
    expect(healthItem({ ...CLEAN, daysSinceLastReview: 8 }, 'review')).toMatchObject({
      tone: 'warning',
      valueText: 'há 8 dias'
    })
    expect(healthItem({ ...CLEAN, daysSinceLastReview: null }, 'review')).toMatchObject({
      tone: 'warning',
      valueText: '—'
    })
    expect(healthItem({ ...CLEAN, daysSinceLastReview: 0 }, 'review').valueText).toBe('hoje')
  })
})

describe('destinos dos indicadores', () => {
  it('as rotas da lista de tarefas abrem o recorte que o indicador conta', () => {
    const search = (route: string): string => route.slice(route.indexOf('?'))
    expect(listIntentFromSearch(search(HEALTH_TARGETS.waiting.route))).toMatchObject({
      status: 'aguardando',
      filters: { staleDays: 7, sort: 'status_changed' }
    })
    expect(listIntentFromSearch(search(HEALTH_TARGETS.next.route))?.filters.staleDays).toBe(14)
    expect(listIntentFromSearch(search(HEALTH_TARGETS.overdue.route))?.filters.overdue).toBe(true)
    expect(listIntentFromSearch(search(HEALTH_TARGETS.inbox.route))?.status).toBe('inbox')
  })
})
