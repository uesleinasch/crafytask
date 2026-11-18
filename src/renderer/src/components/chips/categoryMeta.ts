import { Clock, Flag, Flame, type LucideIcon } from 'lucide-react'
import type { ColoredCategory } from '@renderer/theme/semantic'
import type { TaskCategory } from '@shared/types'

export const CATEGORY_ICONS: Record<ColoredCategory, LucideIcon> = {
  urgente: Flame,
  prioridade: Flag,
  time_leak: Clock
}

export const CATEGORY_CHIP_LABELS: Record<TaskCategory, string> = {
  urgente: 'Urgente',
  prioridade: 'Prioridade',
  normal: 'Normal',
  time_leak: 'Time leak'
}
