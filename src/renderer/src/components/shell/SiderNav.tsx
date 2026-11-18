import { Badge, Flex, Menu, theme, type MenuProps } from 'antd'
import {
  Archive,
  BarChart3,
  Calendar,
  CalendarDays,
  ClipboardCheck,
  FolderKanban,
  ListTodo,
  Mountain,
  NotebookTabs,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  SquareTerminal,
  Tags,
  type LucideIcon
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTerminalStore } from '@renderer/stores/terminalStore'
import { TERMINAL_SHORTCUT_LABEL } from '@renderer/components/terminal/terminalKeys'
import { PALETTE } from '@renderer/theme/tokens'
import { useThemeSettings } from '@renderer/theme/themeSettings'
import { NAV_FOOTER, NAV_GROUPS, navKeyFor, type NavKey, type NavRoute } from './navigation'
import { useNavCounts, type NavCounts } from './useNavCounts'

const ICONS: Record<NavKey, LucideIcon> = {
  tasks: ListTodo,
  today: CalendarDays,
  calendar: Calendar,
  review: ClipboardCheck,
  projects: FolderKanban,
  horizons: Mountain,
  labels: Tags,
  notebooks: NotebookTabs,
  dashboard: BarChart3,
  archived: Archive,
  settings: Settings
}

const TERMINALS_KEY = 'terminals'
const COLLAPSE_KEY = 'collapse'

function icon(Icon: LucideIcon): React.ReactNode {
  return <Icon size={16} strokeWidth={1.75} />
}

interface Indicator {
  count?: number
  dot?: boolean
  hint: string
  neutral?: boolean
}

function indicatorFor(key: NavKey, counts: NavCounts): Indicator | null {
  if (key === 'tasks' && counts.inbox > 0)
    return { count: counts.inbox, hint: `${counts.inbox} no Inbox` }
  if (key === 'today' && counts.today > 0)
    return { count: counts.today, hint: `${counts.today} no plano de hoje` }
  if (key === 'projects' && counts.activeProjects > 0)
    return { count: counts.activeProjects, hint: `${counts.activeProjects} projetos ativos` }
  if (key === 'review' && counts.reviewOverdue) return { dot: true, hint: 'Revisão atrasada' }
  return null
}

function NavLabel({
  label,
  indicator
}: {
  label: string
  indicator: Indicator | null
}): React.JSX.Element {
  const { token } = theme.useToken()
  if (!indicator) return <>{label}</>
  return (
    <Flex justify="space-between" align="center" gap={8}>
      <span>{label}</span>
      {indicator.dot ? (
        <Badge status="warning" aria-label={indicator.hint} />
      ) : (
        <Badge
          count={indicator.count}
          size="small"
          color={indicator.neutral ? token.colorTextTertiary : token.colorPrimary}
          aria-label={indicator.hint}
        />
      )}
    </Flex>
  )
}

function routeItem(item: NavRoute, counts: NavCounts): NonNullable<MenuProps['items']>[number] {
  const indicator = indicatorFor(item.key, counts)
  return {
    key: item.key,
    icon: icon(ICONS[item.key]),
    title: indicator ? `${item.label} · ${indicator.hint}` : item.label,
    label: <NavLabel label={item.label} indicator={indicator} />
  }
}

interface SiderNavProps {
  collapsed: boolean
  onToggleCollapsed: () => void
}

export function SiderNav({ collapsed, onToggleCollapsed }: SiderNavProps): React.JSX.Element {
  const location = useLocation()
  const navigate = useNavigate()
  const { token } = theme.useToken()
  const { mode } = useThemeSettings()
  const counts = useNavCounts(location.pathname)
  const terminalCount = useTerminalStore((s) => s.sessions.length)
  const toggleTerminals = useTerminalStore((s) => s.toggle)
  const selected = navKeyFor(location.pathname)

  const routes = new Map<string, string>(
    [...NAV_GROUPS.flatMap((group) => group.items), ...NAV_FOOTER].map((item) => [
      item.key,
      item.route
    ])
  )

  const handleClick: MenuProps['onClick'] = ({ key }) => {
    if (key === TERMINALS_KEY) return toggleTerminals()
    if (key === COLLAPSE_KEY) return onToggleCollapsed()
    const route = routes.get(key)
    if (route) navigate(route)
  }

  const mainItems: MenuProps['items'] = NAV_GROUPS.map((group) => ({
    type: 'group',
    key: group.label,
    label: collapsed ? null : group.label,
    children: group.items.map((item) => routeItem(item, counts))
  }))

  const terminalsHint =
    terminalCount > 0
      ? `${terminalCount} ${terminalCount === 1 ? 'terminal aberto' : 'terminais abertos'} · ${TERMINAL_SHORTCUT_LABEL}`
      : 'Nenhum terminal aberto: abra pela tarefa'

  const footerItems: MenuProps['items'] = [
    {
      key: TERMINALS_KEY,
      icon: icon(SquareTerminal),
      disabled: terminalCount === 0,
      title: `Terminais · ${terminalsHint}`,
      label: (
        <NavLabel
          label="Terminais"
          indicator={
            terminalCount > 0 ? { count: terminalCount, hint: terminalsHint, neutral: true } : null
          }
        />
      )
    },
    ...NAV_FOOTER.map((item) => routeItem(item, counts)),
    {
      key: COLLAPSE_KEY,
      icon: icon(collapsed ? PanelLeftOpen : PanelLeftClose),
      label: collapsed ? 'Expandir menu' : 'Recolher menu'
    }
  ]

  const selectedKeys = selected ? [selected] : []

  return (
    <Flex vertical style={{ height: '100%' }}>
      <Flex
        align="center"
        justify={collapsed ? 'center' : 'flex-start'}
        style={{
          height: 52,
          flex: 'none',
          paddingInline: collapsed ? 0 : 20,
          borderBottom: `1px solid ${token.colorBorderSecondary}`
        }}
      >
        <span
          className="font-brand select-none"
          style={{ fontSize: 22, lineHeight: 1, color: PALETTE[mode].brand }}
        >
          {collapsed ? 'C' : 'CrafyTask'}
        </span>
      </Flex>
      <nav aria-label="Navegação principal" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <Menu
          mode="inline"
          inlineCollapsed={collapsed}
          selectedKeys={selectedKeys}
          items={mainItems}
          onClick={handleClick}
          style={{ borderInlineEnd: 'none', paddingBlock: 8 }}
        />
      </nav>
      <Menu
        mode="inline"
        inlineCollapsed={collapsed}
        selectedKeys={selectedKeys}
        items={footerItems}
        onClick={handleClick}
        style={{
          flex: 'none',
          borderInlineEnd: 'none',
          borderTop: `1px solid ${token.colorBorderSecondary}`,
          paddingBlock: 8
        }}
      />
    </Flex>
  )
}
