import { describe, expect, it } from 'vitest'
import type { WeeklyReview } from '@shared/types'
import { NAV_FOOTER, NAV_GROUPS, isWeeklyReviewOverdue, navKeyFor, screenTitle } from './navigation'

const review = (completed_at?: string): WeeklyReview => ({
  id: 1,
  started_at: '2026-11-01T10:00:00.000Z',
  completed_at,
  inbox_cleared: true,
  checklist_state: '{}'
})

describe('navegação', () => {
  it('tem os três grupos do guia e o rodapé', () => {
    expect(NAV_GROUPS.map((group) => group.label)).toEqual(['Fluxo', 'Organizar', 'Conhecimento'])
    expect(NAV_FOOTER.map((item) => item.route)).toEqual(['/archived', '/settings'])
  })

  it('marca o item da lista no detalhe da tarefa e o de projetos no detalhe do projeto', () => {
    expect(navKeyFor('/')).toBe('tasks')
    expect(navKeyFor('/task/42')).toBe('tasks')
    expect(navKeyFor('/project/7')).toBe('projects')
    expect(navKeyFor('/tags')).toBe('labels')
    expect(navKeyFor('/contexts')).toBe('labels')
    expect(navKeyFor('/settings')).toBe('settings')
    expect(navKeyFor('/float')).toBeNull()
  })

  it('dá título a cada tela', () => {
    expect(screenTitle('/')).toBe('Tarefas')
    expect(screenTitle('/task/1')).toBe('Tarefa')
    expect(screenTitle('/review')).toBe('Revisão semanal')
    expect(screenTitle('/tags')).toBe('Contextos e tags')
    expect(screenTitle('/contexts')).toBe('Contextos e tags')
    expect(screenTitle('/archived')).toBe('Arquivo')
  })
})

describe('revisão semanal atrasada', () => {
  const now = new Date('2026-11-18T12:00:00.000Z')

  it('está atrasada sem nenhuma revisão concluída', () => {
    expect(isWeeklyReviewOverdue([], now)).toBe(true)
    expect(isWeeklyReviewOverdue([review()], now)).toBe(true)
  })

  it('está em dia com revisão concluída nos últimos sete dias', () => {
    expect(isWeeklyReviewOverdue([review('2026-11-13T09:00:00.000Z')], now)).toBe(false)
    expect(isWeeklyReviewOverdue([review('2026-11-13 09:00:00')], now)).toBe(false)
  })

  it('atrasa quando a última concluída passou de sete dias', () => {
    expect(isWeeklyReviewOverdue([review('2026-11-10T09:00:00.000Z')], now)).toBe(true)
  })
})
