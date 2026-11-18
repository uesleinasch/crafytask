import { describe, expect, it, vi } from 'vitest'
import {
  NAV_COMMANDS,
  isCtrlShortcut,
  matchesQuery,
  moveIndex,
  normalizeSearch,
  onCommandPaletteRequest,
  openCommandPalette
} from './paletteCommands'

describe('paleta de comandos', () => {
  it('oferece um comando de navegação por tela', () => {
    expect(NAV_COMMANDS.map((c) => c.route)).toContain('/calendar')
    expect(NAV_COMMANDS.find((c) => c.route === '/review')?.label).toBe('Ir para Revisão semanal')
  })

  it('busca sem diferenciar acento nem caixa', () => {
    expect(normalizeSearch('  Calendário ')).toBe('calendario')
    expect(matchesQuery('Ir para Calendário', 'CALEND')).toBe(true)
    expect(matchesQuery('Ir para Revisão semanal', 'revisao')).toBe(true)
    expect(matchesQuery('Ir para Hoje', 'projetos')).toBe(false)
    expect(matchesQuery('qualquer', '')).toBe(true)
  })

  it('anda pela lista em volta', () => {
    expect(moveIndex(0, -1, 3)).toBe(2)
    expect(moveIndex(2, 1, 3)).toBe(0)
    expect(moveIndex(1, 1, 3)).toBe(2)
    expect(moveIndex(0, 1, 0)).toBe(0)
  })

  it('abre com Ctrl+K, mas não rouba o Ctrl+K do terminal', () => {
    const key = { ctrlKey: true, altKey: false, metaKey: false, shiftKey: false, code: 'KeyK' }
    expect(isCtrlShortcut(key, 'KeyK', false)).toBe(true)
    expect(isCtrlShortcut({ ...key, ctrlKey: false, metaKey: true }, 'KeyK', false)).toBe(true)
    expect(isCtrlShortcut(key, 'KeyK', true)).toBe(false)
    expect(isCtrlShortcut({ ...key, shiftKey: true }, 'KeyK', false)).toBe(false)
    expect(isCtrlShortcut({ ...key, code: 'KeyJ' }, 'KeyK', false)).toBe(false)
  })

  it('abre por pedido de qualquer parte do shell', () => {
    const listener = vi.fn()
    const off = onCommandPaletteRequest(listener)
    openCommandPalette()
    expect(listener).toHaveBeenCalledTimes(1)
    off()
    openCommandPalette()
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
