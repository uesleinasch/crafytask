import { theme } from 'antd'
import { describe, expect, it } from 'vitest'
import { buildTheme, componentSizeFor } from './buildTheme'
import { PALETTE } from './tokens'

describe('buildTheme', () => {
  it('usa o algoritmo do modo e só acrescenta o compacto na densidade compacta', () => {
    expect(buildTheme('light', 'comfortable').algorithm).toEqual([theme.defaultAlgorithm])
    expect(buildTheme('dark', 'compact').algorithm).toEqual([
      theme.darkAlgorithm,
      theme.compactAlgorithm
    ])
  })

  it('liga cssVar e desliga o hash', () => {
    const config = buildTheme('light', 'comfortable')
    expect(config.cssVar).toBeTruthy()
    expect(config.hashed).toBe(false)
  })

  it('tira a cor primária da paleta do modo', () => {
    expect(buildTheme('dark', 'comfortable').token?.colorPrimary).toBe(PALETTE.dark.primary)
    expect(buildTheme('light', 'comfortable').token?.colorPrimary).toBe(PALETTE.light.primary)
  })

  it('aproxima as abas na densidade compacta sem colar os rótulos', () => {
    expect(buildTheme('light', 'comfortable').components?.Tabs?.horizontalItemGutter).toBe(24)
    expect(buildTheme('light', 'compact').components?.Tabs?.horizontalItemGutter).toBe(16)
    expect(buildTheme('light', 'compact').components?.Tabs?.horizontalItemPaddingSM).toBe('8px 4px')
  })

  it('reduz o respiro da linha da tabela na densidade compacta', () => {
    expect(buildTheme('light', 'comfortable').components?.Table?.cellPaddingBlock).toBe(10)
    expect(buildTheme('light', 'compact').components?.Table?.cellPaddingBlock).toBe(6)
    expect(buildTheme('light', 'comfortable').components?.Table?.cellPaddingBlockSM).toBe(10)
    expect(buildTheme('light', 'compact').components?.Table?.cellPaddingBlockMD).toBe(8)
  })
})

describe('componentSizeFor', () => {
  it('densidade compacta diminui os componentes', () => {
    expect(componentSizeFor('compact')).toBe('small')
    expect(componentSizeFor('comfortable')).toBeUndefined()
  })
})
