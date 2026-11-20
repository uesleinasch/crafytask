import type { ReactNode } from 'react'
import { Flex, theme } from 'antd'

export function FloatingActionBar({ children }: { children: ReactNode }): React.JSX.Element {
  const { token } = theme.useToken()
  return (
    <div
      role="region"
      aria-label="Ações em massa"
      style={{ position: 'sticky', bottom: 12, zIndex: 5, marginTop: 12 }}
    >
      <Flex
        wrap="wrap"
        align="center"
        gap={8}
        style={{
          padding: '8px 12px',
          borderRadius: token.borderRadiusLG,
          background: token.colorBgElevated,
          border: `1px solid ${token.colorBorder}`,
          boxShadow: token.boxShadowSecondary
        }}
      >
        {children}
      </Flex>
    </div>
  )
}
