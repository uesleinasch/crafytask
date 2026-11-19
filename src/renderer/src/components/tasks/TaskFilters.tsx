import { Badge, Button, Checkbox, Drawer, Flex, Grid, Popover, Select, Typography } from 'antd'
import { ListFilter } from 'lucide-react'
import { useState } from 'react'
import type { Context, Project, Tag, TaskCategory } from '@shared/types'
import {
  EMPTY_TASK_FILTERS,
  STALE_DAYS_OPTIONS,
  activeFilterCount,
  type TaskFiltersValue
} from './taskFilterState'
import { CATEGORY_CHIP_LABELS } from '@renderer/components/chips/categoryMeta'

const NO_PROJECT = -1
const CATEGORIES: TaskCategory[] = ['urgente', 'prioridade', 'normal', 'time_leak']
const search = { optionFilterProp: 'label' }

interface TaskFiltersProps {
  value: TaskFiltersValue
  onChange: (patch: Partial<TaskFiltersValue>) => void
  contexts: Context[]
  projects: Project[]
  tags: Tag[]
  shown: number
  total: number
  hideProject?: boolean
}

export function TaskFilters({
  value,
  onChange,
  contexts,
  projects,
  tags,
  shown,
  total,
  hideProject
}: TaskFiltersProps): React.JSX.Element {
  const screens = Grid.useBreakpoint()
  const [open, setOpen] = useState(false)
  const count = activeFilterCount(value)
  const narrow = screens.md === false

  const panel = (
    <Flex vertical gap={10} style={{ width: narrow ? '100%' : 280 }}>
      <Select
        aria-label="Categoria"
        placeholder="Categoria"
        allowClear
        value={value.category === 'all' ? undefined : value.category}
        onChange={(category) => onChange({ category: category ?? 'all' })}
        options={CATEGORIES.map((category) => ({
          value: category,
          label: CATEGORY_CHIP_LABELS[category]
        }))}
      />
      <Select
        aria-label="Contexto"
        placeholder="Contexto"
        allowClear
        showSearch={search}
        value={value.contextId ?? undefined}
        onChange={(contextId) => onChange({ contextId: contextId ?? null })}
        options={contexts.map((context) => ({
          value: context.id,
          label: `${context.icon} ${context.name}`
        }))}
      />
      {!hideProject && (
        <Select
          aria-label="Projeto"
          placeholder="Projeto"
          allowClear
          showSearch={search}
          value={value.projectId ?? undefined}
          onChange={(projectId) => onChange({ projectId: projectId ?? null })}
          options={[
            { value: NO_PROJECT, label: 'Sem projeto' },
            ...projects.map((project) => ({ value: project.id, label: project.name }))
          ]}
        />
      )}
      <Select
        aria-label="Tag"
        placeholder="Tag"
        allowClear
        showSearch={search}
        value={value.tagId ?? undefined}
        onChange={(tagId) => onChange({ tagId: tagId ?? null })}
        options={tags.map((tag) => ({ value: tag.id, label: tag.name }))}
      />
      <Select
        aria-label="Ordenar"
        value={value.sort}
        onChange={(sort) => onChange({ sort })}
        options={[
          { value: 'updated', label: 'Ordenar por atualização' },
          { value: 'due_date', label: 'Ordenar por prazo' },
          { value: 'status_changed', label: 'Ordenar pela mais parada' }
        ]}
      />
      <Select
        aria-label="Parada há"
        placeholder="Parada há…"
        allowClear
        value={value.staleDays ?? undefined}
        onChange={(staleDays) => onChange({ staleDays: staleDays ?? null })}
        options={STALE_DAYS_OPTIONS.map((days) => ({
          value: days,
          label: `Parada há mais de ${days} dias`
        }))}
      />
      <Checkbox
        checked={value.overdue}
        onChange={(event) => onChange({ overdue: event.target.checked })}
      >
        Só com prazo vencido
      </Checkbox>
      <Checkbox
        checked={value.blockedOnly}
        onChange={(event) => onChange({ blockedOnly: event.target.checked })}
      >
        Só bloqueadas
      </Checkbox>
      <Flex justify="space-between" align="center">
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Mostrando {shown} de {total}
        </Typography.Text>
        <Button
          type="link"
          size="small"
          disabled={count === 0}
          onClick={() => onChange(EMPTY_TASK_FILTERS)}
          style={{ paddingInline: 0 }}
        >
          Limpar filtros
        </Button>
      </Flex>
    </Flex>
  )

  const trigger = (
    <Button icon={<ListFilter size={16} strokeWidth={1.75} />} onClick={() => setOpen(!open)}>
      Filtros
      {count > 0 && <Badge count={count} size="small" />}
    </Button>
  )

  if (narrow) {
    return (
      <>
        {trigger}
        <Drawer
          title="Filtros"
          placement="bottom"
          size={420}
          open={open}
          onClose={() => setOpen(false)}
        >
          {panel}
        </Drawer>
      </>
    )
  }

  return (
    <Popover
      trigger="click"
      placement="bottomLeft"
      title="Filtros"
      content={panel}
      open={open}
      onOpenChange={setOpen}
    >
      {trigger}
    </Popover>
  )
}
