import { createContext } from 'react'
import type { MenuProps } from 'antd'

export type RowMenuLookup = (rowKey: string) => MenuProps | null

export const RowMenuContext = createContext<RowMenuLookup | null>(null)
