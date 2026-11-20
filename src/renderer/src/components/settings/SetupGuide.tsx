import type { ReactNode } from 'react'
import { Button, Flex, Steps, Typography } from 'antd'
import { ExternalLink } from 'lucide-react'
import { usePersistedState } from '@renderer/hooks/usePersistedState'
import { resolveSteps, toggleStepDone } from './stepProgress'

export interface SetupStep {
  id: string
  title: string
  autoDone?: boolean
  content?: ReactNode
}

export function SetupGuide({
  storageKey,
  steps
}: {
  storageKey: string
  steps: SetupStep[]
}): React.JSX.Element {
  const [doneIds, setDoneIds] = usePersistedState<string[]>(storageKey, [])
  const resolved = resolveSteps(steps, doneIds)
  const current = resolved.findIndex((step) => step.current)

  return (
    <Steps
      orientation="vertical"
      size="small"
      current={current === -1 ? steps.length : current}
      items={steps.map((step, index) => {
        const state = resolved[index]
        return {
          title: step.title,
          status: state.done ? 'finish' : state.current ? 'process' : 'wait',
          content: (
            <Flex vertical gap={8} style={{ padding: '4px 0 12px', maxWidth: 520 }}>
              {step.content}
              {state.manual && (
                <Button
                  size="small"
                  type={state.current ? 'default' : 'text'}
                  style={{ alignSelf: 'start' }}
                  onClick={() => setDoneIds(toggleStepDone(doneIds, step.id))}
                >
                  {state.done ? 'Desmarcar' : 'Marcar como feito'}
                </Button>
              )}
            </Flex>
          )
        }
      })}
    />
  )
}

export function GuideLink({
  href,
  children
}: {
  href: string
  children: ReactNode
}): React.JSX.Element {
  return (
    <Typography.Link href={href} target="_blank" rel="noopener noreferrer">
      {children} <ExternalLink size={12} strokeWidth={1.75} aria-hidden />
    </Typography.Link>
  )
}

export function GuideField({
  label,
  children
}: {
  label: string
  children: ReactNode
}): React.JSX.Element {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Typography.Text style={{ fontSize: 12, fontWeight: 500 }}>{label}</Typography.Text>
      {children}
    </label>
  )
}
