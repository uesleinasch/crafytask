import { Button, Flex, Tag, TimePicker, Tooltip, Typography, theme } from 'antd'
import dayjs from 'dayjs'
import { CalendarSync, FileText, Play, Trash2 } from 'lucide-react'
import type { TaskCategory, TaskStatus } from '@shared/types'
import { CategoryChip } from '@renderer/components/chips/CategoryChip'
import { StatusChip } from '@renderer/components/chips/StatusChip'
import { ProjectLabel } from '@renderer/components/tasks/ProjectLabel'
import { durationLabel, toMin } from './calendarView'

export interface PopoverSubject {
  kind: 'block' | 'event'
  taskId: number
  name: string
  date: string
  start: string
  end: string
  status?: TaskStatus
  category?: TaskCategory
  projectName?: string | null
  projectColor?: string | null
  gcal: boolean
}

interface BlockPopoverProps {
  subject: PopoverSubject
  onChange: (times: { start_time: string; end_time: string }) => void
  onStartTimer: () => void
  onOpen: () => void
  onDelete?: () => void
}

export function BlockPopover({
  subject,
  onChange,
  onStartTimer,
  onOpen,
  onDelete
}: BlockPopoverProps): React.JSX.Element {
  const { token } = theme.useToken()
  const icon = { size: 14, strokeWidth: 1.75 }
  return (
    <div
      style={{
        width: 280,
        maxWidth: 'calc(100vw - 48px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }}
      onContextMenu={(e) => e.stopPropagation()}
    >
      <Flex align="center" gap={8}>
        <Tag bordered={false} style={{ marginInlineEnd: 0 }}>
          {subject.kind === 'event' ? 'Tarefa com horário' : 'Bloco de tempo'}
        </Tag>
        {subject.gcal && (
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
        href={`#/task/${subject.taskId}`}
        onClick={(e) => {
          e.preventDefault()
          onOpen()
        }}
        style={{ color: token.colorText, fontWeight: 600, fontSize: 15 }}
      >
        {subject.name}
      </Typography.Link>
      <Flex gap={10} wrap align="center" style={{ fontSize: 12 }}>
        {subject.projectName && (
          <ProjectLabel name={subject.projectName} color={subject.projectColor} />
        )}
        {subject.status && <StatusChip status={subject.status} />}
        {subject.category && subject.category !== 'normal' && (
          <CategoryChip category={subject.category} />
        )}
      </Flex>
      <Flex align="center" gap={8}>
        <TimePicker.RangePicker
          size="small"
          format="HH:mm"
          minuteStep={15}
          allowClear={false}
          value={[
            dayjs(`${subject.date} ${subject.start}`),
            dayjs(`${subject.date} ${subject.end}`)
          ]}
          onChange={(value) => {
            if (!value?.[0] || !value[1]) return
            onChange({ start_time: value[0].format('HH:mm'), end_time: value[1].format('HH:mm') })
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
          {durationLabel(toMin(subject.end) - toMin(subject.start))}
        </span>
      </Flex>
      <Flex gap={6} wrap>
        <Button size="small" type="primary" icon={<Play {...icon} />} onClick={onStartTimer}>
          Iniciar timer
        </Button>
        <Button size="small" icon={<FileText {...icon} />} onClick={onOpen}>
          Abrir
        </Button>
        {onDelete && (
          <Tooltip title="Excluir bloco (Delete)">
            <Button
              size="small"
              type="text"
              danger
              icon={<Trash2 {...icon} />}
              aria-label="Excluir bloco"
              onClick={onDelete}
            />
          </Tooltip>
        )}
      </Flex>
    </div>
  )
}
