import { describe, expect, it } from 'vitest'
import type { Area, Project } from '@shared/types'
import {
  deleteWarning,
  dueHint,
  dueTone,
  groupByArea,
  isStalled,
  lacksNextAction,
  noNextActionNotice,
  progressPercent,
  stalledNotice,
  statusCounts,
  visibleProjects,
  type ProjectFilters
} from './projectList'

const project = (patch: Partial<Project>): Project => ({
  id: 1,
  name: 'P',
  status: 'active',
  color: '#2A62D6',
  created_at: '2026-11-01',
  updated_at: '2026-11-01',
  task_count: 0,
  completed_task_count: 0,
  ...patch
})

const projects = [
  project({
    id: 1,
    name: 'Site',
    area_id: 1,
    area_name: 'Carreira',
    due_date: '2026-12-01',
    task_count: 4,
    completed_task_count: 1,
    next_action: 'Deploy',
    updated_at: '2026-11-10'
  }),
  project({
    id: 2,
    name: 'Mudança',
    outcome: 'Casa nova arrumada',
    task_count: 2,
    completed_task_count: 0,
    updated_at: '2026-11-12'
  }),
  project({
    id: 3,
    name: 'Livro',
    status: 'someday',
    due_date: '2026-11-20',
    task_count: 2,
    completed_task_count: 2,
    updated_at: '2026-11-01'
  }),
  project({ id: 4, name: 'Vazio', area_id: 9, updated_at: '2026-11-05' })
]

const base: ProjectFilters = { tab: 'all', search: '', onlyWithoutNext: false, sort: 'due' }

describe('lista de projetos', () => {
  it('sem próxima ação: ativo, com tarefa aberta e sem próxima', () => {
    expect(projects.map(lacksNextAction)).toEqual([false, true, false, false])
    expect(progressPercent(projects[0])).toBe(25)
    expect(progressPercent(projects[3])).toBe(0)
  })

  it('conta por status', () => {
    expect(statusCounts(projects)).toEqual({ all: 4, active: 3, someday: 1, done: 0, archived: 0 })
  })

  it('filtra por aba, busca em nome, resultado e área, e só sem próxima ação', () => {
    const names = (f: Partial<ProjectFilters>): string[] =>
      visibleProjects(projects, { ...base, ...f }).map((p) => p.name)
    expect(names({ tab: 'someday' })).toEqual(['Livro'])
    expect(names({ search: 'casa NOVA' })).toEqual(['Mudança'])
    expect(names({ search: 'carreira' })).toEqual(['Site'])
    expect(names({ onlyWithoutNext: true })).toEqual(['Mudança'])
  })

  it('ordena por prazo (sem prazo no fim), progresso, recentes e nome', () => {
    const names = (sort: ProjectFilters['sort']): string[] =>
      visibleProjects(projects, { ...base, sort }).map((p) => p.name)
    expect(names('due')).toEqual(['Livro', 'Site', 'Mudança', 'Vazio'])
    expect(names('progress')).toEqual(['Livro', 'Site', 'Mudança', 'Vazio'])
    expect(names('updated')).toEqual(['Mudança', 'Site', 'Vazio', 'Livro'])
    expect(names('name')).toEqual(['Livro', 'Mudança', 'Site', 'Vazio'])
  })

  it('agrupa por área na ordem das áreas; área sumida cai em Sem área', () => {
    const areas = [
      { id: 1, name: 'Carreira' },
      { id: 2, name: 'Saúde' }
    ] as Area[]
    expect(groupByArea(projects, areas).map((g) => [g.name, g.projects.map((p) => p.id)])).toEqual([
      ['Carreira', [1]],
      ['Sem área', [2, 3, 4]]
    ])
  })

  it('prazo: âmbar a 7 dias e vermelho vencido, só em projeto ativo', () => {
    const today = '2026-11-19'
    expect(dueTone(project({ due_date: '2026-11-18' }), today)).toBe('overdue')
    expect(dueTone(project({ due_date: '2026-11-26' }), today)).toBe('soon')
    expect(dueTone(project({ due_date: '2026-11-27' }), today)).toBeNull()
    expect(dueTone(project({ due_date: '2026-11-18', status: 'done' }), today)).toBeNull()
    expect(dueHint('2026-11-18', today)).toBe('Venceu há 1 dia')
    expect(dueHint('2026-11-19', today)).toBe('Vence hoje')
    expect(dueHint('2026-11-22', today)).toBe('Faltam 3 dias')
  })

  it('textos de aviso e exclusão', () => {
    expect(noNextActionNotice(1)).toBe('1 projeto ativo está sem próxima ação.')
    expect(noNextActionNotice(3)).toBe('3 projetos ativos estão sem próxima ação.')
    expect(deleteWarning(project({ task_count: 0 }))).toBe('O projeto não tem tarefas.')
    expect(deleteWarning(project({ task_count: 1 }))).toBe(
      'A tarefa dele não é apagada: fica sem projeto.'
    )
    expect(deleteWarning(project({ task_count: 5 }))).toBe(
      'As 5 tarefas dele não são apagadas: ficam sem projeto.'
    )
  })
})

describe('projetos parados', () => {
  const now = new Date('2026-11-19T15:00:00.000Z')
  const old = project({ id: 1, name: 'Velho', last_activity_at: '2026-11-05 10:00:00' })
  const recent = project({ id: 2, name: 'Novo', last_activity_at: '2026-11-18 10:00:00' })
  const paused = project({ id: 3, status: 'someday', last_activity_at: '2026-10-01 10:00:00' })

  it('parado é ativo e sem atividade há mais de 7 dias', () => {
    expect(isStalled(old, now)).toBe(true)
    expect(isStalled(recent, now)).toBe(false)
    expect(isStalled(paused, now)).toBe(false)
    expect(isStalled(project({}), now)).toBe(false)
  })

  it('filtra só os parados e ordena pelo mais parado', () => {
    const rows = visibleProjects([recent, old, paused], {
      tab: 'all',
      search: '',
      onlyWithoutNext: false,
      onlyStalled: true,
      now,
      sort: 'activity'
    })
    expect(rows.map((p) => p.name)).toEqual(['Velho'])
    const sorted = visibleProjects([recent, old], { ...base, sort: 'activity' })
    expect(sorted.map((p) => p.name)).toEqual(['Velho', 'Novo'])
    expect(stalledNotice(2)).toBe('2 projetos ativos estão parados.')
  })
})
