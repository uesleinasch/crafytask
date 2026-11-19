import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  App,
  Button,
  DatePicker,
  Drawer,
  Flex,
  Grid,
  Segmented,
  Select,
  Space,
  Spin,
  Tooltip
} from 'antd'
import dayjs from 'dayjs'
import { ChevronDown, ChevronLeft, ChevronRight, ListTodo, PanelLeftOpen, Plus } from 'lucide-react'
import type { CreateTimeBlockInput, TimeBlock } from '@shared/types'
import { addDays, calendarPrefs } from '@shared/calendarPrefs'
import { localDateString } from '@shared/dueState'
import { CalendarGrid, type GridBlockActions } from '@renderer/components/calendar/CalendarGrid'
import { CalendarShowMenu } from '@renderer/components/calendar/CalendarShowMenu'
import { MonthlyCalendar } from '@renderer/components/calendar/LegacyMonthView'
import { NewBlockModal, type NewBlockDraft } from '@renderer/components/calendar/NewBlockModal'
import { UnscheduledPanel } from '@renderer/components/calendar/UnscheduledPanel'
import {
  SHOW_KEYS,
  VIEW_OPTIONS,
  defaultView,
  dropStart,
  fromMin,
  isWeekend,
  periodLabel,
  snapSlot,
  stepCursor,
  viewDays,
  type AllDayItem,
  type CalendarView,
  type GridView,
  type ShowKey
} from '@renderer/components/calendar/calendarView'
import { errorMessage } from '@renderer/components/settings/settingsStatus'
import { PageContainer } from '@renderer/components/shell/PageContainer'
import { RegionBoundary } from '@renderer/components/shell/RegionBoundary'
import { useCalendarMonth, useCalendarRange } from '@renderer/hooks/useCalendar'
import { usePersistedState } from '@renderer/hooks/usePersistedState'
import { useTimerStore } from '@renderer/stores/timerStore'

const SHOW_KEY = 'ticktask:calendar-show'

function initialView(): GridView {
  return defaultView({ lg: window.innerWidth >= 992, md: window.innerWidth >= 768 })
}

function shortDay(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
    .format(new Date(`${date}T12:00:00`))
    .replace('.', '')
}

type GridSectionProps = Omit<React.ComponentProps<typeof CalendarGrid>, 'data'> & {
  from: string
  to: string
  version: number
}

function GridSection({ from, to, version, ...grid }: GridSectionProps): React.JSX.Element {
  const data = useCalendarRange(from, to, version)
  if (!data) {
    return (
      <Flex justify="center" style={{ padding: 48 }}>
        <Spin />
      </Flex>
    )
  }
  return <CalendarGrid {...grid} data={data} />
}

interface MonthSectionProps {
  cursor: string
  onTaskOpen: (id: number) => void
  onDayClick: (date: string) => void
}

function MonthSection({ cursor, onTaskOpen, onDayClick }: MonthSectionProps): React.JSX.Element {
  const { message } = App.useApp()
  const month = useCalendarMonth(cursor.slice(0, 7))
  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <MonthlyCalendar
        year={Number(cursor.slice(0, 4))}
        month={Number(cursor.slice(5, 7)) - 1}
        scheduledTasks={month.scheduledTasks}
        timeBlocks={month.timeBlocks}
        onTaskNavigate={onTaskOpen}
        onDayClick={onDayClick}
        onDragEnd={(taskId, date) =>
          void month
            .scheduleTask(taskId, date)
            .then(() => message.success('Tarefa reagendada'))
            .catch((error) => message.error(errorMessage(error)))
        }
      />
    </div>
  )
}

export function CalendarPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const screens = Grid.useBreakpoint()
  const prefs = calendarPrefs()
  const { startTimer } = useTimerStore()
  const [view, setView] = useState<CalendarView>(initialView)
  const [cursor, setCursor] = useState(() => localDateString(new Date()))
  const [now, setNow] = useState(() => new Date())
  const [storedShow, setStoredShow] = usePersistedState<ShowKey[]>(SHOW_KEY, SHOW_KEYS)
  const show = useMemo(() => new Set(storedShow), [storedShow])
  const [draft, setDraft] = useState<NewBlockDraft | null>(null)
  const [version, setVersion] = useState(0)
  const [panel, setPanel] = useState(() => window.innerWidth >= 1200)
  const changed = useCallback(() => setVersion((v) => v + 1), [])

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
  const panelRange =
    view === 'month'
      ? { from: `${cursor.slice(0, 7)}-01`, to: addDays(`${stepCursor('month', cursor, 1)}`, -1) }
      : { from: allDays[0], to: allDays[allDays.length - 1] }

  const openTask = useCallback((id: number) => navigate(`/task/${id}`), [navigate])

  const openDay = useCallback((date: string) => {
    setCursor(date)
    setView('day')
  }, [])

  const slotClick = useCallback(
    (date: string, minutes: number) => {
      const start = snapSlot(minutes, prefs.dayStartHour, prefs.dayEndHour)
      setDraft({ date, start: fromMin(start), end: fromMin(start + 60) })
    },
    [prefs.dayStartHour, prefs.dayEndHour]
  )

  async function run<T>(action: () => Promise<T>): Promise<{ value: T } | null> {
    try {
      const value = await action()
      changed()
      return { value }
    } catch (error) {
      message.error(errorMessage(error))
      return null
    }
  }

  function undoable(text: string, undo: () => Promise<unknown>): void {
    const key = `calendar-undo-${Date.now()}`
    message.success({
      key,
      duration: 5,
      content: (
        <span>
          {text} ·{' '}
          <a
            onClick={() => {
              message.destroy(key)
              void run(undo)
            }}
          >
            Desfazer
          </a>
        </span>
      )
    })
  }

  async function createBlock(input: CreateTimeBlockInput): Promise<void> {
    try {
      await window.api.createTimeBlock(input)
    } catch (error) {
      message.error(errorMessage(error))
      throw error
    }
    setDraft(null)
    changed()
    message.success('Bloco reservado')
  }

  const blockActions: GridBlockActions = {
    onOpen: openTask,
    onStartTimer: (block) => {
      startTimer(block.task_id)
        .then(() => message.success(`Timer iniciado: ${block.task_name}`))
        .catch((error) => message.error(errorMessage(error)))
    },
    onChange: (block, patch) => {
      void run(() => window.api.updateTimeBlock(block.id, patch))
    },
    onMove: (block, patch) => {
      void run(() => window.api.updateTimeBlock(block.id, patch)).then((result) => {
        if (!result) return
        const before = result.value
        const where = patch.date && patch.date !== block.date ? `${shortDay(patch.date)}, ` : ''
        undoable(`${block.task_name}: ${where}${patch.start_time}–${patch.end_time}`, () =>
          window.api.updateTimeBlock(block.id, {
            date: before.date,
            start_time: before.start_time,
            end_time: before.end_time
          })
        )
      })
    },
    onDuplicate: (block) => {
      const date = addDays(block.date, 1)
      void run(() =>
        window.api.createTimeBlock({
          task_id: block.task_id,
          date,
          start_time: block.start_time,
          end_time: block.end_time
        })
      ).then((result) => result && message.success(`Bloco repetido em ${shortDay(date)}`))
    },
    onDelete: (block: TimeBlock) => {
      void run(() => window.api.deleteTimeBlock(block.id)).then((result) => {
        if (!result) return
        undoable('Bloco excluído', () =>
          window.api.createTimeBlock({
            task_id: block.task_id,
            date: block.date,
            start_time: block.start_time,
            end_time: block.end_time
          })
        )
      })
    }
  }

  function reserve(taskId: number, date: string, startMin: number): void {
    const start = dropStart(startMin, prefs.dayStartHour, prefs.dayEndHour)
    void run(() =>
      window.api.createTimeBlock({
        task_id: taskId,
        date,
        start_time: fromMin(start),
        end_time: fromMin(start + 60)
      })
    ).then((result) => result && message.success(`Bloco de 1h para ${result.value.task_name}`))
  }

  function dropChip(kind: AllDayItem['kind'], taskId: number, date: string): void {
    if (kind === 'scheduled') {
      void run(() => window.api.scheduleTaskForDate(taskId, date)).then(
        (result) => result && message.success(`Reagendada para ${shortDay(date)}`)
      )
    } else {
      void run(() => window.api.updateTask(taskId, { due_date: date })).then(
        (result) => result && message.success(`Prazo movido para ${shortDay(date)}`)
      )
    }
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
  const sidePanel = (inDrawer: boolean): React.JSX.Element => (
    <RegionBoundary region="A agendar" resetKeys={[panelRange.from, panelRange.to]}>
      <UnscheduledPanel
        from={panelRange.from}
        to={panelRange.to}
        days={allDays}
        version={version}
        inDrawer={inDrawer}
        onHide={screens.xl && !inDrawer ? () => setPanel(false) : undefined}
        onReserve={(taskId, date) => {
          if (inDrawer) setPanel(false)
          reserve(taskId, date, 9 * 60)
        }}
      />
    </RegionBoundary>
  )

  return (
    <PageContainer
      fullWidth
      padBlock="top"
      style={{ height: '100%', display: 'flex', flexDirection: 'column', paddingBottom: 16 }}
    >
      <Flex gap={8} wrap align="center" style={{ marginBottom: 12 }}>
        {screens.lg && !panel && (
          <Tooltip title="Mostrar a agendar">
            <Button
              icon={<PanelLeftOpen size={16} strokeWidth={1.75} />}
              aria-label="Mostrar painel a agendar"
              onClick={() => setPanel(true)}
            />
          </Tooltip>
        )}
        {!screens.lg && (
          <Button
            icon={<ListTodo size={16} strokeWidth={1.75} />}
            aria-label="A agendar"
            onClick={() => setPanel(true)}
          >
            {screens.sm ? 'A agendar' : null}
          </Button>
        )}
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
          style={{ fontWeight: 600, fontSize: 15, width: 'auto', minWidth: 200 }}
          aria-label="Ir para a data"
        />
        <div style={{ flex: 1 }} />
        {viewControl}
        <CalendarShowMenu show={show} onChange={(next) => setStoredShow([...next])} />
        <Button
          type="primary"
          icon={<Plus size={14} strokeWidth={1.75} />}
          aria-label="Novo bloco"
          onClick={() => setDraft({ date: cursor, start: '09:00', end: '10:00' })}
        >
          {screens.sm ? 'Novo bloco' : null}
        </Button>
      </Flex>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 16 }}>
        {screens.lg && panel && sidePanel(false)}
        <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
          <RegionBoundary region="grade do calendário" resetKeys={[view, cursor]}>
            {view === 'month' ? (
              <MonthSection
                key={version}
                cursor={cursor}
                onTaskOpen={openTask}
                onDayClick={(date) => setDraft({ date, start: '09:00', end: '10:00' })}
              />
            ) : (
              <GridSection
                from={allDays[0]}
                to={allDays[allDays.length - 1]}
                version={version}
                view={gridView}
                days={days}
                today={today}
                now={now}
                show={show}
                onOpenDay={openDay}
                onSlotClick={slotClick}
                onTaskOpen={openTask}
                blockActions={blockActions}
                onDropTask={reserve}
                onDropChip={dropChip}
              />
            )}
          </RegionBoundary>
        </div>
      </div>
      {!screens.lg && (
        <Drawer
          open={panel}
          onClose={() => setPanel(false)}
          placement="left"
          size={Math.min(340, window.innerWidth - 40)}
          title="A agendar"
        >
          {sidePanel(true)}
        </Drawer>
      )}
      <NewBlockModal draft={draft} onCancel={() => setDraft(null)} onCreate={createBlock} />
    </PageContainer>
  )
}
