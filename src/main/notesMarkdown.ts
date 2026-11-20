// Conversor puro: documento ProseMirror (Tiptap) -> Markdown (GitHub-flavored).
// Sem I/O; testável isoladamente. Imagens são resolvidas para um caminho relativo.

interface PMMark {
  type: string
  attrs?: Record<string, unknown>
}
interface PMNode {
  type: string
  attrs?: Record<string, unknown>
  content?: PMNode[]
  text?: string
  marks?: PMMark[]
}

export type MarkdownImageResolver = (assetId: string) => string

export interface MarkdownRenderOptions {
  /** Escreve a menção como @[Nome](task:123), que markdownToProsemirror lê de volta. */
  mentionLinks?: boolean
}

const MENTION_TYPES = new Set(['task', 'project', 'page', 'context'])

function mentionToMarkdown(node: PMNode, options: MarkdownRenderOptions): string {
  const label = String(node.attrs?.label ?? '')
  const entityType = String(node.attrs?.entityType ?? '')
  const id = Number(node.attrs?.id)
  if (!options.mentionLinks || !MENTION_TYPES.has(entityType) || !Number.isInteger(id) || id <= 0) {
    return '@' + label
  }
  return `@[${label.replace(/[[\]]/g, '')}](${entityType}:${id})`
}

function applyMarks(text: string, marks: PMMark[] | undefined): string {
  if (!marks || !marks.length) return text
  const has = (t: string): boolean => marks.some((m) => m.type === t)
  // Código inline não combina com outras marcações.
  if (has('code')) return '`' + text + '`'
  let s = text
  if (has('strike')) s = `~~${s}~~`
  if (has('italic')) s = `*${s}*`
  if (has('bold')) s = `**${s}**`
  if (has('highlight')) s = `==${s}==`
  if (has('underline')) s = `<u>${s}</u>`
  const link = marks.find((m) => m.type === 'link')
  if (link) s = `[${s}](${String(link.attrs?.href ?? '')})`
  return s
}

function renderInline(nodes: PMNode[] | undefined, options: MarkdownRenderOptions): string {
  let out = ''
  for (const node of nodes ?? []) {
    if (node.type === 'hardBreak') {
      out += '\n'
      continue
    }
    if (node.type === 'mention') {
      out += mentionToMarkdown(node, options)
      continue
    }
    if (node.type !== 'text') continue
    out += applyMarks(String(node.text ?? ''), node.marks)
  }
  return out
}

function firstParagraphInline(node: PMNode): PMNode[] {
  const para = (node.content ?? []).find((c) => c.type === 'paragraph')
  return para?.content ?? []
}

function listToMarkdown(node: PMNode, ordered: boolean, options: MarkdownRenderOptions): string {
  const items = (node.content ?? []).filter((c) => c.type === 'listItem')
  return items
    .map(
      (li, i) => (ordered ? `${i + 1}. ` : '- ') + renderInline(firstParagraphInline(li), options)
    )
    .join('\n')
}

function taskListToMarkdown(node: PMNode, options: MarkdownRenderOptions): string {
  const items = (node.content ?? []).filter((c) => c.type === 'taskItem')
  return items
    .map(
      (ti) =>
        `- ${ti.attrs?.checked ? '[x]' : '[ ]'} ` + renderInline(firstParagraphInline(ti), options)
    )
    .join('\n')
}

function cellText(cell: PMNode, options: MarkdownRenderOptions): string {
  return renderInline(firstParagraphInline(cell), options).replace(/\n/g, ' ').replace(/\|/g, '\\|')
}

function tableToMarkdown(node: PMNode, options: MarkdownRenderOptions): string {
  const rows = (node.content ?? []).filter((r) => r.type === 'tableRow')
  if (!rows.length) return ''
  const width = (rows[0].content ?? []).length
  const lines: string[] = []
  rows.forEach((row, i) => {
    const cells = (row.content ?? []).map((cell) => cellText(cell, options))
    while (cells.length < width) cells.push('')
    lines.push('| ' + cells.join(' | ') + ' |')
    if (i === 0) lines.push('| ' + Array(width).fill('---').join(' | ') + ' |')
  })
  return lines.join('\n')
}

function blockToMarkdown(
  node: PMNode,
  resolveImage: MarkdownImageResolver,
  options: MarkdownRenderOptions
): string {
  switch (node.type) {
    case 'paragraph':
      return renderInline(node.content, options)
    case 'heading': {
      const level = Math.min(6, Math.max(1, Number(node.attrs?.level ?? 1)))
      return '#'.repeat(level) + ' ' + renderInline(node.content, options)
    }
    case 'bulletList':
      return listToMarkdown(node, false, options)
    case 'orderedList':
      return listToMarkdown(node, true, options)
    case 'taskList':
      return taskListToMarkdown(node, options)
    case 'blockquote':
      return (node.content ?? [])
        .filter((c) => c.type === 'paragraph')
        .map((c) => '> ' + renderInline(c.content, options))
        .join('\n')
    case 'codeBlock': {
      const text = (node.content ?? []).map((c) => String(c.text ?? '')).join('')
      const lang = String(node.attrs?.language ?? '')
      return '```' + lang + '\n' + text + '\n```'
    }
    case 'horizontalRule':
      return '---'
    case 'table':
      return tableToMarkdown(node, options)
    case 'image': {
      const alt = String(node.attrs?.alt ?? '')
      const assetId = String(node.attrs?.assetId ?? '')
      const src = assetId ? resolveImage(assetId) : String(node.attrs?.src ?? '')
      return `![${alt}](${src})`
    }
    default:
      return ''
  }
}

const defaultResolver: MarkdownImageResolver = (id) => `assets/${id}`

export function prosemirrorToMarkdown(
  json: string | null | undefined,
  resolveImage: MarkdownImageResolver = defaultResolver,
  options: MarkdownRenderOptions = {}
): string {
  if (!json) return ''
  let doc: PMNode
  try {
    doc = JSON.parse(json) as PMNode
  } catch {
    return ''
  }
  if (!doc || doc.type !== 'doc') return ''
  return (doc.content ?? [])
    .map((n) => blockToMarkdown(n, resolveImage, options))
    .filter((s) => s.length > 0)
    .join('\n\n')
}
