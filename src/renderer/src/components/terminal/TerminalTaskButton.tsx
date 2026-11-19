import { Button, Tooltip } from 'antd'
import { SquareTerminal } from 'lucide-react'
import { sameOwner, useTerminalStore } from '@renderer/stores/terminalStore'
import { TERMINAL_SHORTCUT_LABEL } from './terminalKeys'

interface TerminalTaskButtonProps {
  taskId: number
  workingDir: string | null | undefined
  onWorkingDirChange: () => Promise<void>
}

export function TerminalTaskButton({
  taskId,
  workingDir,
  onWorkingDirChange
}: TerminalTaskButtonProps): React.JSX.Element {
  const isShowingTask = useTerminalStore(
    (s) =>
      s.open &&
      sameOwner(s.sessions.find((session) => session.id === s.activeId)?.owner, {
        kind: 'task',
        id: taskId
      })
  )

  const handleClick = async (): Promise<void> => {
    if (!workingDir) {
      const dir = await window.api.terminalPickDirectory(taskId)
      if (!dir) return
      await onWorkingDirChange()
    }
    await useTerminalStore.getState().toggleFor({ kind: 'task', id: taskId })
  }

  return (
    <Tooltip
      title={
        workingDir
          ? `Terminal em ${workingDir} (${TERMINAL_SHORTCUT_LABEL})`
          : 'Escolher o diretório de trabalho e abrir o terminal'
      }
    >
      <Button
        type={isShowingTask ? 'primary' : 'text'}
        ghost={isShowingTask}
        aria-label="Terminal"
        aria-pressed={isShowingTask}
        icon={<SquareTerminal size={16} strokeWidth={1.75} aria-hidden />}
        onClick={() => void handleClick()}
      />
    </Tooltip>
  )
}
