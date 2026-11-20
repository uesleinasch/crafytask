import { describe, expect, it } from 'vitest'
import {
  activate,
  addSession,
  detachSession,
  groupOf,
  reconcileLayout,
  removeSession,
  replaceSession,
  splitActive,
  type PaneLayout
} from './terminalPanes'

const layout: PaneLayout = { groups: [['a', 'b'], ['c']], activeId: 'b' }

describe('reconcileLayout', () => {
  it('mantém grupos e foco que ainda existem', () => {
    expect(reconcileLayout(['a', 'b', 'c'], layout)).toEqual(layout)
  })

  it('tira sessões que sumiram e apaga grupo vazio', () => {
    expect(reconcileLayout(['b'], layout)).toEqual({ groups: [['b']], activeId: 'b' })
  })

  it('põe sessão nova num grupo próprio no fim', () => {
    expect(reconcileLayout(['a', 'b', 'c', 'd'], layout).groups).toEqual([['a', 'b'], ['c'], ['d']])
  })

  it('foco inválido cai na primeira sessão', () => {
    expect(reconcileLayout(['c'], layout)).toEqual({ groups: [['c']], activeId: 'c' })
    expect(reconcileLayout([], layout)).toEqual({ groups: [], activeId: null })
  })
})

describe('addSession e splitActive', () => {
  it('sessão nova vira grupo e ganha foco', () => {
    expect(addSession(layout, 'd')).toEqual({ groups: [['a', 'b'], ['c'], ['d']], activeId: 'd' })
  })

  it('split entra no grupo ativo logo depois do foco', () => {
    expect(splitActive({ ...layout, activeId: 'a' }, 'd')).toEqual({
      groups: [['a', 'd', 'b'], ['c']],
      activeId: 'd'
    })
  })

  it('split sem foco cria grupo', () => {
    expect(splitActive({ groups: [], activeId: null }, 'a')).toEqual({
      groups: [['a']],
      activeId: 'a'
    })
  })
})

describe('activate', () => {
  it('foca sessão conhecida e ignora desconhecida', () => {
    expect(activate(layout, 'c').activeId).toBe('c')
    expect(activate(layout, 'x')).toBe(layout)
  })
})

describe('removeSession', () => {
  it('foco passa para o painel anterior do mesmo grupo', () => {
    expect(removeSession({ groups: [['a', 'b', 'c']], activeId: 'c' }, 'c')).toEqual({
      groups: [['a', 'b']],
      activeId: 'b'
    })
    expect(removeSession({ groups: [['a', 'b']], activeId: 'a' }, 'a')).toEqual({
      groups: [['b']],
      activeId: 'b'
    })
  })

  it('grupo vazio some e o foco vai para o grupo vizinho', () => {
    expect(removeSession({ ...layout, activeId: 'c' }, 'c')).toEqual({
      groups: [['a', 'b']],
      activeId: 'a'
    })
    expect(removeSession({ groups: [['a'], ['b']], activeId: 'a' }, 'a')).toEqual({
      groups: [['b']],
      activeId: 'b'
    })
  })

  it('remover sessão sem foco mantém o foco', () => {
    expect(removeSession(layout, 'c')).toEqual({ groups: [['a', 'b']], activeId: 'b' })
  })

  it('última sessão deixa layout vazio', () => {
    expect(removeSession({ groups: [['a']], activeId: 'a' }, 'a')).toEqual({
      groups: [],
      activeId: null
    })
  })
})

describe('replaceSession', () => {
  it('troca no mesmo lugar e leva o foco', () => {
    expect(replaceSession(layout, 'b', 'z')).toEqual({ groups: [['a', 'z'], ['c']], activeId: 'z' })
  })
})

describe('detachSession', () => {
  it('tira a sessão do grupo para um grupo logo depois', () => {
    expect(detachSession(layout, 'a')).toEqual({ groups: [['b'], ['a'], ['c']], activeId: 'a' })
  })

  it('sessão sozinha não muda', () => {
    expect(detachSession(layout, 'c')).toBe(layout)
  })
})

describe('groupOf', () => {
  it('acha o grupo da sessão', () => {
    expect(groupOf(layout, 'b')).toEqual(['a', 'b'])
    expect(groupOf(layout, null)).toBeNull()
  })
})
