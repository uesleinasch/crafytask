import { App } from 'antd'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTimerStore } from '@renderer/stores/timerStore'

export function useShellEvents(): void {
  const { message } = App.useApp()
  const navigate = useNavigate()

  useEffect(() => window.api.onNavigate((path) => navigate(path)), [navigate])

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
        message.success(`"${taskName}" foi desbloqueada: dependência concluída.`)
      }),
    [message]
  )

  useEffect(
    () =>
      window.api.onRendererRecovered(() => {
        message.warning('A janela travou e foi recarregada. Seus dados estão salvos.')
      }),
    [message]
  )
}
