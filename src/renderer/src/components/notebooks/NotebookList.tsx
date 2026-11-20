import { useRef, useState, type ReactNode } from 'react'
import {
  Button,
  Card,
  Divider,
  Dropdown,
  Menu,
  Select,
  Spin,
  Tooltip,
  Typography,
  type MenuProps
} from 'antd'
import { BookOpen, Ellipsis, Plus } from 'lucide-react'
import type { Notebook } from '@shared/types'

const ICON = { size: 16, strokeWidth: 1.75, 'aria-hidden': true } as const

interface NotebookNavProps {
  notebooks: Notebook[]
  selectedId: number | null
  onSelect: (id: number) => void
  onCreate: () => void
  menuFor: (notebook: Notebook) => MenuProps
}

interface NotebookListProps extends NotebookNavProps {
  loaded: boolean
  syncingId: number | null
  search: ReactNode
  onReorder: (id: number, targetId: number) => void
}

export function NotebookList({
  notebooks,
  loaded,
  selectedId,
  syncingId,
  search,
  onSelect,
  onCreate,
  menuFor,
  onReorder
}: NotebookListProps): React.JSX.Element {
  const dragging = useRef<number | null>(null)
  const [over, setOver] = useState<number | null>(null)

  const items: MenuProps['items'] = notebooks.map((notebook) => ({
    key: String(notebook.id),
    icon: <BookOpen {...ICON} style={{ color: notebook.color }} />,
    label: (
      <Dropdown menu={menuFor(notebook)} trigger={['contextMenu']}>
        <div
          className={[
            'ct-nb-node',
            notebook.id === selectedId ? 'on' : '',
            over === notebook.id ? 'over' : ''
          ].join(' ')}
          draggable
          onDragStart={(event) => {
            dragging.current = notebook.id
            event.dataTransfer.effectAllowed = 'move'
            event.dataTransfer.setData('text/plain', notebook.name)
          }}
          onDragEnd={() => {
            dragging.current = null
            setOver(null)
          }}
          onDragOver={(event) => {
            if (dragging.current === null || dragging.current === notebook.id) return
            event.preventDefault()
            setOver(notebook.id)
          }}
          onDragLeave={() => setOver((current) => (current === notebook.id ? null : current))}
          onDrop={(event) => {
            event.preventDefault()
            const id = dragging.current
            dragging.current = null
            setOver(null)
            if (id !== null && id !== notebook.id) onReorder(id, notebook.id)
          }}
        >
          <span className="ct-ellipsis" style={{ flex: 1 }}>
            {notebook.name}
          </span>
          {syncingId === notebook.id && (
            <Tooltip title="Sincronizando com o Notion">
              <Spin size="small" aria-label="Sincronizando com o Notion" />
            </Tooltip>
          )}
          <span className="ct-nb-act">
            <Dropdown menu={menuFor(notebook)} trigger={['click']} placement="bottomRight">
              <Button
                size="small"
                type="text"
                aria-label={`Ações de ${notebook.name}`}
                icon={<Ellipsis {...ICON} />}
                onClick={(event) => event.stopPropagation()}
              />
            </Dropdown>
          </span>
        </div>
      </Dropdown>
    )
  }))

  return (
    <Card
      size="small"
      className="ct-nb-side"
      styles={{
        body: { padding: 8, display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }
      }}
    >
      {search}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <div className="ct-nb-eyebrow" style={{ padding: '8px 8px 4px' }}>
          Cadernos
        </div>
        {notebooks.length > 0 ? (
          <Menu
            mode="inline"
            selectedKeys={selectedId === null ? [] : [String(selectedId)]}
            items={items}
            onClick={({ key }) => onSelect(Number(key))}
            style={{ borderInlineEnd: 0, background: 'transparent' }}
          />
        ) : (
          <Typography.Text
            type="secondary"
            style={{ display: 'block', padding: '4px 8px', fontSize: 13 }}
          >
            {loaded ? 'Nenhum caderno ainda.' : 'Carregando…'}
          </Typography.Text>
        )}
      </div>
      <Button
        type="text"
        block
        icon={<Plus {...ICON} />}
        style={{ justifyContent: 'flex-start' }}
        onClick={onCreate}
      >
        Novo caderno
      </Button>
    </Card>
  )
}

export function NotebookSelect({
  notebooks,
  selectedId,
  onSelect,
  onCreate,
  menuFor
}: NotebookNavProps): React.JSX.Element {
  const selected = notebooks.find((n) => n.id === selectedId) ?? null
  return (
    <>
      <Select
        aria-label="Caderno"
        placeholder="Escolha um caderno"
        value={selected?.id}
        onChange={onSelect}
        style={{ flex: '1 1 180px', minWidth: 0 }}
        options={notebooks.map((notebook) => ({
          value: notebook.id,
          label: (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <BookOpen {...ICON} style={{ color: notebook.color, flex: 'none' }} />
              <span className="ct-ellipsis">{notebook.name}</span>
            </span>
          )
        }))}
        popupRender={(menu) => (
          <>
            {menu}
            <Divider style={{ margin: '4px 0' }} />
            <Button
              type="text"
              block
              icon={<Plus {...ICON} />}
              style={{ justifyContent: 'flex-start' }}
              onClick={onCreate}
            >
              Novo caderno
            </Button>
          </>
        )}
      />
      {selected && (
        <Dropdown menu={menuFor(selected)} trigger={['click']} placement="bottomRight">
          <Button aria-label={`Ações de ${selected.name}`} icon={<Ellipsis {...ICON} />} />
        </Dropdown>
      )}
    </>
  )
}
