import {
  CircleArrowRight,
  CircleCheck,
  CirclePlay,
  Hourglass,
  Inbox,
  Lightbulb,
  type LucideIcon
} from 'lucide-react'
import { STATUS_LABELS, type TaskStatus } from '@shared/types'

export const STATUS_ICONS: Record<TaskStatus, LucideIcon> = {
  inbox: Inbox,
  aguardando: Hourglass,
  proximas: CircleArrowRight,
  executando: CirclePlay,
  finalizada: CircleCheck,
  someday: Lightbulb
}

export function statusTabText(status: TaskStatus | 'all'): string {
  return status === 'all' ? 'Todas' : STATUS_LABELS[status]
}
