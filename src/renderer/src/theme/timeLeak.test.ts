import { describe, expect, it } from 'vitest'
import {
  TIME_LEAK_SCALE,
  TIME_LEAK_THRESHOLDS,
  timeLeakBackground,
  timeLeakLevel
} from './semantic'

describe('timeLeakLevel', () => {
  it('usa 30 min, 1 h e 2 h como limiares', () => {
    expect(TIME_LEAK_THRESHOLDS).toEqual([1800, 3600, 7200])
  })

  it('só pinta tarefa da categoria time leak', () => {
    expect(timeLeakLevel('normal', 99999)).toBe(0)
    expect(timeLeakLevel('urgente', 99999)).toBe(0)
    expect(timeLeakLevel(undefined, 99999)).toBe(0)
  })

  it('sobe de nível ao cruzar cada limiar', () => {
    expect(timeLeakLevel('time_leak', 0)).toBe(0)
    expect(timeLeakLevel('time_leak', 1799)).toBe(0)
    expect(timeLeakLevel('time_leak', 1800)).toBe(1)
    expect(timeLeakLevel('time_leak', 3599)).toBe(1)
    expect(timeLeakLevel('time_leak', 3600)).toBe(2)
    expect(timeLeakLevel('time_leak', 7199)).toBe(2)
    expect(timeLeakLevel('time_leak', 7200)).toBe(3)
    expect(timeLeakLevel('time_leak', 50000)).toBe(3)
  })

  it('aceita limiares configurados', () => {
    expect(timeLeakLevel('time_leak', 600, [300, 900, 1200])).toBe(1)
  })
})

describe('timeLeakBackground', () => {
  it('não pinta o nível 0 e usa a escala do tema nos outros', () => {
    expect(timeLeakBackground('light', 0)).toBeUndefined()
    expect(timeLeakBackground('light', 1)).toBe(TIME_LEAK_SCALE.light[0])
    expect(timeLeakBackground('dark', 3)).toBe(TIME_LEAK_SCALE.dark[2])
  })
})
