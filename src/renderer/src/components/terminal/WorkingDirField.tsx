import { useEffect, useState } from 'react'
import { FolderOpen, Undo2 } from 'lucide-react'
import { effectiveWorkingDir } from '@shared/workingDir'

function shortPath(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean)
  return parts.length > 2 ? `…/${parts.slice(-2).join('/')}` : path
}

interface WorkingDirFieldProps {
  taskId: number
  workingDir: string | null | undefined
  projectWorkingDir: string | null | undefined
  startCommand: string | null | undefined
  onChange: () => Promise<void>
}

export function WorkingDirField({
  taskId,
  workingDir: ownDir,
  projectWorkingDir,
  startCommand,
  onChange
}: WorkingDirFieldProps): React.JSX.Element {
  const { dir: workingDir, source } = effectiveWorkingDir({
    working_dir: ownDir,
    project_working_dir: projectWorkingDir
  })
  const [draft, setDraft] = useState(startCommand ?? '')

  useEffect(() => {
    setDraft(startCommand ?? '')
  }, [startCommand])

  const pick = async (): Promise<void> => {
    const dir = await window.api.terminalPickDirectory(taskId)
    if (dir) await onChange()
  }

  const inheritProjectDir = async (): Promise<void> => {
    await window.api.terminalSetTaskWorkspace(taskId, { working_dir: null })
    await onChange()
  }

  const commitCommand = async (): Promise<void> => {
    const next = draft.trim()
    if (next === (startCommand ?? '')) return
    await window.api.terminalSetTaskWorkspace(taskId, { start_command: next || null })
    await onChange()
  }

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-xs text-slate-400 mb-1.5">Diretório de trabalho</label>
        <div className="flex gap-2">
          <div
            title={workingDir ?? undefined}
            className="flex-1 min-w-0 flex items-center h-8 px-2 rounded-lg text-xs border border-slate-200 bg-slate-50 font-mono text-slate-600"
          >
            <span className="truncate">
              {workingDir ? (
                shortPath(workingDir)
              ) : (
                <span className="font-sans text-slate-400">Nenhum</span>
              )}
            </span>
            {source === 'project' && (
              <span className="ml-auto pl-2 shrink-0 font-sans text-[10px] text-slate-400">
                do projeto
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => void pick()}
            title={workingDir ? 'Alterar diretório' : 'Escolher diretório'}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-slate-200 text-xs text-slate-500 hover:text-slate-700 hover:border-slate-300"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            {workingDir ? 'Alterar' : 'Escolher'}
          </button>
          {source === 'task' && projectWorkingDir && (
            <button
              type="button"
              onClick={() => void inheritProjectDir()}
              title={`Usar o diretório do projeto (${projectWorkingDir})`}
              className="flex items-center h-8 px-2 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      {workingDir && (
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Comando ao abrir o terminal</label>
          <input
            value={draft}
            placeholder="npm run dev"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => void commitCommand()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
            }}
            className="w-full h-8 px-2 rounded-lg text-xs font-mono border border-slate-200 bg-white focus:outline-none focus:border-slate-400"
          />
        </div>
      )}
    </div>
  )
}
