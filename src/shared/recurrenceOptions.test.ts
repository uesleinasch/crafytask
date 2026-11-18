import { describe, expect, it } from 'vitest'
import { recurrenceLabel, recurrenceOptionValue } from './recurrenceOptions'

describe('recurrenceOptionValue', () => {
  it('mapeia vazio para none', () => {
    expect(recurrenceOptionValue(null)).toBe('none')
  })

  it('acha a opção pelo tipo mesmo com campos extras', () => {
    expect(recurrenceOptionValue('{"type":"weekly","interval":1}')).toBe('{"type":"weekly"}')
  })

  it('devolve a regra crua quando o JSON é inválido', () => {
    expect(recurrenceOptionValue('xx')).toBe('xx')
  })
})

describe('recurrenceLabel', () => {
  it('dá o rótulo da opção', () => {
    expect(recurrenceLabel('{"type":"daily"}')).toBe('Diária')
    expect(recurrenceLabel(undefined)).toBe('Não repete')
  })

  it('cai em Personalizada para tipo desconhecido', () => {
    expect(recurrenceLabel('{"type":"yearly"}')).toBe('Personalizada')
  })
})
