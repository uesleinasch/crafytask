import { createContext, useContext, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  App,
  Button,
  Card,
  Checkbox,
  Dropdown,
  Empty,
  Flex,
  Grid,
  Input,
  Segmented,
  Select,
  Spin,
  Table,
  Tabs,
  Typography,
  theme,
  type MenuProps,
  type TableProps
} from 'antd'
import {
  Ellipsis,
  LayoutGrid,
  ListTodo,
  MapPin,
  Merge,
  Pencil,
  Plus,
  Search,
  Table2,
  Tags,
  Trash2
} from 'lucide-react'
import { PageContainer } from '@renderer/components/shell/PageContainer'
import { LabelMark } from '@renderer/components/labels/LabelMark'
import { LabelEditModal } from '@renderer/components/labels/LabelEditModal'
import { LabelMergeModal } from '@renderer/components/labels/LabelMergeModal'
import {
  editLabelDraft,
  newLabelDraft,
  labelDisplay,
  labelTasksPath,
  labelUsage,
  visibleLabels,
  type Label,
  type LabelDraft,
  type LabelKind,
  type LabelSort
} from '@renderer/components/labels/labels'
import { usePersistedState } from '@renderer/hooks/usePersistedState'
import { useLabels } from '@renderer/hooks/useLabels'
import { errorMessage } from '@renderer/components/settings/settingsStatus'

type LabelsView = 'cards' | 'table'

const ICON = { size: 14, strokeWidth: 1.75, 'aria-hidden': true } as const

const INTRO: Record<LabelKind, string> = {
  context:
    'Onde ou com o que uma ação pode ser feita. Filtre a lista por contexto para ver o que dá para fazer agora.',
  tag: 'Rótulos livres, criados enquanto você digita. Variações de grafia viram tags diferentes: use Mesclar para juntar.'
}

const RowMenuContext = createContext<((id: number) => MenuProps | null) | null>(null)

function MenuRow(
  props: React.HTMLAttributes<HTMLTableRowElement> & { 'data-row-key'?: string | number }
): React.JSX.Element {
  const menuOf = useContext(RowMenuContext)
  const menu = menuOf?.(Number(props['data-row-key']))
  if (!menu) return <tr {...props} />
  return (
    <Dropdown menu={menu} trigger={['contextMenu']}>
      <tr {...props} />
    </Dropdown>
  )
}

const TABLE_COMPONENTS: TableProps<Label>['components'] = { body: { row: MenuRow } }

export function LabelsPage(): React.JSX.Element {
  const { token } = theme.useToken()
  const { message, modal } = App.useApp()
  const screens = Grid.useBreakpoint()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const kind: LabelKind = pathname === '/tags' ? 'tag' : 'context'
  const isContext = kind === 'context'
  const { contexts, tags, loading, refresh } = useLabels()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<LabelSort>('uses')
  const [onlyUnused, setOnlyUnused] = useState(false)
  const [view, setView] = usePersistedState<LabelsView>('ticktask:labelsView', 'cards')
  const [editing, setEditing] = useState<LabelDraft | null>(null)
  const [merging, setMerging] = useState<Label | null>(null)

  const narrow = screens.md === false
  const effectiveView: LabelsView = narrow ? 'cards' : view
  const list = isContext ? contexts : tags
  const rows = useMemo(
    () => visibleLabels(list, { query, onlyUnused, sort }),
    [list, query, onlyUnused, sort]
  )
  const unusedCount = list.filter((label) => label.task_count === 0).length
  const mono = {
    fontFamily: token.fontFamilyCode,
    fontVariantNumeric: 'tabular-nums' as const
  }

  function switchTab(next: string): void {
    setQuery('')
    setOnlyUnused(false)
    void navigate(next === 'tag' ? '/tags' : '/contexts', { replace: true })
  }

  function openTasks(label: Label): void {
    void navigate(labelTasksPath(label))
  }

  function openLabel(label: Label): void {
    if (label.task_count > 0) openTasks(label)
    else setEditing(editLabelDraft(label))
  }

  function confirmDelete(label: Label): void {
    const name = labelDisplay(kind, label.name)
    const uses = label.task_count
    modal.confirm({
      title: `Excluir ${name}?`,
      content: uses
        ? `${isContext ? 'O contexto' : 'A tag'} sai de ${uses} tarefa${uses === 1 ? '' : 's'}. As tarefas em si não são afetadas.`
        : `${isContext ? 'Este contexto não está' : 'Esta tag não está'} em nenhuma tarefa.`,
      okText: 'Excluir',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await (isContext ? window.api.deleteContext(label.id) : window.api.deleteTag(label.id))
          await refresh()
          message.success(`${name} excluíd${isContext ? 'o' : 'a'}`)
        } catch (error) {
          message.error(errorMessage(error))
        }
      }
    })
  }

  function menuFor(label: Label): MenuProps {
    return {
      items: [
        {
          key: 'open',
          icon: <ListTodo {...ICON} />,
          label: 'Ver tarefas',
          disabled: label.task_count === 0
        },
        { key: 'edit', icon: <Pencil {...ICON} />, label: 'Editar' },
        {
          key: 'merge',
          icon: <Merge {...ICON} />,
          label: 'Mesclar em…',
          disabled: list.length < 2
        },
        { type: 'divider' },
        { key: 'delete', icon: <Trash2 {...ICON} />, label: 'Excluir…', danger: true }
      ],
      onClick: ({ key, domEvent }) => {
        domEvent.stopPropagation()
        if (key === 'open') openTasks(label)
        if (key === 'edit') setEditing(editLabelDraft(label))
        if (key === 'merge') setMerging(label)
        if (key === 'delete') confirmDelete(label)
      }
    }
  }

  const menuById = (id: number): MenuProps | null => {
    const label = list.find((item) => item.id === id)
    return label ? menuFor(label) : null
  }

  async function saveLabel(draft: LabelDraft, name: string): Promise<void> {
    const original = draft.original
    if (isContext) {
      if (original) {
        await window.api.updateContext(original.id, {
          name,
          icon: draft.icon ?? undefined,
          color: draft.color
        })
      } else {
        await window.api.createContext(name, draft.icon ?? undefined, draft.color)
      }
    } else if (original) {
      await window.api.updateTag(original.id, { name, color: draft.color })
    } else {
      await window.api.createTag(name, draft.color)
    }
    await refresh()
    message.success(original ? 'Salvo' : isContext ? 'Contexto criado' : 'Tag criada')
  }

  async function mergeLabels(source: Label, target: Label): Promise<number> {
    const affected = isContext
      ? await window.api.mergeContexts(source.id, target.id)
      : await window.api.mergeTags(source.id, target.id)
    await refresh()
    return affected
  }

  const moreButton = (label: Label, placement?: 'bottomRight'): React.JSX.Element => (
    <Dropdown menu={menuFor(label)} trigger={['click']} placement={placement}>
      <Button
        size="small"
        type="text"
        aria-label="Mais ações"
        icon={<Ellipsis {...ICON} />}
        onClick={(e) => e.stopPropagation()}
      />
    </Dropdown>
  )

  const card = (label: Label): React.JSX.Element => (
    <Dropdown key={label.id} menu={menuFor(label)} trigger={['contextMenu']}>
      <div>
        <Card size="small" hoverable onClick={() => openLabel(label)}>
          <Flex align="center" gap={12}>
            <LabelMark kind={kind} color={label.color} icon={label.icon} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Typography.Text strong ellipsis style={{ display: 'block' }}>
                {labelDisplay(kind, label.name)}
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {labelUsage(label)}
              </Typography.Text>
            </div>
            {moreButton(label)}
          </Flex>
        </Card>
      </div>
    </Dropdown>
  )

  const columns: TableProps<Label>['columns'] = [
    {
      title: isContext ? 'Contexto' : 'Tag',
      key: 'name',
      render: (_, label) => (
        <Flex align="center" gap={10}>
          <LabelMark kind={kind} color={label.color} icon={label.icon} size={28} />
          <Typography.Link
            onClick={() => openLabel(label)}
            style={{ color: token.colorText, fontWeight: 500 }}
          >
            {labelDisplay(kind, label.name)}
          </Typography.Link>
        </Flex>
      )
    },
    {
      title: 'Tarefas',
      key: 'uses',
      width: 90,
      align: 'right',
      render: (_, label) => <span style={mono}>{label.task_count}</span>
    },
    {
      title: 'Abertas',
      key: 'open',
      width: 90,
      align: 'right',
      render: (_, label) => <span style={mono}>{label.open_count}</span>
    },
    {
      title: '',
      key: 'actions',
      width: 48,
      render: (_, label) => moreButton(label, 'bottomRight')
    }
  ]

  const tabLabel = (icon: React.ReactNode, text: string, count: number): React.ReactNode => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {icon}
      {text}
      <span
        style={{
          ...mono,
          fontSize: 12,
          padding: '0 6px',
          borderRadius: 6,
          color: token.colorTextTertiary,
          background: token.colorBgLayout,
          border: `1px solid ${token.colorBorder}`
        }}
      >
        {count}
      </span>
    </span>
  )

  let body: React.ReactNode
  if (loading) {
    body = (
      <Flex justify="center" style={{ padding: 48 }}>
        <Spin />
      </Flex>
    )
  } else if (rows.length === 0) {
    body = (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          query || onlyUnused
            ? 'Nada com esses filtros.'
            : isContext
              ? 'Nenhum contexto ainda.'
              : 'Nenhuma tag ainda.'
        }
      />
    )
  } else if (effectiveView === 'table') {
    body = (
      <RowMenuContext.Provider value={menuById}>
        <Table<Label>
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={rows}
          columns={columns}
          components={TABLE_COMPONENTS}
          scroll={{ x: 'max-content' }}
        />
      </RowMenuContext.Provider>
    )
  } else {
    body = (
      <div
        style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 230px), 1fr))'
        }}
      >
        {rows.map(card)}
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <PageContainer>
        <Tabs
          activeKey={kind}
          onChange={switchTab}
          style={{ marginBottom: 4 }}
          items={[
            {
              key: 'context',
              label: tabLabel(<MapPin {...ICON} />, 'Contextos', contexts.length)
            },
            { key: 'tag', label: tabLabel(<Tags {...ICON} />, 'Tags', tags.length) }
          ]}
        />
        <Typography.Text
          type="secondary"
          style={{ display: 'block', marginBottom: 12, maxWidth: '72ch' }}
        >
          {INTRO[kind]}
        </Typography.Text>
        <Flex gap={8} wrap align="center" style={{ marginBottom: 12 }}>
          <Input
            allowClear
            aria-label="Buscar"
            placeholder={isContext ? 'Buscar contexto' : 'Buscar tag'}
            prefix={<Search {...ICON} />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ flex: '1 1 200px', maxWidth: 320 }}
          />
          <Select<LabelSort>
            aria-label="Ordenar"
            value={sort}
            onChange={setSort}
            style={{ width: 170 }}
            options={[
              { value: 'uses', label: 'Mais usados' },
              { value: 'name', label: 'Nome' },
              { value: 'unused', label: 'Menos usados' }
            ]}
          />
          <Checkbox checked={onlyUnused} onChange={(e) => setOnlyUnused(e.target.checked)}>
            Só sem uso{' '}
            <span style={{ ...mono, color: token.colorTextTertiary }}>{unusedCount}</span>
          </Checkbox>
          <div style={{ flex: 1 }} />
          {!narrow && (
            <Segmented<LabelsView>
              value={effectiveView}
              onChange={setView}
              options={[
                {
                  value: 'cards',
                  icon: <LayoutGrid size={16} strokeWidth={1.75} />,
                  label: screens.lg ? 'Cards' : undefined,
                  title: 'Cards'
                },
                {
                  value: 'table',
                  icon: <Table2 size={16} strokeWidth={1.75} />,
                  label: screens.lg ? 'Tabela' : undefined,
                  title: 'Tabela'
                }
              ]}
            />
          )}
          <Button
            type="primary"
            icon={<Plus size={16} strokeWidth={1.75} />}
            aria-label={isContext ? 'Novo contexto' : 'Nova tag'}
            onClick={() => setEditing(newLabelDraft(kind))}
          >
            {screens.sm === false ? null : isContext ? 'Novo contexto' : 'Nova tag'}
          </Button>
        </Flex>
        {body}
      </PageContainer>
      <LabelEditModal
        kind={kind}
        draft={editing}
        labels={list}
        onClose={() => setEditing(null)}
        onSave={saveLabel}
      />
      <LabelMergeModal
        source={merging}
        labels={list}
        onClose={() => setMerging(null)}
        onMerge={mergeLabels}
      />
    </div>
  )
}
