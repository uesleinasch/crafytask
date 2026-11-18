import { theme, type ThemeConfig } from 'antd'
import type { Density, ThemeMode } from '@shared/themePreference'
import { PALETTE, seedTokens } from './tokens'

export function componentSizeFor(density: Density): 'small' | undefined {
  return density === 'compact' ? 'small' : undefined
}

export function buildTheme(mode: ThemeMode, density: Density): ThemeConfig {
  const c = PALETTE[mode]
  const compact = density === 'compact'
  return {
    cssVar: { prefix: 'ant' },
    hashed: false,
    algorithm: [
      mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
      ...(compact ? [theme.compactAlgorithm] : [])
    ],
    token: seedTokens(mode),
    components: {
      Layout: {
        siderBg: c.sider,
        headerBg: c.surface,
        bodyBg: c.bg,
        headerHeight: 52,
        headerPadding: '0 16px',
        triggerBg: c.sider,
        triggerColor: c.text2
      },
      Menu: {
        itemBg: 'transparent',
        subMenuItemBg: 'transparent',
        itemSelectedBg: c.primarySoft,
        itemSelectedColor: c.primary,
        itemHoverBg: c.hover,
        itemBorderRadius: 8,
        itemMarginInline: 8,
        groupTitleColor: c.text3,
        groupTitleFontSize: 11,
        iconSize: 16,
        collapsedIconSize: 18
      },
      Tabs: {
        itemColor: c.text2,
        itemSelectedColor: c.text,
        inkBarColor: c.primary,
        horizontalItemGutter: compact ? 16 : 24,
        horizontalItemPadding: '10px 4px',
        horizontalItemPaddingSM: '8px 4px',
        horizontalItemPaddingLG: '12px 4px',
        titleFontSize: 14
      },
      Table: {
        headerBg: c.surface,
        headerColor: c.text3,
        headerSplitColor: 'transparent',
        rowHoverBg: c.rowHover,
        rowSelectedBg: c.primarySoft,
        rowSelectedHoverBg: c.primarySoft,
        cellPaddingBlock: compact ? 6 : 10,
        cellPaddingBlockMD: compact ? 8 : 12,
        cellPaddingBlockSM: compact ? 6 : 10,
        borderColor: c.border
      },
      Card: {
        headerFontSize: 15,
        headerFontSizeSM: 14,
        headerHeight: 56,
        headerHeightSM: 48,
        headerPadding: 20,
        headerPaddingSM: 16,
        bodyPadding: 20,
        bodyPaddingSM: 16
      },
      Segmented: { itemSelectedBg: c.surface, trackBg: c.track },
      Statistic: { contentFontSize: 26 }
    }
  }
}
