import type { ReactNode, Ref } from 'react'
import { Button, Flex, Segmented, Space, Tabs, Tooltip, theme } from 'antd'
import { ArrowLeft, Expand, FileText, Pause, PenTool, Play, Shrink } from 'lucide-react'
import type { JSONContent } from '@tiptap/core'
import type { NotesOwner } from '@shared/types'
import { FocusOverlay } from '@renderer/components/editor/FocusOverlay'
import { NotesBody, type NotesTab } from '@renderer/components/editor/NotesPanel'
import type { TaskNotesEditorHandle } from '@renderer/components/editor/TaskNotesEditor'
import type { TaskDrawingEditorHandle } from '@renderer/components/editor/TaskDrawingEditor'
import { LiveDot } from '@renderer/components/chips/LiveDot'
import { formatTime } from '@renderer/lib/utils'

const ICON = { size: 16, strokeWidth: 1.75, 'aria-hidden': true } as const

interface TaskWorkspaceProps {
  owner: NotesOwner
  taskName: string
  fill: boolean
  showLabels: boolean
  tab: NotesTab
  onTabChange: (tab: NotesTab) => void
  focus: boolean
  onFocusChange: (focus: boolean) => void
  notesActions: ReactNode
  displaySeconds: number
  isRunning: boolean
  startBlocked: boolean
  onToggleTimer: () => void
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
  taskName,
  fill,
  showLabels,
  tab,
  onTabChange,
  focus,
  onFocusChange,
  notesActions,
  displaySeconds,
  isRunning,
  startBlocked,
  onToggleTimer,
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

  const header = (
    <Flex
      align="center"
      gap={4}
      style={{ padding: '0 8px 0 12px', borderBottom: `1px solid ${token.colorBorderSecondary}` }}
    >
      <Tabs
        size="small"
        activeKey={tab}
        onChange={(key) => onTabChange(key as NotesTab)}
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
          }
        ]}
      />
      {tab === 'notes' && notesActions}
      <Tooltip title="Modo foco (Esc sai)">
        <Button
          type="text"
          aria-label="Modo foco"
          data-focus-opener
          icon={<Expand {...ICON} />}
          onClick={() => onFocusChange(true)}
        />
      </Tooltip>
    </Flex>
  )

  const bar = (
    <>
      <Button type="text" icon={<ArrowLeft {...ICON} />} onClick={exit} aria-label="Sair">
        {showLabels ? 'Sair' : null}
      </Button>
      <span
        title={taskName}
        style={{
          flex: 1,
          minWidth: 0,
          fontWeight: 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        {taskName}
      </span>
      {isRunning && <LiveDot label="Timer rodando" />}
      <span style={{ fontFamily: token.fontFamilyCode, fontVariantNumeric: 'tabular-nums' }}>
        {formatTime(displaySeconds)}
      </span>
      <Tooltip title={isRunning ? 'Pausar' : 'Iniciar'}>
        <Button
          type="text"
          disabled={readOnly || startBlocked}
          aria-label={isRunning ? 'Pausar' : 'Iniciar'}
          icon={isRunning ? <Pause {...ICON} /> : <Play {...ICON} />}
          onClick={onToggleTimer}
        />
      </Tooltip>
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
      label={`Modo foco: ${taskName}`}
      bar={bar}
      header={header}
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
    </FocusOverlay>
  )
}
