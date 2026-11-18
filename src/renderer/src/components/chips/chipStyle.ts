import type { CSSProperties } from 'react'

export function chipStyle(fg: string, bg: string, border: string, radius: number): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    height: 22,
    paddingInline: 8,
    borderRadius: radius,
    fontSize: 12,
    fontWeight: 500,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    color: fg,
    background: bg,
    border: `1px solid ${border}`
  }
}
