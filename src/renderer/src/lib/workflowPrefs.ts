import { useMemo, useSyncExternalStore } from 'react'
import type { CalendarPrefs } from '@shared/calendarPrefs'
import {
  DEFAULT_WORKFLOW_PREFS,
  calendarPrefsFrom,
  timeLeakThresholds,
  type WorkflowPrefs,
  type WorkflowPrefsPatch
} from '@shared/workflowPrefs'

let current: WorkflowPrefs = DEFAULT_WORKFLOW_PREFS
let started = false
type WorkflowPrefsStatus = 'loading' | 'ready' | 'error'

let status: WorkflowPrefsStatus = 'loading'
const listeners = new Set<() => void>()

function publish(next: WorkflowPrefs): void {
  current = next
  status = 'ready'
  for (const listener of listeners) listener()
}

function start(): void {
  if (started) return
  started = true
  window.api.onWorkflowPrefsChanged(publish)
  window.api
    .getWorkflowPrefs()
    .then(publish)
    .catch((error: unknown) => {
      console.error('Falha ao ler as preferências de fluxo de trabalho:', error)
      status = 'error'
      for (const listener of listeners) listener()
    })
}

export function getWorkflowPrefs(): WorkflowPrefs {
  start()
  return current
}

export function workflowPrefsLoaded(): boolean {
  return status === 'ready'
}

function subscribe(listener: () => void): () => void {
  start()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useWorkflowPrefs(): WorkflowPrefs {
  return useSyncExternalStore(subscribe, getWorkflowPrefs)
}

export function useWorkflowPrefsStatus(): WorkflowPrefsStatus {
  return useSyncExternalStore(subscribe, () => {
    start()
    return status
  })
}

export function useCalendarPrefs(): CalendarPrefs {
  const prefs = useWorkflowPrefs()
  return useMemo(() => calendarPrefsFrom(prefs), [prefs])
}

export function useTimeLeakThresholds(): number[] {
  const prefs = useWorkflowPrefs()
  return useMemo(() => timeLeakThresholds(prefs), [prefs])
}

export async function updateWorkflowPrefs(patch: WorkflowPrefsPatch): Promise<WorkflowPrefs> {
  const next = await window.api.setWorkflowPrefs(patch)
  publish(next)
  return next
}
