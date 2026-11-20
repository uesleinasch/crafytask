import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { UNTITLED_PAGE, flattenPageTree } from '@shared/notebookTree'
import { notebookDb } from '../../database'
import {
  createNotebook,
  createPage,
  createSection,
  deleteNotebook,
  deletePage,
  deleteSection,
  getNotebook,
  getPage,
  getSection,
  listNotebooks,
  listPageSubtree,
  listPages,
  listSections,
  listNotebookPageIds,
  movePage,
  searchPages,
  updateNotebook,
  updatePageNotes,
  updatePageTitle,
  updateSection
} from '../../notebookQueries'
import {
  afterNotebookStructureChange,
  afterPageMoved,
  autoSyncNotebook,
  removeNotebookNode
} from '../../notebookService'
import { readDrawingPreview } from '../../drawingAssets'
import { markdownToProsemirror, type PMDoc } from '../../markdownToProsemirror'
import { prosemirrorToMarkdown } from '../../notesMarkdown'
import { needsConfirmation } from '../confirmGuard'
import { fail, ok, okImage } from '../reply'
import type { ToolContext } from '../toolContext'
import { hasRealContent, parseNotes } from './notes'
import { describeElements } from './drawing'

function pageTree(sectionId: number): { id: number; title: string; depth: number }[] {
  return flattenPageTree(listPages(notebookDb(), sectionId)).map(({ page, depth }) => ({
    id: page.id,
    title: page.title || UNTITLED_PAGE,
    depth
  }))
}

export function registerNotebookTools(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    'list_notebooks',
    {
      title: 'Listar cadernos',
      description:
        'Cadernos, seções e páginas (com subpáginas, em ordem de árvore; depth 0 a 2). Passe notebook_id para listar só um caderno.',
      inputSchema: { notebook_id: z.number().int().positive().optional() }
    },
    async ({ notebook_id }) => {
      const db = notebookDb()
      const notebooks = notebook_id
        ? [getNotebook(db, notebook_id)].filter((n) => n !== undefined)
        : listNotebooks(db)
      if (notebook_id && notebooks.length === 0) {
        return fail('not_found', `Caderno ${notebook_id} não existe.`)
      }
      return ok({
        notebooks: notebooks.map((n) => ({
          id: n.id,
          name: n.name,
          sections: listSections(db, n.id).map((s) => ({
            id: s.id,
            name: s.name,
            pages: pageTree(s.id)
          }))
        }))
      })
    }
  )

  server.registerTool(
    'search_pages',
    {
      title: 'Buscar páginas de caderno',
      description:
        'Busca páginas pelo título e pelo texto das notas. Devolve até 30, com um trecho.',
      inputSchema: { query: z.string().min(1) }
    },
    async ({ query }) => ok({ results: searchPages(notebookDb(), query) })
  )

  server.registerTool(
    'read_page',
    {
      title: 'Ler uma página de caderno',
      description:
        'Devolve a página em Markdown, com caderno, seção e subpáginas. Se a página tem desenho, a imagem PNG vem junto.',
      inputSchema: { page_id: z.number().int().positive() }
    },
    async ({ page_id }) => {
      const db = notebookDb()
      const page = getPage(db, page_id)
      if (!page) return fail('not_found', `Página ${page_id} não existe.`)
      const section = getSection(db, page.section_id)
      const notebook = section ? getNotebook(db, section.notebook_id) : undefined
      const parsed = parseNotes(page.notes)
      const drawing = describeElements(page.drawing)
      const data = {
        page_id,
        title: page.title || UNTITLED_PAGE,
        notebook: notebook ? { id: notebook.id, name: notebook.name } : null,
        section: section ? { id: section.id, name: section.name } : null,
        parent_page_id: page.parent_page_id,
        subpage_ids: listPageSubtree(db, page_id).slice(1),
        updated_at: page.updated_at,
        markdown:
          parsed.kind === 'doc' || parsed.kind === 'empty'
            ? prosemirrorToMarkdown(page.notes)
            : null,
        drawing: { elements: drawing.count, kinds: drawing.kinds, texts: drawing.texts }
      }
      if (drawing.count === 0) return ok(data)
      const png = await readDrawingPreview({ kind: 'page', id: page_id })
      return png ? okImage(png.toString('base64'), 'image/png', data) : ok(data)
    }
  )

  server.registerTool(
    'create_page',
    {
      title: 'Criar página de caderno',
      description:
        'Cria uma página numa seção (ids em list_notebooks), opcionalmente como subpágina (até 2 níveis) e já com conteúdo em Markdown.',
      inputSchema: {
        section_id: z.number().int().positive(),
        title: z.string().optional(),
        parent_page_id: z.number().int().positive().optional(),
        markdown: z.string().optional()
      }
    },
    async ({ section_id, title, parent_page_id, markdown }) => {
      const db = notebookDb()
      let page
      try {
        page = createPage(db, { section_id, title, parent_page_id: parent_page_id ?? null })
      } catch (error) {
        return fail('validation', error instanceof Error ? error.message : String(error))
      }
      if (markdown) updatePageNotes(db, page.id, JSON.stringify(markdownToProsemirror(markdown)))
      afterNotebookStructureChange({ kind: 'page', id: page.id })
      return ok({ page_id: page.id, section_id, parent_page_id: page.parent_page_id })
    }
  )

  server.registerTool(
    'write_page',
    {
      title: 'Escrever numa página de caderno',
      description:
        'Grava Markdown nas notas de uma página. Mesma conversão e mesmas perdas de write_notes (menções, destaques, tabelas, checklist e imagens não sobrevivem). Prefira mode=append; mode=replace sobre página com conteúdo exige confirm_token.',
      inputSchema: {
        page_id: z.number().int().positive(),
        markdown: z.string().min(1),
        mode: z.enum(['append', 'replace']).optional(),
        confirm_token: z.string().optional()
      }
    },
    async ({ page_id, markdown, mode, confirm_token }) => {
      const db = notebookDb()
      const page = getPage(db, page_id)
      if (!page) return fail('not_found', `Página ${page_id} não existe.`)

      const effectiveMode = mode ?? 'append'
      const parsed = parseNotes(page.notes)
      const incoming = markdownToProsemirror(markdown)
      const destructive = effectiveMode === 'replace' || parsed.kind !== 'doc'

      if (
        hasRealContent(parsed) &&
        destructive &&
        needsConfirmation('replace_notes', 1, ctx.bulkThreshold)
      ) {
        const operation = { kind: 'replace_page_notes', payload: { page_id, markdown } }
        if (!confirm_token) {
          return fail(
            'needs_confirmation',
            'Substituir apaga as notas atuais da página, incluindo o que o Markdown não representa. Mostre o conteúdo atual ao usuário antes de confirmar.',
            {
              confirm_token: ctx.confirmStore.issue(operation),
              current_markdown: parsed.kind === 'doc' ? prosemirrorToMarkdown(page.notes) : null
            }
          )
        }
        const consumed = ctx.confirmStore.consume(confirm_token, operation)
        if (!consumed.ok) return fail(consumed.code, consumed.message)
      }

      const next: PMDoc =
        effectiveMode === 'append' && parsed.kind === 'doc'
          ? { type: 'doc', content: [...parsed.doc.content, ...incoming.content] }
          : incoming
      updatePageNotes(db, page_id, JSON.stringify(next))
      autoSyncNotebook({ kind: 'page', id: page_id })
      return ok({ page_id, mode: effectiveMode, blocks: next.content.length })
    }
  )

  server.registerTool(
    'delete_page',
    {
      title: 'Excluir página de caderno',
      description:
        'Apaga a página e as subpáginas dela, para sempre. Sempre exige confirm_token: a primeira chamada devolve o que será apagado.',
      inputSchema: {
        page_id: z.number().int().positive(),
        confirm_token: z.string().optional()
      }
    },
    async ({ page_id, confirm_token }) => {
      const db = notebookDb()
      const page = getPage(db, page_id)
      if (!page) return fail('not_found', `Página ${page_id} não existe.`)

      const ids = listPageSubtree(db, page_id)
      const operation = { kind: 'delete_pages', payload: { page_id } }
      if (needsConfirmation('delete_pages', ids.length, ctx.bulkThreshold)) {
        if (!confirm_token) {
          return fail('needs_confirmation', 'Confirme com o usuário antes de apagar.', {
            confirm_token: ctx.confirmStore.issue(operation),
            preview: ids.map((id) => ({ id, title: getPage(db, id)?.title || UNTITLED_PAGE }))
          })
        }
        const consumed = ctx.confirmStore.consume(confirm_token, operation)
        if (!consumed.ok) return fail(consumed.code, consumed.message)
      }

      const deleted = await removeNotebookNode('page', page_id, (id) => deletePage(db, id))
      return ok({ deleted })
    }
  )

  server.registerTool(
    'manage_notebooks',
    {
      title: 'Organizar cadernos',
      description:
        'Estrutura dos cadernos (ids em list_notebooks). entity=notebook ou section: action=create (name; a seção exige notebook_id), update (id, name) e delete (id; apaga tudo que está dentro e sempre exige confirm_token). entity=page: action=update renomeia (id, name) e action=move leva a página para outra seção ou página pai (id, section_id, parent_page_id opcional, index opcional). Para criar e apagar página use create_page e delete_page.',
      inputSchema: {
        entity: z.enum(['notebook', 'section', 'page']),
        action: z.enum(['create', 'update', 'delete', 'move']),
        id: z.number().int().positive().optional(),
        name: z.string().min(1).max(200).optional(),
        notebook_id: z.number().int().positive().optional(),
        section_id: z.number().int().positive().optional(),
        parent_page_id: z.union([z.number().int().positive(), z.null()]).optional(),
        index: z.number().int().min(0).optional(),
        confirm_token: z.string().optional()
      }
    },
    async ({
      entity,
      action,
      id,
      name,
      notebook_id,
      section_id,
      parent_page_id,
      index,
      confirm_token
    }) => {
      const db = notebookDb()
      const exists = (kind: typeof entity, nodeId: number): boolean =>
        kind === 'notebook'
          ? Boolean(getNotebook(db, nodeId))
          : kind === 'section'
            ? Boolean(getSection(db, nodeId))
            : Boolean(getPage(db, nodeId))

      try {
        if (action === 'create') {
          if (entity === 'page') return fail('validation', 'Para criar página use create_page.')
          if (!name) return fail('validation', 'action=create exige name.')
          if (entity === 'notebook') {
            const notebook = createNotebook(db, { name })
            afterNotebookStructureChange({ kind: 'notebook', id: notebook.id })
            return ok({ created: notebook.id, entity, name: notebook.name })
          }
          if (notebook_id === undefined) return fail('validation', 'Seção nova exige notebook_id.')
          if (!getNotebook(db, notebook_id)) {
            return fail('not_found', `Caderno ${notebook_id} não existe.`)
          }
          const section = createSection(db, { notebook_id, name })
          afterNotebookStructureChange({ kind: 'section', id: section.id })
          return ok({ created: section.id, entity, name: section.name })
        }

        if (id === undefined) return fail('validation', `action=${action} exige id.`)
        if (!exists(entity, id)) return fail('not_found', `${entity} ${id} não existe.`)

        if (action === 'update') {
          if (!name) return fail('validation', 'action=update exige name.')
          if (entity === 'notebook') updateNotebook(db, id, { name })
          else if (entity === 'section') updateSection(db, id, { name })
          else updatePageTitle(db, id, name)
          afterNotebookStructureChange({ kind: entity, id })
          return ok({ updated: id, entity, name })
        }

        if (action === 'move') {
          if (entity !== 'page') return fail('validation', 'Só página pode ser movida.')
          if (section_id === undefined) return fail('validation', 'action=move exige section_id.')
          if (!getSection(db, section_id))
            return fail('not_found', `Seção ${section_id} não existe.`)
          const parent = parent_page_id ?? null
          const siblings = listPages(db, section_id).filter(
            (page) => (page.parent_page_id ?? null) === parent && page.id !== id
          )
          movePage(db, id, {
            section_id,
            parent_page_id: parent,
            index: Math.min(index ?? siblings.length, siblings.length)
          })
          afterPageMoved(id)
          return ok({ moved: id, section_id, parent_page_id: parent })
        }

        if (entity === 'page') return fail('validation', 'Para apagar página use delete_page.')
        const pages =
          entity === 'notebook' ? listNotebookPageIds(db, id).length : listPages(db, id).length
        const operation = { kind: `delete_${entity}`, payload: { id } }
        if (!confirm_token) {
          return fail(
            'needs_confirmation',
            `Apagar ${entity === 'notebook' ? 'o caderno' : 'a seção'} apaga ${pages} página(s) junto, para sempre. Confirme com o usuário.`,
            { confirm_token: ctx.confirmStore.issue(operation), pages }
          )
        }
        const consumed = ctx.confirmStore.consume(confirm_token, operation)
        if (!consumed.ok) return fail(consumed.code, consumed.message)
        await removeNotebookNode(entity, id, (nodeId) =>
          entity === 'notebook' ? deleteNotebook(db, nodeId) : deleteSection(db, nodeId)
        )
        return ok({ deleted: id, entity, pages })
      } catch (error) {
        return fail('validation', error instanceof Error ? error.message : String(error))
      }
    }
  )
}
