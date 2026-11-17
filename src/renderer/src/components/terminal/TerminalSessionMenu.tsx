import { Palette, Pencil, Shapes, SplitSquareHorizontal, Undo2 } from 'lucide-react'
import type { TerminalSession } from '@shared/types'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger
} from '@renderer/components/ui/context-menu'
import { DEFAULT_COLORS } from '@renderer/lib/colors'
import { useTerminalStore } from '@renderer/stores/terminalStore'
import { TERMINAL_TAB_ICONS } from '@shared/terminalTab'
import { TAB_ICON_COMPONENTS } from './tabIcons'

interface TerminalSessionMenuProps {
  session: TerminalSession
  canDetach: boolean
  onRename: () => void
  children: React.ReactNode
}

export function TerminalSessionMenu({
  session,
  canDetach,
  onRename,
  children
}: TerminalSessionMenuProps): React.JSX.Element {
  const store = useTerminalStore.getState
  return (
    <ContextMenu modal={false}>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48" onCloseAutoFocus={(event) => event.preventDefault()}>
        <ContextMenuItem onSelect={onRename}>
          <Pencil /> Renomear
        </ContextMenuItem>
        <ContextMenuItem
          disabled={session.title === null}
          onSelect={() => void store().customize(session.id, { title: null })}
        >
          <Undo2 /> Restaurar nome
        </ContextMenuItem>
        <ContextMenuItem disabled={!canDetach} onSelect={() => store().detach(session.id)}>
          <SplitSquareHorizontal /> Separar do grupo
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Palette /> Cor
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-40">
            <ContextMenuRadioGroup
              value={session.color ?? 'none'}
              onValueChange={(value) =>
                void store().customize(session.id, { color: value === 'none' ? null : value })
              }
            >
              <ContextMenuRadioItem value="none">Sem cor</ContextMenuRadioItem>
              {DEFAULT_COLORS.map((color) => (
                <ContextMenuRadioItem key={color} value={color}>
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  {color}
                </ContextMenuRadioItem>
              ))}
            </ContextMenuRadioGroup>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Shapes /> Ícone
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-44">
            <ContextMenuRadioGroup
              value={session.icon ?? 'none'}
              onValueChange={(value) =>
                void store().customize(session.id, { icon: value === 'none' ? null : value })
              }
            >
              <ContextMenuRadioItem value="none">Sem ícone</ContextMenuRadioItem>
              {TERMINAL_TAB_ICONS.map(({ id, label }) => {
                const Icon = TAB_ICON_COMPONENTS[id]
                return (
                  <ContextMenuRadioItem key={id} value={id}>
                    <Icon /> {label}
                  </ContextMenuRadioItem>
                )
              })}
            </ContextMenuRadioGroup>
          </ContextMenuSubContent>
        </ContextMenuSub>
      </ContextMenuContent>
    </ContextMenu>
  )
}
