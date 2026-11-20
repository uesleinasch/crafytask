import type { CSSProperties } from 'react'
import { Flex, Segmented } from 'antd'
import type { Density, ThemeMode, ThemePreference } from '@shared/themePreference'
import { THEME_OPTIONS } from '@renderer/components/shell/themeOptions'
import { PALETTE } from '@renderer/theme/tokens'
import { useThemeSettings } from '@renderer/theme/themeSettings'
import { SettingRow, SettingsCard } from './SettingsLayout'

const DENSITY_OPTIONS: { value: Density; label: string }[] = [
  { value: 'comfortable', label: 'Confortável' },
  { value: 'compact', label: 'Compacta' }
]

function previewStyles(preference: ThemePreference): { frame: CSSProperties; parts: string[] } {
  if (preference === 'system') {
    const { light, dark } = PALETTE
    return {
      frame: { background: `linear-gradient(135deg, ${light.bg} 50%, ${dark.bg} 50%)` },
      parts: Array(3).fill(`color-mix(in srgb, ${light.text3} 40%, transparent)`)
    }
  }
  const c = PALETTE[preference as ThemeMode]
  return {
    frame: { background: c.bg },
    parts: [c.sider, c.surface, c.primarySoft]
  }
}

function ThemePreview({ preference }: { preference: ThemePreference }): React.JSX.Element {
  const { frame, parts } = previewStyles(preference)
  return (
    <span className="ct-theme-prev" style={frame} aria-hidden>
      {parts.map((background, index) => (
        <span key={index} style={{ background }} />
      ))}
    </span>
  )
}

export function AppearanceSection(): React.JSX.Element {
  const { preference, setPreference, density, setDensity } = useThemeSettings()

  return (
    <Flex vertical gap={16}>
      <SettingsCard title="Tema">
        <SettingRow
          title="Tema"
          description="Seguir o sistema troca sozinho quando o sistema muda."
          vertical
        >
          <div className="ct-theme-grid" role="group" aria-label="Tema">
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                className={preference === value ? 'ct-theme-opt on' : 'ct-theme-opt'}
                aria-pressed={preference === value}
                onClick={() => setPreference(value)}
              >
                <ThemePreview preference={value} />
                <Flex align="center" gap={6}>
                  <Icon size={16} strokeWidth={1.75} aria-hidden />
                  {label}
                </Flex>
              </button>
            ))}
          </div>
        </SettingRow>
      </SettingsCard>
      <SettingsCard title="Densidade">
        <SettingRow
          title="Densidade da interface"
          description="Compacta mostra mais linhas por tela; controles e tabelas ficam mais baixos."
        >
          <Segmented<Density>
            aria-label="Densidade da interface"
            value={density}
            onChange={setDensity}
            options={DENSITY_OPTIONS}
          />
        </SettingRow>
      </SettingsCard>
    </Flex>
  )
}
