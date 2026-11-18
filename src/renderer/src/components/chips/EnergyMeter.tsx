import { Tooltip, theme } from 'antd'
import type { EnergyLevel } from '@shared/types'
import { ENERGY_BARS, ENERGY_LABELS } from '@renderer/theme/semantic'

interface EnergyMeterProps {
  level: EnergyLevel
  tooltip?: boolean
}

export function EnergyMeter({ level, tooltip = true }: EnergyMeterProps): React.JSX.Element {
  const { token } = theme.useToken()
  const label = `Energia ${ENERGY_LABELS[level].toLowerCase()}`
  const meter = (
    <span
      role="img"
      aria-label={label}
      style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 2, height: 14 }}
    >
      {[1, 2, 3].map((bar) => (
        <span
          key={bar}
          style={{
            width: 4,
            height: 4 + bar * 3,
            borderRadius: 1,
            background: bar <= ENERGY_BARS[level] ? token.colorPrimary : token.colorBorder
          }}
        />
      ))}
    </span>
  )
  return tooltip ? <Tooltip title={label}>{meter}</Tooltip> : meter
}
