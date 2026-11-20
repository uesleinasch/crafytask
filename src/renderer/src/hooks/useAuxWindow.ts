import { useEffect } from 'react'

export function useAuxWindow(): void {
  useEffect(() => {
    document.body.classList.add('aux-window')
    return () => document.body.classList.remove('aux-window')
  }, [])
}
