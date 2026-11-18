import { describe, expect, it } from 'vitest'
import {
  MAX_RELOADS_IN_WINDOW,
  RELOAD_WINDOW_MS,
  recentReloads,
  shouldReloadRenderer
} from './rendererRecovery'

describe('recuperação do renderer', () => {
  const now = 1_000_000

  it('recarrega depois de crash, kill ou falta de memória', () => {
    for (const reason of ['crashed', 'killed', 'oom', 'abnormal-exit', 'memory-eviction']) {
      expect(shouldReloadRenderer(reason, [], now)).toBe(true)
    }
  })

  it('não recarrega em saída limpa nem em falha de inicialização', () => {
    for (const reason of ['clean-exit', 'launch-failed', 'integrity-failure']) {
      expect(shouldReloadRenderer(reason, [], now)).toBe(false)
    }
  })

  it('para de recarregar quando cai em laço', () => {
    const reloads = Array.from({ length: MAX_RELOADS_IN_WINDOW }, (_, i) => now - i * 1000)
    expect(shouldReloadRenderer('crashed', reloads, now)).toBe(false)
  })

  it('esquece recargas fora da janela de tempo', () => {
    const old = Array.from({ length: MAX_RELOADS_IN_WINDOW }, () => now - RELOAD_WINDOW_MS)
    expect(recentReloads(old, now)).toEqual([])
    expect(shouldReloadRenderer('crashed', old, now)).toBe(true)
  })
})
