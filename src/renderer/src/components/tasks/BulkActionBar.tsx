import { Button, Flex, Select, Typography, theme } from 'antd'
import { Archive, CalendarDays, Trash2 } from 'lucide-react'
import { STATUS_LABELS, type Project, type Task, type TaskStatus } from '@shared/types'
import { plural } from './bulkActionText'
import { useTaskBulkActions } from './useTaskBulkActions'

const ICON = { size: 14, strokeWidth: 1.75, 'aria-hidden': true } as const
const STATUSES = Object.keys(STATUS_LABELS) as TaskStatus[]
const NO_PROJECT = -1

interface BulkActionBarProps {
  selectedIds: number[]
  taskById: (id: number) => Task | undefined
  projects: Project[]
  visibleCount: number
  selectedVisibleCount: number
  onSelectAll: () => void
  onClear: () => void
}

export function BulkActionBar({
  selectedIds,
  taskById,
  projects,
  visibleCount,
  selectedVisibleCount,
  onSelectAll,
  onClear
}: BulkActionBarProps): React.JSX.Element | null {
  const { token } = theme.useToken()
  const bulk = useTaskBulkActions()
  const count = selectedIds.length
  const anyBlocked = selectedIds.some((id) => taskById(id)?.is_blocked)
  const status = (
    <span className="sr-only" aria-live="polite">
      {count > 0 ? plural(count, 'tarefa selecionada', 'tarefas selecionadas') : ''}
    </span>
  )
  if (count === 0) return status

  return (
    <>
      {status}
      <div
        role="region"
        aria-label="Ações em massa"
        style={{ position: 'sticky', bottom: 12, zIndex: 5, marginTop: 12 }}
      >
        <Flex
          wrap="wrap"
          align="center"
          gap={8}
          style={{
            padding: '8px 12px',
            borderRadius: token.borderRadiusLG,
            background: token.colorBgElevated,
            border: `1px solid ${token.colorBorder}`,
            boxShadow: token.boxShadowSecondary
          }}
        >
          <Typography.Text strong>{plural(count, 'selecionada', 'selecionadas')}</Typography.Text>
          {selectedVisibleCount < visibleCount && (
            <Button size="small" type="link" onClick={onSelectAll}>
              Selecionar todas ({visibleCount})
            </Button>
          )}
          <Button size="small" type="link" onClick={onClear}>
            Limpar
          </Button>
          <div style={{ flex: 1 }} />
          <Select<TaskStatus>
            size="small"
            placeholder="Marcar como…"
            aria-label="Marcar como"
            value={null}
            style={{ width: 150 }}
            options={STATUSES.map((status) => ({
              value: status,
              label: STATUS_LABELS[status],
              disabled: status === 'executando' && anyBlocked
            }))}
            onChange={(status) => void bulk.setStatus(selectedIds, status)}
          />
          <Select<number>
            size="small"
            showSearch
            optionFilterProp="label"
            placeholder="Mover para projeto…"
            aria-label="Mover para projeto"
            value={null}
            style={{ width: 180 }}
            options={[
              { value: NO_PROJECT, label: 'Sem projeto' },
              ...projects
                .filter((project) => project.status !== 'archived')
                .map((project) => ({ value: project.id, label: project.name }))
            ]}
            onChange={(value) => {
              const projectId = value === NO_PROJECT ? null : value
              void bulk.moveToProject(
                selectedIds,
                projectId,
                projects.find((p) => p.id === projectId)?.name
              )
            }}
          />
          <Button
            size="small"
            icon={<CalendarDays {...ICON} />}
            onClick={() =>
              void bulk.toggleToday(
                selectedIds.map((id) => ({ id, scheduled_date: taskById(id)?.scheduled_date }))
              )
            }
          >
            Hoje
          </Button>
          <Button
            size="small"
            icon={<Archive {...ICON} />}
            onClick={() => void bulk.archive(selectedIds)}
          >
            Arquivar
          </Button>
          <Button
            size="small"
            danger
            icon={<Trash2 {...ICON} />}
            onClick={() => bulk.confirmDelete(selectedIds)}
          >
            Excluir
          </Button>
        </Flex>
      </div>
    </>
  )
}
