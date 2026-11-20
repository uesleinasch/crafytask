import { useState } from 'react'
import { BubbleMenu } from '@tiptap/react/menus'
import type { Editor } from '@tiptap/react'
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Highlighter,
  Link as LinkIcon,
  ALargeSmall
} from 'lucide-react'

const FONT_SIZES = ['12px', '14px', '16px', '18px', '24px', '32px']

function FontSizePicker({ editor }: { editor: Editor }): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const current = editor.getAttributes('textStyle').fontSize as string | undefined

  const apply = (size: string | null): void => {
    const chain = editor.chain().focus()
    if (size) chain.setFontSize(size).run()
    else chain.unsetFontSize().run()
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        className={current ? 'ct-tool active' : 'ct-tool'}
        aria-label="Tamanho da fonte"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title="Tamanho da fonte"
      >
        <ALargeSmall size={16} />
      </button>
      {open && (
        <div
          className="ct-popup"
          style={{
            position: 'absolute',
            left: 0,
            top: '100%',
            zIndex: 50,
            marginTop: 4,
            width: 112
          }}
        >
          <button
            className={current ? 'ct-popup-item' : 'ct-popup-item active'}
            onClick={() => apply(null)}
          >
            Padrão
          </button>
          {FONT_SIZES.map((size) => (
            <button
              key={size}
              className={current === size ? 'ct-popup-item active' : 'ct-popup-item'}
              onClick={() => apply(size)}
            >
              {parseInt(size, 10)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function BubbleToolbar({ editor }: { editor: Editor | null }): React.JSX.Element | null {
  if (!editor) return null
  const tool = (name: string): string => (editor.isActive(name) ? 'ct-tool active' : 'ct-tool')
  return (
    <BubbleMenu editor={editor} className="ct-popup flex gap-0.5">
      <button
        className={tool('bold')}
        aria-label="Negrito"
        aria-pressed={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold size={16} />
      </button>
      <button
        className={tool('italic')}
        aria-label="Itálico"
        aria-pressed={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic size={16} />
      </button>
      <button
        className={tool('strike')}
        aria-label="Tachado"
        aria-pressed={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough size={16} />
      </button>
      <button
        className={tool('code')}
        aria-label="Código"
        aria-pressed={editor.isActive('code')}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <Code size={16} />
      </button>
      <button
        className={tool('highlight')}
        aria-label="Marca-texto"
        aria-pressed={editor.isActive('highlight')}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
      >
        <Highlighter size={16} />
      </button>
      <FontSizePicker editor={editor} />
      <button
        className={tool('link')}
        aria-label="Link"
        aria-pressed={editor.isActive('link')}
        onClick={() => {
          const prev = editor.getAttributes('link').href as string | undefined
          const url = window.prompt('URL do link:', prev ?? '')
          if (url === null) return
          if (url === '') editor.chain().focus().unsetLink().run()
          else editor.chain().focus().setLink({ href: url }).run()
        }}
      >
        <LinkIcon size={16} />
      </button>
    </BubbleMenu>
  )
}
