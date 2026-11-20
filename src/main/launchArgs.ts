export const HIDDEN_FLAG = '--hidden'

export function shouldStartHidden(argv: readonly string[]): boolean {
  return argv.includes(HIDDEN_FLAG)
}

export const QUICK_CAPTURE_FLAG = '--quick-capture'

export function wantsQuickCapture(argv: readonly string[]): boolean {
  return argv.includes(QUICK_CAPTURE_FLAG)
}
