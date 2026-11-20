import { describe, expect, it } from 'vitest'
import {
  capturarPrompt,
  encerrarPrompt,
  planejarDiaPrompt,
  retomarPrompt,
  revisaoPrompt
} from './prompts'

describe('textos dos prompts', () => {
  it('retomar usa o id quando vem e a pasta quando não vem', () => {
    expect(retomarPrompt('42')).toContain('task_id=42')
    expect(retomarPrompt('42')).not.toContain('directory')
    expect(retomarPrompt()).toContain('directory')
    expect(retomarPrompt()).toContain('(sem task_id)')
  })

  it('planejar-dia passa a data ao briefing só quando ela vem', () => {
    expect(planejarDiaPrompt('2026-11-23')).toContain('briefing com date=2026-11-23')
    expect(planejarDiaPrompt()).toContain('o dia de hoje')
    expect(planejarDiaPrompt()).not.toContain('date=')
    expect(planejarDiaPrompt()).toContain('Só depois do ok')
  })

  it('capturar leva o texto, aparado', () => {
    const text = capturarPrompt('  Ligar para o contador\n')
    expect(text.endsWith('Ligar para o contador')).toBe(true)
    expect(text).toContain('sem perguntar nada')
  })

  it('revisao e encerrar citam as tools que conduzem o fluxo', () => {
    expect(revisaoPrompt()).toContain('weekly_review')
    expect(revisaoPrompt()).toContain('action=complete')
    expect(encerrarPrompt()).toContain('action=status')
    expect(encerrarPrompt()).toContain('action=pause')
  })
})
