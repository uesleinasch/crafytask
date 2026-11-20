import type { CSSProperties } from 'react'

const PAD = 8

export function inlineEditStyle(style: CSSProperties = {}): CSSProperties {
  return {
    paddingBlock: 2,
    ...style,
    paddingInline: PAD,
    marginInline: -PAD,
    width: `calc(100% + ${PAD * 2}px)`
  }
}
