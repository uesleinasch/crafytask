import { Button, Tooltip, Typography, theme } from 'antd'
import { Maximize2, Pause } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { FloatTimerData } from '@shared/types'
import { LiveDot } from '@renderer/components/chips/LiveDot'
import { useAuxWindow } from '@renderer/hooks/useAuxWindow'
import { useTimeLeakThresholds } from '@renderer/lib/workflowPrefs'
import { formatTime } from '@renderer/lib/utils'
import { timeLeakBackground, timeLeakLevel } from '@renderer/theme/semantic'
import { useThemeSettings } from '@renderer/theme/themeSettings'

export function FloatTimerPage(): React.JSX.Element {
  useAuxWindow()
  const { token } = theme.useToken()
  const { mode } = useThemeSettings()
  const leakThresholds = useTimeLeakThresholds()
  const [timers, setTimers] = useState<FloatTimerData[] | null>(null)

  useEffect(() => {
    const unsubscribeUpdate = window.api.onFloatUpdate(setTimers)
    const unsubscribeClear = window.api.onFloatClear(() => setTimers([]))
    return () => {
      unsubscribeUpdate()
      unsubscribeClear()
    }
  }, [])

  const footerText: React.CSSProperties = { flex: 1, fontSize: token.fontSizeSM }
  const time: React.CSSProperties = {
    fontFamily: token.fontFamilyCode,
    fontVariantNumeric: 'tabular-nums',
    fontSize: 14,
    fontWeight: 600
  }

  return (
    <div className="ct-aux-win" role="dialog" aria-label="Timers em andamento">
      <div className="ct-aux-rows">
        {timers === null ? (
          <div className="ct-aux-row">
            <Typography.Text type="secondary" style={footerText}>
              Carregando os timers…
            </Typography.Text>
          </div>
        ) : (
          timers.map((timer) => (
            <div
              key={timer.taskId}
              className="ct-aux-row"
              style={{
                background: timeLeakBackground(
                  mode,
                  timeLeakLevel(timer.category, timer.seconds, leakThresholds)
                )
              }}
            >
              <LiveDot />
              <Tooltip title="Abrir a tarefa no CrafyTask">
                <button
                  type="button"
                  className="ct-aux-name"
                  onClick={() => void window.api.openTaskFromFloat(timer.taskId)}
                >
                  {timer.taskName}
                </button>
              </Tooltip>
              <span style={time}>{formatTime(timer.seconds)}</span>
              <Tooltip title="Pausar">
                <Button
                  type="text"
                  size="small"
                  aria-label={`Pausar ${timer.taskName}`}
                  icon={<Pause size={14} strokeWidth={1.75} />}
                  onClick={() => void window.api.stopFromFloat(timer.taskId)}
                />
              </Tooltip>
            </div>
          ))
        )}
      </div>
      <div className="ct-aux-foot">
        <Typography.Text type="secondary" style={footerText}>
          {timers === null ? '' : `${timers.length} em andamento`}
        </Typography.Text>
        {timers && timers.length > 1 && (
          <Button
            type="text"
            size="small"
            icon={<Pause size={14} strokeWidth={1.75} />}
            onClick={() => void window.api.stopAllFromFloat()}
          >
            Pausar todos
          </Button>
        )}
        <Tooltip title="Abrir CrafyTask">
          <Button
            type="text"
            size="small"
            aria-label="Abrir CrafyTask"
            icon={<Maximize2 size={14} strokeWidth={1.75} />}
            onClick={() => void window.api.restoreFromFloat()}
          />
        </Tooltip>
      </div>
    </div>
  )
}
