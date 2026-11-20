import { Clock, Flag, Flame, type LucideIcon } from 'lucide-react'
import type { ColoredCategory } from '@renderer/theme/semantic'

export const CATEGORY_ICONS: Record<ColoredCategory, LucideIcon> = {
  urgente: Flame,
  prioridade: Flag,
  time_leak: Clock
}
