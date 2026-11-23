const NAME_LIMIT = 80

const FIELD_LABELS: Record<string, string> = {
  name: 'nome',
  description: 'descrição',
  category: 'categoria',
  energy: 'energia',
  project: 'projeto',
  milestone: 'marco',
  contexts: 'contextos',
  tags: 'tags',
  due_date: 'prazo',
  due_time: 'hora do prazo',
  scheduled_date: 'agendamento',
  scheduled_time: 'hora de início',
  scheduled_end_time: 'hora de fim',
  external_url: 'link externo',
  waiting_for: 'aguardando',
  time_limit_minutes: 'limite de tempo',
  recurrence: 'repetição',
  working_dir: 'pasta de trabalho',
  start_command: 'comando inicial',
  git_branch: 'branch',
  pr_url: 'PR'
}

function shortName(name: string): string {
  return name.length > NAME_LIMIT ? `${name.slice(0, NAME_LIMIT - 1)}…` : name
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

export function fieldsChangedSummary(args: Record<string, unknown>): string | null {
  const labels = Object.keys(FIELD_LABELS)
    .filter((key) => args[key] !== undefined)
    .map((key) => FIELD_LABELS[key])
  return labels.length > 0 ? `Alterado: ${labels.join(', ')}` : null
}

export function notesWrittenSummary(
  mode: 'append' | 'replace' | 'section',
  blocks: number
): string {
  if (mode === 'append') return `Notas: acréscimo de ${plural(blocks, 'bloco', 'blocos')}`
  if (mode === 'section') return 'Notas: seção substituída'
  return 'Notas substituídas'
}

export function drawingWrittenSummary(mode: 'append' | 'replace', elements: number): string {
  return mode === 'append'
    ? `Desenho: +${plural(elements, 'elemento', 'elementos')}`
    : 'Desenho substituído'
}

export function dependencySummary(action: 'add' | 'remove', dependsOnId: number): string {
  return action === 'add'
    ? `Passou a depender de #${dependsOnId}`
    : `Deixou de depender de #${dependsOnId}`
}

export function manualTimeSummary(minutes: number): string {
  return `Tempo manual: +${plural(minutes, 'minuto', 'minutos')}`
}

export function timeEntrySummary(action: 'update' | 'delete' | 'reset'): string {
  if (action === 'update') return 'Sessão de tempo corrigida'
  if (action === 'delete') return 'Sessão de tempo apagada'
  return 'Tempo registrado zerado'
}

export function gcalSyncSummary(enabled: boolean): string {
  return enabled
    ? 'Google Calendar: sincronização ligada'
    : 'Google Calendar: sincronização desligada'
}

export function jiraTransitionSummary(status: string | null | undefined): string {
  return status ? `Jira: issue movida para "${shortName(status)}"` : 'Jira: transição aplicada'
}

export function exportSummary(): string {
  return 'Markdown local regravado'
}

export function subtasksCreatedSummary(subtasks: { id: number; name: string }[]): string {
  if (subtasks.length === 1) {
    return `Subtarefa criada: #${subtasks[0].id} ${shortName(subtasks[0].name)}`
  }
  return `${subtasks.length} subtarefas criadas: ${subtasks.map((subtask) => `#${subtask.id}`).join(', ')}`
}

export function subtaskDeletedSummary(subtask: { id: number; name: string }): string {
  return `Subtarefa apagada: #${subtask.id} ${shortName(subtask.name)}`
}
