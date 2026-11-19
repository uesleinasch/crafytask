import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { CreateTaskInput } from '@shared/types'
import { TaskDialog } from '@renderer/components/TaskDialog'
import { TaskListView } from '@renderer/components/tasks/TaskListView'
import { PageContainer } from '@renderer/components/shell/PageContainer'
import { onNewTaskRequest } from '@renderer/lib/newTaskRequest'

export function TaskListPage(): React.JSX.Element {
  const navigate = useNavigate()
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => onNewTaskRequest(() => setDialogOpen(true)), [])

  const handleCreateTask = useCallback(
    async (data: CreateTaskInput): Promise<void> => {
      const task = await window.api.createTask(data)
      navigate(`/task/${task.id}`)
    },
    [navigate]
  )

  return (
    <div className="h-full overflow-y-auto">
      <PageContainer>
        <TaskListView />
      </PageContainer>
      <TaskDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={handleCreateTask} />
    </div>
  )
}
