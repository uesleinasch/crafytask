import { describe, expect, it } from 'vitest'
import { HISTORY_NOTE_BODY_LIMIT, historyNoteFromDoc } from './historyNote'

const doc = (...content: unknown[]): string => JSON.stringify({ type: 'doc', content })
const paragraph = (...content: unknown[]): unknown => ({ type: 'paragraph', content })
const text = (value: string, marks?: unknown[]): unknown => ({ type: 'text', text: value, marks })

describe('historyNoteFromDoc', () => {
  it('guarda o documento e resume em Markdown', () => {
    const json = doc(paragraph(text('Release '), text('só no fim', [{ type: 'bold' }])), {
      type: 'bulletList',
      content: [{ type: 'listItem', content: [paragraph(text('notas'))] }]
    })
    const note = historyNoteFromDoc(json)
    expect(note.body).toBe(json)
    expect(note.summary).toBe('Release **só no fim**\n\n- notas')
  })

  it('escreve a menção como link que o MCP lê', () => {
    const json = doc(
      paragraph(text('ver '), {
        type: 'mention',
        attrs: { id: 12, label: 'Deploy', entityType: 'task' }
      })
    )
    expect(historyNoteFromDoc(json).summary).toBe('ver @[Deploy](task:12)')
  })

  it('aceita anotação só com imagem', () => {
    const json = doc({ type: 'image', attrs: { src: 'ticktask-asset://a/1.png', assetId: 'abc' } })
    expect(historyNoteFromDoc(json).summary).toContain('abc')
  })

  it('recusa documento vazio, inválido ou grande demais', () => {
    expect(() => historyNoteFromDoc(doc(paragraph()))).toThrow('vazia')
    expect(() => historyNoteFromDoc('{nao é json')).toThrow('vazia')
    expect(() => historyNoteFromDoc('x'.repeat(HISTORY_NOTE_BODY_LIMIT + 1))).toThrow('tamanho')
  })
})
