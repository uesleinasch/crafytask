import { describe, expect, it } from 'vitest'
import { plural, todayToggle } from './bulkActionText'

describe('plural', () => {
  it('usa o singular só para um', () => {
    expect(plural(1, 'tarefa arquivada', 'tarefas arquivadas')).toBe('1 tarefa arquivada')
    expect(plural(3, 'tarefa arquivada', 'tarefas arquivadas')).toBe('3 tarefas arquivadas')
    expect(plural(0, 'tarefa', 'tarefas')).toBe('0 tarefas')
  })
})

describe('todayToggle', () => {
  const today = '2026-11-18'

  it('planeja para hoje se alguma ainda não está no plano', () => {
    expect(todayToggle([{ scheduled_date: today }, { scheduled_date: null }], today)).toEqual({
      date: today,
      success: 'No plano de hoje'
    })
  })

  it('tira do plano quando todas já estão em hoje', () => {
    expect(todayToggle([{ scheduled_date: today }, { scheduled_date: today }], today)).toEqual({
      date: null,
      success: 'Fora do plano de hoje'
    })
  })
})
