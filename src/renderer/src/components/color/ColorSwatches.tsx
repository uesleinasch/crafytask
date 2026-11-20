import { Flex, theme } from 'antd'
import { USER_COLORS, userColorName } from '@renderer/theme/semantic'

interface ColorSwatchesProps {
  value: string
  onChange: (color: string) => void
  size?: number
}

function sameColor(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase()
}

export function ColorSwatches({
  value,
  onChange,
  size = 26
}: ColorSwatchesProps): React.JSX.Element {
  const { token } = theme.useToken()
  const known = !value || USER_COLORS.some((color) => sameColor(color, value))
  const colors: string[] = known ? [...USER_COLORS] : [...USER_COLORS, value]

  return (
    <Flex gap={8} wrap role="radiogroup" aria-label="Cor">
      {colors.map((color) => {
        const on = !!value && sameColor(color, value)
        const name = userColorName(color)
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={`Cor ${name}`}
            title={name}
            onClick={() => onChange(color)}
            style={{
              width: size,
              height: size,
              borderRadius: '50%',
              background: color,
              border: 'none',
              cursor: 'pointer',
              boxShadow: on
                ? `0 0 0 2px ${token.colorBgElevated}, 0 0 0 4px ${token.colorText}`
                : 'none'
            }}
          />
        )
      })}
    </Flex>
  )
}
