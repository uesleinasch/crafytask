import { Flex, Typography } from 'antd'
import { Plug, SquareTerminal } from 'lucide-react'
import type { Task } from '@shared/types'
import { GoogleCalendarTaskToggle } from '@renderer/components/GoogleCalendarTaskToggle'
import { WorkingDirField } from '@renderer/components/terminal/WorkingDirField'
import { JiraTaskControls } from '@renderer/components/jira/JiraTaskControls'
import { Field, Section } from '@renderer/components/shell/SectionHeader'

interface TaskDetailsPanelProps {
  task: Task
  refreshTask: () => Promise<void>
}

export function TaskDetailsPanel({ task, refreshTask }: TaskDetailsPanelProps): React.JSX.Element {
  const openJiraParent = (): void => {
    const url = task.external_url?.replace(
      /\/browse\/[^/]+$/,
      `/browse/${encodeURIComponent(task.jira_parent_key ?? '')}`
    )
    if (url) void window.api.appOpenExternal(url)
  }

  return (
    <Flex vertical gap={20}>
      {task.jira_key && (
        <Section icon={Plug} title="Jira">
          <JiraTaskControls task={task} showKey showFieldsButton={false} />
          {task.jira_parent_key && (
            <Field label="Pai">
              <Typography.Link onClick={openJiraParent} ellipsis>
                {task.jira_parent_key}
                {task.jira_parent_summary && ` · ${task.jira_parent_summary}`}
              </Typography.Link>
            </Field>
          )}
        </Section>
      )}

      <GoogleCalendarTaskToggle
        taskId={task.id}
        enabled={Boolean(task.gcal_sync)}
        onChange={refreshTask}
      />

      <Section icon={SquareTerminal} title="Ambiente">
        <WorkingDirField
          taskId={task.id}
          workingDir={task.working_dir}
          projectWorkingDir={task.project_working_dir}
          startCommand={task.start_command}
          onChange={refreshTask}
        />
      </Section>
    </Flex>
  )
}
