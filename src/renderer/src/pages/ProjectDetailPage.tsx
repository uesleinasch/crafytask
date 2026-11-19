import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useErrorBoundary } from 'react-error-boundary'
import {
  Alert,
  App,
  Button,
  Col,
  Flex,
  Grid,
  Result,
  Row,
  Spin,
  Tabs,
  type RefSelectProps
} from 'antd'
import { TriangleAlert } from 'lucide-react'
import type { Area, Project, Task, UpdateProjectInput } from '@shared/types'
import { localDateString } from '@shared/dueState'
import { ProjectHeader } from '@renderer/components/projects/ProjectHeader'
import {
  NextActionCard,
  OutcomeCard,
  ProgressCard
} from '@renderer/components/projects/ProjectSummary'
import { lacksNextAction, openTasks } from '@renderer/components/projects/projectList'
import { errorMessage } from '@renderer/components/settings/settingsStatus'
import { PageContainer } from '@renderer/components/shell/PageContainer'
import { TaskListView } from '@renderer/components/tasks/TaskListView'

interface ProjectData {
  project: Project | null
  areas: Area[]
  tasks: Task[]
}

export function ProjectDetailPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const projectId = Number(id)
  const { showBoundary } = useErrorBoundary()
  const { message } = App.useApp()
  const screens = Grid.useBreakpoint()
  const [data, setData] = useState<ProjectData | null>(null)
  const [tab, setTab] = useState('tarefas')
  const nextRef = useRef<RefSelectProps>(null)
  const today = localDateString(new Date())

  const load = useCallback(() => {
    Promise.all([
      window.api.getProject(projectId),
      window.api.listAreas(),
      window.api.listTasks({ projectId, archived: false, status: 'all' })
    ])
      .then(([project, areas, tasks]) => setData({ project: project ?? null, areas, tasks }))
      .catch(showBoundary)
  }, [projectId, showBoundary])

  useEffect(() => {
    load()
    return window.api.onTasksRefresh(load)
  }, [load])

  const save = useCallback(
    async (patch: UpdateProjectInput, success?: string): Promise<void> => {
      try {
        await window.api.updateProject(projectId, patch)
        if (success) message.success(success)
        load()
      } catch (error) {
        message.error(errorMessage(error))
      }
    },
    [projectId, load, message]
  )

  if (!data) {
    return (
      <Flex justify="center" style={{ padding: 48 }}>
        <Spin />
      </Flex>
    )
  }
  const { project, areas, tasks } = data
  if (!project) {
    return (
      <Result status="404" title="Projeto não encontrado" subTitle="Ele pode ter sido excluído." />
    )
  }

  const narrow = screens.md === false
  const nextCard = <NextActionCard ref={nextRef} project={project} tasks={tasks} onSave={save} />
  const outcomeCard = <OutcomeCard project={project} onSave={save} />
  const progressCard = <ProgressCard project={project} tasks={tasks} today={today} />
  const taskArea = (
    <TaskListView key={project.id} project={{ id: project.id, name: project.name }} />
  )

  return (
    <div className="h-full overflow-y-auto">
      <PageContainer>
        <ProjectHeader
          project={project}
          areas={areas}
          today={today}
          onSave={save}
          onReload={load}
        />
        {lacksNextAction(project) && (
          <Alert
            type="warning"
            showIcon
            icon={<TriangleAlert size={16} strokeWidth={1.75} aria-hidden />}
            style={{ marginTop: 12 }}
            message="Sem próxima ação definida: o projeto não anda até ter um próximo passo concreto."
            action={
              <Button
                size="small"
                onClick={() => {
                  setTab('resumo')
                  window.setTimeout(() => nextRef.current?.focus(), 0)
                }}
              >
                Definir
              </Button>
            }
          />
        )}
        {narrow ? (
          <Tabs
            activeKey={tab}
            onChange={setTab}
            style={{ marginTop: 8 }}
            items={[
              { key: 'tarefas', label: `Tarefas ${openTasks(project)}`, children: taskArea },
              {
                key: 'resumo',
                label: 'Resumo',
                children: (
                  <Flex vertical gap={12}>
                    {nextCard}
                    {outcomeCard}
                    {progressCard}
                  </Flex>
                )
              }
            ]}
          />
        ) : screens.xl ? (
          <Row gutter={16} wrap={false} style={{ marginTop: 16 }}>
            <Col flex="1 1 0" style={{ minWidth: 0 }}>
              {taskArea}
            </Col>
            <Col flex={screens.xxl ? '0 0 400px' : '0 0 340px'}>
              <Flex vertical gap={12}>
                {nextCard}
                {outcomeCard}
                {progressCard}
              </Flex>
            </Col>
          </Row>
        ) : (
          <>
            <Row gutter={[12, 12]} style={{ margin: '16px 0' }}>
              <Col xs={24} md={8}>
                {nextCard}
              </Col>
              <Col xs={24} md={8}>
                {outcomeCard}
              </Col>
              <Col xs={24} md={8}>
                {progressCard}
              </Col>
            </Row>
            {taskArea}
          </>
        )}
      </PageContainer>
    </div>
  )
}
