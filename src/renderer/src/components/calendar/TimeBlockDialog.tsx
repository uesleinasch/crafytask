import { useState, useEffect, useCallback } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import { SearchableSelect } from '@renderer/components/ui/searchable-select'
import { toast } from '@renderer/components/ui/sonner'
import type { TaskListItem, CreateTimeBlockInput } from '@shared/types'
import { Trash2 } from 'lucide-react'

function dateToStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

interface TimeBlockDialogProps {
  open: boolean
  onClose: () => void
  onSave: (data: CreateTimeBlockInput) => Promise<void>
  onDelete?: () => Promise<void>
  tasks: TaskListItem[]
  initial?: Partial<TimeBlockDialogState>
  title: string
}

interface TimeBlockDialogState {
  taskId: string
  date: string
  startTime: string
  endTime: string
}

export function TimeBlockDialog({
  open,
  onClose,
  onSave,
  onDelete,
  tasks,
  initial,
  title
}: TimeBlockDialogProps): React.JSX.Element {
  const [taskId, setTaskId] = useState(initial?.taskId || '')
  const [date, setDate] = useState(initial?.date || dateToStr(new Date()))
  const [startTime, setStartTime] = useState(initial?.startTime || '09:00')
  const [endTime, setEndTime] = useState(initial?.endTime || '10:00')

  useEffect(() => {
    if (open) {
      setTaskId(initial?.taskId || '')
      setDate(initial?.date || dateToStr(new Date()))
      setStartTime(initial?.startTime || '09:00')
      setEndTime(initial?.endTime || '10:00')
    }
  }, [open, initial?.taskId, initial?.date, initial?.startTime, initial?.endTime])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!taskId) return
      if (startTime >= endTime) {
        toast.error('Hora de início deve ser anterior ao fim.')
        return
      }
      try {
        await onSave({ task_id: Number(taskId), date, start_time: startTime, end_time: endTime })
        onClose()
      } catch {
        return
      }
    },
    [taskId, date, startTime, endTime, onSave, onClose]
  )

  const durationMin = endTime > startTime ? timeToMinutes(endTime) - timeToMinutes(startTime) : 0

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md w-full">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2 min-w-0 w-full">
          <div className="min-w-0 w-full">
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Tarefa *</label>
            <SearchableSelect
              value={taskId}
              onChange={setTaskId}
              options={tasks.map((t) => ({ value: String(t.id), label: t.name }))}
              placeholder="Selecione uma tarefa..."
              searchPlaceholder="Buscar tarefa..."
              className="w-full min-w-0"
            />
          </div>
          <div className="min-w-0 w-full">
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Data *</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 min-w-0">
            <div className="min-w-0">
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Início *</label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="min-w-0">
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Fim *</label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
          {durationMin > 0 && (
            <p className="text-xs text-slate-500">
              Duração: {Math.floor(durationMin / 60)}h{' '}
              {durationMin % 60 > 0 ? `${durationMin % 60}min` : ''}
            </p>
          )}
          <DialogFooter className="gap-2">
            {onDelete && (
              <Button
                type="button"
                variant="ghost"
                className="text-red-500 hover:text-red-600 hover:bg-red-50 mr-auto"
                onClick={async () => {
                  try {
                    await onDelete()
                    onClose()
                  } catch {
                    return
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Excluir
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!taskId}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ===================== DRAGGABLE TASK CHIP (Monthly) =====================
