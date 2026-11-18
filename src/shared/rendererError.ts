export interface RendererErrorReport {
  kind: 'caught' | 'uncaught'
  region?: string
  message: string
  stack?: string
  componentStack?: string
}
