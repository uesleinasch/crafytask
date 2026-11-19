import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { App, Button, DatePicker, Flex, Grid, Segmented, Select, Space, Spin, Tooltip } from 'antd'
import dayjs from 'dayjs'
import { ChevronDown, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import type { CreateTimeBlockInput, TaskListItem, TimeBlock } from '@shared/types'
import { calendarPrefs } from '@shared/calendarPrefs'
import { localDateString } from '@shared/dueState'
import { CalendarGrid } from '@renderer/components/calendar/CalendarGrid'
import { CalendarShowMenu } from '@renderer/components/calendar/CalendarShowMenu'
import { MonthlyCalendar } from '@renderer/components/calendar/LegacyMonthView'
import { TimeBlockDialog } from '@renderer/components/calendar/TimeBlockDialog'
import {
  SHOW_KEYS,
  VIEW_OPTIONS,
  defaultView,
  fromMin,
  isWeekend,
  periodLabel,
  snapSlot,
  stepCursor,
  viewDays,
  type CalendarView,
  type GridView,
  type ShowKey
} from '@renderer/components/calendar/calendarView'
import { RegionBoundary } from '@renderer/components/shell/RegionBoundary'
import { PageContainer } from '@renderer/components/shell/PageContainer'
import { useCalendarMonth, useCalendarRange } from '@renderer/hooks/useCalendar'
import { usePersistedState } from '@renderer/hooks/usePersistedState'

const SHOW_KEY = 'ticktask:calendar-show'

interface BlockDialogState {
  open: boolean
  block?: TimeBlock
  initial?: Partial<{ taskId: string; date: string; startTime: string; endTime: string }>
}

function initialView(): GridView {
  return defaultView({ lg: window.innerWidth >= 992, md: window.innerWidth >= 768 })
}

export function CalendarPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const screens = Grid.useBreakpoint()
  const prefs = calendarPrefs()
  const [view, setView] = useState<CalendarView>(initialView)
  const [cursor, setCursor] = useState(() => localDateString(new Date()))
  const [now, setNow] = useState(() => new Date())
  const [storedShow, setStoredShow] = usePersistedState<ShowKey[]>(SHOW_KEY, SHOW_KEYS)
  const show = useMemo(() => new Set(storedShow), [storedShow])
  const [dialog, setDialog] = useState<BlockDialogState>({ open: false })
  const [selectable, setSelectable] = useState<TaskListItem[]>([])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const today = localDateString(now)
  const gridView: GridView = view === 'month' ? 'week' : view
  const allDays = useMemo(
    () => viewDays(gridView, cursor, prefs.weekStart),
    [gridView, cursor, prefs.weekStart]
  )
  const days =
    view === 'week' && !show.has('weekend') ? allDays.filter((d) => !isWeekend(d)) : allDays
  const range = useCalendarRange(allDays[0], allDays[allDays.length - 1])
  const month = useCalendarMonth(cursor.slice(0, 7))

  useEffect(() => {
    if (!dialog.open) return
    window.api.listActiveTasksLight().then(setSelectable).catch(console.error)
  }, [dialog.open])

  const openTask = useCallback((id: number) => navigate(`/task/${id}`), [navigate])

  const openDay = useCallback((date: string) => {
    setCursor(date)
    setView('day')
  }, [])

  const slotClick = useCallback(
    (date: string, minutes: number) => {
      const start = snapSlot(minutes, prefs.dayStartHour, prefs.dayEndHour)
      setDialog({
        open: true,
        initial: { date, startTime: fromMin(start), endTime: fromMin(start + 60) }
      })
    },
    [prefs.dayStartHour, prefs.dayEndHour]
  )

  const blockClick = useCallback((block: TimeBlock) => {
    setDialog({
      open: true,
      block,
      initial: {
        taskId: String(block.task_id),
        date: block.date,
        startTime: block.start_time,
        endTime: block.end_time
      }
    })
  }, [])

  async function saveBlock(input: CreateTimeBlockInput): Promise<void> {
    if (dialog.block) {
      await range.updateTimeBlock(dialog.block.id, input)
      message.success('Bloco atualizado')
    } else {
      await range.createTimeBlock(input)
      message.success('Bloco criado')
    }
    await month.refresh()
  }

  async function deleteBlock(): Promise<void> {
    if (!dialog.block) return
    await range.deleteTimeBlock(dialog.block.id)
    await month.refresh()
    message.success('Bloco removido')
  }

  async function rescheduleFromMonth(taskId: number, date: string): Promise<void> {
    await month.scheduleTask(taskId, date)
    await range.refresh()
    message.success('Tarefa reagendada')
  }

  const label = periodLabel(view, cursor, view === 'month' ? [] : allDays)
  const viewControl = screens.md ? (
    <Segmented
      value={view}
      onChange={(value) => setView(value as CalendarView)}
      options={VIEW_OPTIONS}
      aria-label="Visão"
    />
  ) : (
    <Select
      value={view}
      onChange={setView}
      options={VIEW_OPTIONS}
      style={{ width: 110 }}
      aria-label="Visão"
    />
  )

  return (
    <PageContainer
      fullWidth
      padBlock="top"
      style={{ height: '100%', display: 'flex', flexDirection: 'column', paddingBottom: 16 }}
    >
      <Flex gap={8} wrap align="center" style={{ marginBottom: 12 }}>
        <Button onClick={() => setCursor(localDateString(new Date()))}>Hoje</Button>
        <Space.Compact>
          <Tooltip title="Anterior">
            <Button
              icon={<ChevronLeft size={16} strokeWidth={1.75} />}
              aria-label="Anterior"
              onClick={() => setCursor((c) => stepCursor(view, c, -1))}
            />
          </Tooltip>
          <Tooltip title="Próximo">
            <Button
              icon={<ChevronRight size={16} strokeWidth={1.75} />}
              aria-label="Próximo"
              onClick={() => setCursor((c) => stepCursor(view, c, 1))}
            />
          </Tooltip>
        </Space.Compact>
        <DatePicker
          value={dayjs(cursor)}
          onChange={(value) => value && setCursor(value.format('YYYY-MM-DD'))}
          allowClear={false}
          variant="borderless"
          format={() => label}
          inputReadOnly
          suffixIcon={<ChevronDown size={12} strokeWidth={1.75} />}
          style={{ fontWeight: 600, width: 'auto', minWidth: 200 }}
          aria-label="Ir para a data"
        />
        <div style={{ flex: 1 }} />
        {viewControl}
        <CalendarShowMenu show={show} onChange={(next) => setStoredShow([...next])} />
        <Button
          type="primary"
          icon={<Plus size={14} strokeWidth={1.75} />}
          onClick={() =>
            setDialog({
              open: true,
              initial: { date: cursor, startTime: '09:00', endTime: '10:00' }
            })
          }
        >
          {screens.sm ? 'Novo bloco' : null}
        </Button>
      </Flex>
      <div style={{ flex: 1, minHeight: 0 }}>
        <RegionBoundary region="grade do calendário" resetKeys={[view]}>
          {view === 'month' ? (
            <div style={{ height: '100%', overflow: 'auto' }}>
              <MonthlyCalendar
                year={Number(cursor.slice(0, 4))}
                month={Number(cursor.slice(5, 7)) - 1}
                scheduledTasks={month.scheduledTasks}
                timeBlocks={month.timeBlocks}
                onTaskNavigate={openTask}
                onDayClick={(date) => setDialog({ open: true, initial: { date } })}
                onDragEnd={(taskId, date) => void rescheduleFromMonth(taskId, date)}
              />
            </div>
          ) : range.data ? (
            <CalendarGrid
              view={gridView}
              days={days}
              today={today}
              now={now}
              data={range.data}
              show={show}
              onOpenDay={openDay}
              onSlotClick={slotClick}
              onBlockClick={blockClick}
              onTaskOpen={openTask}
            />
          ) : (
            <Flex justify="center" style={{ padding: 48 }}>
              <Spin />
            </Flex>
          )}
        </RegionBoundary>
      </div>
      <TimeBlockDialog
        open={dialog.open}
        onClose={() => setDialog({ open: false })}
        onSave={saveBlock}
        onDelete={dialog.block ? deleteBlock : undefined}
        tasks={selectable}
        initial={dialog.initial}
        title={dialog.block ? 'Editar bloco de tempo' : 'Novo bloco de tempo'}
      />
    </PageContainer>
  )
}
