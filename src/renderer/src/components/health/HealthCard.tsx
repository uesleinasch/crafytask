import {
  CalendarX,
  ChevronRight,
  CircleArrowRight,
  CircleCheck,
  CirclePause,
  ClipboardCheck,
  Clock,
  Hourglass,
  Inbox,
  Lightbulb,
  type LucideIcon
} from 'lucide-react'
import { CATEGORY_COLORS, STATUS_COLORS, type ChipColors } from '@renderer/theme/semantic'
import { useThemeSettings } from '@renderer/theme/themeSettings'
import type { ThemeMode } from '@renderer/theme/tokens'
import type { HealthItem, HealthKey, HealthTone } from './healthItems'

const ICONS: Record<HealthKey, LucideIcon> = {
  inbox: Inbox,
  nonext: CircleArrowRight,
  stalled: CirclePause,
  waiting: Hourglass,
  next: Clock,
  overdue: CalendarX,
  someday: Lightbulb,
  review: ClipboardCheck
}

function toneColors(tone: HealthTone, mode: ThemeMode): ChipColors {
  switch (tone) {
    case 'ok':
      return STATUS_COLORS.executando[mode]
    case 'warning':
      return STATUS_COLORS.aguardando[mode]
    case 'error':
      return CATEGORY_COLORS.urgente[mode]
    case 'neutral':
      return STATUS_COLORS.inbox[mode]
  }
}

interface HealthCardProps {
  item: HealthItem
  onOpen?: () => void
  openLabel?: string
}

export function HealthCard({ item, onOpen, openLabel }: HealthCardProps): React.JSX.Element {
  const { mode } = useThemeSettings()
  const { fg, bg } = toneColors(item.tone, mode)
  const Icon = item.tone === 'ok' ? CircleCheck : ICONS[item.key]
  const body = (
    <>
      <span className="ct-health-icon" style={{ color: fg, background: bg }}>
        <Icon size={18} strokeWidth={1.75} aria-hidden />
      </span>
      <span style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span style={{ fontWeight: 500 }}>{item.title}</span>
        <span style={{ fontSize: 12, color: 'var(--ant-color-text-tertiary)' }}>{item.text}</span>
      </span>
      <span className="ct-health-val">{item.valueText}</span>
    </>
  )
  if (!onOpen) return <div className="ct-health">{body}</div>
  return (
    <button
      type="button"
      className="ct-health"
      onClick={onOpen}
      aria-label={`${item.title}: ${item.valueText}. ${item.text}.${openLabel ? ` ${openLabel}` : ''}`}
    >
      {body}
      <ChevronRight
        size={14}
        strokeWidth={1.75}
        aria-hidden
        style={{ color: 'var(--ant-color-text-tertiary)' }}
      />
    </button>
  )
}

export function HealthGrid({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <div className="ct-health-grid">{children}</div>
}
