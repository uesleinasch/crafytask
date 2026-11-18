import { useEffect, useState } from 'react'
import type { PopupComponentProps } from '../suggestionPopup'

export interface MentionEntry {
  id: number
  label: string
  type: 'task' | 'project' | 'context' | 'page'
}

const TYPE_LABEL: Record<MentionEntry['type'], string> = {
  task: 'Tarefa',
  project: 'Projeto',
  context: 'Contexto',
  page: 'Página'
}

export function MentionList(props: PopupComponentProps<MentionEntry>): React.JSX.Element {
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
          Nada encontrado
        </span>
      </div>
    )
  }
  return (
    <div className="ct-popup" style={{ width: 256 }}>
      {items.map((it, i) => (
        <button
          key={`${it.type}-${it.id}`}
          className={i === index ? 'ct-popup-item active' : 'ct-popup-item'}
          onMouseEnter={() => setIndex(i)}
          onClick={() => command(it)}
        >
          <span className="truncate">{it.label}</span>
          <span className="ct-popup-muted shrink-0">{TYPE_LABEL[it.type]}</span>
        </button>
      ))}
    </div>
  )
}
