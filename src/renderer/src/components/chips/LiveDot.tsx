import { theme } from 'antd'

export function LiveDot({ label }: { label?: string }): React.JSX.Element {
  const { token } = theme.useToken()
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className="ct-live"
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        flex: 'none',
        borderRadius: 999,
        background: token.colorSuccess
      }}
    />
  )
}
