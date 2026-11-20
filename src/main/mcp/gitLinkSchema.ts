import { z } from 'zod'
import { gitBranchError, sessionIdError } from './gitLink'

function checked(check: (value: string) => string | null): z.ZodString {
  return z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      const message = check(value)
      if (message) ctx.addIssue({ code: 'custom', message })
    })
}

export const GIT_BRANCH = checked(gitBranchError).describe(
  'Branch do git em que o trabalho da task está.'
)
export const SESSION_ID = checked(sessionIdError).describe(
  'Id da sessão do cliente (no Claude Code, o id da sessão atual), para retomar depois.'
)
