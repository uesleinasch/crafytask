import { dialog, type BrowserWindow } from 'electron'
import { recentReloads, shouldReloadRenderer } from './rendererRecovery'

export function guardRenderer(window: BrowserWindow, label: string): void {
  let reloads: number[] = []
  let notifyOnLoad = false
  const contents = window.webContents

  contents.on('render-process-gone', (_, details) => {
    console.error(
      `[renderer:${label}] processo encerrado (${details.reason}, código ${details.exitCode})`
    )
    const now = Date.now()
    if (window.isDestroyed() || !shouldReloadRenderer(details.reason, reloads, now)) return
    reloads = [...recentReloads(reloads, now), now]
    notifyOnLoad = true
    contents.reload()
  })

  contents.on('did-finish-load', () => {
    if (!notifyOnLoad) return
    notifyOnLoad = false
    contents.send('app:rendererRecovered')
  })

  window.on('unresponsive', async () => {
    console.error(`[renderer:${label}] parou de responder`)
    const { response } = await dialog.showMessageBox(window, {
      type: 'warning',
      title: 'CrafyTask',
      message: 'A janela parou de responder.',
      detail: 'Você pode esperar ou recarregar. Seus dados estão salvos no banco local.',
      buttons: ['Esperar', 'Recarregar'],
      defaultId: 0,
      cancelId: 0
    })
    if (response === 1 && !window.isDestroyed()) contents.forcefullyCrashRenderer()
  })
}
