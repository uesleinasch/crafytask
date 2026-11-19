import { describe, expect, it } from 'vitest'
import type { Area, Goal, Project, Task } from '@shared/types'
import {
  areaCounts,
  areaSummary,
  deleteAreaWarning,
  emptyLevelText,
  filterByArea,
  type HorizonData
} from './horizonLevels'

const areas = [
  { id: 1, name: 'Carreira', icon: '💼' },
  { id: 2, name: 'Saúde', icon: '🏋️' }
] as Area[]
const projects = [
  { id: 10, name: 'Site', status: 'active', area_id: 1 },
  { id: 11, name: 'Corrida', status: 'active', area_id: 2 },
  { id: 12, name: 'Antigo', status: 'done', area_id: 1 },
  { id: 13, name: 'Solto', status: 'active' }
] as Project[]
const goals = [
  { id: 1, name: 'Líder técnico', horizon: 3, area_id: 1 },
  { id: 2, name: 'Maratona', horizon: 3, area_id: 2 },
  { id: 3, name: 'Viver bem', horizon: 5 }
] as Goal[]
const today = [
  { id: 100, name: 'Deploy', status: 'proximas', project_id: 10 },
  { id: 101, name: 'Treino', status: 'executando', project_id: 11 },
  { id: 102, name: 'Avulsa', status: 'proximas' },
  { id: 103, name: 'Feita', status: 'finalizada', project_id: 10 }
] as Task[]
const data: HorizonData = { areas, goals, projects, today }

describe('horizontes', () => {
  it('sem filtro: ações abertas de hoje, projetos ativos, todas as áreas e metas por nível', () => {
    const view = filterByArea(data, null)
    expect(view.today.map((t) => t.id)).toEqual([100, 101, 102])
    expect(view.projects.map((p) => p.id)).toEqual([10, 11, 13])
    expect(view.areas).toHaveLength(2)
    expect([view.goals[3].length, view.goals[4].length, view.goals[5].length]).toEqual([2, 0, 1])
  })

  it('filtro por área atravessa os níveis; metas sem área aparecem em todas', () => {
    const view = filterByArea(data, 1)
    expect(view.today.map((t) => t.id)).toEqual([100])
    expect(view.projects.map((p) => p.id)).toEqual([10])
    expect(view.areas.map((a) => a.id)).toEqual([1])
    expect(view.goals[3].map((g) => g.id)).toEqual([1])
    expect(view.goals[5].map((g) => g.id)).toEqual([3])
  })

  it('contagens e textos de área', () => {
    expect(areaSummary(areaCounts(areas[0], projects, goals))).toBe('1 projeto · 1 meta')
    expect(areaSummary({ projects: 0, goals: 2 })).toBe('0 projetos · 2 metas')
    expect(deleteAreaWarning(areas[0], projects, goals)).toBe(
      '2 projetos e 1 meta ficam sem área. Nada mais é apagado.'
    )
    expect(deleteAreaWarning({ id: 9 } as Area, projects, goals)).toBe(
      'Nenhum projeto ou meta usa esta área.'
    )
    expect(emptyLevelText('Metas', true)).toBe('Nada em metas nesta área.')
  })
})
