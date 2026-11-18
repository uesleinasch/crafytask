import type { ReactNode } from 'react'
import { Space, Tabs, theme } from 'antd'
import { FileText, Lock, Network, Timer } from 'lucide-react'
import type { Task } from '@shared/types'
import { CATEGORY_COLORS } from '@renderer/theme/semantic'
import { useThemeSettings } from '@renderer/theme/themeSettings'

export type InspectorTab = 'tempo' | 'detalhes' | 'relacoes'

export interface InspectorPanels {
  tempo: ReactNode
  detalhes: ReactNode
  relacoes: ReactNode
}

const ICON = { size: 14, strokeWidth: 1.75, 'aria-hidden': true } as const

function useInspectorLabels(task: Task): Record<InspectorTab, ReactNode> {
  const { token } = theme.useToken()
  const { mode } = useThemeSettings()
  const total = task.subtask_count ?? 0
  return {
    tempo: (
      <Space size={4}>
        <Timer {...ICON} />
        Tempo
      </Space>
    ),
    detalhes: (
      <Space size={4}>
        <FileText {...ICON} />
        Detalhes
      </Space>
    ),
    relacoes: (
      <Space size={4}>
        {task.is_blocked ? (
          <Lock
            size={14}
            strokeWidth={1.75}
            role="img"
            aria-label="Bloqueada"
            color={CATEGORY_COLORS.prioridade[mode].fg}
          />
        ) : (
          <Network {...ICON} />
        )}
        Relações
        {total > 0 && (
          <span
            style={{
              fontFamily: token.fontFamilyCode,
              fontVariantNumeric: 'tabular-nums',
              fontSize: 12,
              color: token.colorTextSecondary
            }}
          >
            {task.completed_subtask_count ?? 0}/{total}
          </span>
        )}
      </Space>
    )
  }
}

interface TaskInspectorProps {
  task: Task
  activeKey: InspectorTab
  onChange: (key: InspectorTab) => void
  panels: InspectorPanels
}

export function TaskInspector({
  task,
  activeKey,
  onChange,
  panels
}: TaskInspectorProps): React.JSX.Element {
  const labels = useInspectorLabels(task)
  return (
    <Tabs
      size="small"
      activeKey={activeKey}
      onChange={(key) => onChange(key as InspectorTab)}
      items={(['tempo', 'detalhes', 'relacoes'] as const).map((key) => ({
        key,
        label: labels[key],
        children: panels[key]
      }))}
    />
  )
}

export type DetailTab = 'notas' | InspectorTab

interface TaskDetailTabsProps {
  task: Task
  activeKey: DetailTab
  onChange: (key: DetailTab) => void
  notes: ReactNode
  panels: InspectorPanels
}

export function TaskDetailTabs({
  task,
  activeKey,
  onChange,
  notes,
  panels
}: TaskDetailTabsProps): React.JSX.Element {
  const labels = useInspectorLabels(task)
  return (
    <Tabs
      activeKey={activeKey}
      onChange={(key) => onChange(key as DetailTab)}
      style={{ marginTop: 8 }}
      items={[
        { key: 'notas', label: 'Notas', children: notes },
        ...(['tempo', 'detalhes', 'relacoes'] as const).map((key) => ({
          key,
          label: labels[key],
          children: panels[key]
        }))
      ]}
    />
  )
}
