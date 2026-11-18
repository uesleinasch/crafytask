import { Flex } from 'antd'
import { ListChecks, Lock, Network } from 'lucide-react'
import type { Task } from '@shared/types'
import { SubtaskList } from '@renderer/components/SubtaskList'
import { DependencySelector } from '@renderer/components/DependencySelector'
import { JiraChildIssues } from '@renderer/components/jira/JiraChildIssues'
import { Section, SectionHeader } from '@renderer/components/shell/SectionHeader'

interface TaskRelationsPanelProps {
  task: Task
  refreshTask: () => Promise<void>
}

export function TaskRelationsPanel({
  task,
  refreshTask
}: TaskRelationsPanelProps): React.JSX.Element {
  const subtaskCount = task.subtask_count ?? 0
  return (
    <Flex vertical gap={20}>
      {!task.parent_task_id && (
        <Section
          icon={ListChecks}
          title="Subtarefas"
          extra={subtaskCount ? `${task.completed_subtask_count ?? 0}/${subtaskCount}` : null}
        >
          <SubtaskList
            parentTaskId={task.id}
            isParentBlocked={task.is_blocked}
            onSubtaskChange={refreshTask}
          />
        </Section>
      )}
      <Section icon={Lock} title="Depende de">
        <DependencySelector taskId={task.id} onDependenciesChange={refreshTask} />
      </Section>
      {task.jira_key && task.jira_issue_kind !== 'subtask' && (
        <JiraChildIssues
          taskId={task.id}
          header={<SectionHeader icon={Network} title="Issues filhas no Jira" />}
        />
      )}
    </Flex>
  )
}
