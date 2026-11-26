import { describe, expect, it } from 'vitest'
import { horizontalWheelDelta } from './boardPan'

describe('horizontalWheelDelta', () => {
  it('só desloca com Shift e quando o quadro passa da largura', () => {
    expect(horizontalWheelDelta({ shiftKey: true, deltaX: 0, deltaY: 120 }, true)).toBe(120)
    expect(horizontalWheelDelta({ shiftKey: false, deltaX: 0, deltaY: 120 }, true)).toBeNull()
    expect(horizontalWheelDelta({ shiftKey: true, deltaX: 0, deltaY: 120 }, false)).toBeNull()
  })

  it('usa o deltaX quando o sistema já converteu a rolagem', () => {
    expect(horizontalWheelDelta({ shiftKey: true, deltaX: -80, deltaY: 0 }, true)).toBe(-80)
    expect(horizontalWheelDelta({ shiftKey: true, deltaX: 0, deltaY: 0 }, true)).toBeNull()
  })
})
