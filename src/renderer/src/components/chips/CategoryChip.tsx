import { theme } from 'antd'
import { CATEGORY_LABELS, type TaskCategory } from '@shared/types'
import { CATEGORY_COLORS } from '@renderer/theme/semantic'
import { useThemeSettings } from '@renderer/theme/themeSettings'
import { CATEGORY_ICONS } from './categoryMeta'
import { chipStyle } from './chipStyle'

export function CategoryChip({ category }: { category: TaskCategory }): React.JSX.Element {
  const { token } = theme.useToken()
  const { mode } = useThemeSettings()

  if (category === 'normal') {
    return (
      <span
        style={chipStyle(
          token.colorTextSecondary,
          'transparent',
          token.colorBorderSecondary,
          token.borderRadiusSM
        )}
      >
        {CATEGORY_LABELS.normal}
      </span>
    )
  }

  const { fg, bg } = CATEGORY_COLORS[category][mode]
  const Icon = CATEGORY_ICONS[category]
  return (
    <span style={chipStyle(fg, bg, 'transparent', token.borderRadiusSM)}>
      <Icon size={13} strokeWidth={2} aria-hidden />
      {CATEGORY_LABELS[category]}
    </span>
  )
}
