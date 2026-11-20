import type { ReviewHealthIndicators, ReviewStepKey, Task, WeeklyReview } from '@shared/types'
import { calendarDaysSince, parseSqlTime } from '@shared/healthLimits'
import { REVIEW_STEP_KEYS } from '@shared/reviewSteps'
import { addDays } from '@shared/calendarPrefs'
import { calendarRoute } from '@renderer/components/calendar/calendarView'
import { REVIEW_PHASES, REVIEW_STEP_LABELS, type ReviewPhase } from './reviewEntryState'

export type ReviewView = ReviewStepKey | 'finish'

export interface ReviewStepMeta {
  question: string
  open?: { route: string | ((today: string) => string); text: string }
}

export function reviewStepRoute(open: NonNullable<ReviewStepMeta['open']>, today: string): string {
  return typeof open.route === 'function' ? open.route(today) : open.route
}

export const REVIEW_STEP_META: Record<ReviewStepKey, ReviewStepMeta> = {
  collect: {
    question:
      'Papéis, anotações, e-mails marcados, fotos e mensagens que ficaram fora do sistema: tudo para o Inbox, sem decidir nada ainda.',
    open: { route: '/?status=inbox', text: 'Abre Tarefas na aba Inbox' }
  },
  inbox: {
    question:
      'Cada item vira próxima ação, aguardando ou someday, ou sai. O que leva menos de 2 minutos, faça agora. Meta: Inbox zero.',
    open: { route: '/?status=inbox', text: 'Abre Tarefas na aba Inbox' }
  },
  mind: {
    question:
      'O que ainda está ocupando sua cabeça? Passe pelos gatilhos e anote tudo o que aparecer.'
  },
  next: {
    question: 'Ainda fazem sentido? Conclua o que já foi feito e tire o que perdeu o sentido.',
    open: { route: '/?status=proximas', text: 'Abre Tarefas na aba Próximas' }
  },
  past: {
    question:
      'Reuniões, sessões e entregas dos últimos 7 dias. Alguma gerou ação, recado ou pendência?',
    open: {
      route: (today) => calendarRoute('week', addDays(today, -7)),
      text: 'Abre o Calendário na semana passada'
    }
  },
  upcoming: {
    question: 'Prazos e compromissos que vêm aí. Algum pede preparação? Anote a ação agora.',
    open: {
      route: (today) => calendarRoute('agenda', today),
      text: 'Abre o Calendário nas próximas duas semanas'
    }
  },
  waiting: {
    question: 'Alguém respondeu? O que está parado há mais de 7 dias precisa de cobrança.',
    open: { route: '/?status=aguardando', text: 'Abre Tarefas na aba Aguardando' }
  },
  projects: {
    question: 'Todo projeto ativo tem uma próxima ação? Algum terminou ou deve ir para someday?',
    open: { route: '/projects', text: 'Abre Projetos' }
  },
  someday: {
    question: 'Algo está pronto para virar ação? Algo já não interessa e pode sair?',
    open: { route: '/?status=someday', text: 'Abre Tarefas na aba Someday' }
  },
  creative: {
    question:
      'Ideias, projetos novos, mudanças nas suas áreas e metas. Anote sem filtro; cada linha vai para o Inbox.',
    open: { route: '/horizons', text: 'Abre Horizontes' }
  }
}

export const COLLECT_PLACES = [
  'Mesa e bolsos',
  'Caixa de e-mail',
  'Mensagens',
  'Fotos e prints',
  'Anotações em papel',
  'Downloads',
  'Navegador'
]

export const MIND_TRIGGERS = [
  'Promessas a outras pessoas',
  'Projetos começados e parados',
  'Mensagens a responder',
  'Contas e finanças',
  'Saúde e consultas',
  'Casa e manutenção',
  'Time e liderados',
  'Estudos e leituras',
  'Eventos e viagens',
  'Família e amigos'
]

export const UPCOMING_DAYS = 14

export function reviewView(review: WeeklyReview, atFinish: boolean): ReviewView {
  return atFinish || !review.current_step ? 'finish' : review.current_step
}

export function phaseOf(key: ReviewStepKey): ReviewPhase {
  return REVIEW_PHASES.find((phase) => phase.steps.includes(key))!
}

export function stepNumber(key: ReviewStepKey): number {
  return REVIEW_STEP_KEYS.indexOf(key) + 1
}

export function previousStep(key: ReviewStepKey): ReviewStepKey | null {
  const index = REVIEW_STEP_KEYS.indexOf(key)
  return index > 0 ? REVIEW_STEP_KEYS[index - 1] : null
}

export function markedCount(review: WeeklyReview): number {
  return REVIEW_STEP_KEYS.filter((key) => review.steps[key]).length
}

export function unmarkedSteps(review: WeeklyReview): ReviewStepKey[] {
  return REVIEW_STEP_KEYS.filter((key) => review.steps[key] !== 'done')
}

export function elapsedMinutes(review: WeeklyReview, now: Date): number {
  return Math.max(
    1,
    Math.round((now.getTime() - parseSqlTime(review.started_at).getTime()) / 60_000)
  )
}

export function staleDays(
  task: Pick<Task, 'status_changed_at' | 'updated_at'>,
  now: Date
): number | null {
  const changed = task.status_changed_at ?? task.updated_at
  return changed ? calendarDaysSince(changed, now) : null
}

export function ideaLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export function chaseText(task: Pick<Task, 'name' | 'waiting_for'>): string {
  return `Cobrar ${task.waiting_for?.trim() || 'resposta'}: ${task.name}`
}

export interface SystemRow {
  key: 'inboxCount' | 'projectsWithoutNextAction' | 'staleWaitingTasks' | 'staleNextTasks'
  label: string
  start: number | null
  now: number
}

const SYSTEM_ROWS: Omit<SystemRow, 'start' | 'now'>[] = [
  { key: 'inboxCount', label: 'Inbox' },
  { key: 'projectsWithoutNextAction', label: 'Projetos sem próxima ação' },
  { key: 'staleWaitingTasks', label: 'Aguardando > 7 dias' },
  { key: 'staleNextTasks', label: 'Próximas > 14 dias' }
]

export function systemRows(
  start: ReviewHealthIndicators | null,
  now: ReviewHealthIndicators
): SystemRow[] {
  return SYSTEM_ROWS.map((row) => ({
    ...row,
    start: start ? start[row.key] : null,
    now: now[row.key]
  }))
}

export function summaryRows(
  review: WeeklyReview,
  now: ReviewHealthIndicators
): { label: string; value: string }[] {
  const start = review.start_health?.inboxCount
  return [
    { label: 'Inbox', value: `${start ?? '—'} → ${now.inboxCount}` },
    { label: 'Coletados', value: String(review.counters.collected) },
    { label: 'Itens processados', value: String(review.counters.processed) },
    { label: 'Projetos com próxima ação nova', value: String(review.counters.nextSet) },
    { label: 'Cobranças criadas', value: String(review.counters.chased) },
    { label: 'Tarefas tiradas das listas', value: String(review.counters.cleaned) }
  ]
}

export function unmarkedText(steps: readonly ReviewStepKey[]): string {
  const n = steps.length
  return `${n} passo${n > 1 ? 's' : ''} sem marcar: ${steps
    .map((key) => REVIEW_STEP_LABELS[key].toLowerCase())
    .join(', ')}.`
}

export function shortDuration(seconds: number): string {
  const minutes = Math.max(0, Math.round(seconds / 60))
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h ${m}min` : `${h}h`
}
