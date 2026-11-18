import { useContext } from 'react'
import { App } from 'antd'
import { STATUS_LABELS, type TaskCategory, type TaskStatus } from '@shared/types'
import { localDateString } from '@shared/dueState'
import { TaskMenuChangedContext } from '@renderer/components/taskMenuContext'
import { toast } from '@renderer/components/ui/sonner'
import { CATEGORY_CHIP_LABELS } from '@renderer/components/chips/categoryMeta'
import { plural, todayToggle } from './bulkActionText'

export interface TaskBulkActions {
  setStatus: (ids: number[], status: TaskStatus) => Promise<void>
  setCategory: (ids: number[], category: TaskCategory) => Promise<void>
  moveToProject: (ids: number[], projectId: number | null, projectName?: string) => Promise<void>
  toggleToday: (items: { id: number; scheduled_date?: string | null }[]) => Promise<void>
  archive: (ids: number[]) => Promise<void>
  confirmDelete: (ids: number[]) => void
}

export function useTaskBulkActions(onDone?: () => void): TaskBulkActions {
  const { modal } = App.useApp()
  const onChanged = useContext(TaskMenuChangedContext)

  const run = async (action: () => Promise<unknown>, success: string): Promise<void> => {
    try {
      await action()
      toast.success(success)
    } catch (error) {
      console.error('[useTaskBulkActions]', error)
      toast.error(error instanceof Error ? error.message : 'Não foi possível concluir a ação')
    } finally {
      onChanged()
      onDone?.()
    }
  }

  return {
    setStatus: (ids, status) =>
      run(
        () =>
          ids.length === 1
            ? window.api.updateStatus(ids[0], status)
            : window.api.bulkUpdateStatus(ids, status),
        `${plural(ids.length, 'tarefa marcada', 'tarefas marcadas')} como ${STATUS_LABELS[status]}`
      ),
    setCategory: (ids, category) =>
      run(
        () => Promise.all(ids.map((id) => window.api.updateTask(id, { category }))),
        `Categoria: ${CATEGORY_CHIP_LABELS[category]}`
      ),
    moveToProject: (ids, projectId, projectName) =>
      run(
        () => window.api.bulkMoveToProject(ids, projectId),
        projectId === null
          ? `${plural(ids.length, 'tarefa', 'tarefas')} sem projeto`
          : `${plural(ids.length, 'tarefa movida', 'tarefas movidas')} para ${projectName ?? 'o projeto'}`
      ),
    toggleToday: (items) => {
      const { date, success } = todayToggle(items, localDateString(new Date()))
      return run(
        () => Promise.all(items.map((item) => window.api.scheduleTaskForDate(item.id, date))),
        success
      )
    },
    archive: (ids) =>
      run(
        () => window.api.bulkSetArchived(ids, true),
        plural(ids.length, 'tarefa arquivada', 'tarefas arquivadas')
      ),
    confirmDelete: (ids) => {
      modal.confirm({
        title: `Excluir ${plural(ids.length, 'tarefa', 'tarefas')}?`,
        content:
          'Apaga também sessões, notas e desenho. No Notion e no Google também, se a sincronização estiver ligada. A issue no Jira continua.',
        okText: 'Excluir',
        okButtonProps: { danger: true },
        cancelText: 'Cancelar',
        onOk: () =>
          run(
            () => window.api.bulkDeleteTasks(ids),
            plural(ids.length, 'tarefa excluída', 'tarefas excluídas')
          )
      })
    }
  }
}
