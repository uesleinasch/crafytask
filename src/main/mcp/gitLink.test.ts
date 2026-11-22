import { describe, expect, it } from 'vitest'
import { GIT_BRANCH_LIMIT, gitBranchError, resumeHint, sessionIdError } from './gitLink'

describe('gitBranchError', () => {
  it('aceita nomes comuns de branch', () => {
    for (const name of ['main', 'feature/mcp-busca', 'release/v3.16.0', 'bugfix/issue_42']) {
      expect(gitBranchError(name)).toBeNull()
    }
  })

  it('recusa vazio, com espaço e longo demais', () => {
    expect(gitBranchError('')).toContain('vazio')
    expect(gitBranchError('minha branch')).toContain('espaço')
    expect(gitBranchError('feature/\tx')).toContain('espaço')
    expect(gitBranchError('x'.repeat(GIT_BRANCH_LIMIT))).toBeNull()
    expect(gitBranchError('x'.repeat(GIT_BRANCH_LIMIT + 1))).toContain('200')
  })
})

describe('sessionIdError', () => {
  it('aceita uuid e recusa o que quebraria a linha de comando', () => {
    expect(sessionIdError('c3b6d7d1-9937-4d55-b42d-59c2a30ec521')).toBeNull()
    expect(sessionIdError('abc; rm -rf ~')).not.toBeNull()
    expect(sessionIdError('$(whoami)')).not.toBeNull()
    expect(sessionIdError('')).not.toBeNull()
    expect(sessionIdError('x'.repeat(201))).not.toBeNull()
  })
})

describe('resumeHint', () => {
  it('monta o comando de retomada', () => {
    expect(resumeHint('abc-123')).toBe('claude --resume abc-123')
  })
})
