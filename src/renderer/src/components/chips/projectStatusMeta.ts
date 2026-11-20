import { Archive, CircleCheck, FolderOpen, Lightbulb, type LucideIcon } from 'lucide-react'
import type { ProjectStatus } from '@shared/types'

export const PROJECT_STATUS_ICONS: Record<ProjectStatus, LucideIcon> = {
  active: FolderOpen,
  someday: Lightbulb,
  done: CircleCheck,
  archived: Archive
}
