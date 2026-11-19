import { Dropdown, type MenuProps } from 'antd'
import { Check, Palette, Pencil, Shapes, SplitSquareHorizontal, Undo2 } from 'lucide-react'
import type { TerminalSession } from '@shared/types'
import { TERMINAL_TAB_ICONS } from '@shared/terminalTab'
import { useTerminalStore } from '@renderer/stores/terminalStore'
import { USER_COLORS } from '@renderer/theme/semantic'
import { TAB_ICON_COMPONENTS } from './tabIcons'

interface TerminalSessionMenuProps {
  session: TerminalSession
  canDetach: boolean
  onRename: () => void
  children: React.ReactElement
}

const ICON = { size: 14, strokeWidth: 1.75, 'aria-hidden': true } as const

function selected(on: boolean): React.ReactNode {
  return on ? <Check {...ICON} /> : <span style={{ display: 'inline-block', width: 14 }} />
}

export function TerminalSessionMenu({
  session,
  canDetach,
  onRename,
  children
}: TerminalSessionMenuProps): React.JSX.Element {
  const store = useTerminalStore.getState
  const color = session.color?.toLowerCase() ?? null

  const items: MenuProps['items'] = [
    { key: 'rename', icon: <Pencil {...ICON} />, label: 'Renomear' },
    {
      key: 'reset-title',
      icon: <Undo2 {...ICON} />,
      label: 'Restaurar nome',
      disabled: session.title === null
    },
    {
      key: 'detach',
      icon: <SplitSquareHorizontal {...ICON} />,
      label: 'Separar do grupo',
      disabled: !canDetach
    },
    { type: 'divider' },
    {
      key: 'color',
      icon: <Palette {...ICON} />,
      label: 'Cor',
      children: [
        { key: 'color:none', icon: selected(color === null), label: 'Sem cor' },
        ...USER_COLORS.map((value) => ({
          key: `color:${value}`,
          icon: selected(color === value.toLowerCase()),
          label: (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span
                aria-hidden
                style={{ width: 12, height: 12, borderRadius: '50%', background: value }}
              />
              <span className="font-mono">{value}</span>
            </span>
          )
        }))
      ]
    },
    {
      key: 'icon',
      icon: <Shapes {...ICON} />,
      label: 'Ícone',
      children: [
        { key: 'icon:none', icon: selected(session.icon === null), label: 'Sem ícone' },
        ...TERMINAL_TAB_ICONS.map(({ id, label }) => {
          const Icon = TAB_ICON_COMPONENTS[id]
          return {
            key: `icon:${id}`,
            icon: selected(session.icon === id),
            label: (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Icon {...ICON} />
                {label}
              </span>
            )
          }
        })
      ]
    }
  ]

  const onClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'rename') onRename()
    else if (key === 'reset-title') void store().customize(session.id, { title: null })
    else if (key === 'detach') store().detach(session.id)
    else if (key.startsWith('color:')) {
      const value = key.slice('color:'.length)
      void store().customize(session.id, { color: value === 'none' ? null : value })
    } else if (key.startsWith('icon:')) {
      const value = key.slice('icon:'.length)
      void store().customize(session.id, { icon: value === 'none' ? null : value })
    }
  }

  return (
    <Dropdown trigger={['contextMenu']} autoFocus menu={{ items, onClick }}>
      {children}
    </Dropdown>
  )
}
