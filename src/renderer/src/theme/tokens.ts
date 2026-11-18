import type { ThemeConfig } from 'antd'
import type { ThemeMode } from '@shared/themePreference'

export type { ThemeMode }

export interface Palette {
  bg: string
  surface: string
  elevated: string
  sider: string
  border: string
  borderStrong: string
  text: string
  text2: string
  text3: string
  primary: string
  primarySoft: string
  onPrimary: string
  brand: string
  hover: string
  rowHover: string
  track: string
  success: string
  warning: string
  error: string
  info: string
}

export const PALETTE: Record<ThemeMode, Palette> = {
  light: {
    bg: '#F6F5FA',
    surface: '#FFFFFF',
    elevated: '#FFFFFF',
    sider: '#FBFAFE',
    border: '#E4E2EE',
    borderStrong: '#CFCCDD',
    text: '#1B1A27',
    text2: '#5B5970',
    text3: '#6B6980',
    primary: '#5B47EB',
    primarySoft: '#EFEDFF',
    onPrimary: '#FFFFFF',
    brand: '#705EFF',
    hover: '#F0EFF6',
    rowHover: '#F7F6FC',
    track: '#ECEBF3',
    success: '#0B7A50',
    warning: '#A15C00',
    error: '#C02331',
    info: '#2A62D6'
  },
  dark: {
    bg: '#111018',
    surface: '#1A1923',
    elevated: '#22202E',
    sider: '#15141D',
    border: '#2E2B3C',
    borderStrong: '#403C52',
    text: '#ECEAF6',
    text2: '#A9A6BE',
    text3: '#8A879F',
    primary: '#8F82FF',
    primarySoft: '#221E3D',
    onPrimary: '#111018',
    brand: '#8F82FF',
    hover: '#25232F',
    rowHover: '#201E2B',
    track: '#15141D',
    success: '#4CD69A',
    warning: '#F0B44C',
    error: '#FF7A82',
    info: '#7AA5FF'
  }
}

export const FONT_FAMILY = "'Geist Variable', system-ui, sans-serif"
export const FONT_FAMILY_CODE = "'Geist Mono Variable', ui-monospace, monospace"

export type SeedTokens = NonNullable<ThemeConfig['token']>

export function seedTokens(mode: ThemeMode): SeedTokens {
  const c = PALETTE[mode]
  return {
    colorPrimary: c.primary,
    colorInfo: c.info,
    colorSuccess: c.success,
    colorWarning: c.warning,
    colorError: c.error,
    colorLink: c.primary,
    colorBgLayout: c.bg,
    colorBgContainer: c.surface,
    colorBgElevated: c.elevated,
    colorBorder: c.borderStrong,
    colorBorderSecondary: c.border,
    colorText: c.text,
    colorTextSecondary: c.text2,
    colorTextTertiary: c.text3,
    colorTextQuaternary: c.text3,
    colorTextLightSolid: c.onPrimary,
    fontFamily: FONT_FAMILY,
    fontFamilyCode: FONT_FAMILY_CODE,
    fontSize: 14,
    borderRadius: 8,
    borderRadiusSM: 6,
    borderRadiusLG: 12,
    borderRadiusXS: 4,
    wireframe: false,
    motionDurationMid: '0.16s',
    motionDurationSlow: '0.24s',
    boxShadowSecondary:
      mode === 'dark' ? '0 8px 24px rgba(0,0,0,.45)' : '0 8px 24px rgba(17,16,24,.10)'
  }
}
