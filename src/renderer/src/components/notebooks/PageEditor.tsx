import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from 'react'
import { App, Button, Empty, Flex, Grid, Input, Spin, Tooltip, theme } from 'antd'
import { Download, RefreshCw } from 'lucide-react'
import type { NotebookPage } from '@shared/types'
import type { NotesTab } from '@renderer/components/editor/NotesPanel'
import type { TaskNotesEditorHandle } from '@renderer/components/editor/TaskNotesEditor'
import type { TaskDrawingEditorHandle } from '@renderer/components/editor/TaskDrawingEditor'
import { parseNotes } from '@renderer/components/editor/notesFormat'
import { TaskWorkspace } from '@renderer/components/tasks/TaskWorkspace'
import { usePersistedState } from '@renderer/hooks/usePersistedState'
import { errorMessage } from '@renderer/components/settings/settingsStatus'
import { UNTITLED_PAGE } from './notebookUi'
import { inlineEditStyle } from '@renderer/lib/inlineEdit'

export interface PageEditorHandle {
  flush: () => Promise<void>
}

interface PageEditorProps {
  pageId: number
}

const TITLE_DEBOUNCE_MS = 500
const ICON = { size: 16, strokeWidth: 1.75, 'aria-hidden': true } as const

// CURRENT_TIMESTAMP do SQLite é UTC sem fuso ("AAAA-MM-DD HH:MM:SS"); sem o Z vira hora local.
function fromSqlite(value: string): Date {
  return new Date(value.replace(' ', 'T') + 'Z')
}

function formatStamp(date: Date): string {
  const day = date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${day} ${time}`
}

export const PageEditor = forwardRef<PageEditorHandle, PageEditorProps>(function PageEditor(
  { pageId },
  ref
) {
  const { token } = theme.useToken()
  const { message } = App.useApp()
  const screens = Grid.useBreakpoint()
  const [page, setPage] = useState<NotebookPage | null>(null)
  const [missing, setMissing] = useState(false)
  const [title, setTitle] = useState('')
  const [editedAt, setEditedAt] = useState<Date | null>(null)
  const [focus, setFocus] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [tab, setTab] = usePersistedState<NotesTab>('ticktask.notebooks.tab', 'notes')
  const notesRef = useRef<TaskNotesEditorHandle>(null)
  const drawingRef = useRef<TaskDrawingEditorHandle>(null)
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingTitle = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setPage(null)
    setMissing(false)
    window.api
      .getPage(pageId)
      .then((loaded) => {
        if (cancelled) return
        if (!loaded) {
          setMissing(true)
          return
        }
        setPage(loaded)
        setTitle(loaded.title)
        setEditedAt(fromSqlite(loaded.updated_at))
      })
      .catch((e) => console.error('Falha ao abrir a página:', e))
    return () => {
      cancelled = true
    }
  }, [pageId])

  const saveTitle = useCallback(async (): Promise<void> => {
    if (titleTimer.current) clearTimeout(titleTimer.current)
    const next = pendingTitle.current
    pendingTitle.current = null
    if (next === null) return
    await window.api.updatePageTitle(pageId, next)
    setEditedAt(new Date())
  }, [pageId])

  useEffect(
    () => () => {
      if (titleTimer.current) clearTimeout(titleTimer.current)
      const next = pendingTitle.current
      pendingTitle.current = null
      if (next !== null) {
        window.api
          .updatePageTitle(pageId, next)
          .catch((e) => console.error('Falha ao salvar o título:', e))
      }
    },
    [pageId]
  )

  const handleTitleChange = (value: string): void => {
    setTitle(value)
    pendingTitle.current = value
    if (titleTimer.current) clearTimeout(titleTimer.current)
    titleTimer.current = setTimeout(() => {
      saveTitle().catch((e) => console.error('Falha ao salvar o título:', e))
    }, TITLE_DEBOUNCE_MS)
  }

  const flush = useCallback(async (): Promise<void> => {
    await Promise.all([saveTitle(), notesRef.current?.flushSave(), drawingRef.current?.flushSave()])
  }, [saveTitle])

  useImperativeHandle(ref, () => ({ flush }), [flush])

  const handleExport = async (): Promise<void> => {
    try {
      await flush()
      const filePath = await window.api.exportPageLocal(pageId)
      if (filePath) message.success(`Página exportada em ${filePath}`)
    } catch (error) {
      message.error(errorMessage(error))
    }
  }

  const handleSync = async (): Promise<void> => {
    setSyncing(true)
    try {
      await flush()
      await window.api.syncNotebookPageToNotion(pageId)
    } catch (error) {
      // O aviso de erro já chega pelo evento notion:syncError.
      console.error('Falha ao sincronizar a página com o Notion:', error)
    } finally {
      setSyncing(false)
    }
  }

  const [savedNotes, setSavedNotes] = useState<string | null>(null)
  const [savedDrawing, setSavedDrawing] = useState<string | null>(null)
  const initialContent = useMemo(() => parseNotes(savedNotes ?? page?.notes), [savedNotes, page])
  const owner = useMemo(() => ({ kind: 'page' as const, id: pageId }), [pageId])
  const touch = useCallback(() => setEditedAt(new Date()), [])

  if (missing) {
    return (
      <Flex align="center" justify="center" style={{ height: '100%' }}>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Página não encontrada." />
      </Flex>
    )
  }

  if (!page) {
    return (
      <Flex align="center" justify="center" style={{ height: '100%' }}>
        <Spin />
      </Flex>
    )
  }

  const actions = (
    <Flex gap={2} align="center">
      <Tooltip title="Exportar a página em Markdown">
        <Button
          type="text"
          aria-label="Exportar a página em Markdown"
          icon={<Download {...ICON} />}
          onClick={() => void handleExport()}
        />
      </Tooltip>
      <Tooltip title={syncing ? 'Sincronizando…' : 'Salvar e sincronizar com o Notion'}>
        <Button
          type="text"
          aria-label="Salvar e sincronizar com o Notion"
          disabled={syncing}
          icon={
            <RefreshCw
              {...ICON}
              className={syncing ? 'animate-spin motion-reduce:animate-none' : undefined}
            />
          }
          onClick={() => void handleSync()}
        />
      </Tooltip>
    </Flex>
  )

  const heading = (
    <div style={{ padding: '16px 24px 8px' }}>
      <Input
        variant="borderless"
        value={title}
        placeholder={UNTITLED_PAGE}
        aria-label="Título da página"
        onChange={(e) => handleTitleChange(e.target.value)}
        onBlur={() => void saveTitle()}
        onPressEnter={(e) => e.currentTarget.blur()}
        style={inlineEditStyle({ fontSize: 20, fontWeight: 600 })}
      />
      <span
        style={{
          fontFamily: token.fontFamilyCode,
          fontVariantNumeric: 'tabular-nums',
          fontSize: 12,
          color: token.colorTextTertiary
        }}
      >
        criada {formatStamp(fromSqlite(page.created_at))}
        {editedAt && ` · editada ${formatStamp(editedAt)}`}
      </span>
    </div>
  )

  return (
    <TaskWorkspace
      owner={owner}
      title={title || UNTITLED_PAGE}
      heading={heading}
      fill
      showLabels={!!screens.sm}
      tab={tab}
      onTabChange={setTab}
      focus={focus}
      onFocusChange={setFocus}
      notesActions={actions}
      initialContent={initialContent}
      editorRef={notesRef}
      onChange={() => undefined}
      onSaved={(notes) => {
        setSavedNotes(notes)
        touch()
      }}
      initialDrawing={savedDrawing ?? page.drawing}
      drawingRef={drawingRef}
      onDrawingChange={() => undefined}
      onDrawingSaved={(drawing) => {
        setSavedDrawing(drawing)
        touch()
      }}
    />
  )
})
