import { useCallback, useEffect, useState } from 'react'
import { applySyncEvent, type IntegrationState, type McpView } from './integrationStatus'

export interface IntegrationsSnapshot {
  notion: IntegrationState
  google: IntegrationState
  jira: IntegrationState
  mcp: McpView | null
}

const IDLE: IntegrationState = { configured: false, phase: 'idle' }
const NOW_TICK_MS = 30_000

function parseTime(value?: string): number | undefined {
  if (!value) return undefined
  const time = Date.parse(value)
  return Number.isNaN(time) ? undefined : time
}

function quiet<T>(promise: Promise<T>): Promise<T | null> {
  return promise.catch((error) => {
    console.error('Falha ao ler o estado de uma integração:', error)
    return null
  })
}

export function useIntegrationStatus(pathname: string): {
  snapshot: IntegrationsSnapshot
  now: number
} {
  const [snapshot, setSnapshot] = useState<IntegrationsSnapshot>({
    notion: IDLE,
    google: IDLE,
    jira: IDLE,
    mcp: null
  })
  const [now, setNow] = useState(() => Date.now())

  const load = useCallback(async (): Promise<void> => {
    const [notion, google, jira, mcp] = await Promise.all([
      quiet(window.api.notionGetConfig()),
      quiet(window.api.gcalGetStatus()),
      quiet(window.api.jiraGetStatus()),
      quiet(window.api.mcpGetStatus())
    ])
    setSnapshot((prev) => ({
      notion: {
        ...prev.notion,
        configured: !!notion?.apiKey,
        at: prev.notion.at ?? parseTime(notion?.lastSync)
      },
      google: { ...prev.google, configured: !!google?.connected },
      jira: { ...prev.jira, configured: !!jira?.connected },
      mcp: mcp ? { enabled: mcp.enabled, running: mcp.running, port: mcp.port } : null
    }))
  }, [])

  useEffect(() => {
    void load()
  }, [load, pathname])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), NOW_TICK_MS)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const update = (
      key: 'notion' | 'google' | 'jira',
      status: 'syncing' | 'success' | 'error',
      detail?: string
    ): void => {
      const at = Date.now()
      setNow(at)
      setSnapshot((prev) => ({ ...prev, [key]: applySyncEvent(prev[key], status, detail, at) }))
    }

    const onStart = (_: unknown, taskName?: string): void => update('notion', 'syncing', taskName)
    const onSuccess = (_: unknown, taskName?: string): void => update('notion', 'success', taskName)
    const onError = (_: unknown, error?: string): void => update('notion', 'error', error)
    window.api.onSyncStart?.(onStart)
    window.api.onSyncSuccess?.(onSuccess)
    window.api.onSyncError?.(onError)
    const offJira = window.api.onJiraSync((status, detail) => update('jira', status, detail))
    const offGoogle = window.api.onGcalSync((status, detail) => update('google', status, detail))

    return () => {
      window.api.offSyncStart?.(onStart)
      window.api.offSyncSuccess?.(onSuccess)
      window.api.offSyncError?.(onError)
      offJira()
      offGoogle()
    }
  }, [])

  return { snapshot, now }
}
