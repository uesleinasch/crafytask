import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { App, type MenuProps } from 'antd'
import { CircleCheck, FolderOpen, Trash2, TrendingUp } from 'lucide-react'
import { PROJECT_STATUS_LABELS, type Area, type Project, type ProjectStatus } from '@shared/types'
import { errorMessage } from '@renderer/components/settings/settingsStatus'
import { NO_AREA, deleteWarning } from './projectList'

const ICON = { size: 14, strokeWidth: 1.75, 'aria-hidden': true } as const
const STATUSES = Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]

export function useProjectMenu(
  areas: Area[],
  onChanged: () => void
): (project: Project) => MenuProps {
  const navigate = useNavigate()
  const { message, modal } = App.useApp()

  return useCallback(
    (project: Project): MenuProps => {
      const save = (patch: Parameters<typeof window.api.updateProject>[1], text: string): void => {
        window.api
          .updateProject(project.id, patch)
          .then(() => {
            onChanged()
            message.success(text)
          })
          .catch((error) => message.error(errorMessage(error)))
      }
      const mark = (on: boolean, label: string): string => (on ? `✓ ${label}` : label)
      return {
        items: [
          { key: 'open', icon: <FolderOpen {...ICON} />, label: 'Abrir' },
          {
            key: 'status',
            icon: <CircleCheck {...ICON} />,
            label: 'Marcar como',
            children: STATUSES.map((status) => ({
              key: `status:${status}`,
              label: mark(project.status === status, PROJECT_STATUS_LABELS[status])
            }))
          },
          {
            key: 'area',
            icon: <TrendingUp {...ICON} />,
            label: 'Área de foco',
            children: [
              ...areas.map((area) => ({
                key: `area:${area.id}`,
                label: mark(project.area_id === area.id, area.name)
              })),
              { key: 'area:', label: mark(!project.area_id, NO_AREA) }
            ]
          },
          { type: 'divider' },
          { key: 'delete', icon: <Trash2 {...ICON} />, label: 'Excluir…', danger: true }
        ],
        onClick: ({ key, domEvent }) => {
          domEvent.stopPropagation()
          const [kind, value] = key.split(':')
          if (kind === 'open') navigate(`/project/${project.id}`)
          if (kind === 'status') {
            const status = value as ProjectStatus
            save({ status }, `${project.name}: ${PROJECT_STATUS_LABELS[status]}`)
          }
          if (kind === 'area') {
            const area = areas.find((a) => a.id === Number(value))
            save({ area_id: area?.id ?? null }, area ? `Área: ${area.name}` : NO_AREA)
          }
          if (kind === 'delete') {
            modal.confirm({
              title: `Excluir o projeto ${project.name}?`,
              content: deleteWarning(project),
              okText: 'Excluir',
              okButtonProps: { danger: true },
              cancelText: 'Cancelar',
              onOk: () =>
                window.api
                  .deleteProject(project.id)
                  .then(() => {
                    onChanged()
                    message.success('Projeto excluído')
                  })
                  .catch((error) => message.error(errorMessage(error)))
            })
          }
        }
      }
    },
    [areas, onChanged, navigate, message, modal]
  )
}
