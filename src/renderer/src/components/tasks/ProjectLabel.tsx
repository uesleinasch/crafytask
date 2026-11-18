import { Flex, Typography, theme } from 'antd'

interface ProjectLabelProps {
  name: string
  color?: string | null
}

export function ProjectLabel({ name, color }: ProjectLabelProps): React.JSX.Element {
  const { token } = theme.useToken()
  return (
    <Flex align="center" gap={6} style={{ minWidth: 0 }}>
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          flex: 'none',
          background: color || token.colorBorder
        }}
      />
      <Typography.Text ellipsis style={{ minWidth: 0 }}>
        {name}
      </Typography.Text>
    </Flex>
  )
}
