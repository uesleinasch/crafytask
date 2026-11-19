import { useState } from 'react'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  useDroppable,
  useDraggable
} from '@dnd-kit/core'
import type { Task, TimeBlock } from '@shared/types'
import { GripVertical } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function dateToStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

function getMonthDays(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const days: (Date | null)[] = []
  // Pad start (week starts on Sunday = 0)
  for (let i = 0; i < first.getDay(); i++) days.push(null)
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d))
  // Pad end to complete the last row
  while (days.length % 7 !== 0) days.push(null)
  return days
}

// ===================== TIME BLOCK DIALOG =====================

interface DraggableTaskChipProps {
  task: Task
  onNavigate: (id: number) => void
}

function DraggableTaskChip({ task, onNavigate }: DraggableTaskChipProps): React.JSX.Element {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `task-${task.id}` })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation()
        onNavigate(task.id)
      }}
      className={cn(
        'flex items-center gap-1 px-1.5 py-0.5 rounded text-xs cursor-grab active:cursor-grabbing select-none',
        'bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200 transition-colors',
        isDragging && 'opacity-40'
      )}
    >
      <GripVertical className="h-2.5 w-2.5 text-blue-400 shrink-0" />
      <span className="truncate">{task.name}</span>
    </div>
  )
}

// ===================== DROPPABLE DAY CELL (Monthly) =====================

interface DroppableDayCellProps {
  date: Date
  tasks: Task[]
  timeBlockCount: number
  isToday: boolean
  isCurrentMonth: boolean
  onNavigate: (taskId: number) => void
  onDayClick: (date: string) => void
}

function DroppableDayCell({
  date,
  tasks,
  timeBlockCount,
  isToday,
  isCurrentMonth,
  onNavigate,
  onDayClick
}: DroppableDayCellProps): React.JSX.Element {
  const dateStr = dateToStr(date)
  const { setNodeRef, isOver } = useDroppable({ id: `day-${dateStr}` })

  return (
    <div
      ref={setNodeRef}
      onClick={() => onDayClick(dateStr)}
      className={cn(
        'min-h-[90px] p-1.5 border border-slate-200 cursor-pointer transition-colors',
        isToday && 'bg-blue-50 border-blue-300',
        !isCurrentMonth && 'bg-slate-50 opacity-50',
        isOver && 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-300'
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={cn(
            'text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full',
            isToday ? 'bg-blue-500 text-white' : 'text-slate-600'
          )}
        >
          {date.getDate()}
        </span>
        {timeBlockCount > 0 && (
          <span className="text-xs bg-orange-100 text-orange-600 px-1 rounded">
            {timeBlockCount}⏱
          </span>
        )}
      </div>
      <div className="space-y-0.5">
        {tasks.slice(0, 3).map((t) => (
          <DraggableTaskChip key={t.id} task={t} onNavigate={onNavigate} />
        ))}
        {tasks.length > 3 && (
          <span className="text-xs text-slate-400 pl-1">+{tasks.length - 3} mais</span>
        )}
      </div>
    </div>
  )
}

// ===================== TIME BLOCK CARD (Weekly grid) =====================

interface MonthlyCalendarProps {
  year: number
  month: number
  scheduledTasks: Task[]
  timeBlocks: TimeBlock[]
  onTaskNavigate: (id: number) => void
  onDayClick: (date: string) => void
  onDragEnd: (taskId: number, newDate: string) => void
}

export function MonthlyCalendar({
  year,
  month,
  scheduledTasks,
  timeBlocks,
  onTaskNavigate,
  onDayClick,
  onDragEnd
}: MonthlyCalendarProps): React.JSX.Element {
  const today = dateToStr(new Date())
  const days = getMonthDays(year, month)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  function getTasksForDay(date: Date): Task[] {
    const ds = dateToStr(date)
    return scheduledTasks.filter((t) => t.scheduled_date === ds)
  }

  function getBlockCountForDay(date: Date): number {
    const ds = dateToStr(date)
    return timeBlocks.filter((b) => b.date === ds).length
  }

  function handleDragStart(event: DragStartEvent): void {
    const id = Number(String(event.active.id).replace('task-', ''))
    setActiveTask(scheduledTasks.find((t) => t.id === id) || null)
  }

  function handleDragEnd(event: DragEndEvent): void {
    setActiveTask(null)
    const { active, over } = event
    if (!over) return
    const taskId = Number(String(active.id).replace('task-', ''))
    const newDate = String(over.id).replace('day-', '')
    if (newDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      onDragEnd(taskId, newDate)
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 shrink-0">
          {DAY_NAMES.map((d) => (
            <div
              key={d}
              className="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide"
            >
              {d}
            </div>
          ))}
        </div>
        {/* Day cells */}
        <div className="grid grid-cols-7 flex-1">
          {days.map((date, idx) =>
            date === null ? (
              <div
                key={`empty-${idx}`}
                className="min-h-[90px] bg-slate-50/50 border border-slate-100"
              />
            ) : (
              <DroppableDayCell
                key={dateToStr(date)}
                date={date}
                tasks={getTasksForDay(date)}
                timeBlockCount={getBlockCountForDay(date)}
                isToday={dateToStr(date) === today}
                isCurrentMonth={date.getMonth() === month}
                onNavigate={onTaskNavigate}
                onDayClick={onDayClick}
              />
            )
          )}
        </div>
      </div>
      {/* Drag overlay hint */}
      {activeTask && (
        <div className="fixed bottom-4 right-4 bg-slate-800 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg pointer-events-none">
          Solte em um dia para reagendar
        </div>
      )}
    </DndContext>
  )
}
