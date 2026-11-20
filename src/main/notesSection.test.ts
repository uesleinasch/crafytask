import { describe, expect, it } from 'vitest'
import { markdownToProsemirror } from './markdownToProsemirror'
import { prosemirrorToMarkdown } from './notesMarkdown'
import { findSection, listHeadings, readSection, replaceSection } from './notesSection'

const SOURCE = [
  '# Projeto',
  'abertura',
  '## Contexto',
  'texto do contexto',
  '### Detalhe',
  'texto do detalhe',
  '## Plano',
  '- passo 1',
  '# Apêndice',
  'fim'
].join('\n\n')

const doc = (): ReturnType<typeof markdownToProsemirror> => markdownToProsemirror(SOURCE)
const md = (content: unknown[]): string =>
  prosemirrorToMarkdown(JSON.stringify({ type: 'doc', content }))
const body = (markdown: string): ReturnType<typeof markdownToProsemirror>['content'] =>
  markdownToProsemirror(markdown).content

describe('listHeadings', () => {
  it('lista os títulos com o nível', () => {
    expect(listHeadings(doc())).toEqual([
      { text: 'Projeto', level: 1 },
      { text: 'Contexto', level: 2 },
      { text: 'Detalhe', level: 3 },
      { text: 'Plano', level: 2 },
      { text: 'Apêndice', level: 1 }
    ])
  })
})

describe('readSection', () => {
  it('lê do título até o próximo de nível igual ou maior, com os subtítulos dentro', () => {
    const section = readSection(doc(), 'Contexto')
    expect(section.ok && md(section.content)).toBe(
      '## Contexto\n\ntexto do contexto\n\n### Detalhe\n\ntexto do detalhe'
    )
  })

  it('aceita o título com #, caixa e espaços diferentes', () => {
    expect(findSection(doc(), '##  contexto ').ok).toBe(true)
  })

  it('o último título vai até o fim do documento', () => {
    const section = readSection(doc(), 'Apêndice')
    expect(section.ok && md(section.content)).toBe('# Apêndice\n\nfim')
  })
})

describe('replaceSection', () => {
  it('troca só o meio do documento e devolve o que saiu', () => {
    const result = replaceSection(doc(), 'Plano', body('- passo novo\n- outro'))
    if (!result.ok) throw new Error('esperava ok')
    expect(md(result.previous)).toBe('- passo 1')
    expect(md(result.doc.content)).toBe(SOURCE.replace('- passo 1', '- passo novo\n- outro'))
  })

  it('seção com subtítulos: os subtítulos saem junto', () => {
    const result = replaceSection(doc(), 'Contexto', body('resumo novo'))
    if (!result.ok) throw new Error('esperava ok')
    expect(md(result.previous)).toBe('texto do contexto\n\n### Detalhe\n\ntexto do detalhe')
    expect(listHeadings(result.doc).map((heading) => heading.text)).toEqual([
      'Projeto',
      'Contexto',
      'Plano',
      'Apêndice'
    ])
  })

  it('subtítulo: troca só ele, o título de cima fica', () => {
    const result = replaceSection(doc(), 'Detalhe', body('detalhe novo'))
    if (!result.ok) throw new Error('esperava ok')
    expect(md(result.doc.content)).toBe(SOURCE.replace('texto do detalhe', 'detalhe novo'))
  })

  it('último título: troca até o fim', () => {
    const result = replaceSection(doc(), 'Apêndice', body('novo fim\n\nmais uma linha'))
    if (!result.ok) throw new Error('esperava ok')
    expect(md(result.doc.content).endsWith('# Apêndice\n\nnovo fim\n\nmais uma linha')).toBe(true)
  })

  it('conteúdo novo que repete o título não duplica o título', () => {
    const result = replaceSection(doc(), 'Plano', body('## Plano\n\n- passo novo'))
    if (!result.ok) throw new Error('esperava ok')
    expect(md(result.doc.content)).toBe(SOURCE.replace('- passo 1', '- passo novo'))
  })

  it('não muda o documento original', () => {
    const original = doc()
    const before = JSON.stringify(original)
    replaceSection(original, 'Plano', body('x'))
    expect(JSON.stringify(original)).toBe(before)
  })

  it('título não encontrado devolve a lista de títulos', () => {
    const result = replaceSection(doc(), 'Riscos', body('x'))
    expect(result).toMatchObject({ ok: false, code: 'not_found' })
    expect(!result.ok && result.headings).toHaveLength(5)
  })

  it('título repetido é ambíguo', () => {
    const repeated = markdownToProsemirror('## Notas\n\na\n\n## Notas\n\nb')
    expect(replaceSection(repeated, 'Notas', body('x'))).toMatchObject({
      ok: false,
      code: 'ambiguous'
    })
  })
})
