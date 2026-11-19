import { useEffect, useState } from 'react'
import { useErrorBoundary } from 'react-error-boundary'
import { Button, Dropdown, Flex, Input, Spin, Tooltip, Typography, theme } from 'antd'
import { CircleCheck, GripVertical, PanelLeftClose, Plus, Search } from 'lucide-react'
import type { Task } from '@shared/types'
import { EnergyMeter } from '@renderer/components/chips/EnergyMeter'
import { ProjectLabel } from '@renderer/components/tasks/ProjectLabel'
import { formatDueShort } from '@renderer/components/tasks/taskTableFormat'
import { DRAG_TYPE } from './calendarView'

interface UnscheduledPanelProps {
  from: string
  to: string
  days: string[]
  scope: 'days' | 'month'
  version: number
  inDrawer?: boolean
  onHide?: () => void
  onReserve: (taskId: number, date: string) => void
}

function dayOption(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
    .format(new Date(`${date}T12:00:00`))
    .replace('.', '')
}

export function UnscheduledPanel({
  from,
  to,
  days,
  scope,
  version,
  inDrawer,
  onHide,
  onReserve
}: UnscheduledPanelProps): React.JSX.Element {
  const { token } = theme.useToken()
  const { showBoundary } = useErrorBoundary()
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [planned, setPlanned] = useState(0)

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    let current = true
    const load = (): void => {
      Promise.all([
        window.api.getUnscheduledTasks(from, to, { search: query || undefined }),
        window.api.getTimeBlocksForRange(from, to)
      ])
        .then(([list, blocks]) => {
          if (!current) return
          setTasks(list)
          setPlanned(
            new Set(
              blocks
                .filter((b) => b.task_status === 'proximas' || b.task_status === 'executando')
                .map((b) => b.task_id)
            ).size
          )
        })
        .catch(showBoundary)
    }
    load()
    const off = window.api.onTasksRefresh(load)
    return () => {
      current = false
      off()
    }
  }, [from, to, query, version, showBoundary])

  return (
    <div className={inDrawer ? 'ct-calside in-drawer' : 'ct-calside'}>
      <Flex align="center" justify="space-between">
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: token.colorTextTertiary
          }}
        >
          A agendar{tasks ? ` · ${tasks.length}` : ''}
        </span>
        {onHide && (
          <Tooltip title="Esconder painel">
            <Button
              size="small"
              type="text"
              icon={<PanelLeftClose size={14} strokeWidth={1.75} />}
              aria-label="Esconder painel"
              onClick={onHide}
            />
          </Tooltip>
        )}
      </Flex>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        Próximas ações sem bloco {scope === 'month' ? 'neste mês' : 'nestes dias'}. Arraste para a
        grade para reservar tempo.
      </Typography.Text>
      <Input
        size="small"
        allowClear
        placeholder="Filtrar"
        prefix={<Search size={14} strokeWidth={1.75} />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Filtrar tarefas a agendar"
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
        {tasks === null ? (
          <Flex justify="center" style={{ padding: 16 }}>
            <Spin size="small" />
          </Flex>
        ) : tasks.length ? (
          tasks.map((task) => (
            <div
              key={task.id}
              className="ct-calplan"
              draggable
              onDragStart={(e) =>
                e.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ taskId: task.id }))
              }
            >
              <GripVertical
                size={14}
                strokeWidth={1.75}
                aria-hidden
                style={{ color: token.colorTextTertiary, flex: 'none' }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Typography.Text
                  ellipsis
                  style={{ fontWeight: 500, fontSize: 13, display: 'block' }}
                >
                  {task.name}
                </Typography.Text>
                <Flex gap={8} align="center" style={{ fontSize: 12, minWidth: 0 }}>
                  {task.project_name && (
                    <ProjectLabel name={task.project_name} color={task.project_color} />
                  )}
                  {task.energy_level && <EnergyMeter level={task.energy_level} />}
                  {task.due_date && (
                    <Typography.Text
                      type="secondary"
                      style={{ fontFamily: token.fontFamilyCode, flex: 'none' }}
                    >
                      {formatDueShort(task.due_date.slice(0, 10), task.due_time)}
                    </Typography.Text>
                  )}
                </Flex>
              </div>
              <Dropdown
                trigger={['click']}
                menu={{
                  items: days.map((d) => ({ key: d, label: `${dayOption(d)}, 1h` })),
                  onClick: ({ key }) => onReserve(task.id, key)
                }}
              >
                <Button
                  size="small"
                  type="text"
                  icon={<Plus size={14} strokeWidth={1.75} />}
                  aria-label={`Reservar tempo para ${task.name}`}
                />
              </Dropdown>
            </div>
          ))
        ) : (
          <Flex align="center" gap={8} style={{ fontSize: 13, padding: '8px 0' }}>
            <CircleCheck
              size={16}
              strokeWidth={1.75}
              aria-hidden
              style={{ color: token.colorSuccess }}
            />
            <Typography.Text type="secondary">
              {query ? 'Nenhuma tarefa com esse filtro.' : 'Toda próxima ação tem tempo reservado.'}
            </Typography.Text>
          </Flex>
        )}
      </div>
      {planned > 0 && (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {planned} já com bloco {scope === 'month' ? 'neste mês' : 'nestes dias'}.
        </Typography.Text>
      )}
    </div>
  )
}
