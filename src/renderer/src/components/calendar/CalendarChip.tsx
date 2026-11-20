import { theme } from 'antd'
import { Flag } from 'lucide-react'
import { DRAG_TYPE, type AllDayItem } from './calendarView'

interface CalendarChipProps {
  item: AllDayItem
  today: string
  compact?: boolean
  onOpen: (taskId: number) => void
}

export function CalendarChip({
  item,
  today,
  compact,
  onOpen
}: CalendarChipProps): React.JSX.Element {
  const { token } = theme.useToken()
  const { task } = item
  const due = item.kind === 'due'
  const dueDate = task.due_date?.slice(0, 10)
  const tone =
    due && dueDate && dueDate < today
      ? token.colorError
      : due && dueDate === today
        ? token.colorWarning
        : token.colorTextTertiary
  const label = `${due ? 'Prazo' : 'Agendada'}: ${task.name}${due && task.due_time ? ` às ${task.due_time}` : ''}`
  return (
    <button
      type="button"
      className={due ? 'ct-calchip due' : 'ct-calchip'}
      draggable
      onDragStart={(e) =>
        e.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ taskId: task.id, chip: item.kind }))
      }
      onClick={() => onOpen(task.id)}
      title={label}
      aria-label={label}
    >
      {due ? (
        <Flag size={12} strokeWidth={2} aria-hidden style={{ flex: 'none', color: tone }} />
      ) : task.project_color ? (
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            flex: 'none',
            background: task.project_color
          }}
        />
      ) : null}
      <span className="ct-calblock-name" style={{ flex: 1 }}>
        {task.name}
      </span>
      {due && task.due_time && !compact && (
        <span style={{ fontFamily: token.fontFamilyCode, color: token.colorTextTertiary }}>
          {task.due_time}
        </span>
      )}
    </button>
  )
}
