import type { ReactNode } from 'react'
import { Badge, Card, Flex, Tag, Typography, theme } from 'antd'
import type { LucideIcon } from 'lucide-react'
import { STATUS_BADGE, type StatusInfo } from './settingsStatus'

export function SettingsCard({
  title,
  extra,
  children
}: {
  title: ReactNode
  extra?: ReactNode
  children: ReactNode
}): React.JSX.Element {
  return (
    <Card size="small" title={title} extra={extra} styles={{ body: { padding: '4px 16px' } }}>
      {children}
    </Card>
  )
}

export function SettingRow({
  title,
  description,
  vertical = false,
  children
}: {
  title: ReactNode
  description?: ReactNode
  vertical?: boolean
  children?: ReactNode
}): React.JSX.Element {
  return (
    <div className={vertical ? 'ct-setrow vertical' : 'ct-setrow'}>
      <div style={{ minWidth: 0, flex: '1 1 260px' }}>
        <Typography.Text strong style={{ fontWeight: 500 }}>
          {title}
        </Typography.Text>
        {description && (
          <Typography.Text
            type="secondary"
            style={{ fontSize: 13, display: 'block', marginTop: 2 }}
          >
            {description}
          </Typography.Text>
        )}
      </div>
      {children !== undefined && (
        <div style={{ flex: vertical ? '1 1 100%' : 'none', maxWidth: '100%' }}>{children}</div>
      )}
    </div>
  )
}

export function SettingsHeader({
  icon: Icon,
  title,
  description,
  status
}: {
  icon: LucideIcon
  title: string
  description: string
  status?: StatusInfo
}): React.JSX.Element {
  const { token } = theme.useToken()
  return (
    <Flex align="start" gap={12} style={{ marginBottom: 16 }}>
      <div
        className="ct-set-icon"
        style={{ color: token.colorPrimary, background: token.colorPrimaryBg }}
      >
        <Icon size={18} strokeWidth={1.75} aria-hidden />
      </div>
      <div style={{ minWidth: 0 }}>
        <Flex align="center" gap={8} wrap>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {title}
          </Typography.Title>
          {status && (
            <Tag bordered={false} style={{ margin: 0 }}>
              <Badge status={STATUS_BADGE[status.tone]} /> {status.label}
            </Tag>
          )}
        </Flex>
        <Typography.Text type="secondary">{description}</Typography.Text>
      </div>
    </Flex>
  )
}
