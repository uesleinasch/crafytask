import { useContext, useState } from 'react'
import { Dropdown, type MenuProps } from 'antd'
import { Archive, CalendarDays, CheckCheck, ExternalLink, Play, Square, Trash2 } from 'lucide-react'
import { TaskMenuChangedContext } from '@renderer/components/taskMenuContext'
import { DeleteConfirmDialog } from '@renderer/components/DeleteConfirmDialog'
import { toast } from '@renderer/components/ui/sonner'
import { useTimerStore } from '@renderer/stores/timerStore'
import { STATUS_LABELS, type Task, type TaskStatus } from '@shared/types'

const STATUSES = Object.keys(STATUS_LABELS) as TaskStatus[]
const ICON = { size: 14, strokeWidth: 1.75, 'aria-hidden': true } as const

interface TaskContextMenuProps {
  task: Task
  onOpen: () => void
  onScheduleForToday?: (taskId: number) => void
  trigger?: Array<'contextMenu' | 'click'>
  children: React.ReactElement
}

export function TaskContextMenu({
  task,
  onOpen,
  onScheduleForToday,
  trigger = ['contextMenu'],
  children
}: TaskContextMenuProps): React.JSX.Element {
  const onChanged = useContext(TaskMenuChangedContext)
  const startTimer = useTimerStore((s) => s.startTimer)
  const stopTimer = useTimerStore((s) => s.stopTimer)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const isScheduledToday = task.scheduled_date === new Date().toISOString().split('T')[0]

  const run = async (action: () => Promise<unknown>, success: string): Promise<void> => {
    try {
      await action()
      toast.success(success)
      onChanged()
    } catch (error) {
      console.error('[TaskContextMenu]', error)
      toast.error(error instanceof Error ? error.message : 'Não foi possível concluir a ação')
    }
  }

  const items: MenuProps['items'] = [
    { key: 'open', icon: <ExternalLink {...ICON} />, label: 'Abrir' },
    task.is_running
      ? { key: 'stop', icon: <Square {...ICON} />, label: 'Parar timer' }
      : {
          key: 'start',
          icon: <Play {...ICON} />,
          label: 'Iniciar timer',
          disabled: task.is_blocked
        },
    ...(onScheduleForToday
      ? [
          {
            key: 'today',
            icon: <CalendarDays {...ICON} />,
            label: isScheduledToday ? 'Tirar do plano de hoje' : 'Planejar para hoje'
          }
        ]
      : []),
    {
      key: 'status',
      icon: <CheckCheck {...ICON} />,
      label: 'Marcar como',
      children: STATUSES.map((status) => ({
        key: `status:${status}`,
        label: `${task.status === status ? '✓ ' : ''}${STATUS_LABELS[status]}`,
        disabled: status === 'executando' && task.is_blocked
      }))
    },
    { type: 'divider' },
    { key: 'archive', icon: <Archive {...ICON} />, label: 'Arquivar' },
    { key: 'delete', icon: <Trash2 {...ICON} />, label: 'Excluir', danger: true }
  ]

  const onClick: MenuProps['onClick'] = ({ key, domEvent }) => {
    domEvent.stopPropagation()
    if (key === 'open') onOpen()
    if (key === 'stop') void run(() => stopTimer(task.id), 'Timer parado')
    if (key === 'start') void run(() => startTimer(task.id), 'Timer iniciado')
    if (key === 'today') onScheduleForToday?.(task.id)
    if (key.startsWith('status:')) {
      const status = key.slice('status:'.length) as TaskStatus
      void run(
        () => window.api.updateStatus(task.id, status),
        `Marcada como ${STATUS_LABELS[status]}`
      )
    }
    if (key === 'archive') void run(() => window.api.archiveTask(task.id), 'Tarefa arquivada')
    if (key === 'delete') setDeleteOpen(true)
  }

  return (
    <>
      <Dropdown menu={{ items, onClick }} trigger={trigger} placement="bottomRight">
        {children}
      </Dropdown>
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={() => {
          setDeleteOpen(false)
          void run(() => window.api.deleteTask(task.id), 'Tarefa deletada')
        }}
      />
    </>
  )
}
