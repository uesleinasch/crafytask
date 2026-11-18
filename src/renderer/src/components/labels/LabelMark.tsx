import { theme } from 'antd'
import { userColorTint } from '@renderer/theme/semantic'
import type { LabelKind } from './labels'

interface LabelMarkProps {
  kind: LabelKind
  color: string
  icon: string | null
  size?: number
}

export function LabelMark({ kind, color, icon, size = 40 }: LabelMarkProps): React.JSX.Element {
  const { token } = theme.useToken()
  const isContext = kind === 'context'
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        flex: 'none',
        display: 'grid',
        placeItems: 'center',
        borderRadius: token.borderRadius,
        background: (isContext && userColorTint(color)) || token.colorBgLayout,
        fontSize: Math.round(size / 2)
      }}
    >
      {isContext ? (
        icon
      ) : (
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: color }} />
      )}
    </span>
  )
}
