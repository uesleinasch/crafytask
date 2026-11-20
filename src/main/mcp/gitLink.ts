export const GIT_BRANCH_LIMIT = 200
export const SESSION_ID_LIMIT = 200

export function gitBranchError(value: string): string | null {
  if (value.length === 0) return 'O nome da branch não pode ser vazio.'
  if (value.length > GIT_BRANCH_LIMIT) {
    return `O nome da branch passa de ${GIT_BRANCH_LIMIT} caracteres.`
  }
  if (/\s/.test(value)) return 'O nome da branch não pode ter espaço.'
  return null
}

export function sessionIdError(value: string): string | null {
  if (value.length === 0) return 'O id da sessão não pode ser vazio.'
  if (value.length > SESSION_ID_LIMIT)
    return `O id da sessão passa de ${SESSION_ID_LIMIT} caracteres.`
  if (!/^[\w.:-]+$/.test(value)) {
    return 'O id da sessão só aceita letras, números, ponto, dois-pontos, hífen e sublinhado.'
  }
  return null
}

export function resumeHint(sessionId: string): string {
  return `claude --resume ${sessionId}`
}
