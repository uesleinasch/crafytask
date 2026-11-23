import type { Area, Goal, GoalHorizon, Project, Task } from '@shared/types'

export type HorizonLevel = 0 | 1 | 2 | GoalHorizon

export interface HorizonDef {
  h: HorizonLevel
  label: string
  sub: string
  emoji?: string
}

export const HORIZONS: HorizonDef[] = [
  { h: 0, label: 'Próximas ações', sub: 'O que está planejado para hoje' },
  { h: 1, label: 'Projetos', sub: 'Resultados em andamento' },
  { h: 2, label: 'Áreas de foco', sub: 'Responsabilidades e papéis' },
  { h: 3, label: 'Metas', sub: '1 a 2 anos', emoji: '🎯' },
  { h: 4, label: 'Visão', sub: '3 a 5 anos', emoji: '🔭' },
  { h: 5, label: 'Propósito', sub: 'Princípios e razão de ser', emoji: '✨' }
]

export const GOAL_HORIZONS = HORIZONS.filter(
  (lv): lv is HorizonDef & { h: GoalHorizon } => lv.h >= 3
)

export const AREA_ICONS = ['🎯', '💼', '🏋️', '🧠', '🏠', '❤️', '🌱', '💰', '🎨', '📚', '🤝', '⚡']

export function horizonSectionId(h: HorizonLevel): string {
  return `hz-${h}`
}

export interface HorizonData {
  areas: Area[]
  goals: Goal[]
  projects: Project[]
  today: Task[]
}

export interface HorizonView {
  today: Task[]
  projects: Project[]
  areas: Area[]
  goals: Record<GoalHorizon, Goal[]>
  doneGoals: Record<GoalHorizon, Goal[]>
}

export function filterByArea(data: HorizonData, areaId: number | null): HorizonView {
  const active = data.projects.filter((p) => p.status === 'active')
  const areaOf = new Map(data.projects.map((p) => [p.id, p.area_id ?? null]))
  const inArea = (id: number | null | undefined): boolean => areaId === null || id === areaId
  const goals = (h: GoalHorizon, done: boolean): Goal[] =>
    data.goals.filter(
      (g) =>
        g.horizon === h &&
        !!g.done_at === done &&
        (areaId === null || !g.area_id || g.area_id === areaId)
    )
  return {
    today: data.today.filter(
      (t) => t.status !== 'finalizada' && inArea(t.project_id ? areaOf.get(t.project_id) : null)
    ),
    projects: active.filter((p) => inArea(p.area_id)),
    areas: data.areas.filter((a) => inArea(a.id)),
    goals: { 3: goals(3, false), 4: goals(4, false), 5: goals(5, false) },
    doneGoals: { 3: goals(3, true), 4: goals(4, true), 5: goals(5, true) }
  }
}

export function areaCounts(
  area: Area,
  projects: Project[],
  goals: Goal[]
): { projects: number; goals: number } {
  return {
    projects: projects.filter((p) => p.status === 'active' && p.area_id === area.id).length,
    goals: goals.filter((g) => g.area_id === area.id && !g.done_at).length
  }
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

export function areaSummary(counts: { projects: number; goals: number }): string {
  return `${plural(counts.projects, 'projeto', 'projetos')} · ${plural(counts.goals, 'meta', 'metas')}`
}

export function deleteAreaWarning(area: Area, projects: Project[], goals: Goal[]): string {
  const np = projects.filter((p) => p.area_id === area.id).length
  const ng = goals.filter((g) => g.area_id === area.id).length
  if (!np && !ng) return 'Nenhum projeto ou meta usa esta área.'
  return `${plural(np, 'projeto', 'projetos')} e ${plural(ng, 'meta', 'metas')} ficam sem área. Nada mais é apagado.`
}

export function emptyLevelText(label: string, filtered: boolean): string {
  return `Nada em ${label.toLowerCase()}${filtered ? ' nesta área.' : '.'}`
}

export function doneGoalsToggle(open: boolean, count: number): string {
  return `${open ? 'Ocultar concluídas' : 'Mostrar concluídas'} (${count})`
}

export function goalDoneDate(doneAt: string): string {
  return `Concluída em ${doneAt.slice(8, 10)}/${doneAt.slice(5, 7)}/${doneAt.slice(0, 4)}`
}

export function finishGoalWarning(goal: Goal, projects: Project[]): string | null {
  const active = projects.filter((p) => p.goal_id === goal.id && p.status === 'active').length
  if (!active) return null
  return `${active === 1 ? '1 projeto ativo ainda serve' : `${active} projetos ativos ainda servem`} a esta meta. Eles continuam ligados a ela; reveja se ainda fazem sentido.`
}
