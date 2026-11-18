import { Button, Flex, Typography } from 'antd'
import { Menu, Plus } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { requestNewTask } from '@renderer/lib/newTaskRequest'
import { screenTitle } from './navigation'

interface ShellHeaderProps {
  onOpenMenu?: () => void
}

export function ShellHeader({ onOpenMenu }: ShellHeaderProps): React.JSX.Element {
  const location = useLocation()
  const navigate = useNavigate()

  const handleNewTask = (): void => {
    if (location.pathname !== '/') navigate('/')
    requestNewTask()
  }

  return (
    <Flex align="center" justify="space-between" gap={12} style={{ height: '100%' }}>
      <Flex align="center" gap={8} style={{ minWidth: 0 }}>
        {onOpenMenu && (
          <Button
            type="text"
            aria-label="Abrir menu"
            icon={<Menu size={18} strokeWidth={1.75} />}
            onClick={onOpenMenu}
          />
        )}
        <Typography.Title level={1} ellipsis style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
          {screenTitle(location.pathname)}
        </Typography.Title>
      </Flex>
      <Button type="primary" icon={<Plus size={16} strokeWidth={1.75} />} onClick={handleNewTask}>
        Nova tarefa
      </Button>
    </Flex>
  )
}
