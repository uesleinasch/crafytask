import { Tooltip, theme } from 'antd'
import type { Task } from '@shared/types'

type JiraKeyProps = Pick<Task, 'jira_key' | 'jira_issue_type' | 'jira_status'>

export function JiraKey({
  jira_key,
  jira_issue_type,
  jira_status
}: JiraKeyProps): React.JSX.Element | null {
  const { token } = theme.useToken()
  if (!jira_key) return null
  const detail = `${jira_issue_type ?? 'Issue'} · Jira: ${jira_status ?? 'sem status'}`
  return (
    <Tooltip title={detail}>
      <span
        role="img"
        aria-label={`Jira ${jira_key}, ${detail}`}
        style={{
          flex: 'none',
          fontSize: 12,
          color: token.colorTextTertiary,
          fontFamily: token.fontFamilyCode,
          fontVariantNumeric: 'tabular-nums'
        }}
      >
        {jira_key}
      </span>
    </Tooltip>
  )
}
