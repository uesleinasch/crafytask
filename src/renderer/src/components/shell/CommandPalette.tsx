import { App, Button, Divider, Flex, Input, Modal, Typography, theme } from 'antd'
import {
  ArrowRight,
  Bug,
  FileText,
  Folder,
  Inbox,
  NotebookText,
  Play,
  Rows3,
  Search,
  type LucideIcon
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { PageSearchResult, Project, Task } from '@shared/types'
import { useThemeSettings } from '@renderer/theme/themeSettings'
import { useTimerStore } from '@renderer/stores/timerStore'
import {
  NAV_COMMANDS,
  isCtrlShortcut,
  matchesQuery,
  moveIndex,
  onCommandPaletteRequest,
  simulateCrash
} from './paletteCommands'

const SHORTCUT_CODE = 'KeyK'
const SEARCH_DEBOUNCE_MS = 150
const TASK_LIMIT = 8
const PAGE_LIMIT = 5
const PROJECT_LIMIT = 5

interface PaletteItem {
  id: string
  group: string
  label: string
  hint?: string
  icon: LucideIcon
  run: () => void
  secondary?: { label: string; icon: LucideIcon; run: () => void }
}

export function CommandPalette(): React.JSX.Element {
  const { token } = theme.useToken()
  const { message } = App.useApp()
  const navigate = useNavigate()
  const { density, setDensity } = useThemeSettings()
  const startTimer = useTimerStore((s) => s.startTimer)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [tasks, setTasks] = useState<Task[]>([])
  const [pages, setPages] = useState<PageSearchResult[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const activeRef = useRef<HTMLDivElement | null>(null)

  const show = useCallback(() => {
    setQuery('')
    setActive(0)
    setTasks([])
    setPages([])
    setOpen(true)
    window.api
      .listProjects()
      .then(setProjects)
      .catch((error) => console.error('Falha ao carregar projetos da paleta:', error))
  }, [])

  useEffect(() => onCommandPaletteRequest(show), [show])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const insideTerminal = event.target instanceof Element && !!event.target.closest('.xterm')
      if (!isCtrlShortcut(event, SHORTCUT_CODE, insideTerminal)) return
      event.preventDefault()
      if (open) setOpen(false)
      else show()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, show])

  useEffect(() => {
    const term = query.trim()
    if (!open || term === '') {
      setTasks([])
      setPages([])
      return
    }
    let stale = false
    const timer = setTimeout(() => {
      Promise.all([
        window.api.listTasks({ search: term, limit: TASK_LIMIT }),
        window.api.searchPages(term)
      ])
        .then(([foundTasks, foundPages]) => {
          if (stale) return
          setTasks(foundTasks)
          setPages(foundPages.slice(0, PAGE_LIMIT))
        })
        .catch((error) => console.error('Falha na busca da paleta:', error))
    }, SEARCH_DEBOUNCE_MS)
    return () => {
      stale = true
      clearTimeout(timer)
    }
  }, [open, query])

  const close = useCallback(() => setOpen(false), [])

  const items = useMemo<PaletteItem[]>(() => {
    const term = query.trim()
    const go = (route: string) => () => {
      close()
      navigate(route)
    }
    const list: PaletteItem[] = []

    if (term !== '') {
      list.push({
        id: 'capture',
        group: 'Ações',
        label: `Capturar para o Inbox: “${term}”`,
        icon: Inbox,
        run: () => {
          close()
          window.api
            .quickCapture(term)
            .then(() => message.success('Capturado no Inbox'))
            .catch(() => message.error('Não foi possível capturar'))
        }
      })
    }

    const densityLabel =
      density === 'compact' ? 'Usar densidade confortável' : 'Usar densidade compacta'
    if (matchesQuery(`${densityLabel} aparência`, term)) {
      list.push({
        id: 'density',
        group: 'Ações',
        label: densityLabel,
        icon: Rows3,
        run: () => {
          close()
          setDensity(density === 'compact' ? 'comfortable' : 'compact')
        }
      })
    }

    if (import.meta.env.DEV && matchesQuery('Simular falha nesta tela', term)) {
      list.push({
        id: 'crash',
        group: 'Desenvolvimento',
        label: 'Simular falha nesta tela',
        icon: Bug,
        run: () => {
          close()
          simulateCrash()
        }
      })
    }

    for (const command of NAV_COMMANDS) {
      if (!matchesQuery(command.label, term)) continue
      list.push({
        id: `nav-${command.key}`,
        group: 'Ir para',
        label: command.label,
        icon: ArrowRight,
        run: go(command.route)
      })
    }

    for (const task of tasks) {
      list.push({
        id: `task-${task.id}`,
        group: 'Tarefas',
        label: task.name,
        hint: `#${task.id}`,
        icon: FileText,
        run: go(`/task/${task.id}`),
        secondary: task.is_running
          ? undefined
          : {
              label: `Iniciar timer de ${task.name}`,
              icon: Play,
              run: () => {
                close()
                startTimer(task.id)
                  .then(() => message.success('Timer iniciado'))
                  .catch(() => message.error('Não foi possível iniciar o timer'))
              }
            }
      })
    }

    if (term) {
      const matching = projects.filter((project) => matchesQuery(project.name, term))
      for (const project of matching.slice(0, PROJECT_LIMIT)) {
        list.push({
          id: `project-${project.id}`,
          group: 'Projetos',
          label: project.name,
          hint: project.status === 'archived' ? 'Arquivado' : undefined,
          icon: Folder,
          run: go(`/project/${project.id}`)
        })
      }
    }

    for (const page of pages) {
      list.push({
        id: `page-${page.id}`,
        group: 'Páginas',
        label: page.title || 'Sem título',
        hint: `${page.notebook_name} · ${page.section_name}`,
        icon: NotebookText,
        run: go(`/notebooks?page=${page.id}`)
      })
    }

    return list
  }, [query, tasks, projects, pages, density, setDensity, navigate, close, message, startTimer])

  const activeIndex = Math.min(active, Math.max(items.length - 1, 0))

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const handleKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setActive(moveIndex(activeIndex, event.key === 'ArrowDown' ? 1 : -1, items.length))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      items[activeIndex]?.run()
    }
  }

  let lastGroup = ''

  return (
    <Modal
      open={open}
      onCancel={close}
      footer={null}
      closable={false}
      width={560}
      destroyOnHidden
      styles={{ container: { padding: 8 } }}
      aria-label="Paleta de comandos"
    >
      <Input
        autoFocus
        size="large"
        variant="borderless"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setActive(0)
        }}
        onKeyDown={handleKeyDown}
        placeholder="Buscar tarefas, projetos, páginas ou comandos…"
        aria-label="Buscar tarefas, páginas ou comandos"
        prefix={<Search size={18} strokeWidth={1.75} aria-hidden />}
      />
      <Divider style={{ margin: '6px 0' }} />
      <div role="listbox" aria-label="Resultados" style={{ maxHeight: 360, overflowY: 'auto' }}>
        {items.length === 0 && (
          <Typography.Text type="secondary" style={{ display: 'block', padding: '8px 12px' }}>
            Nada encontrado
          </Typography.Text>
        )}
        {items.map((item, index) => {
          const header = item.group !== lastGroup ? item.group : null
          lastGroup = item.group
          const selected = index === activeIndex
          const Icon = item.icon
          return (
            <div key={item.id}>
              {header && (
                <Typography.Text
                  type="secondary"
                  style={{
                    display: 'block',
                    padding: '8px 12px 4px',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '.08em',
                    textTransform: 'uppercase'
                  }}
                >
                  {header}
                </Typography.Text>
              )}
              <div
                ref={selected ? activeRef : undefined}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActive(index)}
                onClick={item.run}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  borderRadius: token.borderRadius,
                  cursor: 'pointer',
                  background: selected ? token.controlItemBgActive : undefined
                }}
              >
                <Icon size={16} strokeWidth={1.75} aria-hidden style={{ flex: 'none' }} />
                <Typography.Text ellipsis style={{ flex: 1, minWidth: 0 }}>
                  {item.label}
                </Typography.Text>
                {item.hint && (
                  <Typography.Text
                    type="secondary"
                    ellipsis
                    style={{ fontSize: 12, maxWidth: 200 }}
                  >
                    {item.hint}
                  </Typography.Text>
                )}
                {item.secondary && (
                  <Button
                    size="small"
                    type="text"
                    aria-label={item.secondary.label}
                    icon={<item.secondary.icon size={14} strokeWidth={1.75} />}
                    onClick={(event) => {
                      event.stopPropagation()
                      item.secondary?.run()
                    }}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>
      <Flex gap={16} style={{ padding: '8px 12px 4px' }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          ↑↓ navegar · Enter abrir · Esc fechar
        </Typography.Text>
      </Flex>
    </Modal>
  )
}
