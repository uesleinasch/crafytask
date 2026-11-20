import { cn } from '@renderer/lib/utils'

export function Switch({
  checked,
  onChange,
  disabled,
  label
}: {
  checked: boolean
  onChange: () => void
  disabled?: boolean
  label: string
}): React.JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50',
        checked ? 'bg-emerald-500' : 'bg-slate-300'
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  )
}

export function ToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled
}: {
  title: string
  description: React.ReactNode
  checked: boolean
  onChange: () => void
  disabled?: boolean
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 rounded-sm border border-slate-200">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-700">{title}</p>
        <div className="text-xs text-slate-500 mt-0.5">{description}</div>
      </div>
      <Switch checked={checked} onChange={onChange} disabled={disabled} label={title} />
    </div>
  )
}

export function OutLink({
  href,
  children
}: {
  href: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 hover:underline font-medium"
    >
      {children} ↗
    </a>
  )
}

export function Callout({
  tone,
  children
}: {
  tone: 'warn' | 'info'
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'mt-2 rounded-lg border px-3 py-2 text-xs',
        tone === 'warn'
          ? 'bg-amber-50 border-amber-200 text-amber-800'
          : 'bg-blue-50 border-blue-200 text-blue-800'
      )}
    >
      {children}
    </div>
  )
}
