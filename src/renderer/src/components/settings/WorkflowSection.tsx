import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  App,
  Flex,
  InputNumber,
  Segmented,
  Select,
  Space,
  Spin,
  Switch,
  Typography
} from 'antd'
import type { WeekStart } from '@shared/calendarPrefs'
import {
  NOTES_SYNC_INTERVAL_OPTIONS,
  TIME_LEAK_LEVEL_RANGE,
  TIME_LEAK_REPEAT_OPTIONS,
  WORKDAY_HOURS_RANGE,
  type DueNotices,
  type WorkflowPrefs,
  type WorkflowPrefsPatch
} from '@shared/workflowPrefs'
import {
  updateWorkflowPrefs,
  useWorkflowPrefs,
  useWorkflowPrefsStatus
} from '@renderer/lib/workflowPrefs'
import { errorMessage } from './settingsStatus'
import { SettingRow, SettingsCard } from './SettingsLayout'

const LEAK_LABELS = ['Âmbar', 'Laranja', 'Vermelho'] as const

const DUE_NOTICES: { key: keyof DueNotices; title: string; description?: string }[] = [
  { key: 'eve', title: 'Na véspera' },
  { key: 'day', title: 'No dia', description: 'A partir das 9h.' },
  { key: 'soon', title: '15 minutos antes da hora do prazo' },
  { key: 'atTime', title: 'Na hora do prazo' }
]

const hourLabel = (hour: number): string => `${String(hour).padStart(2, '0')}:00`
const HOURS = Array.from({ length: 25 }, (_, hour) => hour)

function intervalLabel(seconds: number): string {
  return seconds < 60 ? `${seconds} s` : `${seconds / 60} min`
}

function CommitNumber({
  value,
  min,
  max,
  step,
  label,
  before,
  addon,
  width,
  onCommit
}: {
  value: number
  min: number
  max: number
  step?: number
  label: string
  before?: string
  addon: string
  width: number
  onCommit: (value: number) => Promise<number>
}): React.JSX.Element {
  const [draft, setDraft] = useState<number | null>(value)
  const latest = useRef<number | null>(value)
  useEffect(() => {
    latest.current = value
    setDraft(value)
  }, [value])

  const change = (next: number | null): void => {
    latest.current = next
    setDraft(next)
  }

  const commit = (): void => {
    window.setTimeout(() => {
      const typed = latest.current
      const next = typed === null ? null : step ? Math.round(typed / step) * step : typed
      if (next === null || next === value) {
        change(value)
        return
      }
      void onCommit(next).then(change)
    })
  }

  return (
    <Space.Compact style={{ width }}>
      {before && <Space.Addon>{before}</Space.Addon>}
      <InputNumber
        aria-label={label}
        min={min}
        max={max}
        step={step}
        precision={step ? 1 : 0}
        value={draft}
        onChange={change}
        onBlur={commit}
        onPressEnter={commit}
        style={{ width: '100%', fontVariantNumeric: 'tabular-nums' }}
      />
      <Space.Addon>{addon}</Space.Addon>
    </Space.Compact>
  )
}

export function WorkflowSection(): React.JSX.Element {
  const { message } = App.useApp()
  const prefs = useWorkflowPrefs()
  const status = useWorkflowPrefsStatus()

  const save = (patch: WorkflowPrefsPatch): Promise<WorkflowPrefs> =>
    updateWorkflowPrefs(patch).catch((error: unknown) => {
      message.error(`Não foi possível salvar: ${errorMessage(error)}`)
      return prefs
    })

  const setLeakLevel = async (index: number, minutes: number): Promise<number> => {
    const levels = [...prefs.timeLeakLevels] as WorkflowPrefs['timeLeakLevels']
    levels[index] = minutes
    const next = await save({ timeLeakLevels: levels })
    return next.timeLeakLevels[index]
  }

  const levels = prefs.timeLeakLevels

  if (status === 'loading') {
    return (
      <Flex justify="center" style={{ padding: 48 }}>
        <Spin />
      </Flex>
    )
  }
  if (status === 'error') {
    return (
      <Alert
        type="error"
        showIcon
        title="Não foi possível ler as preferências de fluxo de trabalho."
        description="Feche e abra Configurações de novo. Se continuar, veja o log do app."
      />
    )
  }

  return (
    <Flex vertical gap={16}>
      <SettingsCard title="Plano do dia">
        <SettingRow
          title="Jornada diária"
          description="Base da barra de carga em Hoje e no calendário."
        >
          <CommitNumber
            label="Jornada diária"
            addon="horas"
            width={150}
            value={prefs.workdayHours}
            min={WORKDAY_HOURS_RANGE.min}
            max={WORKDAY_HOURS_RANGE.max}
            step={WORKDAY_HOURS_RANGE.step}
            onCommit={async (workdayHours) => (await save({ workdayHours })).workdayHours}
          />
        </SettingRow>
        <SettingRow
          title="Semana começa em"
          description="Vale para Hoje, o calendário e a revisão semanal."
        >
          <Segmented<WeekStart>
            aria-label="Semana começa em"
            value={prefs.weekStart}
            onChange={(weekStart) => save({ weekStart })}
            options={[
              { value: 'sunday', label: 'Domingo' },
              { value: 'monday', label: 'Segunda' }
            ]}
          />
        </SettingRow>
      </SettingsCard>

      <SettingsCard title="Time leak">
        <SettingRow
          title="Níveis de alerta"
          description="Tempo acumulado que pinta a linha de âmbar, laranja e vermelho. Padrão: 30 min, 1 h e 2 h."
          vertical
        >
          <Space wrap>
            {LEAK_LABELS.map((label, index) => (
              <CommitNumber
                key={label}
                label={`Nível ${label.toLowerCase()} do time leak`}
                before={label}
                addon="min"
                width={200}
                value={levels[index]}
                min={index === 0 ? TIME_LEAK_LEVEL_RANGE.min : levels[index - 1] + 1}
                max={index === 2 ? TIME_LEAK_LEVEL_RANGE.max : levels[index + 1] - 1}
                onCommit={(minutes) => setLeakLevel(index, minutes)}
              />
            ))}
          </Space>
        </SettingRow>
        <SettingRow
          title="Repetir o aviso de time leak a cada"
          description="O aviso do sistema começa no nível laranja."
        >
          <Select
            aria-label="Repetir o aviso de time leak a cada"
            value={prefs.timeLeakRepeatMinutes}
            onChange={(timeLeakRepeatMinutes) => save({ timeLeakRepeatMinutes })}
            options={TIME_LEAK_REPEAT_OPTIONS.map((minutes) => ({
              value: minutes,
              label: `${minutes} min`
            }))}
            style={{ width: 120 }}
          />
        </SettingRow>
      </SettingsCard>

      <SettingsCard title="Calendário">
        <SettingRow
          title="Faixa de horas da grade"
          description="Padrão: o dia inteiro, 00:00–24:00."
        >
          <Flex align="center" gap={8}>
            <Select
              aria-label="Início da grade"
              value={prefs.calendarStartHour}
              onChange={(calendarStartHour) => save({ calendarStartHour })}
              options={HOURS.slice(0, 24).map((hour) => ({
                value: hour,
                label: hourLabel(hour),
                disabled: hour >= prefs.calendarEndHour
              }))}
              style={{ width: 96 }}
            />
            <Typography.Text type="secondary">até</Typography.Text>
            <Select
              aria-label="Fim da grade"
              value={prefs.calendarEndHour}
              onChange={(calendarEndHour) => save({ calendarEndHour })}
              options={HOURS.slice(1).map((hour) => ({
                value: hour,
                label: hourLabel(hour),
                disabled: hour <= prefs.calendarStartHour
              }))}
              style={{ width: 96 }}
            />
          </Flex>
        </SettingRow>
      </SettingsCard>

      <SettingsCard title="Avisos de prazo">
        {DUE_NOTICES.map(({ key, title, description }) => (
          <SettingRow key={key} title={title} description={description}>
            <Switch
              aria-label={`Aviso de prazo: ${title}`}
              checked={prefs.dueNotices[key]}
              onChange={(checked) => save({ dueNotices: { [key]: checked } })}
            />
          </SettingRow>
        ))}
      </SettingsCard>

      <SettingsCard title="Notas">
        <SettingRow
          title="Enviar notas ao Notion a cada"
          description="Intervalo do envio automático das notas da tarefa aberta, com o Notion conectado."
        >
          <Select
            aria-label="Enviar notas ao Notion a cada"
            value={prefs.notesSyncInterval}
            onChange={(notesSyncInterval) => save({ notesSyncInterval })}
            options={NOTES_SYNC_INTERVAL_OPTIONS.map((seconds) => ({
              value: seconds,
              label: intervalLabel(seconds)
            }))}
            style={{ width: 120 }}
          />
        </SettingRow>
      </SettingsCard>
    </Flex>
  )
}
