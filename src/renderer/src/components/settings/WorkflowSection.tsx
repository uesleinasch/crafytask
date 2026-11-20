import { useEffect, useState } from 'react'
import { App, Flex, InputNumber, Segmented, Select, Space, Switch, Typography } from 'antd'
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
import { updateWorkflowPrefs, useWorkflowPrefs } from '@renderer/lib/workflowPrefs'
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
  onCommit: (value: number) => void
}): React.JSX.Element {
  const [draft, setDraft] = useState<number | null>(value)
  useEffect(() => setDraft(value), [value])

  const commit = (): void => {
    if (draft === null || draft === value) {
      setDraft(value)
      return
    }
    onCommit(draft)
  }

  return (
    <Space.Compact style={{ width }}>
      {before && <Space.Addon>{before}</Space.Addon>}
      <InputNumber
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={draft}
        onChange={setDraft}
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

  const save = (patch: WorkflowPrefsPatch): void => {
    updateWorkflowPrefs(patch).catch((error: unknown) =>
      message.error(error instanceof Error ? error.message : 'Não foi possível salvar')
    )
  }

  const setLeakLevel = (index: number, minutes: number): void => {
    const levels = [...prefs.timeLeakLevels] as WorkflowPrefs['timeLeakLevels']
    levels[index] = minutes
    save({ timeLeakLevels: levels })
  }

  const levels = prefs.timeLeakLevels

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
            onCommit={(workdayHours) => save({ workdayHours })}
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
