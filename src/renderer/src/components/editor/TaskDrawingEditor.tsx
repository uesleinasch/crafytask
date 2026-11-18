import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Excalidraw, exportToBlob } from '@excalidraw/excalidraw'
import type { AppState, BinaryFiles, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import type { OrderedExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import type { NotesOwner } from '@shared/types'
import { ensureExcalidrawAssetPath } from './drawingAssetPath'
import { saveOwnerDrawing } from './notesOwner'
import { useThemeSettings } from '@renderer/theme/themeSettings'
import '@excalidraw/excalidraw/index.css'

ensureExcalidrawAssetPath()

export interface TaskDrawingEditorHandle {
  flushSave: () => Promise<void>
}

interface TaskDrawingEditorProps {
  owner: NotesOwner
  initialDrawing: string | null
  onChange?: () => void
  onSaved?: (drawing: string) => void
}

const DEBOUNCE_MS = 800

interface Scene {
  elements: readonly OrderedExcalidrawElement[]
  appState: AppState
  files: BinaryFiles
}

interface StoredDrawing {
  elements: unknown[]
  appState?: Record<string, unknown>
  files?: Record<string, unknown>
}

function parseDrawing(raw: string | null): StoredDrawing | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as StoredDrawing
    return Array.isArray(parsed.elements) ? parsed : null
  } catch {
    return null
  }
}

export const TaskDrawingEditor = forwardRef<TaskDrawingEditorHandle, TaskDrawingEditorProps>(
  function TaskDrawingEditor({ owner, initialDrawing, onChange, onSaved }, ref) {
    const { kind, id } = owner
    const { mode } = useThemeSettings()
    const apiRef = useRef<ExcalidrawImperativeAPI | null>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const pendingSceneRef = useRef<Scene | null>(null)
    const onChangeRef = useRef(onChange)
    onChangeRef.current = onChange
    const onSavedRef = useRef(onSaved)
    onSavedRef.current = onSaved
    const [stored] = useState(() => parseDrawing(initialDrawing))

    const persistScene = useCallback(
      async ({ elements, appState, files }: Scene): Promise<void> => {
        const drawing = JSON.stringify({
          elements,
          // appState inteiro carrega estado volátil (cursor, seleção, collaborators) que não
          // interessa persistir e chega a conter referências não serializáveis.
          appState: { viewBackgroundColor: appState.viewBackgroundColor },
          files
        })

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

        await saveOwnerDrawing({ kind, id }, drawing, preview)
        onSavedRef.current?.(drawing)
      },
      [kind, id]
    )

    const persist = useCallback(async (): Promise<void> => {
      const api = apiRef.current
      if (!api) return
      await persistScene({
        elements: api.getSceneElements(),
        appState: api.getAppState(),
        files: api.getFiles()
      })
    }, [persistScene])

    const handleChange = useCallback(
      (elements: readonly OrderedExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
        onChangeRef.current?.()
        pendingSceneRef.current = { elements, appState, files }
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
          pendingSceneRef.current = null
          persist().catch((e) => console.error('Falha ao salvar o desenho:', e))
        }, DEBOUNCE_MS)
      },
      [persist]
    )

    useImperativeHandle(
      ref,
      () => ({
        flushSave: async () => {
          if (debounceRef.current) clearTimeout(debounceRef.current)
          pendingSceneRef.current = null
          await persist()
        }
      }),
      [persist]
    )

    useEffect(() => {
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        const scene = pendingSceneRef.current
        pendingSceneRef.current = null
        if (scene) persistScene(scene).catch((e) => console.error('Falha ao salvar o desenho:', e))
      }
    }, [persistScene])

    return (
      <div style={{ height: '100%', width: '100%' }}>
        <Excalidraw
          excalidrawAPI={(api) => {
            apiRef.current = api
          }}
          initialData={
            stored
              ? { elements: stored.elements as never, appState: stored.appState as never }
              : null
          }
          onChange={handleChange}
          langCode="pt-BR"
          theme={mode}
        />
      </div>
    )
  }
)
