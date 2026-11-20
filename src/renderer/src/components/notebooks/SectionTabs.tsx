import { useRef, useState } from 'react'
import { Button, Dropdown, Tabs, Tooltip, type MenuProps } from 'antd'
import { Ellipsis, Plus } from 'lucide-react'
import type { NotebookSection } from '@shared/types'

const ICON = { size: 16, strokeWidth: 1.75, 'aria-hidden': true } as const

interface SectionTabsProps {
  sections: NotebookSection[]
  selectedId: number | null
  onSelect: (id: number) => void
  onCreate: () => void
  menuFor: (section: NotebookSection) => MenuProps
  onReorder: (id: number, targetId: number) => void
  draggingPage: () => boolean
  onDropPage: (sectionId: number) => void
}

export function SectionTabs({
  sections,
  selectedId,
  onSelect,
  onCreate,
  menuFor,
  onReorder,
  draggingPage,
  onDropPage
}: SectionTabsProps): React.JSX.Element {
  const dragging = useRef<number | null>(null)
  const [over, setOver] = useState<number | null>(null)
  const active = sections.find((s) => s.id === selectedId) ?? null

  const accepts = (section: NotebookSection): boolean =>
    draggingPage()
      ? section.id !== selectedId
      : dragging.current !== null && dragging.current !== section.id

  return (
    <Tabs
      type="editable-card"
      size="small"
      activeKey={active ? String(active.id) : undefined}
      onChange={(key) => onSelect(Number(key))}
      onEdit={(_, action) => {
        if (action === 'add') onCreate()
      }}
      addIcon={
        <Tooltip title="Nova seção">
          <Plus {...ICON} />
        </Tooltip>
      }
      locale={{ addAriaLabel: 'Nova seção' }}
      tabBarStyle={{ margin: 0 }}
      tabBarExtraContent={
        active && (
          <Dropdown menu={menuFor(active)} trigger={['click']} placement="bottomRight">
            <Button
              size="small"
              type="text"
              aria-label={`Ações da seção ${active.name}`}
              icon={<Ellipsis {...ICON} />}
              style={{ marginLeft: 4 }}
            />
          </Dropdown>
        )
      }
      items={sections.map((section) => ({
        key: String(section.id),
        closable: false,
        label: (
          <Dropdown menu={menuFor(section)} trigger={['contextMenu']}>
            <span
              className={over === section.id ? 'ct-nb-tab over' : 'ct-nb-tab'}
              title={
                over === section.id && draggingPage() ? `Mover para ${section.name}` : undefined
              }
              draggable
              onDragStart={(event) => {
                dragging.current = section.id
                event.dataTransfer.effectAllowed = 'move'
                event.dataTransfer.setData('text/plain', section.name)
              }}
              onDragEnd={() => {
                dragging.current = null
                setOver(null)
              }}
              onDragOver={(event) => {
                if (!accepts(section)) return
                event.preventDefault()
                setOver(section.id)
              }}
              onDragLeave={() => setOver((current) => (current === section.id ? null : current))}
              onDrop={(event) => {
                event.preventDefault()
                setOver(null)
                const id = dragging.current
                dragging.current = null
                if (draggingPage()) {
                  if (section.id !== selectedId) onDropPage(section.id)
                } else if (id !== null && id !== section.id) {
                  onReorder(id, section.id)
                }
              }}
            >
              <span className="ct-nb-dot" style={{ background: section.color }} aria-hidden />
              {section.name}
            </span>
          </Dropdown>
        )
      }))}
    />
  )
}
