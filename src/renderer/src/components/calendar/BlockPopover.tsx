import { Button, Flex, Tag, TimePicker, Tooltip, Typography, theme } from 'antd'
import dayjs from 'dayjs'
import { CalendarSync, FileText, Play, Trash2 } from 'lucide-react'
import type { TimeBlock } from '@shared/types'
import { CategoryChip } from '@renderer/components/chips/CategoryChip'
import { StatusChip } from '@renderer/components/chips/StatusChip'
import { ProjectLabel } from '@renderer/components/tasks/ProjectLabel'
import { durationLabel, toMin } from './calendarView'

export interface BlockActions {
  onChange: (block: TimeBlock, patch: { start_time: string; end_time: string }) => void
  onStartTimer: (block: TimeBlock) => void
  onOpen: (taskId: number) => void
  onDelete: (block: TimeBlock) => void
}

export function BlockPopover({
  block,
  actions
}: {
  block: TimeBlock
  actions: BlockActions
}): React.JSX.Element {
  const { token } = theme.useToken()
  const icon = { size: 14, strokeWidth: 1.75 }
  return (
    <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Flex align="center" gap={8}>
        <Tag bordered={false} style={{ marginInlineEnd: 0 }}>
          Bloco de tempo
        </Tag>
        {!!block.task_gcal_sync && (
          <Tooltip title="Na agenda TickTask do Google">
            <CalendarSync
              size={14}
              strokeWidth={1.75}
              aria-label="Na agenda do Google"
              style={{ color: token.colorTextTertiary }}
            />
          </Tooltip>
        )}
      </Flex>
      <Typography.Link
        href={`#/task/${block.task_id}`}
        onClick={(e) => {
          e.preventDefault()
          actions.onOpen(block.task_id)
        }}
        style={{ color: token.colorText, fontWeight: 600, fontSize: 15 }}
      >
        {block.task_name ?? 'Tarefa'}
      </Typography.Link>
      <Flex gap={10} wrap align="center" style={{ fontSize: 12 }}>
        {block.project_name && (
          <ProjectLabel name={block.project_name} color={block.project_color} />
        )}
        {block.task_status && <StatusChip status={block.task_status} />}
        {block.task_category && block.task_category !== 'normal' && (
          <CategoryChip category={block.task_category} />
        )}
      </Flex>
      <Flex align="center" gap={8}>
        <TimePicker.RangePicker
          size="small"
          format="HH:mm"
          minuteStep={15}
          allowClear={false}
          value={[
            dayjs(`${block.date} ${block.start_time}`),
            dayjs(`${block.date} ${block.end_time}`)
          ]}
          onChange={(value) => {
            if (!value?.[0] || !value[1]) return
            actions.onChange(block, {
              start_time: value[0].format('HH:mm'),
              end_time: value[1].format('HH:mm')
            })
          }}
          style={{ flex: 1 }}
          aria-label="Horário"
        />
        <span
          style={{
            fontFamily: token.fontFamilyCode,
            fontSize: 12,
            color: token.colorTextTertiary
          }}
        >
          {durationLabel(toMin(block.end_time) - toMin(block.start_time))}
        </span>
      </Flex>
      <Flex gap={6} wrap>
        <Button
          size="small"
          type="primary"
          icon={<Play {...icon} />}
          onClick={() => actions.onStartTimer(block)}
        >
          Iniciar timer
        </Button>
        <Button
          size="small"
          icon={<FileText {...icon} />}
          onClick={() => actions.onOpen(block.task_id)}
        >
          Abrir
        </Button>
        <Tooltip title="Excluir bloco (Delete)">
          <Button
            size="small"
            type="text"
            danger
            icon={<Trash2 {...icon} />}
            aria-label="Excluir bloco"
            onClick={() => actions.onDelete(block)}
          />
        </Tooltip>
      </Flex>
    </div>
  )
}
