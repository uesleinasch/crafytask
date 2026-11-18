import { describe, expect, it } from 'vitest'
import { archiveCutoff, isIsoDate } from './archiveAge'

describe('archiveCutoff', () => {
  it('volta N meses a partir de hoje', () => {
    expect(archiveCutoff(3, new Date(2026, 10, 18))).toBe('2026-08-18')
    expect(archiveCutoff(12, new Date(2026, 10, 18))).toBe('2025-11-18')
    expect(archiveCutoff(24, new Date(2026, 0, 5))).toBe('2024-01-05')
  })

  it('para no último dia quando o mês de destino é mais curto', () => {
    expect(archiveCutoff(3, new Date(2026, 4, 31))).toBe('2026-02-28')
    expect(archiveCutoff(6, new Date(2026, 7, 31))).toBe('2026-02-28')
  })
})

describe('isIsoDate', () => {
  it('aceita só AAAA-MM-DD', () => {
    expect(isIsoDate('2026-11-18')).toBe(true)
    expect(isIsoDate('2026-11-18 10:00')).toBe(false)
    expect(isIsoDate(20261118)).toBe(false)
  })
})
