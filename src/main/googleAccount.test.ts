import { describe, expect, it } from 'vitest'
import {
  authScopes,
  clientMode,
  emailFromIdToken,
  grantedPermissions,
  resolveClient
} from './googleAccount'
import { DRIVE_SCOPE, GCAL_SCOPE } from './googleOAuth'

const builtin = { clientId: 'embutido', clientSecret: 'segredo' }

describe('clientMode', () => {
  it('quem já tinha cliente próprio continua nele; o resto usa o embutido', () => {
    expect(clientMode({})).toBe('builtin')
    expect(clientMode({ clientId: 'meu' })).toBe('custom')
    expect(clientMode({ clientId: 'meu', mode: 'builtin' })).toBe('builtin')
  })
})

describe('resolveClient', () => {
  it('escolhe o cliente do modo e recusa credencial incompleta', () => {
    expect(resolveClient({}, builtin)).toEqual(builtin)
    expect(resolveClient({}, { clientId: '', clientSecret: '' })).toBeNull()
    expect(resolveClient({ clientId: 'meu', clientSecret: 'x' }, builtin)).toEqual({
      clientId: 'meu',
      clientSecret: 'x'
    })
    expect(resolveClient({ mode: 'custom', clientId: 'meu' }, builtin)).toBeNull()
  })
})

describe('grantedPermissions', () => {
  it('lê os escopos concedidos; config antiga sem escopos tinha só a agenda', () => {
    expect(grantedPermissions(undefined)).toEqual({ calendar: true, drive: false })
    expect(grantedPermissions(['openid', DRIVE_SCOPE])).toEqual({ calendar: false, drive: true })
    expect(grantedPermissions([GCAL_SCOPE, DRIVE_SCOPE])).toEqual({ calendar: true, drive: true })
  })
})

describe('authScopes', () => {
  it('pede a identidade e só a permissão escolhida', () => {
    expect(authScopes('drive')).toEqual([
      'openid',
      'https://www.googleapis.com/auth/userinfo.email',
      DRIVE_SCOPE
    ])
  })
})

describe('emailFromIdToken', () => {
  it('lê o e-mail do id_token e ignora token inválido', () => {
    const payload = Buffer.from(JSON.stringify({ email: 'voce@gmail.com' })).toString('base64url')
    expect(emailFromIdToken(`h.${payload}.s`)).toBe('voce@gmail.com')
    expect(emailFromIdToken('h.@@@.s')).toBeUndefined()
    expect(emailFromIdToken(undefined)).toBeUndefined()
  })
})
