import { Grid } from 'antd'
import type { CSSProperties, ReactNode } from 'react'

export const PAGE_MAX_WIDTH = 1480

type PadBlock = 'both' | 'top' | 'bottom' | 'none'

interface PageContainerProps {
  children: ReactNode
  fullWidth?: boolean
  padBlock?: PadBlock
  style?: CSSProperties
}

export function PageContainer({
  children,
  fullWidth = false,
  padBlock = 'both',
  style
}: PageContainerProps): React.JSX.Element {
  const screens = Grid.useBreakpoint()
  const narrow = screens.md === false
  const top = padBlock === 'both' || padBlock === 'top' ? (narrow ? 12 : 20) : 0
  const bottom = padBlock === 'both' || padBlock === 'bottom' ? (narrow ? 24 : 32) : 0

  return (
    <div
      style={{
        width: '100%',
        maxWidth: fullWidth ? 'none' : PAGE_MAX_WIDTH,
        marginInline: 'auto',
        paddingInline: narrow ? 12 : 24,
        paddingTop: top,
        paddingBottom: bottom,
        ...style
      }}
    >
      {children}
    </div>
  )
}
