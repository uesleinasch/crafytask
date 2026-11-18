import type { WeeklyReview } from '@shared/types'

export type NavKey =
  | 'tasks'
  | 'today'
  | 'calendar'
  | 'review'
  | 'projects'
  | 'horizons'
  | 'labels'
  | 'notebooks'
  | 'dashboard'
  | 'archived'
  | 'settings'

export interface NavRoute {
  key: NavKey
  label: string
  route: string
}

export interface NavGroup {
  label: string
  items: NavRoute[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Fluxo',
    items: [
      { key: 'tasks', label: 'Tarefas', route: '/' },
      { key: 'today', label: 'Hoje', route: '/today' },
      { key: 'calendar', label: 'Calendário', route: '/calendar' },
      { key: 'review', label: 'Revisão semanal', route: '/review' }
    ]
  },
  {
    label: 'Organizar',
    items: [
      { key: 'projects', label: 'Projetos', route: '/projects' },
      { key: 'horizons', label: 'Horizontes', route: '/horizons' },
      { key: 'labels', label: 'Contextos e tags', route: '/contexts' }
    ]
  },
  {
    label: 'Conhecimento',
    items: [
      { key: 'notebooks', label: 'Cadernos', route: '/notebooks' },
      { key: 'dashboard', label: 'Dashboard', route: '/dashboard' }
    ]
  }
]

export const NAV_FOOTER: NavRoute[] = [
  { key: 'archived', label: 'Arquivo', route: '/archived' },
  { key: 'settings', label: 'Configurações', route: '/settings' }
]

const ALL_ROUTES = [...NAV_GROUPS.flatMap((group) => group.items), ...NAV_FOOTER]

export function navKeyFor(pathname: string): NavKey | null {
  if (pathname === '/' || pathname.startsWith('/task/')) return 'tasks'
  if (pathname.startsWith('/project/')) return 'projects'
  if (pathname === '/tags') return 'labels'
  return ALL_ROUTES.find((item) => item.route === pathname)?.key ?? null
}

export function screenTitle(pathname: string): string {
  if (pathname.startsWith('/task/')) return 'Tarefa'
  if (pathname.startsWith('/project/')) return 'Projeto'
  if (pathname === '/tags') return 'Tags'
  if (pathname === '/contexts') return 'Contextos'
  const key = navKeyFor(pathname)
  return ALL_ROUTES.find((item) => item.key === key)?.label ?? 'CrafyTask'
}

export const REVIEW_INTERVAL_DAYS = 7

export function isWeeklyReviewOverdue(reviews: readonly WeeklyReview[], now: Date): boolean {
  const limit = now.getTime() - REVIEW_INTERVAL_DAYS * 24 * 60 * 60 * 1000
  return !reviews.some((review) => review.completed_at && sqliteTime(review.completed_at) >= limit)
}

function sqliteTime(value: string): number {
  return new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`).getTime()
}
