import { TaskListView } from '@renderer/components/tasks/TaskListView'
import { PageContainer } from '@renderer/components/shell/PageContainer'

export function TaskListPage(): React.JSX.Element {
  return (
    <div className="h-full overflow-y-auto">
      <PageContainer>
        <TaskListView />
      </PageContainer>
    </div>
  )
}
