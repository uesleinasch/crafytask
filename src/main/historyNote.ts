import { prosemirrorToMarkdown } from './notesMarkdown'

export const HISTORY_NOTE_BODY_LIMIT = 200_000

export interface HistoryNote {
  summary: string
  body: string
}

export function historyNoteFromDoc(json: string): HistoryNote {
  if (json.length > HISTORY_NOTE_BODY_LIMIT) {
    throw new Error('A anotação passou do tamanho máximo do histórico.')
  }
  const summary = prosemirrorToMarkdown(json, undefined, { mentionLinks: true }).trim()
  if (!summary) throw new Error('A anotação está vazia.')
  return { summary, body: json }
}
