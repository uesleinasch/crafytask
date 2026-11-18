import type { RendererErrorReport } from '@shared/rendererError'

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message || error.name
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error) ?? String(error)
  } catch {
    return String(error)
  }
}

export function toErrorReport(
  kind: RendererErrorReport['kind'],
  error: unknown,
  componentStack?: string | null,
  region?: string
): RendererErrorReport {
  return {
    kind,
    region,
    message: errorMessage(error),
    stack: error instanceof Error ? error.stack : undefined,
    componentStack: componentStack ?? undefined
  }
}

export function formatErrorDetails(region: string, error: unknown, when: Date): string {
  const lines = [
    `Região: ${region}`,
    `Quando: ${when.toISOString()}`,
    `Erro: ${errorMessage(error)}`
  ]
  if (error instanceof Error && error.stack) lines.push('', error.stack)
  return lines.join('\n')
}

export function regionResetKey(pathname: string, search: string): string {
  return `${pathname}${search}`
}
