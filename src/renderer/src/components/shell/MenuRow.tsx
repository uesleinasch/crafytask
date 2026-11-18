import { useContext } from 'react'
import { Dropdown } from 'antd'
import { RowMenuContext } from './rowMenuContext'

export function MenuRow(
  props: React.HTMLAttributes<HTMLTableRowElement> & { 'data-row-key'?: string | number }
): React.JSX.Element {
  const menuOf = useContext(RowMenuContext)
  const menu = menuOf?.(String(props['data-row-key']))
  if (!menu) return <tr {...props} />
  return (
    <Dropdown menu={menu} trigger={['contextMenu']}>
      <tr {...props} />
    </Dropdown>
  )
}
