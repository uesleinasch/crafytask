import { useState, type ReactNode } from 'react'
import { Button, Card, Empty, Flex, Table, Tooltip, theme } from 'antd'
import type { TableColumnsType } from 'antd'
import { ChartColumn, Table2, type LucideIcon } from 'lucide-react'
import { RegionBoundary } from '@renderer/components/shell/RegionBoundary'

const ICON = { size: 16, strokeWidth: 1.75, 'aria-hidden': true } as const

export interface ChartTable<T> {
  columns: TableColumnsType<T>
  data: T[]
  rowKey: keyof T & string
}

interface ChartCardProps<T> {
  title: string
  icon: LucideIcon
  extra?: ReactNode
  table?: ChartTable<T>
  empty?: string | null
  children: ReactNode
}

export function ChartCard<T extends object>({
  title,
  icon: Icon,
  extra,
  table,
  empty,
  children
}: ChartCardProps<T>): React.JSX.Element {
  const { token } = theme.useToken()
  const [asTable, setAsTable] = useState(false)
  const toggleLabel = asTable ? 'Ver gráfico' : 'Ver como tabela'

  return (
    <Card
      size="small"
      style={{ height: '100%' }}
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Icon {...ICON} color={token.colorTextTertiary} />
          {title}
        </span>
      }
      extra={
        <Flex align="center" gap={4}>
          {extra}
          {table && (
            <Tooltip title={toggleLabel}>
              <Button
                size="small"
                type="text"
                aria-pressed={asTable}
                aria-label={toggleLabel}
                icon={asTable ? <ChartColumn {...ICON} /> : <Table2 {...ICON} />}
                onClick={() => setAsTable(!asTable)}
              />
            </Tooltip>
          )}
        </Flex>
      }
    >
      <RegionBoundary region={`gráfico ${title}`} resetKeys={[asTable]}>
        {empty ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={empty} />
        ) : asTable && table ? (
          <Table<T>
            size="small"
            rowKey={table.rowKey}
            pagination={false}
            columns={table.columns}
            dataSource={table.data}
            scroll={{ x: 'max-content' }}
          />
        ) : (
          children
        )}
      </RegionBoundary>
    </Card>
  )
}
