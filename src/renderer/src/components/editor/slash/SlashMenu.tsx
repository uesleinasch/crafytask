import { useEffect, useState } from 'react'
import type { Editor, Range } from '@tiptap/core'
import type { PopupComponentProps } from '../suggestionPopup'

export interface SlashItem {
  title: string
  command: (props: { editor: Editor; range: Range }) => void
}

export function SlashMenu(props: PopupComponentProps<SlashItem>): React.JSX.Element {
  const { items, command, registerKeyHandler } = props
  const [index, setIndex] = useState(0)

  useEffect(() => setIndex(0), [items])

  useEffect(() => {
    registerKeyHandler((e) => {
      if (!items.length) return false
      if (e.key === 'ArrowDown') {
        setIndex((i) => (i + 1) % items.length)
        return true
      }
      if (e.key === 'ArrowUp') {
        setIndex((i) => (i - 1 + items.length) % items.length)
        return true
      }
      if (e.key === 'Enter') {
        const it = items[index]
        if (it) command(it)
        return true
      }
      return false
    })
  }, [items, index, command, registerKeyHandler])

  if (!items.length) {
    return (
      <div className="ct-popup">
        <span className="ct-popup-muted" style={{ padding: '4px 8px', display: 'block' }}>
          Nenhum comando
        </span>
      </div>
    )
  }
  return (
    <div className="ct-popup" style={{ width: 224 }}>
      {items.map((it, i) => (
        <button
          key={it.title}
          className={i === index ? 'ct-popup-item active' : 'ct-popup-item'}
          onMouseEnter={() => setIndex(i)}
          onClick={() => command(it)}
        >
          {it.title}
        </button>
      ))}
    </div>
  )
}
