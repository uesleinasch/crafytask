import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useErrorBoundary } from 'react-error-boundary'
import {
  App,
  Button,
  Card,
  Dropdown,
  Empty,
  Flex,
  Grid,
  Select,
  Spin,
  Tag,
  Tooltip,
  Typography,
  theme,
  type MenuProps
} from 'antd'
import {
  ArrowLeftRight,
  Ellipsis,
  Filter,
  Folder,
  Pause,
  Pencil,
  Play,
  Plus,
  Trash2
} from 'lucide-react'
import type { Area, Goal, GoalHorizon } from '@shared/types'
import { localDateString } from '@shared/dueState'
import { LiveDot } from '@renderer/components/chips/LiveDot'
import { AreaModal } from '@renderer/components/horizons/AreaModal'
import { GoalModal } from '@renderer/components/horizons/GoalModal'
import { HorizonChip } from '@renderer/components/horizons/HorizonChip'
import {
  areaDraft,
  goalDraft,
  type AreaDraft,
  type GoalDraft
} from '@renderer/components/horizons/horizonDrafts'
import {
  GOAL_HORIZONS,
  HORIZONS,
  areaCounts,
  areaSummary,
  deleteAreaWarning,
  emptyLevelText,
  filterByArea,
  horizonSectionId,
  type HorizonData,
  type HorizonDef
} from '@renderer/components/horizons/horizonLevels'
import { NextActionCell, ProjectProgress } from '@renderer/components/projects/ProjectCells'
import {
  deleteGoalWarning,
  goalProjectsPath,
  goalProjectsSummary
} from '@renderer/components/projects/projectGoals'
import { errorMessage } from '@renderer/components/settings/settingsStatus'
import { PageContainer } from '@renderer/components/shell/PageContainer'
import { ProjectLabel } from '@renderer/components/tasks/ProjectLabel'
import { dueTone, formatDueShort } from '@renderer/components/tasks/taskTableFormat'
import { useTimerStore } from '@renderer/stores/timerStore'

const ICON = { size: 14, strokeWidth: 1.75, 'aria-hidden': true } as const

export function HorizonsPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { showBoundary } = useErrorBoundary()
  const { message, modal } = App.useApp()
  const { token } = theme.useToken()
  const screens = Grid.useBreakpoint()
  const timers = useTimerStore((s) => s.timers)
  const startTimer = useTimerStore((s) => s.startTimer)
  const stopTimer = useTimerStore((s) => s.stopTimer)
  const [data, setData] = useState<HorizonData | null>(null)
  const [areaId, setAreaId] = useState<number | null>(null)
  const [areaEdit, setAreaEdit] = useState<AreaDraft | null>(null)
  const [goalEdit, setGoalEdit] = useState<GoalDraft | null>(null)

  const load = useCallback(() => {
    Promise.all([
      window.api.listAreas(),
      window.api.listGoals(),
      window.api.listProjects(),
      window.api.getTasksForDate(localDateString(new Date()))
    ])
      .then(([areas, goals, projects, today]) => setData({ areas, goals, projects, today }))
      .catch(showBoundary)
  }, [showBoundary])

  useEffect(() => {
    load()
    return window.api.onTasksRefresh(load)
  }, [load])

  const view = useMemo(() => (data ? filterByArea(data, areaId) : null), [data, areaId])

  if (!data || !view) {
    return (
      <Flex justify="center" style={{ padding: 48 }}>
        <Spin />
      </Flex>
    )
  }

  const filtered = areaId !== null
  const areaById = new Map(data.areas.map((a) => [a.id, a]))
  const selectedArea = areaId !== null ? areaById.get(areaId) : undefined
  const scrollTo = (h: number): void => {
    document
      .getElementById(horizonSectionId(h as HorizonDef['h']))
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const newGoal = (h: GoalHorizon): void =>
    setGoalEdit({ name: '', horizon: h, areaId, description: '' })

  const areaTag = (id: number | null | undefined): React.ReactNode => {
    const area = id ? areaById.get(id) : undefined
    if (!area) {
      return (
        <Tag bordered={false} style={{ margin: 0 }}>
          todas as áreas
        </Tag>
      )
    }
    return (
      <Tag bordered={false} style={{ margin: 0 }}>
        <button
          type="button"
          className="ct-linkbutton"
          aria-label={`Filtrar por ${area.name}`}
          onClick={(e) => {
            e.stopPropagation()
            setAreaId(area.id)
          }}
        >
          {area.icon} {area.name}
        </button>
      </Tag>
    )
  }

  const level = (
    lv: HorizonDef,
    count: number,
    children: React.ReactNode,
    onAdd?: () => void
  ): React.ReactNode => (
    <section
      key={lv.h}
      id={horizonSectionId(lv.h)}
      className="ct-hzsection"
      aria-labelledby={`${horizonSectionId(lv.h)}-title`}
    >
      <Card
        size="small"
        styles={{ header: { paddingBlock: 12 } }}
        title={
          <Flex align="center" gap={14}>
            <HorizonChip h={lv.h} />
            <Flex vertical gap={2} style={{ minWidth: 0 }}>
              <Flex align="center" gap={8}>
                <Typography.Text strong id={`${horizonSectionId(lv.h)}-title`}>
                  {lv.label}
                </Typography.Text>
                <Typography.Text
                  type="secondary"
                  style={{
                    fontSize: 12,
                    fontFamily: token.fontFamilyCode,
                    fontVariantNumeric: 'tabular-nums'
                  }}
                >
                  {count}
                </Typography.Text>
              </Flex>
              <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
                {lv.sub}
              </Typography.Text>
            </Flex>
          </Flex>
        }
        extra={
          onAdd && (
            <Button size="small" icon={<Plus {...ICON} />} onClick={onAdd}>
              Adicionar
            </Button>
          )
        }
      >
        {children}
      </Card>
    </section>
  )

  const empty = (text: string, action?: React.ReactNode): React.ReactNode => (
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={text} style={{ margin: '8px 0' }}>
      {action}
    </Empty>
  )

  const h0 = level(
    HORIZONS[0],
    view.today.length,
    view.today.length ? (
      <Flex vertical gap={2}>
        {view.today.map((task) => {
          const running = !!timers[task.id]
          const due = task.due_date?.slice(0, 10)
          const tone = dueTone(due, new Date())
          return (
            <div
              key={task.id}
              className="ct-hzrow"
              onClick={() => void navigate(`/task/${task.id}`)}
            >
              {running && <LiveDot label="Timer rodando" />}
              <Typography.Link
                href={`#/task/${task.id}`}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  void navigate(`/task/${task.id}`)
                }}
                ellipsis
                style={{ flex: 1, minWidth: 0, color: token.colorText }}
              >
                {task.name}
              </Typography.Link>
              {task.project_name && (
                <ProjectLabel name={task.project_name} color={task.project_color} />
              )}
              {due && (
                <Typography.Text
                  type={tone ?? 'secondary'}
                  style={{
                    fontSize: 12,
                    fontFamily: token.fontFamilyCode,
                    fontVariantNumeric: 'tabular-nums',
                    flex: 'none'
                  }}
                >
                  {formatDueShort(due, task.due_time)}
                </Typography.Text>
              )}
              <Tooltip title={task.is_blocked ? 'Bloqueada' : running ? 'Pausar' : 'Iniciar timer'}>
                <Button
                  size="small"
                  type="text"
                  disabled={task.is_blocked}
                  aria-label={running ? `Pausar ${task.name}` : `Iniciar timer de ${task.name}`}
                  icon={running ? <Pause {...ICON} /> : <Play {...ICON} />}
                  onClick={(e) => {
                    e.stopPropagation()
                    ;(running ? stopTimer(task.id) : startTimer(task.id)).catch((error) =>
                      message.error(errorMessage(error))
                    )
                  }}
                />
              </Tooltip>
            </div>
          )
        })}
      </Flex>
    ) : (
      empty(
        `Nada planejado para hoje${filtered ? ' nesta área.' : '.'}`,
        <Button onClick={() => void navigate('/today')}>Abrir o plano do dia</Button>
      )
    )
  )

  const h1 = level(
    HORIZONS[1],
    view.projects.length,
    view.projects.length ? (
      <Flex vertical gap={2}>
        {view.projects.map((project) => (
          <div
            key={project.id}
            className="ct-hzrow"
            style={{ flexWrap: 'wrap', rowGap: 6 }}
            onClick={() => void navigate(`/project/${project.id}`)}
          >
            <span
              aria-hidden
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                flex: 'none',
                background: project.color
              }}
            />
            <Typography.Link
              href={`#/project/${project.id}`}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                void navigate(`/project/${project.id}`)
              }}
              style={{ color: token.colorText, fontWeight: 500 }}
            >
              {project.name}
            </Typography.Link>
            {!filtered && areaTag(project.area_id)}
            <div style={{ flex: 1, minWidth: 0 }}>
              <NextActionCell project={project} />
            </div>
            <ProjectProgress project={project} width={56} />
          </div>
        ))}
      </Flex>
    ) : (
      empty(
        `Nenhum projeto ativo${filtered ? ' nesta área.' : '.'}`,
        <Button onClick={() => void navigate('/projects')}>Abrir projetos</Button>
      )
    )
  )

  const areaMenu = (area: Area): MenuProps => ({
    items: [
      { key: 'filter', icon: <Filter {...ICON} />, label: 'Ver só esta área nos horizontes' },
      { key: 'projects', icon: <Folder {...ICON} />, label: 'Ver projetos da área' },
      { key: 'edit', icon: <Pencil {...ICON} />, label: 'Editar' },
      { type: 'divider' },
      { key: 'delete', icon: <Trash2 {...ICON} />, label: 'Excluir…', danger: true }
    ],
    onClick: ({ key, domEvent }) => {
      domEvent.stopPropagation()
      if (key === 'filter') setAreaId(area.id)
      if (key === 'projects') void navigate(`/projects?q=${encodeURIComponent(area.name)}`)
      if (key === 'edit') setAreaEdit(areaDraft(area))
      if (key === 'delete') {
        modal.confirm({
          title: `Excluir a área ${area.name}?`,
          content: deleteAreaWarning(area, data.projects, data.goals),
          okText: 'Excluir',
          okButtonProps: { danger: true },
          cancelText: 'Cancelar',
          onOk: () =>
            window.api
              .deleteArea(area.id)
              .then(() => {
                if (areaId === area.id) setAreaId(null)
                message.success('Área excluída')
                load()
              })
              .catch((error) => message.error(errorMessage(error)))
        })
      }
    }
  })

  const h2 = level(
    HORIZONS[2],
    view.areas.length,
    view.areas.length ? (
      <div className="ct-hzareas">
        {view.areas.map((area) => {
          const on = areaId === area.id
          return (
            <Dropdown key={area.id} menu={areaMenu(area)} trigger={['contextMenu']}>
              <div className={on ? 'ct-hzarea on' : 'ct-hzarea'}>
                <button
                  type="button"
                  className="ct-hzarea-main"
                  aria-pressed={on}
                  title={`Filtrar os horizontes por ${area.name}`}
                  onClick={() => setAreaId(on ? null : area.id)}
                >
                  <span className="ct-emoji-box" aria-hidden>
                    {area.icon}
                  </span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <Typography.Text strong style={{ display: 'block' }}>
                      {area.name}
                    </Typography.Text>
                    {area.description && (
                      <Typography.Text
                        type="secondary"
                        ellipsis
                        style={{ fontSize: 12, display: 'block' }}
                      >
                        {area.description}
                      </Typography.Text>
                    )}
                    <Typography.Text
                      type="secondary"
                      style={{
                        fontSize: 12,
                        display: 'block',
                        fontFamily: token.fontFamilyCode,
                        fontVariantNumeric: 'tabular-nums'
                      }}
                    >
                      {areaSummary(areaCounts(area, data.projects, data.goals))}
                    </Typography.Text>
                  </span>
                </button>
                <Dropdown menu={areaMenu(area)} trigger={['click']} placement="bottomRight">
                  <Button
                    size="small"
                    type="text"
                    aria-label={`Mais ações de ${area.name}`}
                    icon={<Ellipsis {...ICON} />}
                  />
                </Dropdown>
              </div>
            </Dropdown>
          )
        })}
      </div>
    ) : (
      empty('Nenhuma área de foco.')
    ),
    () => setAreaEdit(areaDraft())
  )

  const openGoalProjects = (goal: Goal): void => {
    void navigate(goalProjectsPath(goal.id))
  }

  const goalMenu = (goal: Goal): MenuProps => ({
    items: [
      { key: 'projects', icon: <Folder {...ICON} />, label: 'Ver projetos da meta' },
      { key: 'edit', icon: <Pencil {...ICON} />, label: 'Editar' },
      {
        key: 'move',
        icon: <ArrowLeftRight {...ICON} />,
        label: 'Mover para',
        children: GOAL_HORIZONS.map((lv) => ({
          key: `move:${lv.h}`,
          label: `${goal.horizon === lv.h ? '✓ ' : ''}H${lv.h} — ${lv.label}`
        }))
      },
      { type: 'divider' },
      { key: 'delete', icon: <Trash2 {...ICON} />, label: 'Excluir…', danger: true }
    ],
    onClick: ({ key, domEvent }) => {
      domEvent.stopPropagation()
      const [kind, value] = key.split(':')
      if (kind === 'projects') openGoalProjects(goal)
      if (kind === 'edit') setGoalEdit(goalDraft(goal))
      if (kind === 'move') {
        const horizon = Number(value) as GoalHorizon
        if (horizon === goal.horizon) return
        window.api
          .updateGoal(goal.id, { horizon })
          .then(() => {
            message.success(`Movida para H${horizon}`)
            load()
          })
          .catch((error) => message.error(errorMessage(error)))
      }
      if (kind === 'delete') {
        modal.confirm({
          title: `Excluir "${goal.name}"?`,
          content: deleteGoalWarning(goal, data.projects),
          okText: 'Excluir',
          okButtonProps: { danger: true },
          cancelText: 'Cancelar',
          onOk: () =>
            window.api
              .deleteGoal(goal.id)
              .then(() => {
                message.success('Meta excluída')
                load()
              })
              .catch((error) => message.error(errorMessage(error)))
        })
      }
    }
  })

  const goalLevel = (lv: HorizonDef & { h: GoalHorizon }): React.ReactNode => {
    const list = view.goals[lv.h]
    return level(
      lv,
      list.length,
      list.length ? (
        <div>
          {list.map((goal) => (
            <Dropdown key={goal.id} menu={goalMenu(goal)} trigger={['contextMenu']}>
              <div className="ct-hzgoal" onClick={() => openGoalProjects(goal)}>
                <span style={{ fontSize: 18 }} aria-hidden>
                  {lv.emoji}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Flex align="center" gap={8} wrap>
                    <button
                      type="button"
                      className="ct-linkbutton ct-hzgoal-name"
                      title="Ver projetos da meta"
                      onClick={(e) => {
                        e.stopPropagation()
                        openGoalProjects(goal)
                      }}
                    >
                      {goal.name}
                    </button>
                    {areaTag(goal.area_id)}
                  </Flex>
                  {goal.description && (
                    <Typography.Text
                      type="secondary"
                      style={{
                        whiteSpace: 'pre-wrap',
                        fontSize: 13,
                        display: 'block',
                        marginTop: 2
                      }}
                    >
                      {goal.description}
                    </Typography.Text>
                  )}
                  <Typography.Text
                    type="secondary"
                    style={{
                      fontSize: 12,
                      display: 'block',
                      marginTop: 2,
                      fontFamily: token.fontFamilyCode,
                      fontVariantNumeric: 'tabular-nums'
                    }}
                  >
                    {goalProjectsSummary(goal.project_count ?? 0)}
                  </Typography.Text>
                </div>
                <Dropdown menu={goalMenu(goal)} trigger={['click']} placement="bottomRight">
                  <Button
                    size="small"
                    type="text"
                    aria-label={`Mais ações de ${goal.name}`}
                    icon={<Ellipsis {...ICON} />}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Dropdown>
              </div>
            </Dropdown>
          ))}
        </div>
      ) : (
        empty(emptyLevelText(lv.label, filtered))
      ),
      () => newGoal(lv.h)
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <PageContainer>
        <Flex gap={8} wrap align="center" style={{ marginBottom: 16 }}>
          <Select
            allowClear
            placeholder="Todas as áreas"
            value={areaId ?? undefined}
            onChange={(id?: number) => setAreaId(id ?? null)}
            style={{ width: 240 }}
            aria-label="Filtrar por área"
            options={data.areas.map((a) => ({ value: a.id, label: `${a.icon} ${a.name}` }))}
          />
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            {selectedArea
              ? `Mostrando ações, projetos e metas de ${selectedArea.name}. Metas sem área aparecem em todas.`
              : 'Escolha uma área para ver do propósito à ação de hoje.'}
          </Typography.Text>
          <div style={{ flex: 1 }} />
          <Button icon={<Plus {...ICON} />} onClick={() => setAreaEdit(areaDraft())}>
            Nova área
          </Button>
          <Button type="primary" icon={<Plus {...ICON} />} onClick={() => newGoal(3)}>
            Nova meta
          </Button>
        </Flex>
        <Flex gap={24} align="flex-start">
          {screens.lg && (
            <nav className="ct-hzrail" aria-label="Níveis">
              {HORIZONS.map((lv) => (
                <button key={lv.h} type="button" onClick={() => scrollTo(lv.h)}>
                  <HorizonChip h={lv.h} />
                  <span>{lv.label}</span>
                </button>
              ))}
            </nav>
          )}
          <Flex vertical gap={16} style={{ flex: 1, minWidth: 0 }}>
            {h0}
            {h1}
            {h2}
            {GOAL_HORIZONS.map(goalLevel)}
          </Flex>
        </Flex>
      </PageContainer>
      <AreaModal
        draft={areaEdit}
        onClose={() => setAreaEdit(null)}
        onSaved={() => {
          setAreaEdit(null)
          load()
        }}
      />
      <GoalModal
        draft={goalEdit}
        areas={data.areas}
        onClose={() => setGoalEdit(null)}
        onSaved={() => {
          setGoalEdit(null)
          load()
        }}
      />
    </div>
  )
}
