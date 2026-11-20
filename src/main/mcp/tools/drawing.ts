import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { DRAWING_SKELETON_LIMIT, DRAWING_SKELETON_TYPES } from '@shared/drawingRender'
import type { NotesOwner } from '@shared/types'
import { getTask, notebookDb, updateTaskDrawing } from '../../database'
import { deleteDrawingPreview, readDrawingPreview, saveDrawingPreview } from '../../drawingAssets'
import { getPage, updatePageDrawing } from '../../notebookQueries'
import { autoSyncNotebook } from '../../notebookService'
import { DRAWING_GUIDE } from '../drawingGuide'
import { afterTaskWrite, renderDrawing } from '../effects'
import { fail, ok, okImage } from '../reply'
import type { ToolContext } from '../toolContext'

const SKELETON = z
  .object({ type: z.enum(DRAWING_SKELETON_TYPES) })
  .passthrough()
  .describe('Elemento simplificado do Excalidraw; formato em drawing_guide.')

interface DrawingElement {
  type?: string
  text?: string
}

export function describeElements(raw: string | null | undefined): {
  count: number
  kinds: Record<string, number>
  texts: string[]
} {
  const empty = { count: 0, kinds: {}, texts: [] }
  if (!raw) return empty

  try {
    const parsed = JSON.parse(raw) as { elements?: DrawingElement[] }
    const elements = Array.isArray(parsed.elements) ? parsed.elements : []
    const kinds: Record<string, number> = {}
    const texts: string[] = []
    for (const el of elements) {
      const kind = el.type ?? 'desconhecido'
      kinds[kind] = (kinds[kind] ?? 0) + 1
      if (typeof el.text === 'string' && el.text.trim().length > 0) texts.push(el.text.trim())
    }
    return { count: elements.length, kinds, texts }
  } catch {
    return empty
  }
}

export function registerDrawingTools(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    'read_drawing',
    {
      title: 'Ver o desenho de uma task',
      description:
        'Devolve o desenho (Excalidraw) de uma task como imagem PNG, junto com um resumo dos elementos.',
      inputSchema: { task_id: z.number().int().positive() }
    },
    async ({ task_id }) => {
      const task = getTask(task_id)
      if (!task) return fail('not_found', `Task ${task_id} não existe.`)

      const summary = describeElements(task.drawing)
      if (summary.count === 0) {
        return ok({ task_id, has_drawing: false, message: 'Esta task não tem desenho.' })
      }

      const png = await readDrawingPreview({ kind: 'task', id: task_id })
      if (!png) {
        return ok({
          task_id,
          has_drawing: true,
          image: null,
          ...summary,
          message:
            'O desenho existe, mas a imagem ainda não foi gerada. Abra a aba Desenho da task no app para gerá-la.'
        })
      }

      return okImage(png.toString('base64'), 'image/png', {
        task_id,
        has_drawing: true,
        elements: summary.count,
        kinds: summary.kinds,
        texts: summary.texts
      })
    }
  )

  server.registerTool(
    'drawing_guide',
    {
      title: 'Guia de desenho',
      description:
        'Devolve o guia de como montar os elementos de write_drawing (formas, texto, setas, cores, exemplo). Leia antes do primeiro desenho da sessão.'
    },
    async () => ok({ guide: DRAWING_GUIDE })
  )

  server.registerTool(
    'write_drawing',
    {
      title: 'Desenhar numa task ou página',
      description:
        'Cria ou altera o desenho (Excalidraw) de uma task (task_id) ou de uma página de caderno (page_id) a partir de elementos simplificados; o formato está em drawing_guide. mode=append (padrão) acrescenta ao desenho atual; mode=replace troca tudo e, sobre um desenho existente, exige confirm_token. A imagem é gerada pela janela do app, que precisa estar aberta (pode estar minimizada ou na bandeja). Confira o resultado com read_drawing ou read_page.',
      inputSchema: {
        task_id: z.number().int().positive().optional(),
        page_id: z.number().int().positive().optional(),
        elements: z.array(SKELETON).min(1).max(DRAWING_SKELETON_LIMIT),
        mode: z.enum(['append', 'replace']).optional(),
        confirm_token: z.string().optional()
      }
    },
    async ({ task_id, page_id, elements, mode, confirm_token }) => {
      if ((task_id === undefined) === (page_id === undefined)) {
        return fail('validation', 'Informe task_id ou page_id, só um dos dois.')
      }

      let owner: NotesOwner
      let current: string | null
      if (task_id !== undefined) {
        const task = getTask(task_id)
        if (!task) return fail('not_found', `Task ${task_id} não existe.`)
        owner = { kind: 'task', id: task_id }
        current = task.drawing ?? null
      } else {
        const page = getPage(notebookDb(), page_id!)
        if (!page) return fail('not_found', `Página ${page_id} não existe.`)
        owner = { kind: 'page', id: page_id! }
        current = page.drawing ?? null
      }

      const effectiveMode = mode ?? 'append'
      const existing = describeElements(current)
      if (effectiveMode === 'replace' && existing.count > 0) {
        const operation = { kind: 'replace_drawing', payload: { owner, elements } }
        if (!confirm_token) {
          return fail(
            'needs_confirmation',
            `Substituir apaga o desenho atual (${existing.count} elementos). Mostre ao usuário o que será perdido antes de confirmar.`,
            { confirm_token: ctx.confirmStore.issue(operation), current: existing }
          )
        }
        const consumed = ctx.confirmStore.consume(confirm_token, operation)
        if (!consumed.ok) return fail(consumed.code, consumed.message)
      }

      const rendered = await renderDrawing({
        skeleton: elements,
        base: effectiveMode === 'append' ? current : null
      })
      if (!rendered.ok)
        return fail('app_state', `Não foi possível gerar o desenho: ${rendered.error}`)

      if (rendered.preview) await saveDrawingPreview(owner, rendered.preview)
      else await deleteDrawingPreview(owner)
      if (owner.kind === 'task') {
        updateTaskDrawing(owner.id, rendered.drawing)
        afterTaskWrite(owner.id)
      } else {
        updatePageDrawing(notebookDb(), owner.id, rendered.drawing)
        autoSyncNotebook({ kind: 'page', id: owner.id })
      }

      return ok({ ...owner, mode: effectiveMode, elements: rendered.elements })
    }
  )
}
