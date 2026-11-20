import { Grid, Tooltip, theme } from 'antd'
import { Info, Plug } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  describeIntegration,
  describeMcp,
  type StatusTone,
  type StatusView
} from './integrationStatus'
import { useIntegrationStatus } from './useIntegrationStatus'

function StatusItem({ view, dot = true }: { view: StatusView; dot?: boolean }): React.JSX.Element {
  const { token } = theme.useToken()
  const navigate = useNavigate()
  const colors: Record<StatusTone, string> = {
    ok: token.colorSuccess,
    busy: token.colorInfo,
    error: token.colorError,
    off: token.colorBorder
  }
  const clickable = view.tone === 'error'
  const content = (
    <span
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? () => navigate('/settings') : undefined}
      onKeyDown={
        clickable
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') navigate('/settings')
            }
          : undefined
      }
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        cursor: clickable ? 'pointer' : 'default',
        color: view.tone === 'error' ? token.colorError : undefined
      }}
    >
      {dot && (
        <span
          aria-hidden
          className={
            view.tone === 'busy' ? 'animate-pulse-slow motion-reduce:animate-none' : undefined
          }
          style={{ width: 7, height: 7, borderRadius: 999, background: colors[view.tone] }}
        />
      )}
      {view.text}
    </span>
  )
  return view.tooltip ? <Tooltip title={view.tooltip}>{content}</Tooltip> : content
}

export function StatusBar(): React.JSX.Element {
  const { token } = theme.useToken()
  const location = useLocation()
  const screens = Grid.useBreakpoint()
  const { snapshot, now } = useIntegrationStatus(location.pathname)
  const wide = screens.md !== false

  return (
    <footer
      role="status"
      aria-label="Estado das integrações"
      style={{
        height: 28,
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        paddingInline: 12,
        fontSize: 12,
        color: token.colorTextSecondary,
        background: token.colorBgContainer,
        borderTop: `1px solid ${token.colorBorderSecondary}`,
        overflow: 'hidden',
        whiteSpace: 'nowrap'
      }}
    >
      <StatusItem view={describeIntegration('Notion', snapshot.notion, now)} />
      {wide && <StatusItem view={describeIntegration('Google Calendar', snapshot.google, now)} />}
      {wide && <StatusItem view={describeIntegration('Jira', snapshot.jira, now)} />}
      {wide && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Plug size={12} strokeWidth={1.75} aria-hidden />
          <StatusItem view={describeMcp(snapshot.mcp)} dot={false} />
        </span>
      )}
      {wide && (
        <Tooltip title="Para sair de vez, use Sair no ícone da bandeja.">
          <span
            style={{
              marginInlineStart: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Info size={12} strokeWidth={1.75} aria-hidden />
            Fechar a janela mantém o CrafyTask na bandeja
          </span>
        </Tooltip>
      )}
    </footer>
  )
}
