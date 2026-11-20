import type { DrawingRenderPayload, DrawingRenderResult } from '@shared/drawingRender'
import { ensureExcalidrawAssetPath } from '@renderer/components/editor/drawingAssetPath'

interface StoredScene {
  elements?: unknown[]
  appState?: { viewBackgroundColor?: string }
  files?: Record<string, unknown>
}

function parseBase(raw: string | null): StoredScene {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as StoredScene
    return Array.isArray(parsed.elements) ? parsed : {}
  } catch {
    return {}
  }
}

export async function renderDrawingSkeleton(
  payload: DrawingRenderPayload
): Promise<DrawingRenderResult> {
  try {
    ensureExcalidrawAssetPath()
    const { convertToExcalidrawElements, exportToBlob } = await import('@excalidraw/excalidraw')
    type Skeleton = Parameters<typeof convertToExcalidrawElements>[0]
    type ExportOptions = Parameters<typeof exportToBlob>[0]

    const base = parseBase(payload.base)
    const added = convertToExcalidrawElements(payload.skeleton as unknown as Skeleton)
    const elements = [...(base.elements ?? []), ...added] as ExportOptions['elements']
    const files = (base.files ?? {}) as ExportOptions['files']
    const appState = { viewBackgroundColor: base.appState?.viewBackgroundColor ?? '#ffffff' }

    let preview: Uint8Array | null = null
    if (elements.length > 0) {
      const blob = await exportToBlob({
        elements,
        appState: { ...appState, exportBackground: true },
        files,
        mimeType: 'image/png',
        exportPadding: 16
      })
      preview = new Uint8Array(await blob.arrayBuffer())
    }

    return {
      ok: true,
      drawing: JSON.stringify({ elements, appState, files }),
      preview,
      elements: elements.length
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}
