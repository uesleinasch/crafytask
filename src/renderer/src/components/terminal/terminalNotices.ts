import type { App } from 'antd'

type Notifier = ReturnType<typeof App.useApp>['notification']

let notifier: Notifier | null = null

export function registerTerminalNotifier(next: Notifier | null): void {
  notifier = next
}

export function terminalNotice(kind: 'error' | 'warning', title: string): void {
  if (notifier) notifier[kind]({ title, placement: 'bottomRight' })
  else console.warn(`[terminal] ${title}`)
}
