import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { App, Button, DatePicker, Dropdown, Flex, Input, Select, Typography, theme } from 'antd'
import dayjs from 'dayjs'
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  CalendarDays,
  Copy,
  Ellipsis,
  FolderOpen,
  SquareTerminal,
  Trash2,
  TrendingUp
} from 'lucide-react'
import {
  PROJECT_STATUS_LABELS,
  type Area,
  type Project,
  type ProjectStatus,
  type UpdateProjectInput
} from '@shared/types'
import { PROJECT_STATUS_ICONS } from '@renderer/components/chips/projectStatusMeta'
import { PropPill } from '@renderer/components/tasks/propertyPills'
import { TerminalProjectButton } from '@renderer/components/terminal/TerminalProjectButton'
import { PROJECT_STATUS_COLORS, USER_COLORS } from '@renderer/theme/semantic'
import { useThemeSettings } from '@renderer/theme/themeSettings'
import { NO_AREA, daysUntil, deleteWarning, dueTone } from './projectList'

const ICON = { size: 14, strokeWidth: 1.75, 'aria-hidden': true } as const
const STATUSES = Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]

interface ProjectHeaderProps {
  project: Project
  areas: Area[]
  today: string
  onSave: (patch: UpdateProjectInput, success?: string) => Promise<void>
  onReload: () => void
}

function dueLabel(date: string, today: string): string {
  const days = daysUntil(date, today)
  const left = days < 0 ? `venceu há ${-days}d` : days === 0 ? 'hoje' : `faltam ${days}d`
  return `Prazo ${date.slice(8, 10)}/${date.slice(5, 7)} · ${left}`
}

export function ProjectHeader({
  project,
  areas,
  today,
  onSave,
  onReload
}: ProjectHeaderProps): React.JSX.Element {
  const navigate = useNavigate()
  const { token } = theme.useToken()
  const { mode } = useThemeSettings()
  const { message, modal } = App.useApp()
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description ?? '')
  useEffect(() => setName(project.name), [project.name])
  useEffect(() => setDescription(project.description ?? ''), [project.description])

  const due = project.due_date?.slice(0, 10)
  const tone = dueTone(project, today)
  const archived = project.status === 'archived'

  const pickDirectory = async (): Promise<void> => {
    const dir = await window.api.terminalPickProjectDirectory(project.id)
    if (dir) onReload()
  }

  const more = {
    items: [
      { key: 'copy', icon: <Copy {...ICON} />, label: 'Copiar nome' },
      {
        key: 'archive',
        icon: archived ? <ArchiveRestore {...ICON} /> : <Archive {...ICON} />,
        label: archived ? 'Reativar' : 'Arquivar'
      },
      { type: 'divider' as const },
      { key: 'delete', icon: <Trash2 {...ICON} />, label: 'Excluir projeto…', danger: true }
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'copy') {
        void navigator.clipboard.writeText(project.name).then(() => message.success('Nome copiado'))
      }
      if (key === 'archive') {
        void onSave(
          { status: archived ? 'active' : 'archived' },
          archived ? 'Projeto reativado' : 'Projeto arquivado'
        )
      }
      if (key === 'delete') {
        modal.confirm({
          title: `Excluir o projeto ${project.name}?`,
          content: deleteWarning(project),
          okText: 'Excluir',
          okButtonProps: { danger: true },
          cancelText: 'Cancelar',
          onOk: async () => {
            await window.api.deleteProject(project.id)
            message.success('Projeto excluído')
            void navigate('/projects')
          }
        })
      }
    }
  }

  return (
    <div>
      <Flex align="center" gap={6} wrap="wrap">
        <Button
          size="small"
          type="text"
          icon={<ArrowLeft {...ICON} />}
          onClick={() => void navigate('/projects')}
        >
          Projetos
        </Button>
        {project.area_name && (
          <>
            <Typography.Text type="secondary" aria-hidden>
              /
            </Typography.Text>
            <Typography.Link
              href="#/horizons"
              onClick={(e) => {
                e.preventDefault()
                void navigate('/horizons')
              }}
              style={{ color: token.colorTextSecondary }}
            >
              {project.area_name}
            </Typography.Link>
          </>
        )}
      </Flex>
      <Flex align="flex-start" gap={12} wrap="wrap" style={{ marginTop: 8 }}>
        <div style={{ flex: '1 1 380px', minWidth: 0 }}>
          <Select<ProjectStatus>
            size="small"
            variant="filled"
            value={project.status}
            onChange={(status) => void onSave({ status }, 'Status do projeto alterado')}
            style={{ width: 150 }}
            popupMatchSelectWidth={false}
            aria-label="Status do projeto"
            options={STATUSES.map((status) => {
              const Icon = PROJECT_STATUS_ICONS[status]
              return {
                value: status,
                label: (
                  <Flex align="center" gap={6}>
                    <Icon {...ICON} color={PROJECT_STATUS_COLORS[status][mode].fg} />
                    {PROJECT_STATUS_LABELS[status]}
                  </Flex>
                )
              }
            })}
          />
          <Flex align="center" gap={10} style={{ marginTop: 4 }}>
            <span
              aria-hidden
              style={{
                width: 14,
                height: 14,
                borderRadius: 999,
                flex: 'none',
                background: project.color
              }}
            />
            <Input
              variant="borderless"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => {
                const next = name.trim()
                if (!next) setName(project.name)
                else if (next !== project.name) void onSave({ name: next })
              }}
              onPressEnter={(e) => e.currentTarget.blur()}
              aria-label="Nome do projeto"
              style={{ fontSize: 22, fontWeight: 600, padding: '2px 0', letterSpacing: '-.01em' }}
            />
          </Flex>
          <Input.TextArea
            variant="borderless"
            autoSize={{ minRows: 1, maxRows: 4 }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => {
              if (description !== (project.description ?? '')) void onSave({ description })
            }}
            placeholder="Adicionar descrição"
            aria-label="Descrição"
            style={{ padding: 0, color: token.colorTextSecondary }}
          />
        </div>
        <Flex align="center" gap={4} wrap="wrap" style={{ flex: 'none' }}>
          {project.working_dir && (
            <TerminalProjectButton projectId={project.id} workingDir={project.working_dir} />
          )}
          <Dropdown menu={more} trigger={['click']} placement="bottomRight">
            <Button
              type="text"
              aria-label="Mais ações"
              icon={<Ellipsis size={16} strokeWidth={1.75} />}
            />
          </Dropdown>
        </Flex>
      </Flex>
      <Flex wrap="wrap" gap={6} style={{ marginTop: 10 }}>
        <PropPill
          label="Área de foco"
          icon={TrendingUp}
          muted={!project.area_id}
          content={
            <Flex vertical gap={8}>
              <Select
                allowClear
                placeholder={NO_AREA}
                value={project.area_id ?? undefined}
                onChange={(areaId?: number) => void onSave({ area_id: areaId ?? null })}
                options={areas.map((a) => ({ value: a.id, label: a.name }))}
                aria-label="Área de foco"
              />
              <Typography.Link
                href="#/horizons"
                onClick={(e) => {
                  e.preventDefault()
                  void navigate('/horizons')
                }}
              >
                Ver em Horizontes →
              </Typography.Link>
            </Flex>
          }
        >
          {project.area_name || 'Área de foco'}
        </PropPill>
        <PropPill
          label="Prazo"
          icon={CalendarDays}
          muted={!due}
          tone={
            tone === 'overdue' ? token.colorError : tone === 'soon' ? token.colorWarning : undefined
          }
          content={
            <Flex vertical gap={8}>
              <DatePicker
                format="DD/MM/YYYY"
                placeholder="Data limite"
                value={due ? dayjs(due) : null}
                onChange={(d) => void onSave({ due_date: d ? d.format('YYYY-MM-DD') : null })}
                aria-label="Data limite"
              />
              {due && (
                <Button
                  type="link"
                  size="small"
                  style={{ padding: 0, alignSelf: 'flex-start' }}
                  onClick={() => void onSave({ due_date: null })}
                >
                  Remover prazo
                </Button>
              )}
            </Flex>
          }
        >
          {due ? dueLabel(due, today) : 'Prazo'}
        </PropPill>
        <PropPill
          label="Cor"
          content={
            <Flex gap={8} wrap role="group" aria-label="Cor">
              {USER_COLORS.map((color) => {
                const on = project.color.toLowerCase() === color.toLowerCase()
                return (
                  <button
                    key={color}
                    type="button"
                    aria-pressed={on}
                    aria-label={`Cor ${color}`}
                    onClick={() => void onSave({ color })}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      cursor: 'pointer',
                      background: color,
                      border: 'none',
                      boxShadow: on
                        ? `0 0 0 2px ${token.colorBgElevated}, 0 0 0 4px ${token.colorText}`
                        : undefined
                    }}
                  />
                )
              })}
            </Flex>
          }
        >
          <span
            aria-hidden
            style={{ width: 8, height: 8, borderRadius: 999, background: project.color }}
          />
          Cor
        </PropPill>
        <PropPill
          label="Diretório de trabalho"
          icon={SquareTerminal}
          muted={!project.working_dir}
          content={
            <Flex vertical gap={8}>
              <Typography.Text
                style={{ fontSize: 12, fontFamily: token.fontFamilyCode, wordBreak: 'break-all' }}
              >
                {project.working_dir || 'Nenhum diretório'}
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Tarefas sem diretório próprio abrem o terminal aqui.
              </Typography.Text>
              <Flex gap={6}>
                <Button
                  size="small"
                  icon={<FolderOpen {...ICON} />}
                  onClick={() => void pickDirectory()}
                >
                  {project.working_dir ? 'Alterar' : 'Escolher'}
                </Button>
                {project.working_dir && (
                  <Button
                    size="small"
                    type="text"
                    danger
                    onClick={() => void onSave({ working_dir: null })}
                  >
                    Remover
                  </Button>
                )}
              </Flex>
            </Flex>
          }
        >
          {project.working_dir
            ? `…/${project.working_dir.split('/').filter(Boolean).slice(-2).join('/')}`
            : 'Diretório'}
        </PropPill>
      </Flex>
    </div>
  )
}
