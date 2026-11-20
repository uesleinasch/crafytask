export type ThemePreference = 'system' | 'light' | 'dark'
export type ThemeMode = 'light' | 'dark'
export type Density = 'comfortable' | 'compact'

export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'system'
export const DEFAULT_DENSITY: Density = 'comfortable'

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark'
}

export function parseThemePreference(raw: string | null): ThemePreference {
  return isThemePreference(raw) ? raw : DEFAULT_THEME_PREFERENCE
}

export function parseDensity(raw: string | null): Density {
  return raw === 'compact' || raw === 'comfortable' ? raw : DEFAULT_DENSITY
}

export function resolveThemeMode(
  preference: ThemePreference,
  systemPrefersDark: boolean
): ThemeMode {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light'
  return preference
}
