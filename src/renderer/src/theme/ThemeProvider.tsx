import { App as AntApp, ConfigProvider } from 'antd'
import ptBR from 'antd/locale/pt_BR'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  parseDensity,
  parseThemePreference,
  resolveThemeMode,
  type Density,
  type ThemePreference
} from '@shared/themePreference'
import { shouldBootstrapTimerStore } from '@renderer/stores/timerWindow'
import { buildTheme } from './buildTheme'
import {
  DENSITY_KEY,
  THEME_PREFERENCE_KEY,
  ThemeSettingsContext,
  readStoredSetting,
  storeSetting
} from './themeSettings'

const DARK_QUERY = '(prefers-color-scheme: dark)'

function useSystemPrefersDark(): boolean {
  const [dark, setDark] = useState(() => window.matchMedia(DARK_QUERY).matches)
  useEffect(() => {
    const query = window.matchMedia(DARK_QUERY)
    const onChange = (): void => setDark(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return dark
}

export function ThemeProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [preference, setPreferenceState] = useState(() =>
    parseThemePreference(readStoredSetting(THEME_PREFERENCE_KEY))
  )
  const [density, setDensityState] = useState(() => parseDensity(readStoredSetting(DENSITY_KEY)))
  const systemPrefersDark = useSystemPrefersDark()
  const mode = resolveThemeMode(preference, systemPrefersDark)

  useEffect(() => {
    const onStorage = (event: StorageEvent): void => {
      if (event.key === THEME_PREFERENCE_KEY)
        setPreferenceState(parseThemePreference(event.newValue))
      if (event.key === DENSITY_KEY) setDensityState(parseDensity(event.newValue))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    if (shouldBootstrapTimerStore(window.location.hash)) {
      void window.api.appSetThemeSource(preference)
    }
  }, [preference])

  const setPreference = useCallback((value: ThemePreference) => {
    storeSetting(THEME_PREFERENCE_KEY, value)
    setPreferenceState(value)
  }, [])

  const setDensity = useCallback((value: Density) => {
    storeSetting(DENSITY_KEY, value)
    setDensityState(value)
  }, [])

  const config = useMemo(() => buildTheme(mode, density), [mode, density])
  const settings = useMemo(
    () => ({ preference, density, mode, setPreference, setDensity }),
    [preference, density, mode, setPreference, setDensity]
  )

  return (
    <ThemeSettingsContext.Provider value={settings}>
      <ConfigProvider theme={config} locale={ptBR}>
        <AntApp component={false}>{children}</AntApp>
      </ConfigProvider>
    </ThemeSettingsContext.Provider>
  )
}
