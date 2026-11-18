import { Drawer, Grid, Layout, theme } from 'antd'
import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Toaster } from '@renderer/components/ui/sonner'
import { TerminalPanel } from '@renderer/components/terminal/TerminalPanel'
import { usePersistedState } from '@renderer/hooks/usePersistedState'
import { CommandPalette } from './CommandPalette'
import { RegionBoundary } from './RegionBoundary'
import { SimulatedCrash } from './SimulatedCrash'
import { ShellHeader } from './ShellHeader'
import { SiderNav } from './SiderNav'
import { StatusBar } from './StatusBar'
import { screenTitle } from './navigation'
import { regionResetKey } from './regionError'
import { useShellEvents } from './useShellEvents'

const { Sider, Header, Content } = Layout

export const SIDER_WIDTH = 232
export const SIDER_COLLAPSED_WIDTH = 64

export function AppShell(): React.JSX.Element {
  const location = useLocation()
  const { token } = theme.useToken()
  const [collapsed, setCollapsed] = usePersistedState('ticktask:siderCollapsed', false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const screens = Grid.useBreakpoint()
  const drawerMode = screens.md === false
  const forceCollapsed = screens.lg === false
  useShellEvents()

  useEffect(() => {
    if (!drawerMode) setDrawerOpen(false)
  }, [drawerMode])

  return (
    <Layout hasSider data-popup-root style={{ height: '100vh' }}>
      {drawerMode ? (
        <Drawer
          placement="left"
          size={SIDER_WIDTH}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          closable={false}
          styles={{ body: { padding: 0 } }}
        >
          <RegionBoundary region="navegação">
            <SiderNav collapsed={false} onNavigate={() => setDrawerOpen(false)} />
          </RegionBoundary>
        </Drawer>
      ) : (
        <Sider
          width={SIDER_WIDTH}
          collapsedWidth={SIDER_COLLAPSED_WIDTH}
          collapsible
          collapsed={forceCollapsed || collapsed}
          trigger={null}
          theme="light"
          style={{ borderInlineEnd: `1px solid ${token.colorBorderSecondary}` }}
        >
          <RegionBoundary region="navegação">
            <SiderNav
              collapsed={forceCollapsed || collapsed}
              onToggleCollapsed={forceCollapsed ? undefined : () => setCollapsed(!collapsed)}
            />
          </RegionBoundary>
        </Sider>
      )}
      <Layout style={{ minWidth: 0 }}>
        <Header
          style={{ borderBottom: `1px solid ${token.colorBorderSecondary}`, lineHeight: 'normal' }}
        >
          <RegionBoundary region="barra superior">
            <ShellHeader onOpenMenu={drawerMode ? () => setDrawerOpen(true) : undefined} />
          </RegionBoundary>
        </Header>
        <Content style={{ minHeight: 0, overflow: 'hidden' }}>
          <RegionBoundary
            region={screenTitle(location.pathname)}
            resetKeys={[regionResetKey(location.pathname, location.search)]}
          >
            {import.meta.env.DEV && <SimulatedCrash />}
            <Outlet />
          </RegionBoundary>
        </Content>
        <TerminalPanel />
        <StatusBar />
      </Layout>
      <CommandPalette />
      <Toaster position="bottom-right" />
    </Layout>
  )
}
