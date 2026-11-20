import type { TaskStatus } from '@shared/types'
import { effectiveWorkingDir } from '@shared/workingDir'

export interface DirTask {
  id: number
  status: TaskStatus
  parent_task_id?: number | null
  working_dir?: string | null
  project_working_dir?: string | null
}

export interface DirProject {
  id: number
  working_dir?: string | null
}

export interface DirectoryMatch<T extends DirTask, P extends DirProject> {
  tasks: T[]
  project: P | null
}

export type DirectoryStart<T extends DirTask> =
  | { kind: 'open'; task: T }
  | { kind: 'ambiguous'; candidates: T[] }
  | { kind: 'none' }

export function normalizeDir(dir: string, home = ''): string {
  let value = dir.trim()
  if (home && (value === '~' || value.startsWith('~/'))) value = home + value.slice(1)
  value = value.replace(/\/{2,}/g, '/')
  if (value.length > 1) value = value.replace(/\/+$/, '')
  return value
}

function contains(base: string, dir: string): boolean {
  return dir === base || base === '/' || dir.startsWith(`${base}/`)
}

function mostSpecific<T>(items: T[], dirOf: (item: T) => string | null, dir: string): T[] {
  const matched = items
    .map((item) => ({ item, base: dirOf(item) }))
    .filter((entry): entry is { item: T; base: string } =>
      Boolean(entry.base && contains(entry.base, dir))
    )
  const longest = Math.max(0, ...matched.map((entry) => entry.base.length))
  return matched.filter((entry) => entry.base.length === longest).map((entry) => entry.item)
}

export function matchByDirectory<T extends DirTask, P extends DirProject>(
  directory: string,
  tasks: T[],
  projects: P[],
  home = ''
): DirectoryMatch<T, P> {
  const dir = normalizeDir(directory, home)
  const dirOfTask = (task: T): string | null => {
    const own = effectiveWorkingDir(task).dir
    return own ? normalizeDir(own, home) : null
  }
  const dirOfProject = (project: P): string | null =>
    project.working_dir ? normalizeDir(project.working_dir, home) : null

  return {
    tasks: mostSpecific(tasks, dirOfTask, dir),
    project: mostSpecific(projects, dirOfProject, dir)[0] ?? null
  }
}

// A task pai fica em executando junto com a subtarefa em andamento; a sessão é da subtarefa.
function withoutParentsOf<T extends DirTask>(tasks: T[]): T[] {
  const parentIds = new Set(tasks.map((task) => task.parent_task_id).filter(Boolean))
  return tasks.filter((task) => !parentIds.has(task.id))
}

export function chooseDirectoryStart<T extends DirTask>(tasks: T[]): DirectoryStart<T> {
  if (tasks.length === 0) return { kind: 'none' }
  const running = withoutParentsOf(tasks.filter((task) => task.status === 'executando'))
  if (running.length === 1) return { kind: 'open', task: running[0] }
  if (running.length > 1) return { kind: 'ambiguous', candidates: running }
  if (tasks.length === 1) return { kind: 'open', task: tasks[0] }
  return { kind: 'ambiguous', candidates: tasks }
}
