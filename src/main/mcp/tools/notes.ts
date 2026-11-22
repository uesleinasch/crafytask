import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { getTask, listContexts, listProjects, notebookDb, updateTaskNotes } from '../../database'
import { getPage } from '../../notebookQueries'
import {
  markdownToProsemirror,
  type MentionEntityType,
  type PMDoc
} from '../../markdownToProsemirror'
import { detectNotesDialect } from '../../notionBlocks'
import { prosemirrorToMarkdown } from '../../notesMarkdown'
import { readSection, replaceSection, type SectionHeading } from '../../notesSection'
import { needsConfirmation } from '../confirmGuard'
import { afterTaskWrite, recordOperation } from '../effects'
import { notesWrittenSummary } from '../operationSummary'
import { fail, ok } from '../reply'
import type { ToolContext } from '../toolContext'

export type ParsedNotes =
  | { kind: 'empty' }
  | { kind: 'doc'; doc: PMDoc }
  | { kind: 'editorjs'; blockCount: number }
  | { kind: 'unknown' }

export function parseNotes(raw: string | null | undefined): ParsedNotes {
  const dialect = detectNotesDialect(raw)
  if (dialect === 'unknown') return raw ? { kind: 'unknown' } : { kind: 'empty' }
  const parsed = JSON.parse(raw as string) as { content?: unknown; blocks?: unknown }
  if (dialect === 'doc') {
    return Array.isArray(parsed.content)
      ? { kind: 'doc', doc: parsed as PMDoc }
      : { kind: 'doc', doc: { type: 'doc', content: [] } }
  }
  return { kind: 'editorjs', blockCount: (parsed.blocks as unknown[]).length }
}

export function hasRealContent(parsed: ParsedNotes): boolean {
  switch (parsed.kind) {
    case 'empty':
      return false
    case 'doc':
      return parsed.doc.content.length > 0
    case 'editorjs':
      return parsed.blockCount > 0
    case 'unknown':
      return true
  }
}

export const MARKDOWN_SUPPORT =
  'Entende parágrafo, títulos, listas, checklist (- [ ] / - [x]), tabela, negrito, itálico, riscado (~~x~~), destaque (==x==), sublinhado (<u>x</u>), código, citação, link e menção (@[Nome](task:123), também project:, page: e context:; id que não existe vira texto). Não entende imagem, quebra de linha dentro do parágrafo nem lista aninhada.'

function mentionExists(entityType: MentionEntityType, id: number): boolean {
  switch (entityType) {
    case 'task':
      return Boolean(getTask(id))
    case 'project':
      return listProjects().some((project) => project.id === id)
    case 'page':
      return Boolean(getPage(notebookDb(), id))
    case 'context':
      return listContexts().some((context) => context.id === id)
  }
}

export function markdownToNotes(markdown: string): PMDoc {
  return markdownToProsemirror(markdown, { mentionExists })
}

export function notesToMarkdown(json: string | null | undefined): string {
  return prosemirrorToMarkdown(json, undefined, { mentionLinks: true })
}

export const SECTION_MODE_HELP =
  'mode=section troca só o conteúdo sob o título informado em heading (até o próximo título de nível igual ou maior), sem confirm_token, e devolve em previous_markdown o que saiu.'

export function nodesToMarkdown(content: PMDoc['content']): string {
  return notesToMarkdown(JSON.stringify({ type: 'doc', content }))
}

export function sectionFailure(
  code: 'not_found' | 'ambiguous',
  heading: string,
  headings: SectionHeading[]
): ReturnType<typeof fail> {
  return fail(
    code,
    code === 'not_found'
      ? `Título "${heading}" não encontrado.`
      : `Mais de um título "${heading}": a seção é ambígua.`,
    { headings }
  )
}

export function registerNotesTools(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    'read_notes',
    {
      title: 'Ler as notas de uma task',
      description:
        'Devolve o corpo das notas de uma task convertido para Markdown. Menções saem como @[Nome](task:123). Com heading, devolve só aquela seção (o título e o que está sob ele).',
      inputSchema: {
        task_id: z.number().int().positive(),
        heading: z.string().trim().min(1).optional().describe('Texto do título da seção.')
      }
    },
    async ({ task_id, heading }) => {
      const task = getTask(task_id)
      if (!task) return fail('not_found', `Task ${task_id} não existe.`)

      const parsed = parseNotes(task.notes)
      if (parsed.kind === 'editorjs') {
        return ok({
          task_id,
          markdown: null,
          format: 'editorjs_legacy',
          message:
            'Notas em formato legado (Editor.js); o servidor MCP não converte esse formato para Markdown. Abra a task no app para migrar a nota automaticamente.'
        })
      }
      if (parsed.kind === 'unknown') {
        return ok({
          task_id,
          markdown: null,
          format: 'unknown',
          message: 'Formato de notas não reconhecido; não foi possível converter para Markdown.'
        })
      }

      if (heading !== undefined) {
        const section = readSection(
          parsed.kind === 'doc' ? parsed.doc : { type: 'doc', content: [] },
          heading
        )
        if (!section.ok) return sectionFailure(section.code, heading, section.headings)
        return ok({ task_id, heading, markdown: nodesToMarkdown(section.content) })
      }

      return ok({ task_id, markdown: notesToMarkdown(task.notes) })
    }
  )

  server.registerTool(
    'write_notes',
    {
      title: 'Escrever nas notas de uma task',
      description: `Grava Markdown nas notas de uma task. ${MARKDOWN_SUPPORT} Prefira mode=append. ${SECTION_MODE_HELP} mode=replace sobre uma nota não vazia, ou em formato que o servidor não reconhece, apaga esse conteúdo e exige confirm_token.`,
      inputSchema: {
        task_id: z.number().int().positive(),
        markdown: z.string().min(1),
        mode: z.enum(['append', 'replace', 'section']).optional(),
        heading: z.string().trim().min(1).optional().describe('mode=section: texto do título.'),
        confirm_token: z.string().optional()
      }
    },
    async ({ task_id, markdown, mode, heading, confirm_token }) => {
      const task = getTask(task_id)
      if (!task) return fail('not_found', `Task ${task_id} não existe.`)

      const effectiveMode = mode ?? 'append'
      const parsed = parseNotes(task.notes)
      const incoming = markdownToNotes(markdown)
      const hasContent = hasRealContent(parsed)

      if (effectiveMode === 'section') {
        if (!heading) return fail('validation', 'mode=section exige heading.')
        if (parsed.kind !== 'doc') {
          return fail('app_state', 'A nota não tem títulos: use mode=append ou mode=replace.')
        }
        const replaced = replaceSection(parsed.doc, heading, incoming.content)
        if (!replaced.ok) return sectionFailure(replaced.code, heading, replaced.headings)
        updateTaskNotes(task_id, JSON.stringify(replaced.doc))
        recordOperation(task_id, notesWrittenSummary('section', incoming.content.length))
        afterTaskWrite(task_id)
        return ok({
          task_id,
          mode: effectiveMode,
          heading,
          blocks: replaced.doc.content.length,
          previous_markdown: nodesToMarkdown(replaced.previous)
        })
      }
      // Sem um doc ProseMirror existente não há como mesclar: append sobre nota legada ou não
      // reconhecida destrói o conteúdo tanto quanto replace, então precisa do mesmo guard.
      const destructive = effectiveMode === 'replace' || parsed.kind !== 'doc'

      if (hasContent && destructive) {
        if (needsConfirmation('replace_notes', 1, ctx.bulkThreshold)) {
          const operation = { kind: 'replace_notes', payload: { task_id, markdown } }
          if (!confirm_token) {
            const legacyNotice =
              parsed.kind === 'editorjs'
                ? 'A nota atual está em formato legado (Editor.js): não pode ser exibida nem mesclada, e será perdida por completo. '
                : parsed.kind === 'unknown'
                  ? 'A nota atual está em formato não reconhecido pelo servidor e será perdida por completo. '
                  : ''
            return fail(
              'needs_confirmation',
              `${legacyNotice}Substituir apaga as notas atuais, incluindo imagens, que o Markdown não representa. Mostre o conteúdo atual ao usuário antes de confirmar.`,
              {
                confirm_token: ctx.confirmStore.issue(operation),
                current_markdown: parsed.kind === 'doc' ? notesToMarkdown(task.notes) : null
              }
            )
          }
          const consumed = ctx.confirmStore.consume(confirm_token, operation)
          if (!consumed.ok) return fail(consumed.code, consumed.message)
        }
      }

      const next: PMDoc =
        effectiveMode === 'append' && parsed.kind === 'doc'
          ? { type: 'doc', content: [...parsed.doc.content, ...incoming.content] }
          : incoming

      updateTaskNotes(task_id, JSON.stringify(next))
      recordOperation(
        task_id,
        notesWrittenSummary(next === incoming ? 'replace' : 'append', incoming.content.length)
      )
      afterTaskWrite(task_id)
      return ok({ task_id, mode: effectiveMode, blocks: next.content.length })
    }
  )
}
