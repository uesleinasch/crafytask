import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DENSITY,
  DEFAULT_THEME_PREFERENCE,
  isThemePreference,
  parseDensity,
  parseThemePreference,
  resolveThemeMode
} from './themePreference'

describe('preferência de tema', () => {
  it('aceita só os três valores', () => {
    expect(isThemePreference('system')).toBe(true)
    expect(isThemePreference('dark')).toBe(true)
    expect(isThemePreference('escuro')).toBe(false)
    expect(isThemePreference(1)).toBe(false)
  })

  it('segue o sistema com valor ausente ou inválido', () => {
    expect(DEFAULT_THEME_PREFERENCE).toBe('system')
    expect(parseThemePreference(null)).toBe('system')
    expect(parseThemePreference('"dark"')).toBe('system')
    expect(parseThemePreference('dark')).toBe('dark')
  })

  it('resolve "system" pelo sistema e respeita a escolha fixa', () => {
    expect(resolveThemeMode('system', true)).toBe('dark')
    expect(resolveThemeMode('system', false)).toBe('light')
    expect(resolveThemeMode('light', true)).toBe('light')
    expect(resolveThemeMode('dark', false)).toBe('dark')
  })
})

describe('densidade', () => {
  it('lê compacta e cai em confortável no resto', () => {
    expect(parseDensity('compact')).toBe('compact')
    expect(parseDensity('comfortable')).toBe('comfortable')
    expect(parseDensity(null)).toBe(DEFAULT_DENSITY)
    expect(parseDensity('dense')).toBe('comfortable')
  })
})
