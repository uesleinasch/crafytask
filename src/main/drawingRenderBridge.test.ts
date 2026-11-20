import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDrawingRenderBridge } from './drawingRenderBridge'

const PAYLOAD = { skeleton: [{ type: 'rectangle' }], base: null }
const DONE = { ok: true as const, drawing: '{}', preview: null, elements: 1 }

afterEach(() => vi.useRealTimers())

describe('createDrawingRenderBridge', () => {
  it('entrega o resultado ao pedido certo', async () => {
    const sent: string[] = []
    const bridge = createDrawingRenderBridge((id) => {
      sent.push(id)
      return true
    })
    const first = bridge.request(PAYLOAD)
    const second = bridge.request(PAYLOAD)
    expect(new Set(sent).size).toBe(2)

    bridge.resolve(sent[1], DONE)
    bridge.resolve(sent[0], { ok: false, error: 'falhou' })

    expect(await second).toEqual(DONE)
    expect(await first).toEqual({ ok: false, error: 'falhou' })
  })

  it('falha na hora quando não há janela para receber', async () => {
    const bridge = createDrawingRenderBridge(() => false)
    expect(await bridge.request(PAYLOAD)).toMatchObject({ ok: false })
  })

  it('desiste depois do tempo limite e ignora resposta atrasada', async () => {
    vi.useFakeTimers()
    let sentId = ''
    const bridge = createDrawingRenderBridge((id) => {
      sentId = id
      return true
    }, 1000)
    const result = bridge.request(PAYLOAD)
    vi.advanceTimersByTime(1000)
    expect(await result).toMatchObject({ ok: false })
    expect(() => bridge.resolve(sentId, DONE)).not.toThrow()
  })

  it('ignora resposta de pedido desconhecido', () => {
    const bridge = createDrawingRenderBridge(() => true)
    expect(() => bridge.resolve('nao-existe', DONE)).not.toThrow()
  })
})
