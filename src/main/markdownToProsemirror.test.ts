import { describe, expect, it } from 'vitest'
import { markdownToProsemirror, type PMNode } from './markdownToProsemirror'
import { prosemirrorToMarkdown } from './notesMarkdown'

describe('markdownToProsemirror', () => {
  it('converte parágrafo simples e separa parágrafos por linha em branco', () => {
    expect(markdownToProsemirror('Olá mundo')).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Olá mundo' }] }]
    })

    const doc = markdownToProsemirror('Um\n\nDois')
    expect(doc.content).toHaveLength(2)
    expect(doc.content[1].content?.[0].text).toBe('Dois')
  })

  it('converte headings de 1 a 3', () => {
    const doc = markdownToProsemirror('# A\n\n## B\n\n### C')
    expect(doc.content.map((node) => node.attrs?.level)).toEqual([1, 2, 3])
    expect(doc.content.every((node) => node.type === 'heading')).toBe(true)
  })

  it('converte lista não ordenada', () => {
    const doc = markdownToProsemirror('- um\n- dois')
    expect(doc.content[0].type).toBe('bulletList')
    expect(doc.content[0].content).toHaveLength(2)
    expect(doc.content[0].content?.[0].type).toBe('listItem')
  })

  it('converte negrito, itálico e código inline numa só passada', () => {
    const doc = markdownToProsemirror('texto **forte**, *leve* e `codigo`')
    const marks = doc.content[0].content?.flatMap((node) => node.marks?.map((m) => m.type) ?? [])
    expect(marks).toContain('bold')
    expect(marks).toContain('italic')
    expect(marks).toContain('code')
  })

  it('converte bloco de código preservando a linguagem', () => {
    const doc = markdownToProsemirror('```ts\nconst a = 1\n```')
    expect(doc.content[0].type).toBe('codeBlock')
    expect(doc.content[0].attrs?.language).toBe('ts')
    expect(doc.content[0].content?.[0].text).toBe('const a = 1')
  })

  it('não emite nó de texto vazio em code fence vazio', () => {
    const doc = markdownToProsemirror('```\n```')
    expect(doc.content[0].type).toBe('codeBlock')
    expect(doc.content[0].content).toBeUndefined()
  })

  it('não emite nó de texto vazio em code fence só com linha em branco', () => {
    const doc = markdownToProsemirror('```\n\n```')
    expect(doc.content[0].type).toBe('codeBlock')
    expect(doc.content[0].content).toBeUndefined()
  })

  it('sobrevive ao round-trip do subconjunto suportado', () => {
    const original = '# Título\n\nTexto com **forte**.\n\n- um\n- dois'
    const roundTrip = prosemirrorToMarkdown(JSON.stringify(markdownToProsemirror(original)))
    expect(roundTrip).toContain('# Título')
    expect(roundTrip).toContain('**forte**')
    expect(roundTrip).toContain('- um')
  })
})

describe('ida e volta (ProseMirror -> Markdown -> ProseMirror)', () => {
  const text = (value: string, ...marks: string[]): PMNode =>
    marks.length > 0
      ? { type: 'text', text: value, marks: marks.map((type) => ({ type })) }
      : { type: 'text', text: value }
  const paragraph = (...content: PMNode[]): PMNode => ({ type: 'paragraph', content })
  const roundTrip = (content: PMNode[]): PMNode[] => {
    const markdown = prosemirrorToMarkdown(JSON.stringify({ type: 'doc', content }), undefined, {
      mentionLinks: true
    })
    return markdownToProsemirror(markdown).content
  }

  it('checklist', () => {
    const content: PMNode[] = [
      {
        type: 'taskList',
        content: [
          { type: 'taskItem', attrs: { checked: false }, content: [paragraph(text('abrir PR'))] },
          { type: 'taskItem', attrs: { checked: true }, content: [paragraph(text('testar'))] }
        ]
      }
    ]
    expect(roundTrip(content)).toEqual(content)
  })

  it('checklist e lista comum vizinhas não se misturam', () => {
    const doc = markdownToProsemirror('- [ ] a fazer\n- item comum\n- [x] feito')
    expect(doc.content.map((node) => node.type)).toEqual(['taskList', 'bulletList', 'taskList'])
  })

  it('tabela, com célula vazia e barra vertical no texto', () => {
    const cell = (type: string, ...content: PMNode[]): PMNode => ({
      type,
      content: [{ type: 'paragraph', content }]
    })
    const content: PMNode[] = [
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [cell('tableHeader', text('Campo')), cell('tableHeader', text('Valor'))]
          },
          {
            type: 'tableRow',
            content: [cell('tableCell', text('a | b')), cell('tableCell', text('forte', 'bold'))]
          },
          { type: 'tableRow', content: [cell('tableCell', text('vazio')), cell('tableCell')] }
        ]
      }
    ]
    expect(roundTrip(content)).toEqual(content)
  })

  it('riscado, destaque e sublinhado', () => {
    const content = [
      paragraph(
        text('antes '),
        text('riscado', 'strike'),
        text(' meio '),
        text('destaque', 'highlight'),
        text(' e '),
        text('sublinhado', 'underline'),
        text(' fim')
      )
    ]
    expect(roundTrip(content)).toEqual(content)
  })

  it('marcas combinadas', () => {
    const content = [
      paragraph(
        text('negrito riscado', 'bold', 'strike'),
        text(' '),
        text('negrito itálico', 'bold', 'italic'),
        text(' '),
        text('destaque negrito', 'highlight', 'bold')
      )
    ]
    expect(roundTrip(content)).toEqual(content)
  })

  it('link com negrito dentro', () => {
    const content: PMNode[] = [
      paragraph({
        type: 'text',
        text: 'site',
        marks: [{ type: 'link', attrs: { href: 'https://exemplo.com' } }, { type: 'bold' }]
      })
    ]
    expect(roundTrip(content)).toEqual(content)
  })

  it('menção a task, projeto e página', () => {
    const mention = (entityType: string, id: number, label: string): PMNode => ({
      type: 'mention',
      attrs: { id, label, entityType }
    })
    const content = [
      paragraph(
        text('ver '),
        mention('task', 123, 'Fechar relatório'),
        text(', '),
        mention('project', 5, 'CrafyTask'),
        text(' e '),
        mention('page', 9, 'Ata de novembro')
      )
    ]
    expect(roundTrip(content)).toEqual(content)
  })

  it('títulos até o nível 6', () => {
    const content: PMNode[] = [4, 5, 6].map((level) => ({
      type: 'heading',
      attrs: { level },
      content: [text(`Nível ${level}`)]
    }))
    expect(roundTrip(content)).toEqual(content)
  })
})

describe('menções', () => {
  it('id que não existe vira texto puro', () => {
    const doc = markdownToProsemirror('ver @[Sumiu](task:99) e @[Fica](task:1)', {
      mentionExists: (_type, id) => id === 1
    })
    expect(doc.content[0].content).toEqual([
      { type: 'text', text: 'ver ' },
      { type: 'text', text: '@Sumiu' },
      { type: 'text', text: ' e ' },
      { type: 'mention', attrs: { id: 1, label: 'Fica', entityType: 'task' } }
    ])
  })

  it('tipo desconhecido não é menção', () => {
    const doc = markdownToProsemirror('@[Algo](tag:3)')
    expect(JSON.stringify(doc)).not.toContain('"mention"')
  })

  it('sem mentionLinks o Markdown mostra só @Nome', () => {
    const json = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'mention', attrs: { id: 3, label: 'Task', entityType: 'task' } }]
        }
      ]
    })
    expect(prosemirrorToMarkdown(json)).toBe('@Task')
    expect(prosemirrorToMarkdown(json, undefined, { mentionLinks: true })).toBe('@[Task](task:3)')
  })
})
