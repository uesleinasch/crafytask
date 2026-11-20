import { useMemo, useState } from 'react'
import { App, Button, Dropdown, Empty, Flex, Tooltip, Tree, theme, type MenuProps } from 'antd'
import type { TreeDataNode, TreeProps } from 'antd'
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  Ellipsis,
  FilePlus2,
  IndentDecrease,
  IndentIncrease,
  Plus,
  Trash2
} from 'lucide-react'
import type { NotebookPageSummary, NotebookSection } from '@shared/types'
import {
  MAX_PAGE_DEPTH,
  canPlaceUnder,
  indentPlacement,
  outdentPlacement,
  pageDepth,
  shiftPlacement,
  siblingsOf,
  treeDropPlacement,
  type PagePlacement
} from '@shared/notebookTree'
import { UNTITLED_PAGE } from './notebookUi'

const ICON = { size: 16, strokeWidth: 1.75, 'aria-hidden': true } as const

interface PageNode extends TreeDataNode {
  page: NotebookPageSummary
  children: PageNode[]
}

interface PageTreeProps {
  pages: NotebookPageSummary[]
  sections: NotebookSection[]
  sectionId: number | null
  selectedId: number | null
  onSelect: (id: number) => void
  onCreate: (parentId: number | null) => void
  onPlace: (id: number, placement: PagePlacement) => void
  onMoveToSection: (id: number, sectionId: number) => void
  onDelete: (page: NotebookPageSummary) => void
  onDragChange: (pageId: number | null) => void
}

function buildNodes(pages: NotebookPageSummary[], parentId: number | null): PageNode[] {
  return siblingsOf(pages, parentId).map((page) => ({
    key: String(page.id),
    page,
    children: buildNodes(pages, page.id)
  }))
}

const titleOf = (page: NotebookPageSummary): string => page.title || UNTITLED_PAGE

export function PageTree({
  pages,
  sections,
  sectionId,
  selectedId,
  onSelect,
  onCreate,
  onPlace,
  onMoveToSection,
  onDelete,
  onDragChange
}: PageTreeProps): React.JSX.Element {
  const { token } = theme.useToken()
  const { message } = App.useApp()
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  const nodes = useMemo(() => buildNodes(pages, null), [pages])
  const expandedKeys = useMemo(
    () =>
      pages
        .filter((p) => pages.some((child) => child.parent_page_id === p.id))
        .map((p) => String(p.id))
        .filter((key) => !collapsed.has(key)),
    [pages, collapsed]
  )

  const place = (id: number, placement: PagePlacement | null): void => {
    if (!placement) return
    if (!canPlaceUnder(pages, id, placement.parent_page_id)) {
      message.warning('Subpáginas vão até 2 níveis.')
      return
    }
    onPlace(id, placement)
  }

  const menuFor = (page: NotebookPageSummary): MenuProps => {
    const depth = pageDepth(pages, page.id)
    const indent = indentPlacement(pages, page.id)
    const others = sections.filter((s) => s.id !== sectionId)
    return {
      items: [
        depth < MAX_PAGE_DEPTH
          ? { key: 'sub', icon: <FilePlus2 {...ICON} />, label: 'Nova subpágina' }
          : null,
        depth > 0
          ? { key: 'out', icon: <IndentDecrease {...ICON} />, label: 'Promover (sobe um nível)' }
          : null,
        indent && canPlaceUnder(pages, page.id, indent.parent_page_id)
          ? { key: 'in', icon: <IndentIncrease {...ICON} />, label: 'Tornar subpágina da anterior' }
          : null,
        {
          key: 'up',
          icon: <ArrowUp {...ICON} />,
          label: 'Mover para cima',
          disabled: !shiftPlacement(pages, page.id, -1)
        },
        {
          key: 'down',
          icon: <ArrowDown {...ICON} />,
          label: 'Mover para baixo',
          disabled: !shiftPlacement(pages, page.id, 1)
        },
        others.length > 0
          ? {
              key: 'move',
              icon: <ArrowLeftRight {...ICON} />,
              label: 'Mover para a seção',
              children: others.map((s) => ({
                key: `move:${s.id}`,
                icon: <span className="ct-nb-dot" style={{ background: s.color }} aria-hidden />,
                label: s.name
              }))
            }
          : null,
        { type: 'divider' },
        { key: 'delete', icon: <Trash2 {...ICON} />, label: 'Excluir página…', danger: true }
      ],
      onClick: ({ key, domEvent }) => {
        domEvent.stopPropagation()
        if (key === 'sub') onCreate(page.id)
        else if (key === 'out') place(page.id, outdentPlacement(pages, page.id))
        else if (key === 'in') place(page.id, indent)
        else if (key === 'up') place(page.id, shiftPlacement(pages, page.id, -1))
        else if (key === 'down') place(page.id, shiftPlacement(pages, page.id, 1))
        else if (key.startsWith('move:')) onMoveToSection(page.id, Number(key.slice(5)))
        else if (key === 'delete') onDelete(page)
      }
    }
  }

  const renderTitle = (node: TreeDataNode): React.ReactNode => {
    const { page } = node as PageNode
    const depth = pageDepth(pages, page.id)
    return (
      <Dropdown menu={menuFor(page)} trigger={['contextMenu']}>
        <div className={page.id === selectedId ? 'ct-nb-node on' : 'ct-nb-node'}>
          <span
            className="ct-ellipsis"
            style={{
              flex: 1,
              fontWeight: depth === 0 ? 500 : 400,
              fontStyle: page.title ? 'normal' : 'italic',
              color: page.title ? undefined : token.colorTextTertiary
            }}
          >
            {titleOf(page)}
          </span>
          <span className="ct-nb-act">
            {depth < MAX_PAGE_DEPTH && (
              <Tooltip title="Nova subpágina">
                <Button
                  size="small"
                  type="text"
                  aria-label={`Nova subpágina em ${titleOf(page)}`}
                  icon={<FilePlus2 {...ICON} />}
                  onClick={(event) => {
                    event.stopPropagation()
                    onCreate(page.id)
                  }}
                />
              </Tooltip>
            )}
            <Dropdown menu={menuFor(page)} trigger={['click']} placement="bottomRight">
              <Button
                size="small"
                type="text"
                aria-label={`Ações de ${titleOf(page)}`}
                icon={<Ellipsis {...ICON} />}
                onClick={(event) => event.stopPropagation()}
              />
            </Dropdown>
          </span>
        </div>
      </Dropdown>
    )
  }

  const allowDrop: TreeProps['allowDrop'] = ({ dragNode, dropNode, dropPosition }) => {
    const target = (dropNode as PageNode).page
    const parentId = dropPosition === 0 ? target.id : target.parent_page_id
    return canPlaceUnder(pages, (dragNode as PageNode).page.id, parentId)
  }

  const handleDrop: TreeProps['onDrop'] = (info) => {
    const dragId = (info.dragNode as unknown as PageNode).page.id
    const target = (info.node as unknown as PageNode).page
    const pos = info.node.pos.split('-')
    const relative = info.dropPosition - Number(pos[pos.length - 1])
    const firstChild =
      info.dropToGap &&
      relative === 1 &&
      info.node.expanded &&
      (info.node.children?.length ?? 0) > 0
    const placement = firstChild
      ? treeDropPlacement(pages, dragId, target.id, 'inside') && {
          parent_page_id: target.id,
          index: 0
        }
      : treeDropPlacement(
          pages,
          dragId,
          target.id,
          !info.dropToGap ? 'inside' : relative < 0 ? 'before' : 'after'
        )
    place(dragId, placement || null)
  }

  return (
    <Flex vertical style={{ height: '100%', minHeight: 0 }}>
      <Flex
        align="center"
        justify="space-between"
        style={{
          padding: '8px 8px 8px 12px',
          borderBottom: `1px solid ${token.colorBorderSecondary}`
        }}
      >
        <span className="ct-nb-eyebrow">Páginas</span>
        <Button
          size="small"
          type="text"
          icon={<Plus {...ICON} />}
          disabled={sectionId === null}
          onClick={() => onCreate(null)}
        >
          Nova página
        </Button>
      </Flex>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 4px' }}>
        {sectionId !== null && nodes.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nenhuma página nesta seção." />
        ) : (
          <Tree<PageNode>
            blockNode
            showLine
            draggable={{ icon: false }}
            treeData={nodes}
            titleRender={renderTitle}
            selectedKeys={selectedId === null ? [] : [String(selectedId)]}
            onSelect={(keys) => {
              if (keys.length > 0) onSelect(Number(keys[0]))
            }}
            expandedKeys={expandedKeys}
            onExpand={(_, { expanded, node }) =>
              setCollapsed((current) => {
                const next = new Set(current)
                if (expanded) next.delete(String(node.key))
                else next.add(String(node.key))
                return next
              })
            }
            allowDrop={allowDrop}
            onDragStart={({ node }) => onDragChange(node.page.id)}
            onDragEnd={() => onDragChange(null)}
            onDrop={(info) => {
              onDragChange(null)
              handleDrop(info)
            }}
          />
        )}
      </div>
    </Flex>
  )
}
