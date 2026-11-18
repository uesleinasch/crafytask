import { App } from 'antd'
import { useEffect } from 'react'
import { toast } from '@renderer/components/ui/sonner'
import { notifySyncError, notifySyncStart, notifySyncSuccess } from '@renderer/lib/syncEvents'
import { useTimerStore } from '@renderer/stores/timerStore'

export function useShellEvents(): void {
  const { message } = App.useApp()

  useEffect(() => {
    const handleSyncStart = (_: unknown, taskName?: string): void => notifySyncStart(taskName)
    const handleSyncSuccess = (_: unknown, taskName?: string): void => notifySyncSuccess(taskName)
    const handleSyncError = (_: unknown, error?: string): void => notifySyncError(error)

    window.api.onSyncStart?.(handleSyncStart)
    window.api.onSyncSuccess?.(handleSyncSuccess)
    window.api.onSyncError?.(handleSyncError)

    return () => {
      window.api.offSyncStart?.(handleSyncStart)
      window.api.offSyncSuccess?.(handleSyncSuccess)
      window.api.offSyncError?.(handleSyncError)
    }
  }, [])

  useEffect(
    () =>
      window.api.onJiraSync((status, detail) => {
        if (status === 'syncing') notifySyncStart(detail, 'Jira')
        else if (status === 'success') notifySyncSuccess(detail, 'Jira')
        else notifySyncError(`Jira: ${detail ?? 'erro na importação'}`)
      }),
    []
  )

  useEffect(
    () =>
      window.api.onGcalSync((status, detail) => {
        if (status === 'syncing') notifySyncStart(detail, 'Google Calendar')
        else if (status === 'success') notifySyncSuccess(detail, 'Google Calendar')
        else notifySyncError(`Google Calendar: ${detail ?? 'erro na sincronização'}`)
      }),
    []
  )

  useEffect(
    () =>
      window.api.onTimerStopped((taskId) => {
        useTimerStore.getState().removeTimer(taskId)
      }),
    []
  )

  useEffect(
    () =>
      window.api.onTaskUnblocked((_taskId, taskName) => {
        toast.success(`"${taskName}" foi desbloqueada!`, { description: 'Dependência concluída.' })
      }),
    []
  )

  useEffect(
    () =>
      window.api.onRendererRecovered(() => {
        message.warning('A janela travou e foi recarregada. Seus dados estão salvos.')
      }),
    [message]
  )
}
