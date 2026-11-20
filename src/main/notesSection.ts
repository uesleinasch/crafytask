import type { PMDoc, PMNode } from './markdownToProsemirror'

export interface SectionHeading {
  text: string
  level: number
}

export type SectionLookup =
  | { ok: true; start: number; end: number }
  | { ok: false; code: 'not_found' | 'ambiguous'; headings: SectionHeading[] }

function nodeText(node: PMNode): string {
  if (node.type === 'text') return node.text ?? ''
  if (node.type === 'mention') return `@${String(node.attrs?.label ?? '')}`
  return (node.content ?? []).map(nodeText).join('')
}

function levelOf(node: PMNode): number {
  return Number(node.attrs?.level ?? 1)
}

function normalize(heading: string): string {
  return heading
    .trim()
    .replace(/^#{1,6}\s+/, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

export function listHeadings(doc: PMDoc): SectionHeading[] {
  return doc.content
    .filter((node) => node.type === 'heading')
    .map((node) => ({ text: nodeText(node).trim(), level: levelOf(node) }))
}

/** A seção vai do título até o próximo título de nível igual ou maior (número menor ou igual). */
export function findSection(doc: PMDoc, heading: string): SectionLookup {
  const wanted = normalize(heading)
  const matches = doc.content
    .map((node, index) => ({ node, index }))
    .filter(({ node }) => node.type === 'heading' && normalize(nodeText(node)) === wanted)

  if (matches.length !== 1) {
    return {
      ok: false,
      code: matches.length === 0 ? 'not_found' : 'ambiguous',
      headings: listHeadings(doc)
    }
  }

  const { node, index } = matches[0]
  let end = index + 1
  while (
    end < doc.content.length &&
    !(doc.content[end].type === 'heading' && levelOf(doc.content[end]) <= levelOf(node))
  ) {
    end += 1
  }
  return { ok: true, start: index, end }
}

export function readSection(
  doc: PMDoc,
  heading: string
): { ok: true; content: PMNode[] } | Extract<SectionLookup, { ok: false }> {
  const found = findSection(doc, heading)
  if (!found.ok) return found
  return { ok: true, content: doc.content.slice(found.start, found.end) }
}

/** Troca o que está sob o título; o título em si fica. `previous` é o conteúdo que saiu. */
export function replaceSection(
  doc: PMDoc,
  heading: string,
  content: PMNode[]
): { ok: true; doc: PMDoc; previous: PMNode[] } | Extract<SectionLookup, { ok: false }> {
  const found = findSection(doc, heading)
  if (!found.ok) return found

  const title = doc.content[found.start]
  const [first, ...rest] = content
  const repeatsTitle =
    first?.type === 'heading' &&
    levelOf(first) === levelOf(title) &&
    normalize(nodeText(first)) === normalize(nodeText(title))
  const body = repeatsTitle ? rest : content

  return {
    ok: true,
    previous: doc.content.slice(found.start + 1, found.end),
    doc: {
      type: 'doc',
      content: [...doc.content.slice(0, found.start + 1), ...body, ...doc.content.slice(found.end)]
    }
  }
}
