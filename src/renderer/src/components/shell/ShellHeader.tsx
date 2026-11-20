import { Button, Dropdown, Grid, Tooltip, Typography, theme, type MenuProps } from 'antd'
import { Menu, Plus, Rows3, Rows4, Search } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { isThemePreference } from '@shared/themePreference'
import { requestNewTask } from '@renderer/lib/newTaskRequest'
import { useThemeSettings } from '@renderer/theme/themeSettings'
import { HeaderCapture } from './HeaderCapture'
import { openCommandPalette } from './paletteCommands'
import { RunningTimersPill } from './RunningTimersPill'
import { screenTitle } from './navigation'
import { THEME_OPTIONS, themeOption } from './themeOptions'

interface ShellHeaderProps {
  onOpenMenu?: () => void
}

function AppearanceMenu(): React.JSX.Element {
  const { preference, setPreference, density, setDensity } = useThemeSettings()
  const CurrentIcon = themeOption(preference).icon
  const items: MenuProps['items'] = [
    {
      key: 'theme',
      type: 'group',
      label: 'Tema',
      children: THEME_OPTIONS.map(({ value, label, icon: Icon }) => ({
        key: value,
        icon: <Icon size={16} strokeWidth={1.75} aria-hidden />,
        label
      }))
    },
    { type: 'divider' },
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
        selectable: true,
        selectedKeys: [preference],
        onClick: ({ key }) => {
          if (key === 'density') setDensity(density === 'compact' ? 'comfortable' : 'compact')
          else if (isThemePreference(key)) setPreference(key)
        }
      }}
    >
      <Button aria-label="Aparência" icon={<CurrentIcon size={16} strokeWidth={1.75} />} />
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
  const screens = Grid.useBreakpoint()
  const showCapture = screens.sm !== false

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
        <RunningTimersPill compact={!screens.md} />
        <SearchButton showLabel={!!screens.xxl} />
        <AppearanceMenu />
        <Tooltip title={screens.lg ? '' : 'Nova tarefa'}>
          <Button
            type="primary"
            aria-label="Nova tarefa"
            icon={<Plus size={16} strokeWidth={1.75} />}
            onClick={requestNewTask}
          >
            {screens.lg ? 'Nova tarefa' : null}
          </Button>
        </Tooltip>
      </div>
    </div>
  )
}
