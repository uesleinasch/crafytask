import { describe, expect, it } from 'vitest'
import { USER_COLORS, userColorName } from '@renderer/theme/semantic'
import { moveIdOnto, plural, shiftId } from './notebookUi'

describe('moveIdOnto', () => {
  it('ocupa o lugar do alvo, para cima ou para baixo', () => {
    expect(moveIdOnto([1, 2, 3, 4], 1, 3)).toEqual([2, 3, 1, 4])
    expect(moveIdOnto([1, 2, 3, 4], 4, 2)).toEqual([1, 4, 2, 3])
  })

  it('ignora o próprio item e ids ausentes', () => {
    expect(moveIdOnto([1, 2], 1, 1)).toBeNull()
    expect(moveIdOnto([1, 2], 9, 1)).toBeNull()
  })
})

describe('shiftId', () => {
  it('troca com o vizinho e para nas pontas', () => {
    expect(shiftId([1, 2, 3], 2, -1)).toEqual([2, 1, 3])
    expect(shiftId([1, 2, 3], 2, 1)).toEqual([1, 3, 2])
    expect(shiftId([1, 2, 3], 1, -1)).toBeNull()
    expect(shiftId([1, 2, 3], 3, 1)).toBeNull()
  })
})

describe('rótulos', () => {
  it('toda cor da paleta tem nome', () => {
    for (const color of USER_COLORS) expect(userColorName(color.toLowerCase())).not.toBe('atual')
    expect(userColorName('#2a62d6')).toBe('azul')
    expect(userColorName('#123456')).toBe('atual')
  })

  it('plural', () => {
    expect(plural(1, 'seção', 'seções')).toBe('1 seção')
    expect(plural(3, 'seção', 'seções')).toBe('3 seções')
  })
})
