import { Fragment } from 'react'

export function Kbd({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <kbd className="ct-kbd">{children}</kbd>
}

export function KeyCombo({ keys, label }: { keys: string[]; label?: string }): React.JSX.Element {
  return (
    <span
      aria-label={label ?? keys.join(' + ')}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}
    >
      {keys.map((key, i) => (
        <Fragment key={`${key}-${i}`}>
          <Kbd>{key}</Kbd>
        </Fragment>
      ))}
    </span>
  )
}
