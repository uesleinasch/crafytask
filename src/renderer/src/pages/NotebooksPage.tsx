import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { App, Button, Card, Drawer, Empty, Flex, Grid, type MenuProps } from 'antd'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Download,
  ListTree,
  Pencil,
  Plus,
  RefreshCw,
  Trash2
} from 'lucide-react'
import type { Notebook, NotebookPageSummary, NotebookSection } from '@shared/types'
import { flattenPageTree, subtreeIds, type PagePlacement } from '@shared/notebookTree'
import { RegionBoundary } from '@renderer/components/shell/RegionBoundary'
import { NotebookList, NotebookSelect } from '@renderer/components/notebooks/NotebookList'
import { PageSearch } from '@renderer/components/notebooks/PageSearch'
import { SectionTabs } from '@renderer/components/notebooks/SectionTabs'
import { PageTree } from '@renderer/components/notebooks/PageTree'
import { PageEditor, type PageEditorHandle } from '@renderer/components/notebooks/PageEditor'
import {
  NameColorDialog,
  type NameColorValue
} from '@renderer/components/notebooks/NameColorDialog'
import {
  DEFAULT_NOTEBOOK_COLOR,
  DEFAULT_SECTION_COLOR,
  UNTITLED_PAGE,
  moveIdOnto,
  plural,
  shiftId
} from '@renderer/components/notebooks/notebookUi'
import { errorMessage } from '@renderer/components/settings/settingsStatus'
import { useNotebooks } from '@renderer/hooks/useNotebooks'
import { usePersistedState } from '@renderer/hooks/usePersistedState'

type NameDialog =
  | { kind: 'notebook'; target: Notebook | null }
  | { kind: 'section'; target: NotebookSection | null }

const ICON = { size: 16, strokeWidth: 1.75, 'aria-hidden': true } as const
const KEEP =
  'As tarefas não mudam; menções @ a essas páginas ficam sem destino. Com o envio automático ao Notion ligado, as páginas vão para o arquivo de lá; desligado, o Notion fica como está. Não dá para desfazer.'

function useFallbackSelection<T extends { id: number }>(
  ready: boolean,
  items: T[],
  selected: number | null,
  select: (id: number | null) => void,
  first: () => number | null
): void {
  // O id selecionado fica fora das dependências de propósito: logo depois de criar um item ele
  // ainda não está na lista, e reagir a essa troca derrubaria a seleção antes do refresh chegar.
  const selectedRef = useRef(selected)
  selectedRef.current = selected
  const firstRef = useRef(first)
  firstRef.current = first
  useEffect(() => {
    if (!ready) return
    const current = selectedRef.current
    if (current !== null && items.some((i) => i.id === current)) return
    const next = firstRef.current()
    if (next !== current) select(next)
  }, [ready, items, select])
}

function EmptyCard({
  description,
  action
}: {
  description: React.ReactNode
  action?: React.ReactNode
}): React.JSX.Element {
  return (
    <Card
      size="small"
      style={{ height: '100%' }}
      styles={{ body: { height: '100%', display: 'grid', placeItems: 'center' } }}
    >
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={description}>
        {action}
      </Empty>
    </Card>
  )
}

export function NotebooksPage(): React.JSX.Element {
  const { message, modal } = App.useApp()
  const screens = Grid.useBreakpoint()
  const [searchParams, setSearchParams] = useSearchParams()
  const [notebookId, setNotebookId] = usePersistedState<number | null>(
    'ticktask.notebooks.notebook',
    null
  )
  const [sectionId, setSectionId] = usePersistedState<number | null>(
    'ticktask.notebooks.section',
    null
  )
  const [pageId, setPageId] = usePersistedState<number | null>('ticktask.notebooks.page', null)
  const { notebooks, notebooksLoaded, sections, pages } = useNotebooks(notebookId, sectionId)
  const [nameDialog, setNameDialog] = useState<NameDialog | null>(null)
  const [syncingNotebookId, setSyncingNotebookId] = useState<number | null>(null)
  const [treeDrawer, setTreeDrawer] = useState(false)
  const editorRef = useRef<PageEditorHandle>(null)
  const draggingPage = useRef<number | null>(null)

  const sectionsReady = sections.forId !== null && sections.forId === notebookId
  const pagesReady = pages.forId !== null && pages.forId === sectionId
  const sectionItems = sectionsReady ? sections.items : []
  const pageItems = pagesReady ? pages.items : []

  useFallbackSelection(notebooksLoaded, notebooks, notebookId, setNotebookId, () =>
    notebooks.length > 0 ? notebooks[0].id : null
  )
  useFallbackSelection(sectionsReady, sections.items, sectionId, setSectionId, () =>
    sections.items.length > 0 ? sections.items[0].id : null
  )
  useFallbackSelection(pagesReady, pages.items, pageId, setPageId, () => {
    const flat = flattenPageTree(pages.items)
    return flat.length > 0 ? flat[0].page.id : null
  })

  const run = useCallback(
    async (action: () => Promise<unknown>): Promise<void> => {
      try {
        await action()
      } catch (error) {
        message.error(errorMessage(error))
      }
    },
    [message]
  )

  const leavePage = useCallback(async (): Promise<void> => {
    try {
      await editorRef.current?.flush()
    } catch (error) {
      console.error('Falha ao salvar a página antes de sair:', error)
    }
  }, [])

  const selectNotebook = async (id: number): Promise<void> => {
    if (id === notebookId) return
    await leavePage()
    setNotebookId(id)
    setSectionId(null)
    setPageId(null)
  }

  const selectSection = async (id: number): Promise<void> => {
    if (id === sectionId) return
    await leavePage()
    setSectionId(id)
    setPageId(null)
  }

  const selectPage = async (id: number): Promise<void> => {
    setTreeDrawer(false)
    if (id === pageId) return
    await leavePage()
    setPageId(id)
  }

  const openPage = useCallback(
    async (id: number): Promise<void> => {
      const location = await window.api.locatePage(id)
      if (!location) {
        message.error('Essa página não existe mais.')
        return
      }
      await leavePage()
      setNotebookId(location.notebook_id)
      setSectionId(location.section_id)
      setPageId(location.page_id)
    },
    [leavePage, message, setNotebookId, setSectionId, setPageId]
  )

  const requestedPage = Number(searchParams.get('page'))
  useEffect(() => {
    if (!Number.isInteger(requestedPage) || requestedPage <= 0) return
    setSearchParams({}, { replace: true })
    void openPage(requestedPage)
  }, [requestedPage, openPage, setSearchParams])

  const exportNotebook = async (notebook: Notebook): Promise<void> => {
    await leavePage()
    await run(async () => {
      const result = await window.api.exportNotebookLocal(notebook.id)
      if (result)
        message.success(
          `${plural(result.pages, 'página exportada', 'páginas exportadas')} em ${result.dir}`
        )
    })
  }

  const syncNotebook = async (notebook: Notebook): Promise<void> => {
    setSyncingNotebookId(notebook.id)
    try {
      await leavePage()
      await window.api.syncNotebookToNotion(notebook.id)
    } catch (error) {
      console.error('Falha ao sincronizar o caderno com o Notion:', error)
    } finally {
      setSyncingNotebookId(null)
    }
  }

  const createPage = (parentId: number | null): Promise<void> =>
    run(async () => {
      if (sectionId === null) return
      await leavePage()
      const page = await window.api.createPage({ section_id: sectionId, parent_page_id: parentId })
      setPageId(page.id)
      setTreeDrawer(false)
    })

  const placePage = (id: number, placement: PagePlacement): Promise<void> =>
    run(async () => {
      if (sectionId === null) return
      await window.api.movePage(id, { section_id: sectionId, ...placement })
    })

  const moveToSection = (id: number, targetId: number): Promise<void> =>
    run(async () => {
      const target = sectionItems.find((s) => s.id === targetId)
      const followsOpen = pageId !== null && subtreeIds(pageItems, id).includes(pageId)
      if (followsOpen) await leavePage()
      await window.api.movePage(id, {
        section_id: targetId,
        parent_page_id: null,
        index: Number.MAX_SAFE_INTEGER
      })
      if (followsOpen) setSectionId(targetId)
      message.success(`Página movida para ${target?.name ?? 'outra seção'}.`)
    })

  const reorderNotebooks = (ids: number[] | null): Promise<void> =>
    run(async () => {
      if (ids) await window.api.reorderNotebooks(ids)
    })

  const reorderSections = (ids: number[] | null): Promise<void> =>
    run(async () => {
      if (ids && notebookId !== null) await window.api.reorderSections(notebookId, ids)
    })

  const confirmDelete = async (
    kind: 'notebook' | 'section' | 'page',
    item: Notebook | NotebookSection | NotebookPageSummary
  ): Promise<void> => {
    let title: string
    let content: string
    try {
      if (kind === 'notebook') {
        const notebook = item as Notebook
        const list = await window.api.listSections(notebook.id)
        const counts = await Promise.all(list.map((s) => window.api.listPages(s.id)))
        const total = counts.reduce((sum, p) => sum + p.length, 0)
        title = `Excluir o caderno "${notebook.name}"?`
        content = `Apaga ${plural(list.length, 'seção', 'seções')} e ${plural(total, 'página', 'páginas')}, com notas, imagens e desenhos. ${KEEP}`
      } else if (kind === 'section') {
        const section = item as NotebookSection
        const list = await window.api.listPages(section.id)
        title = `Excluir a seção "${section.name}"?`
        content = `Apaga ${plural(list.length, 'página', 'páginas')}, com notas, imagens e desenhos. ${KEEP}`
      } else {
        const page = item as NotebookPageSummary
        const sub = subtreeIds(pageItems, page.id).length - 1
        title = `Excluir "${page.title || UNTITLED_PAGE}"?`
        content = `${sub > 0 ? `Apaga a página e ${plural(sub, 'subpágina', 'subpáginas')}` : 'Apaga a página'}, com notas, imagens e desenho. ${KEEP}`
      }
    } catch (error) {
      message.error(errorMessage(error))
      return
    }
    modal.confirm({
      title,
      content,
      okText: 'Excluir',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: () =>
        run(async () => {
          if (kind === 'notebook') await window.api.deleteNotebook(item.id)
          else if (kind === 'section') await window.api.deleteSection(item.id)
          else await window.api.deletePage(item.id)
          message.success(
            kind === 'page'
              ? 'Página excluída'
              : kind === 'section'
                ? 'Seção excluída'
                : 'Caderno excluído'
          )
        })
    })
  }

  const handleNameSubmit = async (value: NameColorValue): Promise<void> => {
    if (!nameDialog) return
    await run(async () => {
      if (nameDialog.kind === 'notebook') {
        if (nameDialog.target) {
          await window.api.updateNotebook(nameDialog.target.id, value)
        } else {
          await leavePage()
          const notebook = await window.api.createNotebook(value)
          setNotebookId(notebook.id)
          setSectionId(null)
          setPageId(null)
        }
      } else if (nameDialog.target) {
        await window.api.updateSection(nameDialog.target.id, value)
      } else if (notebookId !== null) {
        await leavePage()
        const section = await window.api.createSection({ notebook_id: notebookId, ...value })
        setSectionId(section.id)
        setPageId(null)
      }
      setNameDialog(null)
    })
  }

  const notebookIds = notebooks.map((n) => n.id)
  const sectionIds = sectionItems.map((s) => s.id)

  const notebookMenu = (notebook: Notebook): MenuProps => ({
    items: [
      {
        key: 'sync',
        icon: <RefreshCw {...ICON} />,
        label: 'Sincronizar com o Notion',
        disabled: syncingNotebookId !== null
      },
      { key: 'export', icon: <Download {...ICON} />, label: 'Exportar em Markdown…' },
      { key: 'edit', icon: <Pencil {...ICON} />, label: 'Editar…' },
      {
        key: 'up',
        icon: <ArrowUp {...ICON} />,
        label: 'Mover para cima',
        disabled: !shiftId(notebookIds, notebook.id, -1)
      },
      {
        key: 'down',
        icon: <ArrowDown {...ICON} />,
        label: 'Mover para baixo',
        disabled: !shiftId(notebookIds, notebook.id, 1)
      },
      { type: 'divider' },
      { key: 'delete', icon: <Trash2 {...ICON} />, label: 'Excluir caderno…', danger: true }
    ],
    onClick: ({ key, domEvent }) => {
      domEvent.stopPropagation()
      if (key === 'sync') void syncNotebook(notebook)
      else if (key === 'export') void exportNotebook(notebook)
      else if (key === 'edit') setNameDialog({ kind: 'notebook', target: notebook })
      else if (key === 'up') void reorderNotebooks(shiftId(notebookIds, notebook.id, -1))
      else if (key === 'down') void reorderNotebooks(shiftId(notebookIds, notebook.id, 1))
      else if (key === 'delete') void confirmDelete('notebook', notebook)
    }
  })

  const sectionMenu = (section: NotebookSection): MenuProps => ({
    items: [
      { key: 'edit', icon: <Pencil {...ICON} />, label: 'Editar…' },
      {
        key: 'left',
        icon: <ArrowLeft {...ICON} />,
        label: 'Mover para a esquerda',
        disabled: !shiftId(sectionIds, section.id, -1)
      },
      {
        key: 'right',
        icon: <ArrowRight {...ICON} />,
        label: 'Mover para a direita',
        disabled: !shiftId(sectionIds, section.id, 1)
      },
      { type: 'divider' },
      { key: 'delete', icon: <Trash2 {...ICON} />, label: 'Excluir seção…', danger: true }
    ],
    onClick: ({ key, domEvent }) => {
      domEvent.stopPropagation()
      if (key === 'edit') setNameDialog({ kind: 'section', target: section })
      else if (key === 'left') void reorderSections(shiftId(sectionIds, section.id, -1))
      else if (key === 'right') void reorderSections(shiftId(sectionIds, section.id, 1))
      else if (key === 'delete') void confirmDelete('section', section)
    }
  })

  const newNotebook = (): void => setNameDialog({ kind: 'notebook', target: null })
  const newSection = (): void => setNameDialog({ kind: 'section', target: null })
  const search = <PageSearch onOpen={(id) => void openPage(id)} />

  const tree = (
    <RegionBoundary region="páginas" resetKeys={[sectionId]}>
      <PageTree
        pages={pageItems}
        sections={sectionItems}
        sectionId={sectionId}
        selectedId={pageId}
        onSelect={(id) => void selectPage(id)}
        onCreate={(parentId) => void createPage(parentId)}
        onPlace={(id, placement) => void placePage(id, placement)}
        onMoveToSection={(id, target) => void moveToSection(id, target)}
        onDelete={(page) => void confirmDelete('page', page)}
        onDragChange={(id) => {
          draggingPage.current = id
        }}
      />
    </RegionBoundary>
  )

  const editor =
    pageId !== null && pagesReady && pageItems.some((p) => p.id === pageId) ? (
      <RegionBoundary region="página" resetKeys={[pageId]}>
        <PageEditor key={pageId} ref={editorRef} pageId={pageId} />
      </RegionBoundary>
    ) : sectionsReady && sectionItems.length === 0 ? (
      <EmptyCard
        description="Crie uma seção para guardar páginas."
        action={
          <Button type="primary" icon={<Plus {...ICON} />} onClick={newSection}>
            Nova seção
          </Button>
        }
      />
    ) : pagesReady && pageItems.length === 0 ? (
      <EmptyCard
        description="Esta seção ainda não tem páginas."
        action={
          <Button type="primary" icon={<Plus {...ICON} />} onClick={() => void createPage(null)}>
            Nova página
          </Button>
        }
      />
    ) : (
      <EmptyCard description="Carregando…" />
    )

  const body =
    notebookId === null ? (
      notebooksLoaded ? (
        <Card
          size="small"
          style={{ flex: 1, height: '100%' }}
          styles={{ body: { height: '100%', display: 'grid', placeItems: 'center' } }}
        >
          <Empty
            image={<BookOpen size={40} strokeWidth={1.5} aria-hidden />}
            description="Cadernos guardam anotações livres: caderno, seção e página, com notas e desenho."
          >
            <Button type="primary" icon={<Plus {...ICON} />} onClick={newNotebook}>
              Novo caderno
            </Button>
          </Empty>
        </Card>
      ) : (
        <div style={{ flex: 1 }}>
          <EmptyCard description="Carregando…" />
        </div>
      )
    ) : (
      <div className="ct-nb-main">
        <SectionTabs
          sections={sectionItems}
          selectedId={sectionId}
          onSelect={(id) => void selectSection(id)}
          onCreate={newSection}
          menuFor={sectionMenu}
          onReorder={(id, target) => void reorderSections(moveIdOnto(sectionIds, id, target))}
          draggingPage={() => draggingPage.current !== null}
          onDropPage={(target) => {
            const id = draggingPage.current
            draggingPage.current = null
            if (id !== null) void moveToSection(id, target)
          }}
        />
        <div className="ct-nb-body">
          {screens.md && sectionId !== null && (
            <Card
              size="small"
              className="ct-nb-tree"
              styles={{ body: { padding: 0, height: '100%' } }}
            >
              {tree}
            </Card>
          )}
          <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>{editor}</div>
        </div>
      </div>
    )

  return (
    <div className={screens.md ? 'ct-nb' : 'ct-nb narrow'}>
      {!screens.lg && (
        <Flex gap={8} wrap align="center">
          <NotebookSelect
            notebooks={notebooks}
            selectedId={notebookId}
            onSelect={(id) => void selectNotebook(id)}
            onCreate={newNotebook}
            menuFor={notebookMenu}
          />
          <div
            style={{
              flex: screens.md ? '0 1 320px' : '1 1 100%',
              minWidth: 0,
              order: screens.md ? 0 : 3
            }}
          >
            {search}
          </div>
          {!screens.md && sectionId !== null && (
            <Button icon={<ListTree {...ICON} />} onClick={() => setTreeDrawer(true)}>
              Páginas
            </Button>
          )}
        </Flex>
      )}
      <div className="ct-nb-cols">
        {screens.lg && (
          <NotebookList
            notebooks={notebooks}
            loaded={notebooksLoaded}
            selectedId={notebookId}
            syncingId={syncingNotebookId}
            search={search}
            onSelect={(id) => void selectNotebook(id)}
            onCreate={newNotebook}
            menuFor={notebookMenu}
            onReorder={(id, target) => void reorderNotebooks(moveIdOnto(notebookIds, id, target))}
          />
        )}
        {body}
      </div>

      <Drawer
        open={treeDrawer && !screens.md}
        onClose={() => setTreeDrawer(false)}
        size={300}
        title={sectionItems.find((s) => s.id === sectionId)?.name ?? 'Páginas'}
        styles={{ body: { padding: 0 } }}
      >
        {tree}
      </Drawer>

      <NameColorDialog
        open={nameDialog !== null}
        title={
          nameDialog?.kind === 'notebook'
            ? nameDialog.target
              ? 'Editar caderno'
              : 'Novo caderno'
            : nameDialog?.target
              ? 'Editar seção'
              : 'Nova seção'
        }
        placeholder={nameDialog?.kind === 'notebook' ? 'Trabalho' : 'Reuniões'}
        initial={
          nameDialog?.target
            ? { name: nameDialog.target.name, color: nameDialog.target.color }
            : {
                name: '',
                color:
                  nameDialog?.kind === 'section' ? DEFAULT_SECTION_COLOR : DEFAULT_NOTEBOOK_COLOR
              }
        }
        onCancel={() => setNameDialog(null)}
        onSubmit={handleNameSubmit}
      />
    </div>
  )
}
