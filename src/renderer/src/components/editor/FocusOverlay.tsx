import { useEffect, type CSSProperties, type ReactNode } from 'react'
import { theme } from 'antd'

interface FocusOverlayProps {
  open: boolean
  onExit: () => void
  label: string
  bar: ReactNode
  header?: ReactNode
  style?: CSSProperties
  children: ReactNode
}

export const FOCUS_BAR_HEIGHT = 48

export function FocusOverlay({
  open,
  onExit,
  label,
  bar,
  header,
  style,
  children
}: FocusOverlayProps): React.JSX.Element {
  const { token } = theme.useToken()

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      // suggestionPopup.ts não faz preventDefault: com o menu de / ou @ aberto, o Esc é dele
      if (document.querySelector('[data-suggestion-popup]')) return
      onExit()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onExit])

  return (
    <div
      role={open ? 'dialog' : undefined}
      aria-modal={open ? true : undefined}
      aria-label={open ? label : undefined}
      style={
        open
          ? {
              position: 'fixed',
              inset: 0,
              zIndex: token.zIndexPopupBase,
              display: 'flex',
              flexDirection: 'column',
              background: token.colorBgContainer,
              color: token.colorText
            }
          : { display: 'flex', flexDirection: 'column', minWidth: 0, ...style }
      }
    >
      {open ? (
        <div
          style={{
            height: FOCUS_BAR_HEIGHT,
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            paddingInline: 12,
            minWidth: 0,
            borderBottom: `1px solid ${token.colorBorderSecondary}`
          }}
        >
          {bar}
        </div>
      ) : (
        header
      )}
      {children}
    </div>
  )
}
