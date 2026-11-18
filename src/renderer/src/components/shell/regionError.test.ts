import { describe, expect, it } from 'vitest'
import { errorMessage, formatErrorDetails, regionResetKey, toErrorReport } from './regionError'

describe('regionResetKey', () => {
  it('muda ao trocar de rota, de id ou de página do caderno', () => {
    expect(regionResetKey('/task/1', '')).not.toBe(regionResetKey('/task/2', ''))
    expect(regionResetKey('/', '')).not.toBe(regionResetKey('/today', ''))
    expect(regionResetKey('/notebooks', '?page=1')).not.toBe(
      regionResetKey('/notebooks', '?page=2')
    )
  })

  it('fica igual na mesma rota', () => {
    expect(regionResetKey('/task/1', '')).toBe(regionResetKey('/task/1', ''))
  })
})

describe('detalhes do erro', () => {
  it('lê mensagem de Error, texto e objeto', () => {
    expect(errorMessage(new Error('falhou'))).toBe('falhou')
    expect(errorMessage('texto')).toBe('texto')
    expect(errorMessage({ code: 1 })).toBe('{"code":1}')
  })

  it('monta o texto copiado com região, hora, mensagem e pilha', () => {
    const error = new Error('quebrou')
    const text = formatErrorDetails('Tarefas', error, new Date('2026-11-18T12:00:00.000Z'))
    expect(text).toContain('Região: Tarefas')
    expect(text).toContain('Quando: 2026-11-18T12:00:00.000Z')
    expect(text).toContain('Erro: quebrou')
    expect(text).toContain(error.stack as string)
  })

  it('leva a pilha de componentes para o log do main', () => {
    const report = toErrorReport('caught', new Error('x'), '\n    at Lista', 'Tarefas')
    expect(report).toMatchObject({ kind: 'caught', region: 'Tarefas', message: 'x' })
    expect(report.componentStack).toContain('Lista')
  })
})
