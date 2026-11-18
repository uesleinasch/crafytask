import { createContext, useContext } from 'react'
import type { Density, ThemeMode, ThemePreference } from '@shared/themePreference'

export const THEME_PREFERENCE_KEY = 'ticktask:theme'
export const DENSITY_KEY = 'ticktask:density'

export interface ThemeSettings {
  preference: ThemePreference
  density: Density
  mode: ThemeMode
  setPreference: (preference: ThemePreference) => void
  setDensity: (density: Density) => void
}

export const ThemeSettingsContext = createContext<ThemeSettings | null>(null)

export function useThemeSettings(): ThemeSettings {
  const settings = useContext(ThemeSettingsContext)
  if (!settings) throw new Error('useThemeSettings fora do ThemeProvider')
  return settings
}

export function readStoredSetting(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function storeSetting(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    return
  }
}
