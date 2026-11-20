export function Kbd({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <kbd className="ct-kbd">{children}</kbd>
}

export function KeyCombo({ keys }: { keys: string[] }): React.JSX.Element {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
      {keys.map((key, i) => (
        <Kbd key={`${key}-${i}`}>{key}</Kbd>
      ))}
    </span>
  )
}
