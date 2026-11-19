import type { ReviewHealthIndicators } from '@shared/types'
import { HEALTH_LIMITS, isReviewOverdue } from '@shared/healthLimits'

export type HealthKey =
  | 'inbox'
  | 'nonext'
  | 'stalled'
  | 'waiting'
  | 'next'
  | 'overdue'
  | 'someday'
  | 'review'

export type HealthTone = 'ok' | 'warning' | 'error' | 'neutral'

export interface HealthItem {
  key: HealthKey
  title: string
  value: number | null
  valueText: string
  tone: HealthTone
  text: string
}

export const DASHBOARD_HEALTH: readonly HealthKey[] = [
  'inbox',
  'nonext',
  'stalled',
  'waiting',
  'overdue',
  'review'
]

export const REVIEW_HEALTH: readonly HealthKey[] = [
  'inbox',
  'nonext',
  'waiting',
  'next',
  'overdue',
  'someday'
]

const days = (n: number): string => (n === 1 ? '1 dia' : `${n} dias`)

function inboxText(h: ReviewHealthIndicators): string {
  if (h.oldestInboxDays === null) return 'Inbox zero'
  return h.oldestInboxDays === 0
    ? 'O item mais antigo chegou hoje'
    : `O item mais antigo chegou há ${days(h.oldestInboxDays)}`
}

function reviewItem(h: ReviewHealthIndicators): HealthItem {
  const since = h.daysSinceLastReview
  const base = { key: 'review' as const, title: 'Revisão semanal', value: since }
  if (since === null) {
    return {
      ...base,
      valueText: '—',
      tone: 'warning',
      text: 'Nenhuma revisão ainda: leva uns 45 minutos'
    }
  }
  const valueText = since === 0 ? 'hoje' : `há ${days(since)}`
  if (isReviewOverdue(since)) {
    return {
      ...base,
      valueText,
      tone: 'warning',
      text: 'Passou de uma semana: as listas começam a ficar velhas'
    }
  }
  const left = HEALTH_LIMITS.reviewDays - since
  return {
    ...base,
    valueText,
    tone: 'ok',
    text: left === 0 ? 'A próxima é hoje' : `A próxima em até ${days(left)}`
  }
}

function countItem(
  key: HealthKey,
  title: string,
  value: number,
  text: string,
  okText: string,
  alertTone: HealthTone = 'warning'
): HealthItem {
  return {
    key,
    title,
    value,
    valueText: String(value),
    tone: value > 0 ? alertTone : 'ok',
    text: value > 0 ? text : okText
  }
}

export function healthItem(h: ReviewHealthIndicators, key: HealthKey): HealthItem {
  switch (key) {
    case 'inbox':
      return countItem(key, 'Inbox para processar', h.inboxCount, inboxText(h), 'Inbox zero')
    case 'nonext':
      return countItem(
        key,
        'Projetos sem próxima ação',
        h.projectsWithoutNextAction,
        'Ativos, com tarefas abertas e nenhuma em Próximas',
        'Todo projeto ativo tem um próximo passo'
      )
    case 'stalled':
      return countItem(
        key,
        'Projetos parados',
        h.stalledProjects,
        `Sem sessão nem tarefa concluída há mais de ${days(HEALTH_LIMITS.stalledProjectDays)}`,
        'Todos tiveram atividade na semana'
      )
    case 'waiting':
      return countItem(
        key,
        'Aguardando sem resposta',
        h.staleWaitingTasks,
        `Há mais de ${days(HEALTH_LIMITS.waitingDays)} em Aguardando: hora de cobrar`,
        `Nada esperando há mais de ${days(HEALTH_LIMITS.waitingDays)}`
      )
    case 'next':
      return countItem(
        key,
        'Próximas paradas',
        h.staleNextTasks,
        `Há mais de ${days(HEALTH_LIMITS.nextDays)} sem mudar`,
        'Nenhuma próxima ação parada'
      )
    case 'overdue':
      return countItem(
        key,
        'Prazos vencidos',
        h.overdueTasks,
        'Tarefas abertas com prazo antes de hoje',
        'Nenhum prazo vencido',
        'error'
      )
    case 'someday':
      return {
        key,
        title: 'Someday',
        value: h.somedayCount,
        valueText: String(h.somedayCount),
        tone: 'neutral',
        text: 'Ideias guardadas para depois'
      }
    case 'review':
      return reviewItem(h)
  }
}

export function healthItems(h: ReviewHealthIndicators, keys: readonly HealthKey[]): HealthItem[] {
  return keys.map((key) => healthItem(h, key))
}
