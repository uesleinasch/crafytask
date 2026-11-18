import { ArrowRight, CheckCircle2, Clock } from 'lucide-react'
import type { Project } from '@shared/types'
import { ProjectStatusChip } from '@renderer/components/chips/ProjectStatusChip'

interface ProjectListRowProps {
  project: Project
  progress: number
  onOpen: () => void
}

export function ProjectListRow({
  project,
  progress,
  onOpen
}: ProjectListRowProps): React.JSX.Element {
  const missingNextAction =
    !project.next_action && project.status === 'active' && (project.task_count || 0) > 0

  return (
    <div
      onClick={onOpen}
      className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
      style={{ borderLeftColor: project.color, borderLeftWidth: '4px' }}
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-900 truncate">{project.name}</p>
        {project.next_action ? (
          <p className="flex items-center gap-1 text-xs text-blue-600 truncate">
            <ArrowRight size={12} className="shrink-0" />
            <span className="truncate">Próxima: {project.next_action}</span>
          </p>
        ) : (
          missingNextAction && (
            <p className="flex items-center gap-1 text-xs text-amber-600">
              <CheckCircle2 size={12} className="shrink-0" />
              Sem próxima ação definida
            </p>
          )
        )}
      </div>

      <span className="shrink-0">
        <ProjectStatusChip status={project.status} />
      </span>

      <div className="shrink-0 w-32">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span>
            {project.completed_task_count || 0}/{project.task_count || 0}
          </span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <span className="shrink-0 w-24 flex items-center justify-end text-xs text-slate-400">
        {project.due_date && (
          <>
            <Clock size={12} className="mr-1" />
            {new Date(project.due_date).toLocaleDateString('pt-BR')}
          </>
        )}
      </span>
    </div>
  )
}
