import type { ReactNode } from 'react'
import { Flex, theme } from 'antd'
import type { LucideIcon } from 'lucide-react'

interface SectionHeaderProps {
  title: string
  icon?: LucideIcon
  extra?: ReactNode
}

export function SectionHeader({ title, icon: Icon, extra }: SectionHeaderProps): React.JSX.Element {
  const { token } = theme.useToken()
  return (
    <Flex align="center" gap={8}>
      {Icon && <Icon size={13} strokeWidth={1.75} aria-hidden color={token.colorTextTertiary} />}
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '.08em',
          textTransform: 'uppercase',
          color: token.colorTextTertiary
        }}
      >
        {title}
      </span>
      <span style={{ flex: 1, height: 1, background: token.colorBorderSecondary }} />
      {extra !== undefined && extra !== null && (
        <span
          style={{
            fontSize: 12,
            fontFamily: token.fontFamilyCode,
            fontVariantNumeric: 'tabular-nums',
            color: token.colorTextSecondary
          }}
        >
          {extra}
        </span>
      )}
    </Flex>
  )
}

export function Section({
  children,
  ...header
}: SectionHeaderProps & { children: ReactNode }): React.JSX.Element {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SectionHeader {...header} />
      {children}
    </section>
  )
}
