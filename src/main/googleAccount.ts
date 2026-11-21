import { DRIVE_SCOPE, GCAL_SCOPE, IDENTITY_SCOPES, type OAuthClient } from './googleOAuth'
import type { GoogleClientMode, GooglePermission, GooglePermissions } from '@shared/types'

export const PERMISSION_SCOPE: Record<GooglePermission, string> = {
  calendar: GCAL_SCOPE,
  drive: DRIVE_SCOPE
}

export const NO_BUILTIN_CLIENT_MESSAGE =
  'Esta versão do CrafyTask não traz o cliente Google embutido. Use um cliente próprio em Avançado.'
export const NO_CUSTOM_CLIENT_MESSAGE = 'Informe o Client ID e o Client Secret antes de conectar.'

export interface GoogleClientConfig {
  mode?: GoogleClientMode
  clientId?: string
  clientSecret?: string
}

export function clientMode(config: GoogleClientConfig): GoogleClientMode {
  return config.mode ?? (config.clientId ? 'custom' : 'builtin')
}

export function resolveClient(
  config: GoogleClientConfig,
  builtin: OAuthClient
): OAuthClient | null {
  const client =
    clientMode(config) === 'builtin'
      ? builtin
      : { clientId: config.clientId ?? '', clientSecret: config.clientSecret ?? '' }
  return client.clientId && client.clientSecret ? client : null
}

export function grantedPermissions(scopes: string[] | undefined): GooglePermissions {
  if (!scopes) return { calendar: true, drive: false }
  return {
    calendar: scopes.includes(GCAL_SCOPE),
    drive: scopes.includes(DRIVE_SCOPE)
  }
}

export function authScopes(permission: GooglePermission): string[] {
  return [...IDENTITY_SCOPES, PERMISSION_SCOPE[permission]]
}

export function emailFromIdToken(idToken: string | undefined): string | undefined {
  const payload = idToken?.split('.')[1]
  if (!payload) return undefined
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as {
      email?: unknown
    }
    return typeof claims.email === 'string' ? claims.email : undefined
  } catch {
    return undefined
  }
}
