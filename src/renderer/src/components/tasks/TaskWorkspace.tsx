import { useState, type ReactNode, type Ref } from 'react'
import { Button, Flex, Segmented, Space, Tabs, Tooltip, theme } from 'antd'
import { ArrowLeft, Expand, FileText, History, Pause, PenTool, Play, Shrink } from 'lucide-react'
import type { JSONContent } from '@tiptap/core'
import type { NotesOwner } from '@shared/types'
import { FocusOverlay } from '@renderer/components/editor/FocusOverlay'
import { NotesBody, type NotesTab } from '@renderer/components/editor/NotesPanel'
import type { TaskNotesEditorHandle } from '@renderer/components/editor/TaskNotesEditor'
import type { TaskDrawingEditorHandle } from '@renderer/components/editor/TaskDrawingEditor'
import { LiveDot } from '@renderer/components/chips/LiveDot'
import { RegionBoundary } from '@renderer/components/shell/RegionBoundary'
import { formatTime } from '@renderer/lib/utils'

const ICON = { size: 16, strokeWidth: 1.75, 'aria-hidden': true } as const

interface TaskWorkspaceProps {
  owner: NotesOwner
  title: string
  heading?: ReactNode
  fill: boolean
  showLabels: boolean
  tab: NotesTab
  onTabChange: (tab: NotesTab) => void
  focus: boolean
  onFocusChange: (focus: boolean) => void
  notesActions: ReactNode
  history?: ReactNode
  timer?: {
    displaySeconds: number
    isRunning: boolean
    startBlocked: boolean
    onToggle: () => void
  }
  initialContent: JSONContent
  editorRef: Ref<TaskNotesEditorHandle>
  onChange: () => void
  onSaved: (notes: string) => void
  initialDrawing: string | null
  drawingRef: Ref<TaskDrawingEditorHandle>
  onDrawingChange: () => void
  onDrawingSaved: (drawing: string) => void
  readOnly?: boolean
}

export function TaskWorkspace({
  owner,
  title,
  heading,
  fill,
  showLabels,
  tab,
  onTabChange,
  focus,
  onFocusChange,
  notesActions,
  history,
  timer,
  initialContent,
  editorRef,
  onChange,
  onSaved,
  initialDrawing,
  drawingRef,
  onDrawingChange,
  onDrawingSaved,
  readOnly = false
}: TaskWorkspaceProps): React.JSX.Element {
  const { token } = theme.useToken()
  const exit = (): void => onFocusChange(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const showingHistory = Boolean(history) && historyOpen && !focus

  const header = (
    <Flex
      align="center"
      gap={4}
      style={{ padding: '0 8px 0 12px', borderBottom: `1px solid ${token.colorBorderSecondary}` }}
    >
      <Tabs
        size="small"
        activeKey={showingHistory ? 'history' : tab}
        onChange={(key) => {
          setHistoryOpen(key === 'history')
          if (key !== 'history') onTabChange(key as NotesTab)
        }}
        tabBarStyle={{ margin: 0 }}
        style={{ flex: 1, minWidth: 0, marginBottom: -1 }}
        items={[
          {
            key: 'notes',
            label: (
              <Space size={4}>
                <FileText size={14} strokeWidth={1.75} aria-hidden />
                Notas
              </Space>
            )
          },
          {
            key: 'drawing',
            label: (
              <Space size={4}>
                <PenTool size={14} strokeWidth={1.75} aria-hidden />
                Desenho
              </Space>
            )
          },
          ...(history
            ? [
                {
                  key: 'history',
                  label: (
                    <Space size={4}>
                      <History size={14} strokeWidth={1.75} aria-hidden />
                      Histórico
                    </Space>
                  )
                }
              ]
            : [])
        ]}
      />
      {!showingHistory && tab === 'notes' && notesActions}
      {!showingHistory && (
        <Tooltip title="Modo foco (Esc sai)">
          <Button
            type="text"
            aria-label="Modo foco"
            data-focus-opener
            icon={<Expand {...ICON} />}
            onClick={() => onFocusChange(true)}
          />
        </Tooltip>
      )}
    </Flex>
  )

  const bar = (
    <>
      <Button type="text" icon={<ArrowLeft {...ICON} />} onClick={exit} aria-label="Sair">
        {showLabels ? 'Sair' : null}
      </Button>
      <span
        title={title}
        style={{
          flex: 1,
          minWidth: 0,
          fontWeight: 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        {title}
      </span>
      {timer && (
        <>
          {timer.isRunning && <LiveDot label="Timer rodando" />}
          <span style={{ fontFamily: token.fontFamilyCode, fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(timer.displaySeconds)}
          </span>
          <Tooltip title={timer.isRunning ? 'Pausar' : 'Iniciar'}>
            <Button
              type="text"
              disabled={(readOnly && !timer.isRunning) || timer.startBlocked}
              aria-label={timer.isRunning ? 'Pausar' : 'Iniciar'}
              icon={timer.isRunning ? <Pause {...ICON} /> : <Play {...ICON} />}
              onClick={timer.onToggle}
            />
          </Tooltip>
        </>
      )}
      <Segmented
        size="small"
        value={tab}
        onChange={(value) => onTabChange(value as NotesTab)}
        options={[
          {
            value: 'notes',
            title: 'Notas',
            icon: <FileText size={14} strokeWidth={1.75} aria-hidden />,
            label: showLabels ? 'Notas' : undefined
          },
          {
            value: 'drawing',
            title: 'Desenho',
            icon: <PenTool size={14} strokeWidth={1.75} aria-hidden />,
            label: showLabels ? 'Desenho' : undefined
          }
        ]}
      />
      {tab === 'notes' && notesActions}
      <Tooltip title="Sair do modo foco (Esc)">
        <Button
          type="text"
          aria-label="Sair do modo foco"
          icon={<Shrink {...ICON} />}
          onClick={exit}
        />
      </Tooltip>
    </>
  )

  const notesStyle = focus
    ? { maxWidth: '68ch', marginInline: 'auto', paddingBlock: '40px 64px', fontSize: 17 }
    : undefined

  return (
    <FocusOverlay
      open={focus}
      onExit={exit}
      label={`Modo foco: ${title}`}
      bar={bar}
      header={
        <>
          {heading}
          {header}
        </>
      }
      style={{
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        overflow: 'hidden',
        ...(fill ? { height: '100%' } : null)
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: fill || focus ? 0 : tab === 'drawing' ? 480 : 360,
          flex: fill || focus ? 1 : undefined,
          ...(focus && tab === 'notes'
            ? {
                paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))',
                paddingRight: 'max(16px, env(safe-area-inset-right, 0px))'
              }
            : null)
        }}
      >
        {showingHistory && (
          <div
            className="flex-1 overflow-y-auto"
            style={{ padding: '20px 24px', scrollbarWidth: 'thin' }}
          >
            <RegionBoundary region="histórico da tarefa" resetKeys={[owner.kind, owner.id]}>
              {history}
            </RegionBoundary>
          </div>
        )}
        <div
          style={{
            display: showingHistory ? 'none' : 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0
          }}
        >
          <NotesBody
            owner={owner}
            tab={tab}
            initialContent={initialContent}
            editorRef={editorRef}
            onChange={onChange}
            onSaved={onSaved}
            initialDrawing={initialDrawing}
            drawingRef={drawingRef}
            onDrawingChange={onDrawingChange}
            onDrawingSaved={onDrawingSaved}
            notesStyle={notesStyle}
            readOnly={readOnly}
          />
        </div>
      </div>
    </FocusOverlay>
  )
}
