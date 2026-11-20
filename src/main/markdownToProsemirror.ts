// Conversor puro: Markdown -> documento ProseMirror (Tiptap). Caminho inverso de notesMarkdown.ts.
// Os nomes de nó e mark seguem exatamente os `case` reconhecidos por prosemirrorToMarkdown.

export interface PMMark {
  type: string
  attrs?: Record<string, unknown>
}

export interface PMNode {
  type: string
  attrs?: Record<string, unknown>
  content?: PMNode[]
  text?: string
  marks?: PMMark[]
}

export interface PMDoc {
  type: 'doc'
  content: PMNode[]
}

export const MENTION_ENTITY_TYPES = ['task', 'project', 'page', 'context'] as const
export type MentionEntityType = (typeof MENTION_ENTITY_TYPES)[number]

export interface MarkdownParseOptions {
  /** Menção a algo que não existe vira texto puro. Sem a função, toda menção é aceita. */
  mentionExists?: (entityType: MentionEntityType, id: number) => boolean
}

const INLINE = new RegExp(
  [
    '(`[^`]+`)',
    `(@\\[[^\\]]+\\]\\((?:${MENTION_ENTITY_TYPES.join('|')}):\\d+\\))`,
    '(\\[[^\\]]+\\]\\([^)]+\\))',
    '(==.+?==)',
    '(\\*\\*\\*.+?\\*\\*\\*)',
    '(\\*\\*.+?\\*\\*)',
    '(\\*[^*]+\\*)',
    '(~~.+?~~)',
    '(<u>.+?</u>)'
  ].join('|'),
  'g'
)

function textNode(text: string, marks: PMMark[]): PMNode {
  return marks.length > 0 ? { type: 'text', text, marks } : { type: 'text', text }
}

function mentionNode(token: string, marks: PMMark[], options: MarkdownParseOptions): PMNode {
  const [, label, entityType, rawId] = token.match(
    /^@\[([^\]]+)\]\((\w+):(\d+)\)$/
  ) as RegExpMatchArray
  const id = Number(rawId)
  const exists = options.mentionExists?.(entityType as MentionEntityType, id) ?? true
  if (!exists) return textNode(`@${label}`, marks)
  return { type: 'mention', attrs: { id, label, entityType } }
}

function inline(line: string, marks: PMMark[], options: MarkdownParseOptions): PMNode[] {
  const nodes: PMNode[] = []
  let cursor = 0
  const nested = (inner: string, ...added: PMMark[]): void => {
    nodes.push(...inline(inner, [...marks, ...added], options))
  }

  for (const match of line.matchAll(INLINE)) {
    const token = match[0]
    const start = match.index ?? 0
    if (start > cursor) nodes.push(textNode(line.slice(cursor, start), marks))

    if (match[1]) {
      nodes.push(textNode(token.slice(1, -1), [{ type: 'code' }]))
    } else if (match[2]) {
      nodes.push(mentionNode(token, marks, options))
    } else if (match[3]) {
      const [, text, href] = token.match(/\[([^\]]+)\]\(([^)]+)\)/) as RegExpMatchArray
      nested(text, { type: 'link', attrs: { href } })
    } else if (match[4]) {
      nested(token.slice(2, -2), { type: 'highlight' })
    } else if (match[5]) {
      nested(token.slice(3, -3), { type: 'bold' }, { type: 'italic' })
    } else if (match[6]) {
      nested(token.slice(2, -2), { type: 'bold' })
    } else if (match[7]) {
      nested(token.slice(1, -1), { type: 'italic' })
    } else if (match[8]) {
      nested(token.slice(2, -2), { type: 'strike' })
    } else {
      nested(token.slice(3, -4), { type: 'underline' })
    }

    cursor = start + token.length
  }

  if (cursor < line.length) nodes.push(textNode(line.slice(cursor), marks))
  return nodes
}

export function parseInline(line: string, options: MarkdownParseOptions = {}): PMNode[] {
  return inline(line, [], options)
}

const TASK_ITEM = /^[-*]\s+\[([ xX])\]\s+(.*)$/
const BULLET_ITEM = /^[-*]\s+(.*)$/
const ORDERED_ITEM = /^\d+[.)]\s+(.*)$/
const TABLE_SEPARATOR = /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?$/

type ListKind = 'taskList' | 'bulletList' | 'orderedList'

function listKind(line: string): ListKind | null {
  if (TASK_ITEM.test(line)) return 'taskList'
  if (BULLET_ITEM.test(line)) return 'bulletList'
  if (ORDERED_ITEM.test(line)) return 'orderedList'
  return null
}

function splitTableRow(line: string): string[] {
  const inner = line
    .trim()
    .replace(/^\|/, '')
    .replace(/(?<!\\)\|$/, '')
  return inner.split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, '|'))
}

export function markdownToProsemirror(markdown: string, options: MarkdownParseOptions = {}): PMDoc {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const content: PMNode[] = []
  const paragraph = (line: string): PMNode => ({
    type: 'paragraph',
    content: parseInline(line, options)
  })
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    const trimmed = line.trim()

    if (trimmed.length === 0) {
      index += 1
      continue
    }

    const fence = trimmed.match(/^```(\w*)$/)
    if (fence) {
      const body: string[] = []
      index += 1
      while (index < lines.length && lines[index].trim() !== '```') {
        body.push(lines[index])
        index += 1
      }
      index += 1
      const bodyText = body.join('\n')
      content.push({
        type: 'codeBlock',
        attrs: { language: fence[1] || null },
        content: bodyText.length > 0 ? [{ type: 'text', text: bodyText }] : undefined
      })
      continue
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      content.push({ type: 'horizontalRule' })
      index += 1
      continue
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.*)$/)
    if (heading) {
      content.push({
        type: 'heading',
        attrs: { level: heading[1].length },
        content: parseInline(heading[2], options)
      })
      index += 1
      continue
    }

    if (trimmed.startsWith('> ')) {
      const body: string[] = []
      while (index < lines.length && lines[index].trim().startsWith('> ')) {
        body.push(lines[index].trim().slice(2))
        index += 1
      }
      content.push({ type: 'blockquote', content: body.map(paragraph) })
      continue
    }

    if (trimmed.startsWith('|') && TABLE_SEPARATOR.test(lines[index + 1]?.trim() ?? '')) {
      const header = splitTableRow(trimmed)
      const rows: PMNode[] = [
        {
          type: 'tableRow',
          content: header.map((cell) => ({ type: 'tableHeader', content: [paragraph(cell)] }))
        }
      ]
      index += 2
      while (index < lines.length && lines[index].trim().startsWith('|')) {
        const cells = splitTableRow(lines[index]).slice(0, header.length)
        while (cells.length < header.length) cells.push('')
        rows.push({
          type: 'tableRow',
          content: cells.map((cell) => ({ type: 'tableCell', content: [paragraph(cell)] }))
        })
        index += 1
      }
      content.push({ type: 'table', content: rows })
      continue
    }

    const kind = listKind(trimmed)
    if (kind) {
      const items: PMNode[] = []
      while (index < lines.length && listKind(lines[index].trim()) === kind) {
        const current = lines[index].trim()
        if (kind === 'taskList') {
          const [, mark, text] = current.match(TASK_ITEM) as RegExpMatchArray
          items.push({
            type: 'taskItem',
            attrs: { checked: mark !== ' ' },
            content: [paragraph(text)]
          })
        } else {
          const [, text] = current.match(
            kind === 'orderedList' ? ORDERED_ITEM : BULLET_ITEM
          ) as RegExpMatchArray
          items.push({ type: 'listItem', content: [paragraph(text)] })
        }
        index += 1
      }
      content.push({ type: kind, content: items })
      continue
    }

    content.push(paragraph(trimmed))
    index += 1
  }

  return { type: 'doc', content }
}
