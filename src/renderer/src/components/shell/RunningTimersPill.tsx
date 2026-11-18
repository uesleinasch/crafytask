import { Badge, Button, Flex, Popover, Typography, theme } from 'antd'
import { Pause } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatTime } from '@renderer/lib/utils'
import { useTimerStore } from '@renderer/stores/timerStore'
import { LiveDot } from '@renderer/components/chips/LiveDot'
import { sortByLatestStart } from './runningTimers'

export function RunningTimersPill(): React.JSX.Element | null {
  const { token } = theme.useToken()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const timers = useTimerStore((s) => s.timers)
  const stopTimer = useTimerStore((s) => s.stopTimer)
  const syncWithDatabase = useTimerStore((s) => s.syncWithDatabase)
  const mono: React.CSSProperties = {
    fontFamily: token.fontFamilyCode,
    fontVariantNumeric: 'tabular-nums'
  }

  useEffect(() => {
    syncWithDatabase()
  }, [syncWithDatabase])

  const running = sortByLatestStart(Object.values(timers))
  if (running.length === 0) return null
  const [latest] = running

  const content = (
    <Flex vertical style={{ width: 300 }}>
      {running.map((timer) => (
        <Flex key={timer.task.id} align="center" gap={8} style={{ paddingBlock: 6 }}>
          <LiveDot />
          <Typography.Link
            ellipsis
            style={{ flex: 1, minWidth: 0 }}
            onClick={() => {
              setOpen(false)
              navigate(`/task/${timer.task.id}`)
            }}
          >
            {timer.task.name}
          </Typography.Link>
          <span style={mono}>{formatTime(timer.displaySeconds)}</span>
          <Button
            size="small"
            type="text"
            aria-label={`Pausar ${timer.task.name}`}
            icon={<Pause size={14} strokeWidth={1.75} />}
            onClick={() => void stopTimer(timer.task.id)}
          />
        </Flex>
      ))}
    </Flex>
  )

  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      title="Timers em execução"
      content={content}
      open={open}
      onOpenChange={setOpen}
    >
      <Button
        shape="round"
        aria-label={`${running.length} ${running.length === 1 ? 'timer em execução' : 'timers em execução'}`}
      >
        <Flex align="center" gap={8}>
          <LiveDot />
          <span style={mono}>{formatTime(latest.displaySeconds)}</span>
          {running.length > 1 && (
            <Badge count={running.length} size="small" color={token.colorPrimary} />
          )}
        </Flex>
      </Button>
    </Popover>
  )
}
