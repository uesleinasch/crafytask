import { useEffect, useRef, useState } from 'react'
import { PAN_IGNORE_SELECTOR, horizontalWheelDelta } from '@renderer/lib/boardPan'

export function useBoardPan<T extends HTMLElement>(): {
  ref: React.RefObject<T | null>
  panning: boolean
} {
  const ref = useRef<T | null>(null)
  const [panning, setPanning] = useState(false)

  useEffect(() => {
    const board = ref.current
    if (!board) return
    let start: { x: number; left: number } | null = null

    const onWheel = (event: WheelEvent): void => {
      const delta = horizontalWheelDelta(event, board.scrollWidth > board.clientWidth)
      if (delta === null) return
      event.preventDefault()
      board.scrollLeft += delta
    }
    const onPointerDown = (event: PointerEvent): void => {
      if (event.button !== 0 || board.scrollWidth <= board.clientWidth) return
      if ((event.target as Element | null)?.closest(PAN_IGNORE_SELECTOR)) return
      start = { x: event.clientX, left: board.scrollLeft }
      board.setPointerCapture(event.pointerId)
      setPanning(true)
    }
    const onPointerMove = (event: PointerEvent): void => {
      if (start) board.scrollLeft = start.left - (event.clientX - start.x)
    }
    const onPointerEnd = (): void => {
      if (!start) return
      start = null
      setPanning(false)
    }

    board.addEventListener('wheel', onWheel, { passive: false })
    board.addEventListener('pointerdown', onPointerDown)
    board.addEventListener('pointermove', onPointerMove)
    board.addEventListener('pointerup', onPointerEnd)
    board.addEventListener('pointercancel', onPointerEnd)
    return () => {
      board.removeEventListener('wheel', onWheel)
      board.removeEventListener('pointerdown', onPointerDown)
      board.removeEventListener('pointermove', onPointerMove)
      board.removeEventListener('pointerup', onPointerEnd)
      board.removeEventListener('pointercancel', onPointerEnd)
    }
  }, [])

  return { ref, panning }
}
