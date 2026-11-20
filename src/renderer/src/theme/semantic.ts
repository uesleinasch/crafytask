import type { EnergyLevel, ProjectStatus, TaskCategory, TaskStatus } from '@shared/types'
import { PALETTE, type ThemeMode } from './tokens'

export interface ChipColors {
  fg: string
  bg: string
}

type ByMode<T> = Record<ThemeMode, T>

export const STATUS_COLORS: Record<TaskStatus, ByMode<ChipColors>> = {
  inbox: { light: { fg: '#5D6B82', bg: '#EEF1F6' }, dark: { fg: '#9AA8C0', bg: '#232A36' } },
  aguardando: { light: { fg: '#A15C00', bg: '#FFF4E0' }, dark: { fg: '#F0B44C', bg: '#33280F' } },
  proximas: { light: { fg: '#2A62D6', bg: '#EAF0FF' }, dark: { fg: '#7AA5FF', bg: '#1C2744' } },
  executando: { light: { fg: '#0B7A50', bg: '#E3F6EC' }, dark: { fg: '#4CD69A', bg: '#123326' } },
  finalizada: { light: { fg: '#526B5E', bg: '#EDF2EF' }, dark: { fg: '#93AE9F', bg: '#1F2A25' } },
  someday: { light: { fg: '#0F6E7A', bg: '#E2F4F6' }, dark: { fg: '#5CC8D4', bg: '#12302F' } }
}

export type ColoredCategory = Exclude<TaskCategory, 'normal'>

export const CATEGORY_COLORS: Record<ColoredCategory, ByMode<ChipColors>> = {
  urgente: { light: { fg: '#C02331', bg: '#FDECEE' }, dark: { fg: '#FF7A82', bg: '#3A1A1E' } },
  prioridade: { light: { fg: '#A84803', bg: '#FFF0E5' }, dark: { fg: '#FF9A55', bg: '#3A2414' } },
  time_leak: { light: { fg: '#94600E', bg: '#FFF6DD' }, dark: { fg: '#F2C062', bg: '#352A10' } }
}

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, ByMode<ChipColors>> = {
  active: STATUS_COLORS.proximas,
  someday: STATUS_COLORS.someday,
  done: STATUS_COLORS.finalizada,
  archived: STATUS_COLORS.inbox
}

export const TIME_LEAK_SCALE: ByMode<readonly [string, string, string]> = {
  light: ['#FFF6DD', '#FFF0E5', '#FDECEE'],
  dark: ['#2A2412', '#2E2016', '#301A1E']
}

export const TIME_LEAK_THRESHOLDS = [30 * 60, 60 * 60, 120 * 60] as const

export type TimeLeakLevel = 0 | 1 | 2 | 3

export function timeLeakLevel(
  category: TaskCategory | null | undefined,
  seconds: number,
  thresholds: readonly number[] = TIME_LEAK_THRESHOLDS
): TimeLeakLevel {
  if (category !== 'time_leak') return 0
  let level = 0
  for (const limit of thresholds) if (seconds >= limit) level += 1
  return Math.min(level, 3) as TimeLeakLevel
}

export function timeLeakBackground(mode: ThemeMode, level: TimeLeakLevel): string | undefined {
  return level === 0 ? undefined : TIME_LEAK_SCALE[mode][level - 1]
}

export const ENERGY_BARS: Record<EnergyLevel, 1 | 2 | 3> = { alto: 3, medio: 2, baixo: 1 }

export const ENERGY_LABELS: Record<EnergyLevel, string> = {
  alto: 'Alta',
  medio: 'Média',
  baixo: 'Baixa'
}

export interface ChartColors {
  single: string
  muted: string
  sequential: readonly string[]
  categorical: readonly string[]
}

export const CHART_COLORS: ByMode<ChartColors> = {
  light: {
    single: '#5B47EB',
    muted: '#8F8BA6',
    sequential: ['#ECEBF3', '#A99DFF', '#8F80FA', '#7462F2', '#5B47EB', '#4532C4'],
    categorical: [
      '#5B47EB',
      '#EB6834',
      '#1BAF7A',
      '#EDA100',
      '#E87BA4',
      '#008300',
      '#2A78D6',
      '#E34948'
    ]
  },
  dark: {
    single: '#8F82FF',
    muted: '#6C6884',
    sequential: ['#24222F', '#4A3F94', '#5F50B8', '#7766DA', '#9185FF', '#B7AEFF'],
    categorical: [
      '#8577F5',
      '#D95926',
      '#199E70',
      '#C98500',
      '#D55181',
      '#0CA30C',
      '#3987E5',
      '#E66767'
    ]
  }
}

export const HORIZON_COLORS: ByMode<readonly ChipColors[]> = {
  light: [
    { bg: '#F1EFFF', fg: '#4B3BC9' },
    { bg: '#E4E0FF', fg: '#4433B8' },
    { bg: '#D5CFFF', fg: '#3B2BA6' },
    { bg: '#C3BAFF', fg: '#2E218C' },
    { bg: '#AFA3FA', fg: '#24196F' },
    { bg: '#9D8FF5', fg: '#170F4D' }
  ],
  dark: [
    { bg: '#1E1B33', fg: '#B9B0FF' },
    { bg: '#262143', fg: '#C3BBFF' },
    { bg: '#2F2854', fg: '#CEC7FF' },
    { bg: '#3A3168', fg: '#D9D3FF' },
    { bg: '#463B80', fg: '#E6E2FF' },
    { bg: '#5B4CA8', fg: '#FFFFFF' }
  ]
}

export interface CalBlockColors {
  calBlock: string
  calBlockBorder: string
}

export const CAL_BLOCK_COLORS: ByMode<CalBlockColors> = {
  light: { calBlock: '#EFEDFF', calBlockBorder: '#C9C1FF' },
  dark: { calBlock: '#252047', calBlockBorder: '#3E3770' }
}

export const USER_COLORS = [
  '#E5484D',
  '#A84803',
  '#A15C00',
  '#0B7A50',
  '#0F6E7A',
  '#2A62D6',
  '#5B47EB',
  '#7647B0',
  '#B8327A',
  '#5D6B82'
] as const

export function userColorTint(color: string): string | undefined {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}24` : undefined
}

const TERMINAL_BASE = PALETTE.dark

export const TERMINAL = {
  background: TERMINAL_BASE.sider,
  border: TERMINAL_BASE.border,
  hover: TERMINAL_BASE.hover,
  text: TERMINAL_BASE.text,
  text2: TERMINAL_BASE.text2,
  meta: TERMINAL_BASE.text3,
  success: TERMINAL_BASE.success,
  accent: TERMINAL_BASE.primary,
  xterm: {
    background: TERMINAL_BASE.sider,
    foreground: TERMINAL_BASE.text,
    cursor: TERMINAL_BASE.text,
    cursorAccent: TERMINAL_BASE.sider,
    selectionBackground: '#3B3561',
    black: '#4A4660',
    red: TERMINAL_BASE.error,
    green: TERMINAL_BASE.success,
    yellow: TERMINAL_BASE.warning,
    blue: TERMINAL_BASE.info,
    magenta: '#B79CFF',
    cyan: '#5CD3E6',
    white: TERMINAL_BASE.text,
    brightBlack: TERMINAL_BASE.text3,
    brightRed: '#FFA3A9',
    brightGreen: '#7BE3B5',
    brightYellow: '#F6CB7E',
    brightBlue: '#A3C1FF',
    brightMagenta: '#CDBBFF',
    brightCyan: '#8BE1EE',
    brightWhite: '#FFFFFF'
  }
} as const
