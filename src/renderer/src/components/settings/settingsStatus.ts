import type { GcalStatus, HandyStatus, JiraStatus, McpStatus } from '@shared/types'

export type StatusTone = 'on' | 'off' | 'error'

export const STATUS_BADGE: Record<StatusTone, 'success' | 'default' | 'error'> = {
  on: 'success',
  off: 'default',
  error: 'error'
}

export interface StatusInfo {
  tone: StatusTone
  label: string
}

export interface NotionConfig {
  apiKey: string
  pageId?: string
  databaseId?: string
  autoSync: boolean
  lastSync?: string
}

export function notionStatus(config: NotionConfig | null): StatusInfo {
  if (config?.databaseId) return { tone: 'on', label: 'Conectado' }
  if (config?.apiKey) return { tone: 'off', label: 'Incompleto' }
  return { tone: 'off', label: 'Não configurado' }
}

export function gcalStatusInfo(status: GcalStatus | null): StatusInfo {
  return status?.connected
    ? { tone: 'on', label: 'Conectado' }
    : { tone: 'off', label: 'Não conectado' }
}

export function jiraStatusInfo(status: JiraStatus | null): StatusInfo {
  return status?.connected
    ? { tone: 'on', label: 'Conectado' }
    : { tone: 'off', label: 'Não conectado' }
}

export function mcpStatusInfo(status: McpStatus | null): StatusInfo {
  if (!status?.enabled) return { tone: 'off', label: 'Desligado' }
  return status.running ? { tone: 'on', label: 'Rodando' } : { tone: 'error', label: 'Falha' }
}

export function handyStatusInfo(status: HandyStatus | null): StatusInfo {
  if (!status?.installed) return { tone: 'off', label: 'Não instalado' }
  if (!status.enabled) return { tone: 'off', label: 'Desligado' }
  return status.running ? { tone: 'on', label: 'Ligado' } : { tone: 'error', label: 'Parado' }
}

export function errorMessage(error: unknown): string {
  if (!(error instanceof Error)) return 'Erro desconhecido'
  return error.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
}
