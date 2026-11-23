import { useMemo, useRef } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { useNavigate } from 'react-router-dom'
import type { JSONContent } from '@tiptap/core'
import { buildExtensions } from '@renderer/components/editor/extensions'
import { mentionRoute } from '@renderer/components/editor/mention/mentionRoute'

function parseDoc(body: string): JSONContent | null {
  try {
    const doc = JSON.parse(body) as JSONContent
    return doc?.type === 'doc' ? doc : null
  } catch {
    return null
  }
}

interface HistoryNoteViewProps {
  taskId: number
  body: string
  fallback: string | null
}

export function HistoryNoteView({
  taskId,
  body,
  fallback
}: HistoryNoteViewProps): React.JSX.Element {
  const navigate = useNavigate()
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate
  const doc = useMemo(() => parseDoc(body), [body])

  const editor = useEditor(
    {
      extensions: buildExtensions({ kind: 'task', id: taskId }, ''),
      content: doc ?? undefined,
      editable: false,
      editorProps: {
        attributes: { class: 'notes-editor-content ct-history-note' },
        handleClickOn: (_view, _pos, node) => {
          if (node.type.name !== 'mention') return false
          const route = mentionRoute(node.attrs.entityType, node.attrs.id)
          if (!route) return false
          navigateRef.current(route)
          return true
        }
      }
    },
    [taskId, doc]
  )

  if (!doc) return <span style={{ whiteSpace: 'pre-wrap' }}>{fallback}</span>
  return <EditorContent editor={editor} />
}
