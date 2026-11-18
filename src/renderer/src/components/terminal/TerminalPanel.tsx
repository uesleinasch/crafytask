import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronDown,
  Columns2,
  Maximize2,
  Minimize2,
  Plus,
  RotateCcw,
  SquareTerminal,
  X
} from 'lucide-react'
import type { TerminalSession } from '@shared/types'
import { DeleteConfirmDialog } from '@renderer/components/DeleteConfirmDialog'
import { usePersistedState } from '@renderer/hooks/usePersistedState'
import { TERMINAL_HEIGHT_KEY } from '@renderer/lib/terminalPrefs'
import { cn } from '@renderer/lib/utils'
import { useTerminalStore } from '@renderer/stores/terminalStore'
import { groupOf } from '@renderer/stores/terminalPanes'
import { TAB_ICON_COMPONENTS } from './tabIcons'
import { TerminalSessionMenu } from './TerminalSessionMenu'
import { TerminalView } from './TerminalView'
import { RegionBoundary } from '@renderer/components/shell/RegionBoundary'
import { TERMINAL_MAXIMIZE_SHORTCUT_LABEL, terminalShortcut } from './terminalKeys'

const MIN_HEIGHT = 120
const MIN_PANE_SHARE = 0.1
const BUSY_POLL_MS = 2000

function clampHeight(height: number): number {
  return Math.round(Math.min(Math.max(height, MIN_HEIGHT), window.innerHeight * 0.7))
}

function defaultTabLabels(sessions: TerminalSession[]): Map<string, string> {
  const labels = new Map<string, string>()
  const seen = new Map<number, number>()
  for (const session of sessions) {
    const count = sessions.filter((s) => s.taskId === session.taskId).length
    const index = (seen.get(session.taskId) ?? 0) + 1
    seen.set(session.taskId, index)
    labels.set(session.id, count > 1 ? `${session.taskName} (${index})` : session.taskName)
  }
  return labels
}

function TabTitleInput({
  initial,
  onDone
}: {
  initial: string
  onDone: (value: string | null) => void
}): React.JSX.Element {
  const ref = useRef<HTMLInputElement>(null)
  const done = useRef(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      ref.current?.focus()
      ref.current?.select()
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  const finish = (value: string | null): void => {
    if (done.current) return
    done.current = true
    onDone(value)
  }

  return (
    <input
      ref={ref}
      defaultValue={initial}
      maxLength={60}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.key === 'Enter') finish(event.currentTarget.value)
        if (event.key === 'Escape') finish(null)
      }}
      onBlur={(event) => finish(event.currentTarget.value)}
      className="h-5 w-32 rounded bg-slate-950 px-1 text-xs text-slate-100 outline-none ring-1 ring-orange-400/70"
    />
  )
}

function SessionIcon({
  session,
  size
}: {
  session: TerminalSession
  size: number
}): React.JSX.Element {
  const Icon = session.icon ? TAB_ICON_COMPONENTS[session.icon] : SquareTerminal
  return <Icon size={size} className="shrink-0" style={{ color: session.color ?? undefined }} />
}

function BusyDot({ session }: { session: TerminalSession }): React.JSX.Element | null {
  if (!session.busy) return null
  return (
    <span
      title="Processo em execução"
      className="h-1.5 w-1.5 rounded-full bg-orange-400 shrink-0"
    />
  )
}

function connectorFor(index: number, size: number): string {
  if (size < 2) return ''
  if (index === 0) return '┌'
  return index === size - 1 ? '└' : '├'
}

export function TerminalPanel(): React.JSX.Element | null {
  const sessions = useTerminalStore((s) => s.sessions)
  const groups = useTerminalStore((s) => s.groups)
  const activeId = useTerminalStore((s) => s.activeId)
  const open = useTerminalStore((s) => s.open)
  const maximized = useTerminalStore((s) => s.maximized)
  const [weights, setWeights] = useState<Record<string, number>>({})
  const panesRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = usePersistedState(TERMINAL_HEIGHT_KEY, 280)
  const [dragHeight, setDragHeight] = useState<number | null>(null)
  const [pendingClose, setPendingClose] = useState<TerminalSession | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    const store = useTerminalStore.getState()
    void store.refresh()
    const offExit = window.api.onTerminalExit((id, code) => store.markExited(id, code))
    const offRemoved = window.api.onTerminalRemoved((id) => store.forget(id))
    const onKeyDown = (event: KeyboardEvent): void => {
      const shortcut = terminalShortcut(event)
      if (!shortcut) return
      event.preventDefault()
      const state = useTerminalStore.getState()
      if (state.sessions.length === 0) return
      if (shortcut === 'toggle') state.toggle()
      else state.toggleMaximized()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      offExit()
      offRemoved()
      window.removeEventListener('keydown', onKeyDown, true)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const interval = window.setInterval(
      () => void useTerminalStore.getState().refresh(),
      BUSY_POLL_MS
    )
    return () => window.clearInterval(interval)
  }, [open])

  const defaultLabels = useMemo(() => defaultTabLabels(sessions), [sessions])
  const byId = useMemo(() => new Map(sessions.map((s) => [s.id, s])), [sessions])
  const labelOf = (session: TerminalSession): string =>
    session.title ?? defaultLabels.get(session.id) ?? session.taskName

  const finishRename = (session: TerminalSession, value: string | null): void => {
    setEditingId(null)
    if (value === null || value.trim() === labelOf(session)) return
    const title = value.trim() === defaultLabels.get(session.id) ? null : value
    void useTerminalStore.getState().customize(session.id, { title })
  }
  const active = activeId ? (byId.get(activeId) ?? null) : null
  const activeGroup = groupOf({ groups, activeId }, activeId) ?? []
  const split = activeGroup.length > 1

  if (!active) return null

  const requestClose = async (session: TerminalSession): Promise<void> => {
    const fresh = (await window.api.terminalList()).find((s) => s.id === session.id)
    if (fresh?.busy) setPendingClose(fresh)
    else await useTerminalStore.getState().close(session.id)
  }

  const weightOf = (id: string): number => weights[id] ?? 1

  const startPaneResize = (event: React.MouseEvent, index: number): void => {
    event.preventDefault()
    const container = panesRef.current
    if (!container) return
    const leftId = activeGroup[index]
    const rightId = activeGroup[index + 1]
    const total = activeGroup.reduce((sum, id) => sum + weightOf(id), 0)
    const pair = weightOf(leftId) + weightOf(rightId)
    const startLeft = weightOf(leftId)
    const startX = event.clientX
    const width = container.getBoundingClientRect().width
    const min = total * MIN_PANE_SHARE
    const onMove = (move: MouseEvent): void => {
      const delta = ((move.clientX - startX) / width) * total
      const left = Math.min(Math.max(startLeft + delta, min), pair - min)
      setWeights((prev) => ({ ...prev, [leftId]: left, [rightId]: pair - left }))
    }
    const onUp = (): void => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const startResize = (event: React.MouseEvent): void => {
    event.preventDefault()
    const startY = event.clientY
    const startHeight = height
    let latest = startHeight
    const onMove = (move: MouseEvent): void => {
      latest = clampHeight(startHeight + startY - move.clientY)
      setDragHeight(latest)
    }
    const onUp = (): void => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      setDragHeight(null)
      setHeight(latest)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const renderLabel = (session: TerminalSession, where: 'header' | 'list'): React.JSX.Element =>
    editingId === `${where}:${session.id}` ? (
      <TabTitleInput initial={labelOf(session)} onDone={(value) => finishRename(session, value)} />
    ) : (
      <span
        title="Clique duas vezes para renomear"
        onDoubleClick={(event) => {
          event.stopPropagation()
          setEditingId(`${where}:${session.id}`)
        }}
        className={cn('truncate', session.exitCode !== null && 'line-through opacity-60')}
      >
        {labelOf(session)}
      </span>
    )

  const canDetach = (id: string): boolean => (groupOf({ groups, activeId }, id)?.length ?? 0) > 1
  const iconButton =
    'flex items-center justify-center h-7 w-7 shrink-0 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800'

  return (
    <section
      className={cn(
        'flex flex-col bg-slate-900',
        !open && 'hidden',
        maximized ? 'fixed inset-0 z-40' : 'relative shrink-0 border-t border-slate-700'
      )}
      style={maximized ? undefined : { height: clampHeight(dragHeight ?? height) }}
    >
      {!maximized && (
        <div
          onMouseDown={startResize}
          title="Arraste para redimensionar o terminal"
          className="absolute left-0 top-0 z-20 w-full h-1.5 -mt-[3px] cursor-row-resize hover:bg-orange-500/60 transition-colors"
        />
      )}
      <div className="flex items-center h-9 shrink-0 border-b border-slate-800 pl-2 pr-1 gap-1">
        <TerminalSessionMenu
          session={active}
          canDetach={canDetach(active.id)}
          onRename={() => setEditingId(`header:${active.id}`)}
        >
          <div className="flex-1 min-w-0 flex items-center gap-1.5 text-xs text-slate-200">
            <SessionIcon session={active} size={14} />
            <BusyDot session={active} />
            {renderLabel(active, 'header')}
          </div>
        </TerminalSessionMenu>
        {!split && active.exitCode !== null && (
          <button
            type="button"
            onClick={() => void useTerminalStore.getState().restart(active.id)}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs text-orange-300 hover:bg-slate-800"
          >
            <RotateCcw size={12} />
            Reiniciar
          </button>
        )}
        <button
          type="button"
          title="Novo terminal para esta task"
          onClick={() => void useTerminalStore.getState().createSession(active.taskId)}
          className={iconButton}
        >
          <Plus size={14} />
        </button>
        <button
          type="button"
          title="Dividir: novo terminal ao lado"
          onClick={() => void useTerminalStore.getState().splitNew(active.taskId)}
          className={iconButton}
        >
          <Columns2 size={14} />
        </button>
        <button
          type="button"
          title="Encerrar terminal"
          onClick={() => void requestClose(active)}
          className={iconButton}
        >
          <X size={14} />
        </button>
        <button
          type="button"
          title={`${maximized ? 'Restaurar' : 'Tela cheia'} (${TERMINAL_MAXIMIZE_SHORTCUT_LABEL})`}
          onClick={() => useTerminalStore.getState().toggleMaximized()}
          className={iconButton}
        >
          {maximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
        <button
          type="button"
          title="Minimizar (os processos continuam rodando)"
          onClick={() => useTerminalStore.getState().setOpen(false)}
          className={iconButton}
        >
          <ChevronDown size={16} />
        </button>
      </div>
      <div className="flex-1 min-h-0 flex">
        <div ref={panesRef} className="flex-1 min-w-0 flex">
          {sessions.map((session) => {
            const index = activeGroup.indexOf(session.id)
            const focused = session.id === active.id
            return (
              <div
                key={session.id}
                onMouseDownCapture={() => {
                  if (!focused) useTerminalStore.getState().activate(session.id)
                }}
                className={cn('min-w-0 flex flex-col', index === -1 && 'hidden')}
                style={{ order: index * 2, flexGrow: weightOf(session.id), flexBasis: 0 }}
              >
                {split && (
                  <div
                    className={cn(
                      'flex items-center gap-1.5 h-6 shrink-0 px-2 text-[11px] border-b',
                      focused
                        ? 'text-slate-200 border-orange-400/60'
                        : 'text-slate-500 border-slate-800'
                    )}
                  >
                    <SessionIcon session={session} size={12} />
                    <span
                      className={cn(
                        'truncate',
                        session.exitCode !== null && 'line-through opacity-60'
                      )}
                    >
                      {labelOf(session)}
                    </span>
                    {session.exitCode !== null && (
                      <button
                        type="button"
                        onClick={() => void useTerminalStore.getState().restart(session.id)}
                        className="ml-auto flex items-center gap-1 h-5 px-1.5 rounded text-orange-300 hover:bg-slate-800"
                      >
                        <RotateCcw size={11} />
                        Reiniciar
                      </button>
                    )}
                  </div>
                )}
                <div className="flex-1 min-h-0">
                  <RegionBoundary region="terminal" resetKeys={[session.id]}>
                    <TerminalView
                      session={session}
                      visible={open && index !== -1}
                      focused={focused}
                    />
                  </RegionBoundary>
                </div>
              </div>
            )
          })}
          {activeGroup.slice(1).map((id, i) => (
            <div
              key={`divider-${id}`}
              onMouseDown={(event) => startPaneResize(event, i)}
              title="Arraste para redimensionar os painéis"
              className="w-1 shrink-0 cursor-col-resize bg-slate-800 hover:bg-orange-500/60 transition-colors"
              style={{ order: i * 2 + 1 }}
            />
          ))}
        </div>
        {sessions.length > 1 && (
          <aside className="w-52 shrink-0 border-l border-slate-800 overflow-y-auto py-1">
            {groups.map((group) =>
              group.map((id, index) => {
                const session = byId.get(id)
                if (!session) return null
                const inActiveGroup = activeGroup.includes(id)
                return (
                  <TerminalSessionMenu
                    key={id}
                    session={session}
                    canDetach={group.length > 1}
                    onRename={() => setEditingId(`list:${id}`)}
                  >
                    <div
                      onClick={() => useTerminalStore.getState().activate(id)}
                      className={cn(
                        'group flex items-center gap-1.5 h-7 pl-1.5 pr-1 text-xs cursor-pointer',
                        id === active.id
                          ? 'bg-slate-800 text-slate-100'
                          : inActiveGroup
                            ? 'bg-slate-800/40 text-slate-200'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      )}
                      style={
                        session.color ? { boxShadow: `inset 2px 0 0 ${session.color}` } : undefined
                      }
                    >
                      <span className="w-3 shrink-0 text-center font-mono text-slate-600">
                        {connectorFor(index, group.length)}
                      </span>
                      <SessionIcon session={session} size={13} />
                      <BusyDot session={session} />
                      <span className="flex-1 min-w-0 flex">{renderLabel(session, 'list')}</span>
                      <button
                        type="button"
                        title="Encerrar terminal"
                        onClick={(event) => {
                          event.stopPropagation()
                          void requestClose(session)
                        }}
                        className="flex items-center justify-center h-5 w-5 shrink-0 rounded text-slate-500 opacity-0 group-hover:opacity-100 hover:text-slate-100 hover:bg-slate-700"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </TerminalSessionMenu>
                )
              })
            )}
          </aside>
        )}
      </div>

      <DeleteConfirmDialog
        open={pendingClose !== null}
        onOpenChange={(next) => !next && setPendingClose(null)}
        onConfirm={() => {
          if (pendingClose) void useTerminalStore.getState().close(pendingClose.id)
          setPendingClose(null)
        }}
        title="Encerrar terminal?"
        description="Há um processo rodando neste terminal. Encerrar mata o processo; o diretório de trabalho continua vinculado à task."
        confirmLabel="Encerrar"
      />
    </section>
  )
}
