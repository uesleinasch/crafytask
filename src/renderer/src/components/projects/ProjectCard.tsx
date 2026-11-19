import { Button, Card, Dropdown, Flex, Typography, theme, type MenuProps } from 'antd'
import { CalendarDays, Ellipsis, Target } from 'lucide-react'
import type { Project } from '@shared/types'
import { ProjectStatusChip } from '@renderer/components/chips/ProjectStatusChip'
import { NextActionCell, ProjectDue, ProjectProgress } from './ProjectCells'
import { NO_AREA } from './projectList'

interface ProjectCardProps {
  project: Project
  today: string
  showStatus: boolean
  menu: MenuProps
  onOpen: () => void
}

export function ProjectCard({
  project,
  today,
  showStatus,
  menu,
  onOpen
}: ProjectCardProps): React.JSX.Element {
  const { token } = theme.useToken()
  const icon = { size: 14, strokeWidth: 1.75, 'aria-hidden': true } as const
  return (
    <Dropdown menu={menu} trigger={['contextMenu']}>
      <div style={{ height: '100%' }}>
        <Card hoverable size="small" onClick={onOpen} style={{ height: '100%' }}>
          <Flex vertical gap={10}>
            <Flex align="center" gap={8}>
              <span
                aria-hidden
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  flex: 'none',
                  background: project.color
                }}
              />
              <Typography.Link
                href={`#/project/${project.id}`}
                ellipsis
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onOpen()
                }}
                style={{ flex: 1, minWidth: 0, color: token.colorText, fontWeight: 600 }}
              >
                {project.name}
              </Typography.Link>
              {showStatus && <ProjectStatusChip status={project.status} />}
              <Dropdown menu={menu} trigger={['click']} placement="bottomRight">
                <Button
                  size="small"
                  type="text"
                  aria-label={`Mais ações de ${project.name}`}
                  icon={<Ellipsis {...icon} />}
                  onClick={(e) => e.stopPropagation()}
                />
              </Dropdown>
            </Flex>
            {project.outcome && (
              <Flex gap={6} align="start">
                <Target
                  {...icon}
                  style={{ flex: 'none', marginTop: 3, color: token.colorTextTertiary }}
                />
                <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                  {project.outcome}
                </Typography.Text>
              </Flex>
            )}
            <ProjectProgress project={project} width={120} />
            <div style={{ minHeight: 22, minWidth: 0 }}>
              <NextActionCell project={project} />
            </div>
            <Flex gap={8} align="center" style={{ fontSize: 12 }}>
              <Typography.Text type="secondary" ellipsis style={{ fontSize: 12, minWidth: 0 }}>
                {project.area_name || NO_AREA}
              </Typography.Text>
              <span style={{ flex: 1 }} />
              {project.due_date && (
                <Flex align="center" gap={4}>
                  <CalendarDays
                    size={12}
                    strokeWidth={1.75}
                    aria-hidden
                    style={{ color: token.colorTextTertiary }}
                  />
                  <span className="sr-only">Prazo</span>
                  <ProjectDue project={project} today={today} />
                </Flex>
              )}
            </Flex>
          </Flex>
        </Card>
      </div>
    </Dropdown>
  )
}
