import { Button, Dropdown, Grid, Tooltip, Typography, theme, type MenuProps } from 'antd'
import { Menu, Palette, Plus, Rows3, Rows4, Search } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { requestNewTask } from '@renderer/lib/newTaskRequest'
import { useThemeSettings } from '@renderer/theme/themeSettings'
import { HeaderCapture } from './HeaderCapture'
import { openCommandPalette } from './paletteCommands'
import { RunningTimersPill } from './RunningTimersPill'
import { screenTitle } from './navigation'

interface ShellHeaderProps {
  onOpenMenu?: () => void
}

function AppearanceMenu(): React.JSX.Element {
  const { density, setDensity } = useThemeSettings()
  const items: MenuProps['items'] = [
    {
      key: 'density',
      icon: density === 'compact' ? <Rows3 size={16} /> : <Rows4 size={16} />,
      label: density === 'compact' ? 'Densidade confortável' : 'Densidade compacta'
    }
  ]
  return (
    <Dropdown
      trigger={['click']}
      menu={{
        items,
        onClick: () => setDensity(density === 'compact' ? 'comfortable' : 'compact')
      }}
    >
      <Button aria-label="Aparência" icon={<Palette size={16} strokeWidth={1.75} />} />
    </Dropdown>
  )
}

function SearchButton({ showLabel }: { showLabel: boolean }): React.JSX.Element {
  const { token } = theme.useToken()
  return (
    <Tooltip title="Buscar e comandos (Ctrl+K)">
      <Button
        aria-label="Buscar"
        icon={<Search size={16} strokeWidth={1.75} />}
        onClick={openCommandPalette}
      >
        {showLabel && (
          <span>
            Buscar{' '}
            <Typography.Text
              type="secondary"
              style={{ fontSize: 12, marginInlineStart: 6, fontFamily: token.fontFamilyCode }}
            >
              Ctrl K
            </Typography.Text>
          </span>
        )}
      </Button>
    </Tooltip>
  )
}

export function ShellHeader({ onOpenMenu }: ShellHeaderProps): React.JSX.Element {
  const location = useLocation()
  const navigate = useNavigate()
  const screens = Grid.useBreakpoint()
  const showCapture = screens.sm !== false

  const handleNewTask = (): void => {
    if (location.pathname !== '/') navigate('/')
    requestNewTask()
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: showCapture
          ? 'minmax(max-content, 1fr) minmax(200px, 520px) minmax(max-content, 1fr)'
          : 'minmax(0, 1fr) auto',
        alignItems: 'center',
        gap: 12,
        height: '100%'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
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
      </div>
      {showCapture && <HeaderCapture />}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 8,
          minWidth: 0
        }}
      >
        <RunningTimersPill compact={screens.md === false} />
        <SearchButton showLabel={!!screens.xxl} />
        <AppearanceMenu />
        <Button
          type="primary"
          aria-label="Nova tarefa"
          icon={<Plus size={16} strokeWidth={1.75} />}
          onClick={handleNewTask}
        >
          {screens.lg ? 'Nova tarefa' : null}
        </Button>
      </div>
    </div>
  )
}
