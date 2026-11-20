import { Flex, theme } from 'antd'
import { useRef } from 'react'
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
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const selected = colors.findIndex((color) => !!value && sameColor(color, value))
  const tabStop = selected < 0 ? 0 : selected

  const onKeyDown = (event: React.KeyboardEvent, index: number): void => {
    const last = colors.length - 1
    const next =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? index === last
          ? 0
          : index + 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? index === 0
            ? last
            : index - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null
    if (next === null) return
    event.preventDefault()
    onChange(colors[next])
    buttons.current[next]?.focus()
  }

  return (
    <Flex gap={8} wrap role="radiogroup" aria-label="Cor">
      {colors.map((color, index) => {
        const on = !!value && sameColor(color, value)
        const name = userColorName(color)
        return (
          <button
            key={color}
            ref={(element) => {
              buttons.current[index] = element
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={index === tabStop ? 0 : -1}
            onKeyDown={(event) => onKeyDown(event, index)}
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
