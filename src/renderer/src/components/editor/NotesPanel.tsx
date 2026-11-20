import { Suspense, lazy, type CSSProperties, type Ref } from 'react'
import type { JSONContent } from '@tiptap/core'
import type { NotesOwner } from '@shared/types'
import { Flex, Spin } from 'antd'
import { RegionBoundary } from '@renderer/components/shell/RegionBoundary'
import { TaskNotesEditor, type TaskNotesEditorHandle } from './TaskNotesEditor'
import type { TaskDrawingEditorHandle } from './TaskDrawingEditor'

// O Excalidraw acrescenta alguns MB ao bundle; carregar só quando a aba abre mantém o boot das
// outras telas fora dessa conta.
const TaskDrawingEditor = lazy(() =>
  import('./TaskDrawingEditor').then((m) => ({ default: m.TaskDrawingEditor }))
)

export type NotesTab = 'notes' | 'drawing'

interface NotesBodyProps {
  owner: NotesOwner
  tab: NotesTab
  initialContent: JSONContent
  editorRef: Ref<TaskNotesEditorHandle>
  onChange: () => void
  onSaved: (notes: string) => void
  initialDrawing: string | null
  drawingRef: Ref<TaskDrawingEditorHandle>
  onDrawingChange: () => void
  onDrawingSaved: (drawing: string) => void
  notesStyle?: CSSProperties
  readOnly?: boolean
}

export function NotesBody({
  owner,
  tab,
  initialContent,
  editorRef,
  onChange,
  onSaved,
  initialDrawing,
  drawingRef,
  onDrawingChange,
  onDrawingSaved,
  notesStyle,
  readOnly = false
}: NotesBodyProps): React.JSX.Element {
  return tab === 'notes' ? (
    <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
      <div style={notesStyle}>
        <RegionBoundary region="editor de notas" resetKeys={[owner.kind, owner.id]}>
          <TaskNotesEditor
            ref={editorRef}
            owner={owner}
            initialContent={initialContent}
            onChange={onChange}
            onSaved={onSaved}
            readOnly={readOnly}
          />
        </RegionBoundary>
      </div>
    </div>
  ) : (
    <div className="flex-1 min-h-0">
      <Suspense
        fallback={
          <Flex align="center" justify="center" style={{ height: '100%' }}>
            <Spin />
          </Flex>
        }
      >
        <RegionBoundary region="editor de desenho" resetKeys={[owner.kind, owner.id]}>
          <TaskDrawingEditor
            ref={drawingRef}
            owner={owner}
            initialDrawing={initialDrawing}
            onChange={onDrawingChange}
            onSaved={onDrawingSaved}
            readOnly={readOnly}
          />
        </RegionBoundary>
      </Suspense>
    </div>
  )
}
