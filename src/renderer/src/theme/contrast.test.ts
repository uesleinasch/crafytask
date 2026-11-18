import { describe, expect, it } from 'vitest'
import { CATEGORY_COLORS, HORIZON_COLORS, STATUS_COLORS, TIME_LEAK_SCALE } from './semantic'
import { PALETTE, seedTokens, type ThemeMode } from './tokens'

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const [r, g, b] = channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const TEXT_AA = 4.5
const MODES: ThemeMode[] = ['light', 'dark']

describe.each(MODES)('contraste WCAG no tema %s', (mode) => {
  const c = PALETTE[mode]

  it.each(['text', 'text2', 'text3', 'primary', 'success', 'warning', 'error', 'info'] as const)(
    '%s passa AA sobre as superfícies',
    (key) => {
      for (const surface of [c.bg, c.surface, c.elevated, c.sider, c.rowHover, c.primarySoft]) {
        expect(contrast(c[key], surface)).toBeGreaterThanOrEqual(TEXT_AA)
      }
    }
  )

  it('texto do botão primário passa AA', () => {
    expect(contrast(c.onPrimary, c.primary)).toBeGreaterThanOrEqual(TEXT_AA)
  })

  it('logo, texto grande, passa 3:1 sobre o fundo', () => {
    expect(contrast(c.brand, c.surface)).toBeGreaterThanOrEqual(3)
  })

  it.each(Object.keys(STATUS_COLORS))('chip de status %s passa AA', (status) => {
    const { fg, bg } = STATUS_COLORS[status as keyof typeof STATUS_COLORS][mode]
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(TEXT_AA)
  })

  it.each(Object.keys(CATEGORY_COLORS))('chip de categoria %s passa AA', (category) => {
    const { fg, bg } = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS][mode]
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(TEXT_AA)
  })

  it('chips de horizonte H0–H5 passam AA', () => {
    for (const { fg, bg } of HORIZON_COLORS[mode]) {
      expect(contrast(fg, bg)).toBeGreaterThanOrEqual(TEXT_AA)
    }
  })

  it('texto e texto secundário passam AA nas linhas de time leak', () => {
    for (const bg of TIME_LEAK_SCALE[mode]) {
      expect(contrast(c.text, bg)).toBeGreaterThanOrEqual(TEXT_AA)
      expect(contrast(c.text2, bg)).toBeGreaterThanOrEqual(TEXT_AA)
    }
  })

  it('tokens do antd saem da paleta, nunca do azul padrão', () => {
    const token = seedTokens(mode)
    expect(token.colorPrimary).toBe(c.primary)
    expect(token.colorTextLightSolid).toBe(c.onPrimary)
    expect(Object.values(token)).not.toContain('#1677ff')
  })
})
