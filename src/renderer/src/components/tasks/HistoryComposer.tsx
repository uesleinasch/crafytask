import { useRef, useState } from 'react'
import { Button, Flex, Input, Popover, Select, Tooltip, Typography, theme } from 'antd'
import { Extension } from '@tiptap/core'
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react'
import {
  AtSign,
  Bold,
  Code,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListChecks,
  ListOrdered,
  Strikethrough,
  type LucideIcon
} from 'lucide-react'
import { buildExtensions } from '@renderer/components/editor/extensions'
import { pickImageFile, uploadAndInsert } from '@renderer/components/editor/imageUpload'

const { Text } = Typography

type BlockStyle = 'paragraph' | 'h1' | 'h2' | 'h3' | 'blockquote' | 'codeBlock'

const BLOCK_OPTIONS: { value: BlockStyle; label: string }[] = [
  { value: 'paragraph', label: 'Texto normal' },
  { value: 'h1', label: 'Título 1' },
  { value: 'h2', label: 'Título 2' },
  { value: 'h3', label: 'Título 3' },
  { value: 'blockquote', label: 'Citação' },
  { value: 'codeBlock', label: 'Bloco de código' }
]

function currentBlock(editor: Editor): BlockStyle {
  if (editor.isActive('codeBlock')) return 'codeBlock'
  if (editor.isActive('blockquote')) return 'blockquote'
  for (const level of [1, 2, 3] as const) {
    if (editor.isActive('heading', { level })) return `h${level}`
  }
  return 'paragraph'
}

function applyBlock(editor: Editor, style: BlockStyle): void {
  const chain = editor.chain().focus()
  if (editor.isActive('blockquote') && style !== 'blockquote') chain.lift('blockquote')
  if (style === 'paragraph') chain.setParagraph()
  else if (style === 'codeBlock') chain.setCodeBlock()
  else if (style === 'blockquote') chain.setParagraph().setBlockquote()
  else chain.setHeading({ level: Number(style.slice(1)) as 1 | 2 | 3 })
  chain.run()
}

function composerKeys(onSubmit: () => void, onCancel: () => void): Extension {
  return Extension.create({
    name: 'historyComposerKeys',
    priority: 50,
    addKeyboardShortcuts() {
      return {
        'Mod-Enter': () => {
          onSubmit()
          return true
        },
        Escape: () => {
          onCancel()
          return true
        }
      }
    }
  })
}

const SEPARATOR = (
  <span
    aria-hidden
    style={{
      width: 1,
      height: 18,
      margin: '0 4px',
      background: 'var(--ant-color-border-secondary)'
    }}
  />
)

function ToolButton({
  title,
  icon: Icon,
  active,
  onClick
}: {
  title: string
  icon: LucideIcon
  active?: boolean
  onClick: () => void
}): React.JSX.Element {
  return (
    <Tooltip title={title}>
      <Button
        type="text"
        size="small"
        aria-label={title}
        aria-pressed={active}
        icon={<Icon size={15} strokeWidth={1.75} aria-hidden />}
        color={active ? 'primary' : 'default'}
        variant={active ? 'filled' : 'text'}
        onMouseDown={(event) => event.preventDefault()}
        onClick={onClick}
      />
    </Tooltip>
  )
}

function LinkButton({ editor, active }: { editor: Editor; active: boolean }): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [href, setHref] = useState('')

  const apply = (): void => {
    const url = href.trim()
    const chain = editor.chain().focus().extendMarkRange('link')
    if (url) chain.setLink({ href: url }).run()
    else chain.unsetLink().run()
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      trigger="click"
      placement="bottom"
      onOpenChange={(next) => {
        if (next) setHref((editor.getAttributes('link').href as string | undefined) ?? '')
        setOpen(next)
      }}
      content={
        <Flex gap={8}>
          <Input
            autoFocus
            size="small"
            placeholder="https://"
            value={href}
            onChange={(event) => setHref(event.target.value)}
            onPressEnter={apply}
            style={{ width: 240 }}
          />
          <Button size="small" type="primary" onClick={apply}>
            Aplicar
          </Button>
        </Flex>
      }
    >
      <span>
        <ToolButton title="Link" icon={LinkIcon} active={active} onClick={() => setOpen(!open)} />
      </span>
    </Popover>
  )
}

interface HistoryComposerProps {
  taskId: number
  saving: boolean
  onCancel: () => void
  onSave: (doc: string) => void
}

export function HistoryComposer({
  taskId,
  saving,
  onCancel,
  onSave
}: HistoryComposerProps): React.JSX.Element {
  const { token } = theme.useToken()
  const owner = { kind: 'task', id: taskId } as const

  const submitRef = useRef<() => void>(() => {})
  const cancelRef = useRef(onCancel)
  cancelRef.current = onCancel

  const editor = useEditor(
    {
      extensions: [
        ...buildExtensions(owner, 'O que vale lembrar ao retomar esta tarefa?'),
        composerKeys(
          () => submitRef.current(),
          () => cancelRef.current()
        )
      ],
      autofocus: true,
      editorProps: {
        attributes: {
          class: 'notes-editor-content ct-history-note focus:outline-none',
          'aria-label': 'Anotação',
          style: 'min-height: 96px; padding: 10px 12px'
        }
      }
    },
    [taskId]
  )

  const state = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      current
        ? {
            block: currentBlock(current),
            bold: current.isActive('bold'),
            italic: current.isActive('italic'),
            strike: current.isActive('strike'),
            code: current.isActive('code'),
            bulletList: current.isActive('bulletList'),
            orderedList: current.isActive('orderedList'),
            taskList: current.isActive('taskList'),
            link: current.isActive('link'),
            empty: current.isEmpty
          }
        : null
  })

  const submit = (): void => {
    if (editor && !editor.isEmpty && !saving) onSave(JSON.stringify(editor.getJSON()))
  }
  submitRef.current = submit

  if (!editor || !state) return <div style={{ minHeight: 140 }} />

  const run = (fn: (chain: ReturnType<Editor['chain']>) => ReturnType<Editor['chain']>): void => {
    fn(editor.chain().focus()).run()
  }

  const startMention = (): void => {
    const { $from } = editor.state.selection
    const before = $from.parent.textBetween(Math.max(0, $from.parentOffset - 1), $from.parentOffset)
    run((c) => c.insertContent(before === '' || /\s/.test(before) ? '@' : ' @'))
  }

  const insertImage = async (): Promise<void> => {
    const file = await pickImageFile()
    if (file) await uploadAndInsert(editor, owner, file)
  }

  return (
    <Flex vertical gap={8}>
      <div className="ct-history-composer">
        <div role="toolbar" aria-label="Formatação" className="ct-history-composer-bar">
          <Select
            size="small"
            variant="borderless"
            aria-label="Estilo do bloco"
            value={state.block}
            options={BLOCK_OPTIONS}
            onChange={(style) => applyBlock(editor, style)}
            style={{ width: 140 }}
          />
          {SEPARATOR}
          <ToolButton
            title="Negrito (Ctrl+B)"
            icon={Bold}
            active={state.bold}
            onClick={() => run((c) => c.toggleBold())}
          />
          <ToolButton
            title="Itálico (Ctrl+I)"
            icon={Italic}
            active={state.italic}
            onClick={() => run((c) => c.toggleItalic())}
          />
          <ToolButton
            title="Tachado"
            icon={Strikethrough}
            active={state.strike}
            onClick={() => run((c) => c.toggleStrike())}
          />
          <ToolButton
            title="Código"
            icon={Code}
            active={state.code}
            onClick={() => run((c) => c.toggleCode())}
          />
          {SEPARATOR}
          <ToolButton
            title="Lista"
            icon={List}
            active={state.bulletList}
            onClick={() => run((c) => c.toggleBulletList())}
          />
          <ToolButton
            title="Lista numerada"
            icon={ListOrdered}
            active={state.orderedList}
            onClick={() => run((c) => c.toggleOrderedList())}
          />
          <ToolButton
            title="Lista de tarefas"
            icon={ListChecks}
            active={state.taskList}
            onClick={() => run((c) => c.toggleTaskList())}
          />
          {SEPARATOR}
          <LinkButton editor={editor} active={state.link} />
          <ToolButton title="Mencionar tarefa ou página (@)" icon={AtSign} onClick={startMention} />
          <ToolButton
            title="Imagem (ou cole e arraste no texto)"
            icon={ImageIcon}
            onClick={() => void insertImage()}
          />
        </div>
        <div className="ct-history-composer-body">
          <EditorContent editor={editor} />
        </div>
      </div>
      <Flex gap={8} align="center" wrap>
        <Text type="secondary" style={{ fontSize: 12 }}>
          <span style={{ fontFamily: token.fontFamilyCode }}>Ctrl+Enter</span> grava ·{' '}
          <span style={{ fontFamily: token.fontFamilyCode }}>/</span> blocos ·{' '}
          <span style={{ fontFamily: token.fontFamilyCode }}>@</span> menciona · cole imagens
        </Text>
        <div style={{ flex: 1 }} />
        <Button size="small" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          size="small"
          type="primary"
          loading={saving}
          disabled={state.empty}
          onClick={submit}
        >
          Gravar
        </Button>
      </Flex>
    </Flex>
  )
}
