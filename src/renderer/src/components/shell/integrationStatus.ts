export type SyncPhase = 'idle' | 'syncing' | 'success' | 'error'
export type StatusTone = 'ok' | 'busy' | 'error' | 'off'

export interface IntegrationState {
  configured: boolean
  phase: SyncPhase
  detail?: string
  at?: number
}

export interface StatusView {
  tone: StatusTone
  text: string
  tooltip?: string
}

export function relativeTime(at: number, now: number): string {
  const minutes = Math.floor((now - at) / 60_000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours} h`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'há 1 dia' : `há ${days} dias`
}

export function describeIntegration(
  name: string,
  state: IntegrationState,
  now: number
): StatusView {
  if (state.phase === 'syncing') {
    return { tone: 'busy', text: `${name} sincronizando…`, tooltip: state.detail }
  }
  if (state.phase === 'error') {
    return {
      tone: 'error',
      text: `${name} com erro`,
      tooltip: `${state.detail ?? 'Erro na sincronização'}. Clique para abrir as Configurações.`
    }
  }
  if (!state.configured) return { tone: 'off', text: `${name} não conectado` }
  if (state.at === undefined) return { tone: 'ok', text: `${name} conectado` }
  return {
    tone: 'ok',
    text: `${name} sincronizado ${relativeTime(state.at, now)}`,
    tooltip: state.detail
  }
}

export interface McpView {
  enabled: boolean
  running: boolean
  port: number
}

export function describeMcp(mcp: McpView | null): StatusView {
  if (!mcp || !mcp.enabled) return { tone: 'off', text: 'MCP desligado' }
  if (!mcp.running) {
    return {
      tone: 'error',
      text: 'MCP parado',
      tooltip: 'O servidor MCP está ligado mas não subiu. Clique para abrir as Configurações.'
    }
  }
  return { tone: 'ok', text: `MCP em 127.0.0.1:${mcp.port}` }
}

export function applySyncEvent(
  state: IntegrationState,
  status: 'syncing' | 'success' | 'error',
  detail: string | undefined,
  now: number
): IntegrationState {
  if (status === 'syncing') return { ...state, phase: 'syncing', detail }
  if (status === 'success') return { configured: true, phase: 'success', detail, at: now }
  return { ...state, phase: 'error', detail }
}
