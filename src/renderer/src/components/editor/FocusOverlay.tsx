import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
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

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [contenteditable="true"], [tabindex]:not([tabindex="-1"])'

function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement
  )
}

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
  const rootRef = useRef<HTMLDivElement>(null)
  const onExitRef = useRef(onExit)
  onExitRef.current = onExit

  useEffect(() => {
    if (!open) return
    const root = rootRef.current
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    root?.focus()

    const onKeyDown = (event: KeyboardEvent): void => {
      if (!root) return
      if (event.key === 'Tab') {
        const items = focusables(root)
        if (items.length === 0) return
        const first = items[0]
        const last = items[items.length - 1]
        const active = document.activeElement
        if (!root.contains(active)) {
          event.preventDefault()
          first.focus()
        } else if (event.shiftKey && active === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && active === last) {
          event.preventDefault()
          first.focus()
        }
        return
      }
      if (event.key !== 'Escape' || event.defaultPrevented) return
      // suggestionPopup.ts não faz preventDefault: com o menu de / ou @ aberto, o Esc é dele
      if (document.querySelector('[data-suggestion-popup]')) return
      onExitRef.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      requestAnimationFrame(() => {
        const target = opener?.isConnected
          ? opener
          : root?.querySelector<HTMLElement>('[data-focus-opener]')
        target?.focus()
      })
    }
  }, [open])

  return (
    <div
      ref={rootRef}
      tabIndex={open ? -1 : undefined}
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
              outline: 'none',
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
            paddingLeft: 'max(12px, env(safe-area-inset-left, 0px))',
            paddingRight: 'max(12px, env(safe-area-inset-right, 0px))',
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
