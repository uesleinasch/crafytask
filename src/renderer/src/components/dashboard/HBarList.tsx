import type { ReactNode } from 'react'
import { Tooltip, theme } from 'antd'
import { CHART_COLORS } from '@renderer/theme/semantic'
import { useThemeSettings } from '@renderer/theme/themeSettings'

export interface HBarRow {
  key: string
  label: string
  lead: ReactNode
  value: number
  valueText: string
  shareText: string
  ariaValue?: string
  open?: () => void
  tooltip?: ReactNode
}

interface HBarListProps {
  rows: HBarRow[]
  onOpen?: (row: HBarRow) => void
}

export function HBarList({ rows, onOpen }: HBarListProps): React.JSX.Element {
  const { token } = theme.useToken()
  const { mode } = useThemeSettings()
  const max = Math.max(1, ...rows.map((row) => row.value))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {rows.map((row) => (
        <Tooltip
          key={row.key}
          trigger={['hover', 'focus']}
          placement="topLeft"
          title={
            row.tooltip ?? (
              <span>
                <b style={{ fontFamily: token.fontFamilyCode, fontVariantNumeric: 'tabular-nums' }}>
                  {row.valueText}
                </b>{' '}
                · {row.shareText} do total
              </span>
            )
          }
        >
          <button
            type="button"
            className="ct-hbar"
            disabled={!row.open && !onOpen}
            onClick={row.open ?? (onOpen ? () => onOpen(row) : undefined)}
            aria-label={`${row.label}: ${row.ariaValue ?? row.valueText}, ${row.shareText}`}
          >
            <span className="ct-hbar-name">{row.lead}</span>
            <span className="ct-hbar-track">
              <span
                className="ct-hbar-fill"
                style={{
                  width: `${(row.value / max) * 100}%`,
                  background: CHART_COLORS[mode].single
                }}
              />
            </span>
            <span className="ct-hbar-val">
              {row.valueText}
              <span style={{ color: token.colorTextTertiary, marginLeft: 6 }}>{row.shareText}</span>
            </span>
          </button>
        </Tooltip>
      ))}
    </div>
  )
}
