import { FolderOpen, X } from 'lucide-react'

interface ProjectWorkingDirFieldProps {
  projectId: number
  workingDir: string | null | undefined
  onPick: () => Promise<void>
  onClear: () => Promise<void>
}

export function ProjectWorkingDirField({
  projectId,
  workingDir,
  onPick,
  onClear
}: ProjectWorkingDirFieldProps): React.JSX.Element {
  const pick = async (): Promise<void> => {
    const dir = await window.api.terminalPickProjectDirectory(projectId)
    if (dir) await onPick()
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div
          title={workingDir ?? undefined}
          className="flex-1 min-w-0 flex items-center h-9 px-3 rounded-lg text-sm border border-slate-200 bg-slate-50 font-mono text-slate-600"
        >
          <span className="truncate">
            {workingDir || <span className="font-sans text-slate-400">Nenhum</span>}
          </span>
        </div>
        <button
          type="button"
          onClick={() => void pick()}
          title={workingDir ? 'Alterar diretório' : 'Escolher diretório'}
          className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 text-sm text-slate-500 hover:text-slate-700 hover:border-slate-300"
        >
          <FolderOpen className="h-4 w-4" />
          {workingDir ? 'Alterar' : 'Escolher'}
        </button>
        {workingDir && (
          <button
            type="button"
            onClick={() => void onClear()}
            title="Remover diretório do projeto"
            className="flex items-center h-9 px-2 rounded-lg border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <p className="text-xs text-slate-400">
        As tasks do projeto abrem o terminal aqui, a menos que tenham um diretório próprio.
      </p>
    </div>
  )
}
