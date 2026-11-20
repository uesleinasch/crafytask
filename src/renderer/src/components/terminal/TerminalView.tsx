import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import type { TerminalSession } from '@shared/types'
import { App, Button } from 'antd'
import { TERMINAL } from '@renderer/theme/semantic'
import { FONT_FAMILY_CODE } from '@renderer/theme/tokens'
import { readTerminalAutoTimer } from '@renderer/lib/terminalPrefs'
import { useTimerStore } from '@renderer/stores/timerStore'
import { SHIFT_ENTER_SEQUENCE, isShiftEnter, terminalShortcut } from './terminalKeys'

const timerTriggered = new Set<string>()

function exitMessage(exitCode: number): string {
  return `\r\n\x1b[90m[processo encerrado — código ${exitCode}]\x1b[0m\r\n`
}

type Notifier = ReturnType<typeof App.useApp>['notification']

function startTimerFromTerminal(session: TerminalSession, notification: Notifier): void {
  if (timerTriggered.has(session.id)) return
  timerTriggered.add(session.id)
  if (!readTerminalAutoTimer() || session.owner.kind !== 'task') return
  const taskId = session.owner.id
  const timers = useTimerStore.getState()
  if (timers.timers[taskId]) return
  void timers.startTimer(taskId).then(() => {
    const key = `terminal-timer-${session.id}`
    notification.success({
      key,
      title: `Timer iniciado: ${session.ownerName}`,
      description: 'O primeiro comando no terminal começou a contar o tempo.',
      actions: (
        <Button
          size="small"
          onClick={() => {
            void useTimerStore.getState().stopTimer(taskId)
            notification.destroy(key)
          }}
        >
          Parar
        </Button>
      )
    })
  })
}

interface TerminalViewProps {
  session: TerminalSession
  visible: boolean
  focused: boolean
}

export function TerminalView({ session, visible, focused }: TerminalViewProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<{ terminal: Terminal; refit: () => void } | null>(null)
  const sessionRef = useRef(session)
  sessionRef.current = session
  const { notification } = App.useApp()
  const notificationRef = useRef(notification)
  notificationRef.current = notification

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const id = session.id
    const terminal = new Terminal({
      theme: TERMINAL.xterm,
      fontFamily: FONT_FAMILY_CODE,
      fontSize: 13,
      lineHeight: 1.2,
      cursorBlink: true,
      scrollback: 5000,
      allowProposedApi: false
    })
    const fit = new FitAddon()
    terminal.loadAddon(fit)
    terminal.attachCustomKeyEventHandler((event) => {
      if (isShiftEnter(event)) {
        if (event.type === 'keydown') void window.api.terminalWrite(id, SHIFT_ENTER_SEQUENCE)
        return false
      }
      return terminalShortcut(event) === null
    })
    terminal.open(container)

    let disposed = false
    let replayedSeq: number | null = null
    const queued: Array<{ chunk: string; seq: number }> = []

    const offData = window.api.onTerminalData((sessionId, chunk, seq) => {
      if (sessionId !== id) return
      if (replayedSeq === null) queued.push({ chunk, seq })
      else if (seq > replayedSeq) terminal.write(chunk)
    })
    const offExit = window.api.onTerminalExit((sessionId, exitCode) => {
      if (sessionId === id) terminal.write(exitMessage(exitCode))
    })

    void window.api.terminalGetBuffer(id).then((buffer) => {
      if (disposed) return
      replayedSeq = buffer?.seq ?? 0
      if (buffer?.data) terminal.write(buffer.data)
      for (const item of queued) if (item.seq > replayedSeq) terminal.write(item.chunk)
      queued.length = 0
      if (sessionRef.current.exitCode !== null) {
        terminal.write(exitMessage(sessionRef.current.exitCode))
      }
    })

    const input = terminal.onData((data) => {
      void window.api.terminalWrite(id, data)
      if (data.includes('\r')) startTimerFromTerminal(sessionRef.current, notificationRef.current)
    })
    const resize = terminal.onResize(({ cols, rows }) => {
      void window.api.terminalResize(id, cols, rows)
    })

    const refit = (): void => {
      if (container.clientWidth > 0 && container.clientHeight > 0) fit.fit()
    }
    const observer = new ResizeObserver(refit)
    observer.observe(container)
    refit()
    void window.api.terminalResize(id, terminal.cols, terminal.rows)
    terminalRef.current = { terminal, refit }

    return () => {
      disposed = true
      terminalRef.current = null
      observer.disconnect()
      input.dispose()
      resize.dispose()
      offData()
      offExit()
      terminal.dispose()
    }
  }, [session.id])

  useEffect(() => {
    const current = terminalRef.current
    if (!current || !visible) return
    const frame = requestAnimationFrame(() => {
      current.refit()
      current.terminal.refresh(0, current.terminal.rows - 1)
      if (focused) current.terminal.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [visible, focused])

  return (
    <div className="h-full w-full px-2 pt-1">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  )
}
