import { describe, expect, it } from 'vitest'
import {
  dependencySummary,
  drawingWrittenSummary,
  fieldsChangedSummary,
  gcalSyncSummary,
  jiraTransitionSummary,
  manualTimeSummary,
  notesWrittenSummary,
  subtaskDeletedSummary,
  subtasksCreatedSummary,
  timeEntrySummary
} from './operationSummary'

describe('fieldsChangedSummary', () => {
  it('lista os campos alterados pelo rótulo, sem valores', () => {
    expect(fieldsChangedSummary({ id: 1, due_date: '2026-12-01', project: 'CrafyTask' })).toBe(
      'Alterado: projeto, prazo'
    )
  })

  it('conta null (remoção) como alteração', () => {
    expect(fieldsChangedSummary({ id: 1, waiting_for: null })).toBe('Alterado: aguardando')
  })

  it('devolve null quando só o status mudou ou nada veio', () => {
    expect(fieldsChangedSummary({ id: 1, status: 'executando' })).toBeNull()
    expect(fieldsChangedSummary({ id: 1, detail: 'full', name: undefined })).toBeNull()
  })
})

describe('textos de operação', () => {
  it('notas', () => {
    expect(notesWrittenSummary('append', 1)).toBe('Notas: acréscimo de 1 bloco')
    expect(notesWrittenSummary('append', 3)).toBe('Notas: acréscimo de 3 blocos')
    expect(notesWrittenSummary('replace', 3)).toBe('Notas substituídas')
    expect(notesWrittenSummary('section', 2)).toBe('Notas: seção substituída')
  })

  it('desenho', () => {
    expect(drawingWrittenSummary('append', 4)).toBe('Desenho: +4 elementos')
    expect(drawingWrittenSummary('replace', 4)).toBe('Desenho substituído')
  })

  it('dependências', () => {
    expect(dependencySummary('add', 12)).toBe('Passou a depender de #12')
    expect(dependencySummary('remove', 12)).toBe('Deixou de depender de #12')
  })

  it('tempo', () => {
    expect(manualTimeSummary(1)).toBe('Tempo manual: +1 minuto')
    expect(manualTimeSummary(30)).toBe('Tempo manual: +30 minutos')
    expect(timeEntrySummary('update')).toBe('Sessão de tempo corrigida')
    expect(timeEntrySummary('delete')).toBe('Sessão de tempo apagada')
    expect(timeEntrySummary('reset')).toBe('Tempo registrado zerado')
  })

  it('integrações', () => {
    expect(gcalSyncSummary(true)).toContain('ligada')
    expect(gcalSyncSummary(false)).toContain('desligada')
    expect(jiraTransitionSummary('Em revisão')).toBe('Jira: issue movida para "Em revisão"')
    expect(jiraTransitionSummary(null)).toBe('Jira: transição aplicada')
  })

  it('subtarefas, com nome longo cortado', () => {
    expect(subtasksCreatedSummary([{ id: 5, name: 'Filha' }])).toBe('Subtarefa criada: #5 Filha')
    expect(
      subtasksCreatedSummary([
        { id: 5, name: 'A' },
        { id: 6, name: 'B' }
      ])
    ).toBe('2 subtarefas criadas: #5, #6')
    const long = subtaskDeletedSummary({ id: 9, name: 'x'.repeat(200) })
    expect(long.length).toBeLessThan(110)
    expect(long.endsWith('…')).toBe(true)
  })
})
