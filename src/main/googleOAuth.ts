import { createHash, randomBytes } from 'node:crypto'

export const GCAL_SCOPE = 'https://www.googleapis.com/auth/calendar.app.created'
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'
export const IDENTITY_SCOPES = ['openid', 'https://www.googleapis.com/auth/userinfo.email']

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke'

export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>

export interface OAuthClient {
  clientId: string
  clientSecret: string
}

export class GoogleAuthRevokedError extends Error {
  constructor() {
    super('A autorização do Google expirou ou foi revogada. Reconecte nas Configurações.')
    this.name = 'GoogleAuthRevokedError'
  }
}

export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(48).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

export function buildAuthUrl(params: {
  clientId: string
  redirectUri: string
  codeChallenge: string
  state: string
  scopes: string[]
  loginHint?: string
}): string {
  const query = new URLSearchParams({
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    response_type: 'code',
    scope: params.scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    code_challenge: params.codeChallenge,
    code_challenge_method: 'S256',
    state: params.state
  })
  if (params.loginHint) query.set('login_hint', params.loginHint)
  return `${AUTH_ENDPOINT}?${query}`
}

interface TokenResponse {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  scope?: string
  id_token?: string
  error?: string
  error_description?: string
}

async function postToken(fetchFn: FetchFn, form: Record<string, string>): Promise<TokenResponse> {
  const response = await fetchFn(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form).toString()
  })
  const body = (await response.json().catch(() => ({}))) as TokenResponse
  if (!response.ok) {
    if (body.error === 'invalid_grant') throw new GoogleAuthRevokedError()
    throw new Error(body.error_description || body.error || `Google OAuth: HTTP ${response.status}`)
  }
  if (!body.access_token) throw new Error('Google OAuth: resposta sem access token')
  return body
}

export async function exchangeCode(
  fetchFn: FetchFn,
  params: OAuthClient & { code: string; codeVerifier: string; redirectUri: string },
  now: number
): Promise<{
  accessToken: string
  refreshToken: string
  expiresAt: number
  scopes: string[]
  idToken?: string
}> {
  const body = await postToken(fetchFn, {
    client_id: params.clientId,
    client_secret: params.clientSecret,
    code: params.code,
    code_verifier: params.codeVerifier,
    grant_type: 'authorization_code',
    redirect_uri: params.redirectUri
  })
  if (!body.refresh_token) {
    throw new Error('O Google não devolveu um refresh token. Tente conectar de novo.')
  }
  return {
    accessToken: body.access_token!,
    refreshToken: body.refresh_token,
    expiresAt: now + (body.expires_in ?? 3600) * 1000,
    scopes: (body.scope ?? '').split(' ').filter(Boolean),
    idToken: body.id_token
  }
}

export async function refreshAccessToken(
  fetchFn: FetchFn,
  params: OAuthClient & { refreshToken: string },
  now: number
): Promise<{ accessToken: string; expiresAt: number }> {
  const body = await postToken(fetchFn, {
    client_id: params.clientId,
    client_secret: params.clientSecret,
    refresh_token: params.refreshToken,
    grant_type: 'refresh_token'
  })
  return { accessToken: body.access_token!, expiresAt: now + (body.expires_in ?? 3600) * 1000 }
}

export async function revokeToken(fetchFn: FetchFn, token: string): Promise<void> {
  await fetchFn(REVOKE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token }).toString()
  })
}
