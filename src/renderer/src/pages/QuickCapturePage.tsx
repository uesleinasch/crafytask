import { Button, Input, Tooltip, Typography, theme, type InputRef } from 'antd'
import { CircleCheck, Inbox, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Kbd } from '@renderer/components/shell/Kbd'
import { useAuxWindow } from '@renderer/hooks/useAuxWindow'
import { useThemeSettings } from '@renderer/theme/themeSettings'

const CLOSE_AFTER_CAPTURE_MS = 1200

type CaptureState = 'editing' | 'saving' | 'captured' | 'error'

function closeWindow(): void {
  void window.api.closeQuickCapture()
}

export function QuickCapturePage(): React.JSX.Element {
  useAuxWindow()
  const { token } = theme.useToken()
  const { density } = useThemeSettings()
  const [name, setName] = useState('')
  const [state, setState] = useState<CaptureState>('editing')
  const inputRef = useRef<InputRef>(null)
  const trimmed = name.trim()

  useEffect(() => {
    const timeout = setTimeout(() => inputRef.current?.focus(), 100)
    return () => clearTimeout(timeout)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') closeWindow()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (state !== 'captured') return
    const timeout = setTimeout(closeWindow, CLOSE_AFTER_CAPTURE_MS)
    return () => clearTimeout(timeout)
  }, [state])

  const capture = useCallback(async (): Promise<void> => {
    if (!trimmed || state === 'saving' || state === 'captured') return
    setState('saving')
    try {
      await window.api.quickCapture(trimmed)
      setState('captured')
    } catch (error) {
      console.error('Erro ao capturar:', error)
      setState('error')
    }
  }, [trimmed, state])

  return (
    <div className="ct-aux-win" role="dialog" aria-label="Captura rápida">
      <div className="ct-aux-head">
        <Inbox size={16} strokeWidth={1.75} color={token.colorTextTertiary} aria-hidden />
        <Typography.Text strong style={{ flex: 1 }}>
          Capturar para o Inbox
        </Typography.Text>
        <Tooltip title="Fechar (Esc)">
          <Button
            type="text"
            size="small"
            aria-label="Fechar"
            icon={<X size={14} strokeWidth={1.75} />}
            onClick={closeWindow}
          />
        </Tooltip>
      </div>
      {state === 'captured' ? (
        <div
          role="status"
          style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 10, padding: '0 16px 6px' }}
        >
          <CircleCheck size={20} strokeWidth={1.75} color={token.colorSuccess} aria-hidden />
          <div style={{ minWidth: 0 }}>
            <Typography.Text strong style={{ display: 'block' }}>
              Capturado no Inbox
            </Typography.Text>
            <Typography.Text
              type="secondary"
              ellipsis
              style={{ display: 'block', maxWidth: 320, fontSize: token.fontSizeSM }}
            >
              {trimmed}
            </Typography.Text>
          </div>
        </div>
      ) : (
        <>
          <div style={{ padding: '2px 14px 0' }}>
            <Input
              ref={inputRef}
              size={density === 'compact' ? 'middle' : 'large'}
              autoFocus
              placeholder="O que precisa ser feito?"
              aria-label="O que precisa ser feito?"
              value={name}
              status={state === 'error' ? 'error' : undefined}
              onChange={(event) => {
                setName(event.target.value)
                if (state === 'error') setState('editing')
              }}
              onPressEnter={() => void capture()}
            />
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 'auto',
              padding: '10px 14px 12px'
            }}
          >
            {state === 'error' ? (
              <Typography.Text
                type="danger"
                role="alert"
                style={{ flex: 1, fontSize: token.fontSizeSM }}
              >
                Não foi possível capturar. Tente de novo.
              </Typography.Text>
            ) : (
              <Typography.Text
                type="secondary"
                style={{
                  display: 'inline-flex',
                  flex: 1,
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: token.fontSizeSM
                }}
              >
                <Kbd>Enter</Kbd> captura · <Kbd>Esc</Kbd> fecha
              </Typography.Text>
            )}
            <Button
              type="primary"
              size="small"
              disabled={!trimmed}
              loading={state === 'saving'}
              onClick={() => void capture()}
            >
              Capturar
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
