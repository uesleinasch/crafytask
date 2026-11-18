import { Layout, theme } from 'antd'
import { Outlet, useLocation } from 'react-router-dom'
import { FloatingTimer } from '@renderer/components/FloatingTimer'
import { SyncNotification } from '@renderer/components/SyncNotification'
import { Toaster } from '@renderer/components/ui/sonner'
import { TerminalPanel } from '@renderer/components/terminal/TerminalPanel'
import { usePersistedState } from '@renderer/hooks/usePersistedState'
import { RegionBoundary } from './RegionBoundary'
import { ShellHeader } from './ShellHeader'
import { SiderNav } from './SiderNav'
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
  useShellEvents()

  return (
    <Layout hasSider style={{ height: '100vh' }}>
      <Sider
        width={SIDER_WIDTH}
        collapsedWidth={SIDER_COLLAPSED_WIDTH}
        collapsible
        collapsed={collapsed}
        trigger={null}
        theme="light"
        style={{ borderInlineEnd: `1px solid ${token.colorBorderSecondary}` }}
      >
        <RegionBoundary region="navegação">
          <SiderNav collapsed={collapsed} onToggleCollapsed={() => setCollapsed(!collapsed)} />
        </RegionBoundary>
      </Sider>
      <Layout style={{ minWidth: 0 }}>
        <Header
          style={{ borderBottom: `1px solid ${token.colorBorderSecondary}`, lineHeight: 'normal' }}
        >
          <RegionBoundary region="barra superior">
            <ShellHeader />
          </RegionBoundary>
        </Header>
        <Content style={{ minHeight: 0, overflow: 'hidden' }}>
          <RegionBoundary
            region={screenTitle(location.pathname)}
            resetKeys={[regionResetKey(location.pathname, location.search)]}
          >
            <Outlet />
          </RegionBoundary>
        </Content>
        <TerminalPanel />
      </Layout>
      {location.pathname === '/' && <FloatingTimer />}
      <SyncNotification />
      <Toaster position="bottom-right" />
    </Layout>
  )
}
