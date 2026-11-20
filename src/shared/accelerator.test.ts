import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CAPTURE_SHORTCUT,
  acceleratorFromEvent,
  acceleratorKeys,
  isValidAccelerator
} from './accelerator'

const event = (
  code: string,
  mods: Partial<Record<'ctrl' | 'alt' | 'shift' | 'meta', boolean>>
) => ({
  code,
  ctrlKey: !!mods.ctrl,
  altKey: !!mods.alt,
  shiftKey: !!mods.shift,
  metaKey: !!mods.meta
})

describe('isValidAccelerator', () => {
  it('aceita o padrão e combinações com Ctrl, Alt ou Super', () => {
    expect(isValidAccelerator(DEFAULT_CAPTURE_SHORTCUT)).toBe(true)
    expect(isValidAccelerator('Alt+Shift+K')).toBe(true)
    expect(isValidAccelerator('Super+F5')).toBe(true)
  })

  it('recusa sem modificador forte, tecla desconhecida, repetida ou fora de ordem', () => {
    expect(isValidAccelerator('K')).toBe(false)
    expect(isValidAccelerator('Shift+K')).toBe(false)
    expect(isValidAccelerator('CommandOrControl+Enter')).toBe(false)
    expect(isValidAccelerator('Alt+Alt+K')).toBe(false)
    expect(isValidAccelerator('Shift+CommandOrControl+K')).toBe(false)
    expect(isValidAccelerator(42)).toBe(false)
  })
})

describe('acceleratorFromEvent', () => {
  it('monta o acelerador do Electron a partir da tecla física', () => {
    expect(acceleratorFromEvent(event('Space', { ctrl: true, shift: true }))).toBe(
      DEFAULT_CAPTURE_SHORTCUT
    )
    expect(acceleratorFromEvent(event('KeyJ', { alt: true }))).toBe('Alt+J')
    expect(acceleratorFromEvent(event('Digit3', { ctrl: true, meta: true }))).toBe(
      'CommandOrControl+Super+3'
    )
    expect(acceleratorFromEvent(event('ArrowUp', { ctrl: true }))).toBe('CommandOrControl+Up')
  })

  it('ignora modificador sozinho e combinação sem Ctrl, Alt ou Super', () => {
    expect(acceleratorFromEvent(event('ControlLeft', { ctrl: true }))).toBeNull()
    expect(acceleratorFromEvent(event('KeyA', { shift: true }))).toBeNull()
    expect(acceleratorFromEvent(event('Enter', { ctrl: true }))).toBeNull()
  })
})

describe('acceleratorKeys', () => {
  it('mostra Ctrl no lugar de CommandOrControl e setas como símbolo', () => {
    expect(acceleratorKeys(DEFAULT_CAPTURE_SHORTCUT)).toEqual(['Ctrl', 'Shift', 'Space'])
    expect(acceleratorKeys('Alt+Up')).toEqual(['Alt', '↑'])
  })
})
