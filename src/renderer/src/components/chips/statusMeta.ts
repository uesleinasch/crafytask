import {
  CircleArrowRight,
  CircleCheck,
  CirclePlay,
  Hourglass,
  Inbox,
  Lightbulb,
  type LucideIcon
} from 'lucide-react'
import type { TaskStatus } from '@shared/types'

export const STATUS_ICONS: Record<TaskStatus, LucideIcon> = {
  inbox: Inbox,
  aguardando: Hourglass,
  proximas: CircleArrowRight,
  executando: CirclePlay,
  finalizada: CircleCheck,
  someday: Lightbulb
}

export const STATUS_CHIP_LABELS: Record<TaskStatus, string> = {
  inbox: 'Inbox',
  aguardando: 'Aguardando',
  proximas: 'Próximas',
  executando: 'Executando',
  finalizada: 'Finalizada',
  someday: 'Someday'
}

export function statusTabText(status: TaskStatus | 'all'): string {
  return status === 'all' ? 'Todas' : STATUS_CHIP_LABELS[status]
}
