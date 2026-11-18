import { useContext, useEffect, useRef, useState } from 'react'
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
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<number[]>(() => value.map((c) => c.id))
  const selectedRef = useRef(selected)
  const valueKey = value.map((c) => c.id).join(',')

  useEffect(() => {
    const ids = valueKey ? valueKey.split(',').map(Number) : []
    selectedRef.current = ids
    setSelected(ids)
  }, [valueKey])

  const toggle = async (contextId: number, on: boolean): Promise<void> => {
    const previous = selectedRef.current
    const next = on ? [...previous, contextId] : previous.filter((id) => id !== contextId)
    selectedRef.current = next
    setSelected(next)
    try {
      await window.api.setTaskContexts(taskId, next)
      onChanged()
    } catch (error) {
      console.error('[ContextsCell]', error)
      selectedRef.current = previous
      setSelected(previous)
      toast.error('Não foi possível alterar os contextos')
    }
  }

  const shown = selected
    .map((id) => options.find((c) => c.id === id) ?? value.find((c) => c.id === id))
    .filter((c): c is Context => Boolean(c))

  const editor = (
    <Flex
      gap={4}
      wrap="wrap"
      style={{ maxWidth: 260 }}
      data-row-click="ignore"
      onClick={(event) => event.stopPropagation()}
    >
      {options.length === 0 ? (
        <Typography.Text type="secondary">Nenhum contexto cadastrado</Typography.Text>
      ) : (
        options.map((context) => (
          <Tag.CheckableTag
            key={context.id}
            checked={selected.includes(context.id)}
            onChange={(on) => void toggle(context.id, on)}
          >
            {label(context)}
          </Tag.CheckableTag>
        ))
      )}
    </Flex>
  )

  const first = shown[0]
  return (
    <Popover
      trigger={['hover', 'click']}
      open={open}
      onOpenChange={setOpen}
      mouseEnterDelay={0.15}
      placement="bottom"
      title="Contextos"
      content={editor}
    >
      <span
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-row-click="ignore"
        aria-label={
          shown.length
            ? `Contextos: ${shown.map((c) => c.name).join(', ')}. Editar`
            : 'Sem contexto. Editar'
        }
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setOpen((current) => !current)
          }
        }}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
      >
        {first ? (
          <Tag bordered={false} style={{ margin: 0 }}>
            {label(first)}
          </Tag>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        )}
        {shown.length > 1 && (
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
            +{shown.length - 1}
          </Tag>
        )}
      </span>
    </Popover>
  )
}
