import { useEffect, useState } from 'react'
import { onSimulatedCrash } from './paletteCommands'

export function SimulatedCrash(): null {
  const [crashed, setCrashed] = useState(false)
  useEffect(() => onSimulatedCrash(() => setCrashed(true)), [])
  if (crashed) throw new Error('Falha simulada pela paleta de comandos')
  return null
}
