import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'
import type { ThemePreference } from '@shared/themePreference'

export interface ThemeOption {
  value: ThemePreference
  label: string
  icon: LucideIcon
  keywords: string
}

export const THEME_OPTIONS: ThemeOption[] = [
  { value: 'system', label: 'Seguir o sistema', icon: Monitor, keywords: 'automático sistema' },
  { value: 'light', label: 'Claro', icon: Sun, keywords: 'light dia' },
  { value: 'dark', label: 'Escuro', icon: Moon, keywords: 'dark noite' }
]

export function themeOption(value: ThemePreference): ThemeOption {
  return THEME_OPTIONS.find((option) => option.value === value) ?? THEME_OPTIONS[0]
}
