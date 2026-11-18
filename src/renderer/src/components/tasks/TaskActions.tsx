import { useContext } from 'react'
import { Button, Flex, Tooltip } from 'antd'
import { CalendarDays, Ellipsis, Pause, Play } from 'lucide-react'
import type { Task } from '@shared/types'
import { localDateString } from '@shared/dueState'
import { TaskContextMenu } from '@renderer/components/TaskContextMenu'
import { TaskMenuChangedContext } from '@renderer/components/taskMenuContext'
import { toast } from '@renderer/components/ui/sonner'
import { useTimerStore } from '@renderer/stores/timerStore'

const ICON = { size: 14, strokeWidth: 1.75, 'aria-hidden': true } as const

interface TaskActionsProps {
  task: Task
  onOpen: (taskId: number) => void
  onScheduleForToday?: (taskId: number) => void
  showToday?: boolean
  showTimer?: boolean
}

export function TaskActions({
  task,
  onOpen,
  onScheduleForToday,
  showToday = true,
  showTimer = true
}: TaskActionsProps): React.JSX.Element {
  const onChanged = useContext(TaskMenuChangedContext)
  const startTimer = useTimerStore((s) => s.startTimer)
  const stopTimer = useTimerStore((s) => s.stopTimer)
  const scheduledToday = task.scheduled_date === localDateString(new Date())
  const timerTitle = task.is_blocked
    ? 'Bloqueada por dependências'
    : task.is_running
      ? 'Pausar timer'
      : 'Iniciar timer'

  const toggleTimer = async (): Promise<void> => {
    try {
      if (task.is_running) await stopTimer(task.id)
      else await startTimer(task.id)
      toast.success(task.is_running ? 'Timer pausado' : 'Timer iniciado')
      onChanged()
    } catch (error) {
      console.error('[TaskActions]', error)
      toast.error(error instanceof Error ? error.message : 'Não foi possível mexer no timer')
    }
  }

  return (
    <Flex
      gap={0}
      justify="flex-end"
      style={{ flex: 'none' }}
      data-row-click="ignore"
      onClick={(event) => event.stopPropagation()}
    >
      {showToday && onScheduleForToday && (
        <Tooltip title={scheduledToday ? 'Tirar do plano de hoje' : 'Planejar para hoje'}>
          <Button
            size="small"
            type={scheduledToday ? 'primary' : 'text'}
            ghost={scheduledToday}
            aria-label="Hoje"
            aria-pressed={scheduledToday}
            icon={<CalendarDays {...ICON} />}
            onClick={() => onScheduleForToday(task.id)}
          />
        </Tooltip>
      )}
      {showTimer && (
        <Tooltip title={timerTitle}>
          <Button
            size="small"
            type="text"
            disabled={task.is_blocked && !task.is_running}
            aria-label={task.is_running ? 'Pausar timer' : 'Iniciar timer'}
            icon={task.is_running ? <Pause {...ICON} /> : <Play {...ICON} />}
            onClick={() => void toggleTimer()}
          />
        </Tooltip>
      )}
      <TaskContextMenu
        task={task}
        onOpen={() => onOpen(task.id)}
        onScheduleForToday={onScheduleForToday}
        trigger={['click']}
      >
        <Button size="small" type="text" aria-label="Mais ações" icon={<Ellipsis {...ICON} />} />
      </TaskContextMenu>
    </Flex>
  )
}
