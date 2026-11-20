import { describe, expect, it } from 'vitest'
import { NAV_FOOTER, NAV_GROUPS } from '../../renderer/src/components/shell/navigation'
import { APP_SCREENS, appRoute, notifyWaitMs } from './appRoute'

describe('appRoute', () => {
  it('monta a rota de task, projeto e página', () => {
    expect(appRoute({ target: 'task', id: 12 })).toEqual({ ok: true, route: '/task/12' })
    expect(appRoute({ target: 'project', id: 3 })).toEqual({ ok: true, route: '/project/3' })
    expect(appRoute({ target: 'page', id: 9 })).toEqual({ ok: true, route: '/notebooks?page=9' })
  })

  it('recusa id ausente, zero, negativo ou fracionário', () => {
    for (const id of [undefined, 0, -1, 1.5, Number.NaN]) {
      expect(appRoute({ target: 'task', id }).ok).toBe(false)
    }
  })

  it('abre só tela da lista fechada', () => {
    expect(appRoute({ target: 'screen', screen: 'today' })).toEqual({ ok: true, route: '/today' })
    expect(appRoute({ target: 'screen', screen: 'tasks' })).toEqual({ ok: true, route: '/' })
    expect(appRoute({ target: 'screen', screen: '/float' }).ok).toBe(false)
    expect(appRoute({ target: 'screen', screen: 'toString' }).ok).toBe(false)
    expect(appRoute({ target: 'screen' }).ok).toBe(false)
  })

  it('a lista de telas é a mesma da navegação do app', () => {
    const navigation = Object.fromEntries(
      [...NAV_GROUPS.flatMap((group) => group.items), ...NAV_FOOTER].map((item) => [
        item.key,
        item.route
      ])
    )
    expect(APP_SCREENS).toEqual(navigation)
  })
})

describe('notifyWaitMs', () => {
  it('libera a primeira e segura as seguintes até o intervalo passar', () => {
    expect(notifyWaitMs(null, 1_000)).toBe(0)
    expect(notifyWaitMs(1_000, 1_001)).toBe(9_999)
    expect(notifyWaitMs(1_000, 11_000)).toBe(0)
    expect(notifyWaitMs(1_000, 50_000)).toBe(0)
    expect(notifyWaitMs(1_000, 3_000, 5_000)).toBe(3_000)
  })
})
