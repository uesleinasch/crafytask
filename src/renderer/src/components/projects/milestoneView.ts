import type { MilestoneKind, ProjectMilestone } from '@shared/types'
import { daysUntil, type DueTone } from './projectList'

export const MILESTONE_KIND_LABEL: Record<MilestoneKind, string> = {
  inicio: 'Início',
  desenvolvimento: 'Desenvolvimento',
  fim: 'Fim'
}

export const MILESTONE_KIND_ORDER: readonly MilestoneKind[] = ['inicio', 'desenvolvimento', 'fim']

export interface MilestoneDue {
  label: string
  tone: DueTone
}

export function milestoneDue(milestone: ProjectMilestone, today: string): MilestoneDue | null {
  if (!milestone.due_date) return null
  const date = `${milestone.due_date.slice(8, 10)}/${milestone.due_date.slice(5, 7)}`
  if (milestone.done_at) return { label: date, tone: null }
  const days = daysUntil(milestone.due_date, today)
  const left = days < 0 ? `venceu há ${-days}d` : days === 0 ? 'hoje' : `faltam ${days}d`
  return { label: `${date} · ${left}`, tone: days < 0 ? 'overdue' : days <= 7 ? 'soon' : null }
}

export function nextOpenMilestone(milestones: ProjectMilestone[]): ProjectMilestone | null {
  return milestones.find((milestone) => !milestone.done_at) ?? null
}

export function takenKinds(milestones: ProjectMilestone[], exceptId?: number): MilestoneKind[] {
  return milestones
    .filter((milestone) => milestone.kind !== 'desenvolvimento' && milestone.id !== exceptId)
    .map((milestone) => milestone.kind)
}

export function readyToClose(milestone: ProjectMilestone): boolean {
  return (
    !milestone.done_at &&
    milestone.task_count > 0 &&
    milestone.done_task_count === milestone.task_count
  )
}

export function milestoneOptionLabel(milestone: ProjectMilestone): string {
  const date = milestone.due_date
    ? ` · ${milestone.due_date.slice(8, 10)}/${milestone.due_date.slice(5, 7)}`
    : ''
  return `${milestone.name} · ${MILESTONE_KIND_LABEL[milestone.kind]}${date}`
}
