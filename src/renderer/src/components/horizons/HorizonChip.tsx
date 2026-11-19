import { theme } from 'antd'
import { HORIZON_COLORS } from '@renderer/theme/semantic'
import { useThemeSettings } from '@renderer/theme/themeSettings'
import type { HorizonLevel } from './horizonLevels'

export function HorizonChip({ h }: { h: HorizonLevel }): React.JSX.Element {
  const { token } = theme.useToken()
  const { mode } = useThemeSettings()
  const { bg, fg } = HORIZON_COLORS[mode][h]
  return (
    <span
      className="ct-hzchip"
      style={{ background: bg, color: fg, fontFamily: token.fontFamilyCode }}
    >
      H{h}
    </span>
  )
}
