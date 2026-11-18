import { useContext } from 'react'
import { Flex, Popover, Tag, Typography, theme } from 'antd'
import type { Context } from '@shared/types'
import { TaskMenuChangedContext } from '@renderer/components/taskMenuContext'
import { toast } from '@renderer/components/ui/sonner'

interface ContextsCellProps {
  taskId: number
  value: Context[]
  options: Context[]
}

const label = (context: Context): string =>
  context.icon ? `${context.icon} ${context.name}` : context.name

export function ContextsCell({ taskId, value, options }: ContextsCellProps): React.JSX.Element {
  const { token } = theme.useToken()
  const onChanged = useContext(TaskMenuChangedContext)
  const selected = new Set(value.map((context) => context.id))

  const toggle = async (contextId: number, on: boolean): Promise<void> => {
    const next = on ? [...selected, contextId] : [...selected].filter((id) => id !== contextId)
    try {
      await window.api.setTaskContexts(taskId, next)
      onChanged()
    } catch (error) {
      console.error('[ContextsCell]', error)
      toast.error('Não foi possível alterar os contextos')
    }
  }

  const editor = (
    <Flex gap={4} wrap="wrap" style={{ maxWidth: 260 }}>
      {options.length === 0 ? (
        <Typography.Text type="secondary">Nenhum contexto cadastrado</Typography.Text>
      ) : (
        options.map((context) => (
          <Tag.CheckableTag
            key={context.id}
            checked={selected.has(context.id)}
            onChange={(on) => void toggle(context.id, on)}
          >
            {label(context)}
          </Tag.CheckableTag>
        ))
      )}
    </Flex>
  )

  const first = value[0]
  return (
    <Popover
      trigger="hover"
      mouseEnterDelay={0.15}
      placement="bottom"
      title="Contextos"
      content={editor}
    >
      <span
        onClick={(event) => event.stopPropagation()}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'default' }}
        aria-label={
          value.length ? `Contextos: ${value.map((c) => c.name).join(', ')}` : 'Sem contexto'
        }
      >
        {first ? (
          <Tag bordered={false} style={{ margin: 0 }}>
            {label(first)}
          </Tag>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        )}
        {value.length > 1 && (
          <Tag
            bordered={false}
            style={{
              margin: 0,
              color: token.colorPrimary,
              background: token.colorPrimaryBg,
              fontFamily: token.fontFamilyCode,
              fontVariantNumeric: 'tabular-nums'
            }}
          >
            +{value.length - 1}
          </Tag>
        )}
      </span>
    </Popover>
  )
}
