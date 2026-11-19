import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, ConfigProvider, Input, Modal, Tooltip, theme, type InputRef } from 'antd'
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
import { usePersistedState } from '@renderer/hooks/usePersistedState'
import { TERMINAL_HEIGHT_KEY } from '@renderer/lib/terminalPrefs'
import { sameOwner, useTerminalStore } from '@renderer/stores/terminalStore'
import { groupOf } from '@renderer/stores/terminalPanes'
import { buildTheme } from '@renderer/theme/buildTheme'
import { TERMINAL } from '@renderer/theme/semantic'
import { useThemeSettings } from '@renderer/theme/themeSettings'
import { TAB_ICON_COMPONENTS } from './tabIcons'
import { TerminalSessionMenu } from './TerminalSessionMenu'
import { TerminalView } from './TerminalView'
import { RegionBoundary } from '@renderer/components/shell/RegionBoundary'
import { TERMINAL_MAXIMIZE_SHORTCUT_LABEL, terminalShortcut } from './terminalKeys'

const MIN_HEIGHT = 120
const MIN_PANE_SHARE = 0.1
const BUSY_POLL_MS = 2000
const TERMINAL_CSS_VAR_KEY = 'ct-term-theme'

const TERMINAL_VARS = {
  '--ct-term-bg': TERMINAL.background,
  '--ct-term-border': TERMINAL.border,
  '--ct-term-hover': TERMINAL.hover,
  '--ct-term-text': TERMINAL.text,
  '--ct-term-text2': TERMINAL.text2,
  '--ct-term-meta': TERMINAL.meta,
  '--ct-term-accent': TERMINAL.accent
} as React.CSSProperties

function clampHeight(height: number): number {
  return Math.round(Math.min(Math.max(height, MIN_HEIGHT), window.innerHeight * 0.7))
}

function defaultTabLabels(sessions: TerminalSession[]): Map<string, string> {
  const labels = new Map<string, string>()
  const seen = new Map<string, number>()
  for (const session of sessions) {
    const key = `${session.owner.kind}:${session.owner.id}`
    const count = sessions.filter((s) => sameOwner(s.owner, session.owner)).length
    const index = (seen.get(key) ?? 0) + 1
    seen.set(key, index)
    labels.set(session.id, count > 1 ? `${session.ownerName} (${index})` : session.ownerName)
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
  const ref = useRef<InputRef>(null)
  const done = useRef(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => ref.current?.select())
    return () => cancelAnimationFrame(frame)
  }, [])

  const finish = (value: string | null): void => {
    if (done.current) return
    done.current = true
    onDone(value)
  }

  return (
    <Input
      ref={ref}
      size="small"
      autoFocus
      defaultValue={initial}
      maxLength={60}
      aria-label="Nome do terminal"
      style={{ width: 160 }}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.key === 'Enter') finish(event.currentTarget.value)
        if (event.key === 'Escape') finish(null)
      }}
      onBlur={(event) => finish(event.currentTarget.value)}
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
  return (
    <Icon
      size={size}
      strokeWidth={1.75}
      aria-hidden
      style={{ flex: 'none', color: session.color ?? undefined }}
    />
  )
}

function BusyDot({ session }: { session: TerminalSession }): React.JSX.Element | null {
  if (!session.busy) return null
  return (
    <span
      role="img"
      aria-label="Processo em execução"
      title="Processo em execução"
      style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        flex: 'none',
        background: TERMINAL.accent
      }}
    />
  )
}

function connectorFor(index: number, size: number): string {
  if (size < 2) return ''
  if (index === 0) return '┌'
  return index === size - 1 ? '└' : '├'
}

function BarButton({
  title,
  icon,
  onClick
}: {
  title: string
  icon: React.ReactNode
  onClick: () => void
}): React.JSX.Element {
  return (
    <Tooltip title={title}>
      <Button type="text" size="small" aria-label={title} icon={icon} onClick={onClick} />
    </Tooltip>
  )
}

export function TerminalPanel(): React.JSX.Element | null {
  const { density } = useThemeSettings()
  const terminalTheme = useMemo(() => buildTheme('dark', density, TERMINAL_CSS_VAR_KEY), [density])
  return (
    <ConfigProvider theme={terminalTheme}>
      <TerminalPanelBody />
    </ConfigProvider>
  )
}

function TerminalPanelBody(): React.JSX.Element | null {
  const { token } = theme.useToken()
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
    session.title ?? defaultLabels.get(session.id) ?? session.ownerName

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
        className={session.exitCode !== null ? 'ct-ellipsis ct-term-exited' : 'ct-ellipsis'}
      >
        {labelOf(session)}
      </span>
    )

  const canDetach = (id: string): boolean => (groupOf({ groups, activeId }, id)?.length ?? 0) > 1
  const icon = (Icon: typeof Plus, size = 14): React.JSX.Element => (
    <Icon size={size} strokeWidth={1.75} aria-hidden />
  )

  return (
    <section
      aria-label="Terminal"
      className="ct-term"
      style={{
        ...TERMINAL_VARS,
        ...(open ? {} : { display: 'none' }),
        ...(maximized
          ? { position: 'fixed', inset: 0, zIndex: 40 }
          : {
              position: 'relative',
              flex: 'none',
              borderTop: `1px solid ${TERMINAL.border}`,
              height: clampHeight(dragHeight ?? height)
            })
      }}
    >
      {!maximized && (
        <div
          onMouseDown={startResize}
          title="Arraste para redimensionar o terminal"
          className="ct-term-resize"
        />
      )}
      <div className="ct-term-bar">
        <TerminalSessionMenu
          session={active}
          canDetach={canDetach(active.id)}
          onRename={() => setEditingId(`header:${active.id}`)}
        >
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12
            }}
          >
            <SessionIcon session={active} size={14} />
            <BusyDot session={active} />
            {renderLabel(active, 'header')}
          </div>
        </TerminalSessionMenu>
        {!split && active.exitCode !== null && (
          <Button
            type="text"
            size="small"
            icon={icon(RotateCcw, 12)}
            style={{ color: token.colorPrimary }}
            onClick={() => void useTerminalStore.getState().restart(active.id)}
          >
            Reiniciar
          </Button>
        )}
        <BarButton
          title={
            active.owner.kind === 'project'
              ? 'Novo terminal para este projeto'
              : 'Novo terminal para esta task'
          }
          icon={icon(Plus)}
          onClick={() => void useTerminalStore.getState().createSession(active.owner)}
        />
        <BarButton
          title="Dividir: novo terminal ao lado"
          icon={icon(Columns2)}
          onClick={() => void useTerminalStore.getState().splitNew(active.owner)}
        />
        <BarButton
          title="Encerrar terminal"
          icon={icon(X)}
          onClick={() => void requestClose(active)}
        />
        <BarButton
          title={`${maximized ? 'Restaurar' : 'Tela cheia'} (${TERMINAL_MAXIMIZE_SHORTCUT_LABEL})`}
          icon={maximized ? icon(Minimize2) : icon(Maximize2)}
          onClick={() => useTerminalStore.getState().toggleMaximized()}
        />
        <BarButton
          title="Minimizar (os processos continuam rodando)"
          icon={icon(ChevronDown, 16)}
          onClick={() => useTerminalStore.getState().setOpen(false)}
        />
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <div ref={panesRef} style={{ flex: 1, minWidth: 0, display: 'flex' }}>
          {sessions.map((session) => {
            const index = activeGroup.indexOf(session.id)
            const focused = session.id === active.id
            return (
              <div
                key={session.id}
                onMouseDownCapture={() => {
                  if (!focused) useTerminalStore.getState().activate(session.id)
                }}
                style={{
                  minWidth: 0,
                  display: index === -1 ? 'none' : 'flex',
                  flexDirection: 'column',
                  order: index * 2,
                  flexGrow: weightOf(session.id),
                  flexBasis: 0
                }}
              >
                {split && (
                  <div className={focused ? 'ct-term-pane-head focused' : 'ct-term-pane-head'}>
                    <SessionIcon session={session} size={12} />
                    <span
                      className={
                        session.exitCode !== null ? 'ct-ellipsis ct-term-exited' : 'ct-ellipsis'
                      }
                    >
                      {labelOf(session)}
                    </span>
                    {session.exitCode !== null && (
                      <Button
                        type="text"
                        size="small"
                        icon={icon(RotateCcw, 11)}
                        style={{ marginLeft: 'auto', color: token.colorPrimary, height: 20 }}
                        onClick={() => void useTerminalStore.getState().restart(session.id)}
                      >
                        Reiniciar
                      </Button>
                    )}
                  </div>
                )}
                <div style={{ flex: 1, minHeight: 0 }}>
                  <RegionBoundary region="terminal" resetKeys={[session.id]} surface>
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
              className="ct-term-divider"
              style={{ order: i * 2 + 1 }}
            />
          ))}
        </div>
        {sessions.length > 1 && (
          <nav className="ct-term-list" aria-label="Terminais abertos">
            {groups.map((group) =>
              group.map((id, index) => {
                const session = byId.get(id)
                if (!session) return null
                const inActiveGroup = activeGroup.includes(id)
                const state = id === active.id ? ' active' : inActiveGroup ? ' grouped' : ''
                return (
                  <TerminalSessionMenu
                    key={id}
                    session={session}
                    canDetach={group.length > 1}
                    onRename={() => setEditingId(`list:${id}`)}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      aria-current={id === active.id ? 'true' : undefined}
                      onClick={() => useTerminalStore.getState().activate(id)}
                      onKeyDown={(event) => {
                        if (event.target !== event.currentTarget) return
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          useTerminalStore.getState().activate(id)
                        }
                      }}
                      className={`ct-term-item${state}`}
                      style={
                        session.color ? { boxShadow: `inset 2px 0 0 ${session.color}` } : undefined
                      }
                    >
                      <span
                        aria-hidden
                        className="font-mono"
                        style={{ width: 12, flex: 'none', textAlign: 'center', opacity: 0.6 }}
                      >
                        {connectorFor(index, group.length)}
                      </span>
                      <SessionIcon session={session} size={13} />
                      <BusyDot session={session} />
                      <span style={{ flex: 1, minWidth: 0, display: 'flex' }}>
                        {renderLabel(session, 'list')}
                      </span>
                      <Button
                        type="text"
                        size="small"
                        className="ct-term-item-close"
                        aria-label={`Encerrar ${labelOf(session)}`}
                        icon={icon(X, 12)}
                        style={{ width: 20, height: 20, minWidth: 20 }}
                        onClick={(event) => {
                          event.stopPropagation()
                          void requestClose(session)
                        }}
                      />
                    </div>
                  </TerminalSessionMenu>
                )
              })
            )}
          </nav>
        )}
      </div>

      <Modal
        open={pendingClose !== null}
        title="Encerrar terminal?"
        okText="Encerrar"
        cancelText="Cancelar"
        okButtonProps={{ danger: true }}
        onCancel={() => setPendingClose(null)}
        onOk={() => {
          if (pendingClose) void useTerminalStore.getState().close(pendingClose.id)
          setPendingClose(null)
        }}
      >
        Há um processo rodando neste terminal. Encerrar mata o processo; o diretório de trabalho
        continua vinculado {pendingClose?.owner.kind === 'project' ? 'ao projeto' : 'à task'}.
      </Modal>
    </section>
  )
}
