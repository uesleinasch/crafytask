import { useState } from 'react'
import { Button, Card, Checkbox, Flex, Progress, Tooltip, Typography, theme } from 'antd'
import { Circle, CircleCheck, Lock } from 'lucide-react'
import type { Context, Task } from '@shared/types'
import { StatusChip } from '@renderer/components/chips/StatusChip'
import { CategoryChip } from '@renderer/components/chips/CategoryChip'
import { LiveDot } from '@renderer/components/chips/LiveDot'
import { TaskContextMenu } from '@renderer/components/TaskContextMenu'
import { JiraTaskControls } from '@renderer/components/jira/JiraTaskControls'
import { toast } from '@renderer/components/ui/sonner'
import { useLiveSeconds } from '@renderer/hooks/useLiveSeconds'
import { CATEGORY_COLORS, timeLeakBackground, timeLeakLevel } from '@renderer/theme/semantic'
import { useThemeSettings } from '@renderer/theme/themeSettings'
import { ContextsCell } from './ContextsCell'
import { ProjectLabel } from './ProjectLabel'
import { TaskActions } from './TaskActions'
import { dueTone, formatDueShort, formatShortDuration } from './taskTableFormat'

const INTERACTIVE = 'button, a, input, label, [role="checkbox"], [data-row-click="ignore"]'

export interface TaskCardProps {
  task: Task
  selected: boolean
  onToggleSelection: (selected: boolean) => void
  onOpen: (taskId: number) => void
  onScheduleForToday?: (taskId: number) => void
  showStatus: boolean
  showProject?: boolean
  showContexts?: boolean
  contexts: Context[]
}

export function TaskCard({
  task,
  selected,
  onToggleSelection,
  onOpen,
  onScheduleForToday,
  showStatus,
  showProject = true,
  showContexts = true,
  contexts
}: TaskCardProps): React.JSX.Element {
  const { token } = theme.useToken()
  const { mode } = useThemeSettings()
  const seconds = useLiveSeconds(task)
  const [expanded, setExpanded] = useState(false)
  const [subtasks, setSubtasks] = useState<Task[] | null>(null)
  const done = task.status === 'finalizada'
  const subtaskCount = task.subtask_count ?? 0
  const completed = task.completed_subtask_count ?? 0
  const leak = timeLeakBackground(mode, timeLeakLevel(task.category, seconds))
  const mono: React.CSSProperties = {
    fontFamily: token.fontFamilyCode,
    fontVariantNumeric: 'tabular-nums'
  }

  const toggleSubtasks = async (): Promise<void> => {
    if (!expanded && subtasks === null) {
      try {
        setSubtasks(await window.api.listSubtasks(task.id))
      } catch (error) {
        console.error('[TaskCard] subtarefas', error)
        toast.error('Não foi possível carregar as subtarefas')
        return
      }
    }
    setExpanded(!expanded)
  }

  return (
    <TaskContextMenu
      task={task}
      onOpen={() => onOpen(task.id)}
      onScheduleForToday={onScheduleForToday}
    >
      <div style={{ height: '100%' }}>
        <Card
          size="small"
          hoverable
          style={{
            height: '100%',
            cursor: 'pointer',
            background: leak,
            borderColor: selected ? token.colorPrimary : undefined
          }}
          onClick={(event) => {
            const target = event.target as HTMLElement
            if (!event.currentTarget.contains(target) || target.closest(INTERACTIVE)) return
            onOpen(task.id)
          }}
        >
          <Flex vertical gap={8}>
            <Flex justify="space-between" align="start" gap={8}>
              <Flex vertical gap={2} style={{ minWidth: 0 }}>
                <Flex align="center" gap={6}>
                  <Checkbox
                    checked={selected}
                    aria-label={`Selecionar ${task.name}`}
                    onChange={(event) => onToggleSelection(event.target.checked)}
                  />
                  <Typography.Text type="secondary" style={{ ...mono, fontSize: 12 }}>
                    #{task.id}
                  </Typography.Text>
                  {task.is_blocked && (
                    <Tooltip title="Bloqueada por dependências">
                      <Lock
                        size={13}
                        strokeWidth={1.75}
                        role="img"
                        aria-label="Bloqueada por dependências"
                        style={{ color: CATEGORY_COLORS.prioridade[mode].fg }}
                      />
                    </Tooltip>
                  )}
                </Flex>
                <Flex align="center" gap={6} style={{ minWidth: 0 }}>
                  {task.is_running && <LiveDot label="Timer rodando" />}
                  <Typography.Link
                    href={`#/task/${task.id}`}
                    delete={done}
                    style={{
                      fontWeight: 500,
                      minWidth: 0,
                      color: done ? token.colorTextTertiary : token.colorText
                    }}
                  >
                    {task.name}
                  </Typography.Link>
                </Flex>
                {subtaskCount > 0 && (
                  <Button
                    type="text"
                    size="small"
                    aria-expanded={expanded}
                    aria-label={`Subtarefas ${completed}/${subtaskCount} concluídas, ${expanded ? 'recolher' : 'expandir'}`}
                    onClick={() => void toggleSubtasks()}
                    style={{ alignSelf: 'flex-start', paddingInline: 4 }}
                  >
                    <Flex align="center" gap={8}>
                      <Progress
                        percent={Math.round((completed / subtaskCount) * 100)}
                        size={[96, 4]}
                        showInfo={false}
                      />
                      <Typography.Text type="secondary" style={{ ...mono, fontSize: 12 }}>
                        {completed}/{subtaskCount}
                      </Typography.Text>
                    </Flex>
                  </Button>
                )}
              </Flex>
              <TaskActions
                task={task}
                onOpen={onOpen}
                onScheduleForToday={onScheduleForToday}
                showTimer={false}
              />
            </Flex>

            {expanded && subtasks && (
              <Flex
                vertical
                gap={4}
                style={{
                  paddingInlineStart: 12,
                  borderInlineStart: `2px solid ${token.colorBorderSecondary}`
                }}
              >
                {subtasks.map((sub) => {
                  const subDone = sub.status === 'finalizada'
                  const Icon = subDone ? CircleCheck : Circle
                  return (
                    <Flex key={sub.id} align="center" gap={6} style={{ minWidth: 0 }}>
                      <Icon
                        size={12}
                        strokeWidth={1.75}
                        aria-hidden
                        style={{ flex: 'none', color: token.colorTextTertiary }}
                      />
                      <Typography.Text
                        ellipsis
                        delete={subDone}
                        type={subDone ? 'secondary' : undefined}
                        style={{ fontSize: 12, minWidth: 0 }}
                      >
                        {sub.name}
                      </Typography.Text>
                    </Flex>
                  )
                })}
              </Flex>
            )}

            <Flex gap={6} wrap="wrap" align="center">
              {showStatus && <StatusChip status={task.status} />}
              {task.category && task.category !== 'normal' && (
                <CategoryChip category={task.category} />
              )}
              {showProject && task.project_name && (
                <ProjectLabel name={task.project_name} color={task.project_color} />
              )}
              {showContexts && (task.contexts?.length ?? 0) > 0 && (
                <ContextsCell taskId={task.id} value={task.contexts ?? []} options={contexts} />
              )}
              {task.due_date && (
                <Typography.Text
                  type={dueTone(task.due_date, new Date())}
                  style={{ ...mono, fontSize: 12 }}
                >
                  {formatDueShort(task.due_date, task.due_time)}
                </Typography.Text>
              )}
              <JiraTaskControls task={task} />
              <span style={{ ...mono, marginInlineStart: 'auto' }}>
                {formatShortDuration(seconds)}
              </span>
            </Flex>
          </Flex>
        </Card>
      </div>
    </TaskContextMenu>
  )
}
