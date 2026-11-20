import { describe, expect, it } from 'vitest'
import { resolveSteps, toggleStepDone } from './stepProgress'

describe('resolveSteps', () => {
  it('marca como feitos os passos manuais salvos e os automáticos verdadeiros', () => {
    const steps = resolveSteps(
      [
        { id: 'projeto' },
        { id: 'api' },
        { id: 'client', autoDone: true },
        { id: 'conectar', autoDone: false }
      ],
      ['api']
    )
    expect(steps.map((s) => [s.id, s.done])).toEqual([
      ['projeto', true],
      ['api', true],
      ['client', true],
      ['conectar', false]
    ])
  })

  it('passos manuais antes de um automático verdadeiro ficam feitos e sem botão', () => {
    const steps = resolveSteps(
      [{ id: 'a' }, { id: 'b', autoDone: true }, { id: 'c' }, { id: 'd', autoDone: false }],
      []
    )
    expect(steps.map((s) => [s.id, s.done, s.manual])).toEqual([
      ['a', true, false],
      ['b', true, false],
      ['c', false, true],
      ['d', false, false]
    ])
  })

  it('manual salvo continua valendo quando nenhum automático depois dele está feito', () => {
    const steps = resolveSteps([{ id: 'a' }, { id: 'b' }, { id: 'c', autoDone: false }], ['a'])
    expect(steps.map((s) => s.done)).toEqual([true, false, false])
  })

  it('o passo atual é o primeiro não feito', () => {
    const steps = resolveSteps([{ id: 'a' }, { id: 'b' }, { id: 'c' }], ['a', 'c'])
    expect(steps.map((s) => s.current)).toEqual([false, true, false])
  })

  it('sem passo atual quando tudo foi feito', () => {
    const steps = resolveSteps([{ id: 'a' }, { id: 'b', autoDone: true }], ['a'])
    expect(steps.some((s) => s.current)).toBe(false)
  })

  it('autoDone falso prevalece sobre um id salvo', () => {
    const [step] = resolveSteps([{ id: 'conectar', autoDone: false }], ['conectar'])
    expect(step.done).toBe(false)
  })
})

describe('toggleStepDone', () => {
  it('acrescenta e remove o id sem duplicar', () => {
    expect(toggleStepDone(['a'], 'b')).toEqual(['a', 'b'])
    expect(toggleStepDone(['a', 'b'], 'a')).toEqual(['b'])
  })
})
