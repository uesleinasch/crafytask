import type { Area, Project, ProjectStatus } from '@shared/types'

export type ProjectTab = ProjectStatus | 'all'
export type ProjectSort = 'due' | 'progress' | 'updated' | 'name'
export type ProjectView = 'cards' | 'table'

export const PROJECT_TABS: { key: ProjectTab; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'active', label: 'Ativos' },
  { key: 'someday', label: 'Someday' },
  { key: 'done', label: 'Concluídos' },
  { key: 'archived', label: 'Arquivados' }
]

export const SORT_OPTIONS: { value: ProjectSort; label: string }[] = [
  { value: 'due', label: 'Ordenar por prazo' },
  { value: 'progress', label: 'Ordenar por progresso' },
  { value: 'updated', label: 'Mais recentes' },
  { value: 'name', label: 'Ordenar por nome' }
]

export const NO_AREA = 'Sem área'

export function openTasks(project: Project): number {
  return (project.task_count ?? 0) - (project.completed_task_count ?? 0)
}

export function lacksNextAction(project: Project): boolean {
  return project.status === 'active' && openTasks(project) > 0 && !project.next_action
}

export function progressPercent(project: Project): number {
  const total = project.task_count ?? 0
  return total ? Math.round(((project.completed_task_count ?? 0) / total) * 100) : 0
}

export function statusCounts(projects: Project[]): Record<ProjectTab, number> {
  const counts: Record<ProjectTab, number> = {
    all: projects.length,
    active: 0,
    someday: 0,
    done: 0,
    archived: 0
  }
  for (const p of projects) counts[p.status] += 1
  return counts
}

function ratio(p: Project): number {
  return p.task_count ? (p.completed_task_count ?? 0) / p.task_count : 0
}

const SORTERS: Record<ProjectSort, (a: Project, b: Project) => number> = {
  due: (a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'),
  progress: (a, b) => ratio(b) - ratio(a),
  updated: (a, b) => b.updated_at.localeCompare(a.updated_at),
  name: (a, b) => a.name.localeCompare(b.name, 'pt-BR')
}

export interface ProjectFilters {
  tab: ProjectTab
  search: string
  onlyWithoutNext: boolean
  sort: ProjectSort
}

export function visibleProjects(projects: Project[], filters: ProjectFilters): Project[] {
  const needle = filters.search.trim().toLocaleLowerCase('pt-BR')
  return projects
    .filter((p) => filters.tab === 'all' || p.status === filters.tab)
    .filter(
      (p) =>
        !needle ||
        [p.name, p.outcome, p.description, p.area_name]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase('pt-BR')
          .includes(needle)
    )
    .filter((p) => !filters.onlyWithoutNext || lacksNextAction(p))
    .sort((a, b) => SORTERS[filters.sort](a, b) || a.id - b.id)
}

export interface ProjectGroup {
  key: string
  name: string
  projects: Project[]
}

export function groupByArea(projects: Project[], areas: Area[]): ProjectGroup[] {
  const groups: ProjectGroup[] = areas.map((a) => ({
    key: `a${a.id}`,
    name: a.name,
    projects: projects.filter((p) => p.area_id === a.id)
  }))
  groups.push({
    key: 'none',
    name: NO_AREA,
    projects: projects.filter((p) => !p.area_id || !areas.some((a) => a.id === p.area_id))
  })
  return groups.filter((g) => g.projects.length > 0)
}

export type DueTone = 'overdue' | 'soon' | null

export function daysUntil(date: string, today: string): number {
  const ms = Date.parse(`${date.slice(0, 10)}T12:00:00`) - Date.parse(`${today}T12:00:00`)
  return Math.round(ms / 86_400_000)
}

export function dueTone(project: Project, today: string): DueTone {
  if (!project.due_date || project.status !== 'active') return null
  const days = daysUntil(project.due_date, today)
  if (days < 0) return 'overdue'
  return days <= 7 ? 'soon' : null
}

export function dueHint(date: string, today: string): string {
  const days = daysUntil(date, today)
  if (days < 0) return `Venceu há ${-days} ${-days === 1 ? 'dia' : 'dias'}`
  if (days === 0) return 'Vence hoje'
  return `Faltam ${days} ${days === 1 ? 'dia' : 'dias'}`
}

export function deleteWarning(project: Project): string {
  const total = project.task_count ?? 0
  if (!total) return 'O projeto não tem tarefas.'
  return total === 1
    ? 'A tarefa dele não é apagada: fica sem projeto.'
    : `As ${total} tarefas dele não são apagadas: ficam sem projeto.`
}

export function noNextActionNotice(count: number): string {
  return count === 1
    ? '1 projeto ativo está sem próxima ação.'
    : `${count} projetos ativos estão sem próxima ação.`
}
