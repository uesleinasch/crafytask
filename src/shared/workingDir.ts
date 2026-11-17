export type WorkingDirSource = 'task' | 'project' | null

interface WorkingDirOwner {
  working_dir?: string | null
  project_working_dir?: string | null
}

export function effectiveWorkingDir(task: WorkingDirOwner): {
  dir: string | null
  source: WorkingDirSource
} {
  if (task.working_dir) return { dir: task.working_dir, source: 'task' }
  if (task.project_working_dir) return { dir: task.project_working_dir, source: 'project' }
  return { dir: null, source: null }
}
