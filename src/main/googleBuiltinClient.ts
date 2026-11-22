import type { OAuthClient } from './googleOAuth'

export const BUILTIN_GOOGLE_CLIENT: OAuthClient = {
  clientId: import.meta.env.MAIN_VITE_GOOGLE_CLIENT_ID ?? '',
  clientSecret: import.meta.env.MAIN_VITE_GOOGLE_CLIENT_SECRET ?? ''
}
