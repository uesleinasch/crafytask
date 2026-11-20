import type { DrawingRenderPayload, DrawingRenderResult } from '@shared/drawingRender'

export const DRAWING_RENDER_TIMEOUT_MS = 20_000

export interface DrawingRenderBridge {
  request: (payload: DrawingRenderPayload) => Promise<DrawingRenderResult>
  resolve: (requestId: string, result: DrawingRenderResult) => void
}

type Send = (requestId: string, payload: DrawingRenderPayload) => boolean

export function createDrawingRenderBridge(
  send: Send,
  timeoutMs = DRAWING_RENDER_TIMEOUT_MS
): DrawingRenderBridge {
  const pending = new Map<string, (result: DrawingRenderResult) => void>()
  let counter = 0

  return {
    request(payload) {
      const requestId = `draw-${Date.now()}-${++counter}`
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          pending.delete(requestId)
          resolve({ ok: false, error: 'A janela do CrafyTask não respondeu a tempo.' })
        }, timeoutMs)
        pending.set(requestId, (result) => {
          clearTimeout(timer)
          pending.delete(requestId)
          resolve(result)
        })
        if (!send(requestId, payload)) {
          pending.get(requestId)?.({
            ok: false,
            error: 'A janela principal do CrafyTask não está disponível para gerar o desenho.'
          })
        }
      })
    },
    resolve(requestId, result) {
      pending.get(requestId)?.(result)
    }
  }
}
