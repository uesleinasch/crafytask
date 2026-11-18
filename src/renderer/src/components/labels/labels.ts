import type { ContextWithUsage, TagWithUsage } from '@shared/types'
import { USER_COLORS } from '@renderer/theme/semantic'

export type LabelKind = 'context' | 'tag'
export type LabelSort = 'uses' | 'name' | 'unused'

export interface Label {
  kind: LabelKind
  id: number
  name: string
  color: string
  icon: string | null
  task_count: number
  open_count: number
}

export const CONTEXT_EMOJIS = [
  '💻',
  '📱',
  '👥',
  '📧',
  '📖',
  '🛒',
  '🏠',
  '🏢',
  '🚗',
  '🏋️',
  '☎️',
  '📝',
  '🎯',
  '💬',
  '🔧',
  '📋',
  '✍️',
  '🔀'
]

export function contextLabel(context: ContextWithUsage): Label {
  return { ...context, kind: 'context', icon: context.icon }
}

export function tagLabel(tag: TagWithUsage): Label {
  return { ...tag, kind: 'tag', icon: null }
}

export function normalizeLabelName(kind: LabelKind, name: string): string {
  const trimmed = name.trim()
  return kind === 'tag' ? trimmed.replace(/^#+/, '').trim() : trimmed
}

export function labelDisplay(kind: LabelKind, name: string): string {
  return kind === 'tag' ? `#${name}` : name
}

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`

export function labelUsage(label: Label): string {
  if (label.task_count === 0) return label.kind === 'tag' ? 'não usada' : 'não usado'
  return `em ${plural(label.task_count, 'tarefa', 'tarefas')} · ${plural(label.open_count, 'aberta', 'abertas')}`
}

export interface LabelQuery {
  query: string
  onlyUnused: boolean
  sort: LabelSort
}

export function visibleLabels(labels: Label[], { query, onlyUnused, sort }: LabelQuery): Label[] {
  const needle = query.trim().toLowerCase()
  const byName = (a: Label, b: Label): number =>
    a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
  const compare =
    sort === 'name'
      ? byName
      : sort === 'unused'
        ? (a: Label, b: Label) => a.task_count - b.task_count || byName(a, b)
        : (a: Label, b: Label) => b.task_count - a.task_count || byName(a, b)
  return labels
    .filter((label) => !needle || label.name.toLowerCase().includes(needle))
    .filter((label) => !onlyUnused || label.task_count === 0)
    .sort(compare)
}

export function labelNameTaken(labels: Label[], name: string, exceptId?: number): boolean {
  const wanted = name.toLowerCase()
  return labels.some((label) => label.id !== exceptId && label.name.toLowerCase() === wanted)
}

export function labelTasksPath(label: Pick<Label, 'kind' | 'id'>): string {
  return `/?${label.kind === 'tag' ? 'tag' : 'context'}=${label.id}`
}

export interface LabelDraft {
  original: Label | null
  name: string
  icon: string | null
  color: string
}

export function newLabelDraft(kind: LabelKind): LabelDraft {
  return {
    original: null,
    name: '',
    icon: kind === 'context' ? CONTEXT_EMOJIS[0] : null,
    color: USER_COLORS[5]
  }
}

export function editLabelDraft(label: Label): LabelDraft {
  return { original: label, name: label.name, icon: label.icon, color: label.color }
}
