import { FlagTriangleRight, Milestone, Rocket, type LucideIcon } from 'lucide-react'
import type { MilestoneKind } from '@shared/types'

export const MILESTONE_KIND_ICON: Record<MilestoneKind, LucideIcon> = {
  inicio: Rocket,
  desenvolvimento: Milestone,
  fim: FlagTriangleRight
}
