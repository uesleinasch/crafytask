export const APP_SCREENS = {
  tasks: '/',
  today: '/today',
  calendar: '/calendar',
  review: '/review',
  projects: '/projects',
  horizons: '/horizons',
  labels: '/contexts',
  notebooks: '/notebooks',
  dashboard: '/dashboard',
  archived: '/archived',
  settings: '/settings'
} as const

export type AppScreen = keyof typeof APP_SCREENS
export const APP_SCREEN_KEYS = Object.keys(APP_SCREENS) as [AppScreen, ...AppScreen[]]

export type AppTarget = 'task' | 'project' | 'page' | 'screen'

export type AppRouteResult = { ok: true; route: string } | { ok: false; message: string }

export function appRoute(input: {
  target: AppTarget
  id?: number
  screen?: string
}): AppRouteResult {
  if (input.target === 'screen') {
    const route = APP_SCREENS[input.screen as AppScreen]
    if (!input.screen || route === undefined || !Object.hasOwn(APP_SCREENS, input.screen)) {
      return {
        ok: false,
        message: `target=screen exige screen, um de: ${APP_SCREEN_KEYS.join(', ')}.`
      }
    }
    return { ok: true, route }
  }

  if (!Number.isInteger(input.id) || (input.id as number) <= 0) {
    return { ok: false, message: `target=${input.target} exige id (inteiro positivo).` }
  }
  if (input.target === 'task') return { ok: true, route: `/task/${input.id}` }
  if (input.target === 'project') return { ok: true, route: `/project/${input.id}` }
  return { ok: true, route: `/notebooks?page=${input.id}` }
}

export const NOTIFY_MIN_INTERVAL_MS = 10_000

export function notifyWaitMs(
  lastSentAt: number | null,
  now: number,
  minInterval = NOTIFY_MIN_INTERVAL_MS
): number {
  if (lastSentAt === null) return 0
  return Math.max(0, lastSentAt + minInterval - now)
}
