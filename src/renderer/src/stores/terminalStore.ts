import { create } from 'zustand'
import type { TerminalOwner, TerminalSession, TerminalTabCustomization } from '@shared/types'
import { terminalNotice } from '@renderer/components/terminal/terminalNotices'
import { readTerminalShell } from '@renderer/lib/terminalPrefs'
import {
  EMPTY_LAYOUT,
  activate,
  addSession,
  detachSession,
  reconcileLayout,
  removeSession,
  replaceSession,
  splitActive,
  type PaneLayout
} from './terminalPanes'

interface TerminalState extends PaneLayout {
  sessions: TerminalSession[]
  open: boolean
  maximized: boolean
  refresh: () => Promise<void>
  setOpen: (open: boolean) => void
  toggle: () => void
  toggleMaximized: () => void
  activate: (id: string) => void
  splitNew: (owner: TerminalOwner) => Promise<void>
  detach: (id: string) => void
  createSession: (owner: TerminalOwner) => Promise<boolean>
  toggleFor: (owner: TerminalOwner) => Promise<boolean>
  close: (id: string) => Promise<void>
  restart: (id: string) => Promise<void>
  customize: (id: string, patch: TerminalTabCustomization) => Promise<void>
  markExited: (id: string, exitCode: number) => void
  forget: (id: string) => void
}

export function sameOwner(a: TerminalOwner | undefined, b: TerminalOwner): boolean {
  return a?.kind === b.kind && a.id === b.id
}

async function spawn(owner: TerminalOwner): Promise<TerminalSession | null> {
  const result = await window.api.terminalCreate(owner, { shell: readTerminalShell() })
  if (!result.ok) {
    terminalNotice('error', result.error)
    return null
  }
  if (result.shellFallback) {
    terminalNotice('warning', `Shell configurado não encontrado; usando ${result.session.shell}`)
  }
  return result.session
}

function layoutOf(state: PaneLayout): PaneLayout {
  return { groups: state.groups, activeId: state.activeId }
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  sessions: [],
  ...EMPTY_LAYOUT,
  open: false,
  maximized: false,

  refresh: async () => {
    const sessions = await window.api.terminalList()
    set((state) => ({
      sessions,
      ...reconcileLayout(
        sessions.map((s) => s.id),
        layoutOf(state)
      )
    }))
  },

  setOpen: (open) => set(open ? { open } : { open, maximized: false }),

  toggle: () => set((state) => (state.open ? { open: false, maximized: false } : { open: true })),

  toggleMaximized: () => set((state) => ({ open: true, maximized: !state.maximized })),

  activate: (id) => set((state) => ({ ...activate(layoutOf(state), id), open: true })),

  splitNew: async (owner) => {
    const session = await spawn(owner)
    if (!session) return
    set((state) => ({
      sessions: [...state.sessions, session],
      ...splitActive(layoutOf(state), session.id),
      open: true
    }))
  },

  detach: (id) => set((state) => detachSession(layoutOf(state), id)),

  createSession: async (owner) => {
    const session = await spawn(owner)
    if (!session) return false
    set((state) => ({
      sessions: [...state.sessions, session],
      ...addSession(layoutOf(state), session.id),
      open: true
    }))
    return true
  },

  toggleFor: async (owner) => {
    const { sessions, activeId, open } = get()
    const active = sessions.find((s) => s.id === activeId)
    if (open && sameOwner(active?.owner, owner)) {
      set({ open: false, maximized: false })
      return true
    }
    const existing = sessions.find((s) => sameOwner(s.owner, owner))
    if (existing) {
      get().activate(existing.id)
      return true
    }
    return get().createSession(owner)
  },

  close: async (id) => {
    await window.api.terminalDispose(id)
    get().forget(id)
  },

  restart: async (id) => {
    const old = get().sessions.find((s) => s.id === id)
    if (!old) return
    const session = await spawn(old.owner)
    if (!session) return
    set((state) => ({
      sessions: [...state.sessions.filter((s) => s.id !== id), session],
      ...replaceSession(layoutOf(state), id, session.id)
    }))
    await window.api.terminalDispose(id)
    if (old.title || old.color || old.icon) {
      await get().customize(session.id, { title: old.title, color: old.color, icon: old.icon })
    }
  },

  customize: async (id, patch) => {
    const updated = await window.api.terminalCustomize(id, patch)
    if (!updated) return
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === id ? updated : s))
    }))
  },

  markExited: (id, exitCode) =>
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === id ? { ...s, exitCode, busy: false } : s))
    })),

  forget: (id) =>
    set((state) => {
      if (!state.sessions.some((s) => s.id === id)) return state
      const panes = removeSession(layoutOf(state), id)
      const sessions = state.sessions.filter((s) => s.id !== id)
      const open = sessions.length > 0 && state.open
      return { sessions, ...panes, open, maximized: open && state.maximized }
    })
}))
