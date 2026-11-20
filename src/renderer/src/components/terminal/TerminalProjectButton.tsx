import { Button, Tooltip } from 'antd'
import { SquareTerminal } from 'lucide-react'
import { sameOwner, useTerminalStore } from '@renderer/stores/terminalStore'

interface TerminalProjectButtonProps {
  projectId: number
  workingDir: string
}

export function TerminalProjectButton({
  projectId,
  workingDir
}: TerminalProjectButtonProps): React.JSX.Element {
  const owner = { kind: 'project' as const, id: projectId }
  const showing = useTerminalStore(
    (s) =>
      s.open && sameOwner(s.sessions.find((session) => session.id === s.activeId)?.owner, owner)
  )

  return (
    <Tooltip title={`Terminal em ${workingDir}`}>
      <Button
        type={showing ? 'primary' : 'text'}
        ghost={showing}
        aria-label="Terminal"
        aria-pressed={showing}
        icon={<SquareTerminal size={16} strokeWidth={1.75} aria-hidden />}
        onClick={() => void useTerminalStore.getState().toggleFor(owner)}
      />
    </Tooltip>
  )
}
