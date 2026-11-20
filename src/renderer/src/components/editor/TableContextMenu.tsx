import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'

type MenuItem = { label: string; run: (e: Editor) => void; danger?: boolean } | 'divider'

const TABLE_ITEMS: MenuItem[] = [
  { label: 'Adicionar coluna antes', run: (e) => e.chain().focus().addColumnBefore().run() },
  { label: 'Adicionar coluna depois', run: (e) => e.chain().focus().addColumnAfter().run() },
  { label: 'Excluir coluna', run: (e) => e.chain().focus().deleteColumn().run() },
  'divider',
  { label: 'Adicionar linha antes', run: (e) => e.chain().focus().addRowBefore().run() },
  { label: 'Adicionar linha depois', run: (e) => e.chain().focus().addRowAfter().run() },
  { label: 'Excluir linha', run: (e) => e.chain().focus().deleteRow().run() },
  'divider',
  { label: 'Mesclar células', run: (e) => e.chain().focus().mergeCells().run() },
  { label: 'Dividir célula', run: (e) => e.chain().focus().splitCell().run() },
  'divider',
  { label: 'Excluir tabela', run: (e) => e.chain().focus().deleteTable().run(), danger: true }
]

const INSERT_ITEMS: MenuItem[] = [
  {
    label: 'Inserir tabela',
    run: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }
]

interface MenuState {
  x: number
  y: number
  inTable: boolean
}

export function TableContextMenu({ editor }: { editor: Editor | null }): React.JSX.Element | null {
  const [menu, setMenu] = useState<MenuState | null>(null)

  useEffect(() => {
    if (!editor) return undefined
    const dom = editor.view.dom
    const onContext = (e: MouseEvent): void => {
      // Move o cursor para a posição clicada, para operar na célula certa.
      const pos = editor.view.posAtCoords({ left: e.clientX, top: e.clientY })
      if (pos) editor.commands.setTextSelection(pos.pos)
      e.preventDefault()
      setMenu({ x: e.clientX, y: e.clientY, inTable: editor.isActive('table') })
    }
    dom.addEventListener('contextmenu', onContext)
    return () => dom.removeEventListener('contextmenu', onContext)
  }, [editor])

  useEffect(() => {
    if (!menu) return undefined
    const close = (): void => setMenu(null)
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setMenu(null)
    }
    window.addEventListener('click', close)
    window.addEventListener('scroll', close, true)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [menu])

  if (!editor || !menu) return null

  const items = menu.inTable ? TABLE_ITEMS : INSERT_ITEMS
  const left = Math.min(menu.x, window.innerWidth - 224)
  const top = Math.min(menu.y, window.innerHeight - 340)

  return (
    <div
      style={{ position: 'fixed', left, top, zIndex: 9999, width: 208 }}
      className="ct-popup"
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((it, i) =>
        it === 'divider' ? (
          <div key={`d${i}`} className="ct-popup-divider" />
        ) : (
          <button
            key={it.label}
            onClick={() => {
              it.run(editor)
              setMenu(null)
            }}
            className={it.danger ? 'ct-popup-item danger' : 'ct-popup-item'}
          >
            {it.label}
          </button>
        )
      )}
    </div>
  )
}
