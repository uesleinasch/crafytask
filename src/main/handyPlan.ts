import { shellQuote } from './gnomeKeybinding'

export const HANDY_LATEST_RELEASE_URL = 'https://api.github.com/repos/cjpais/Handy/releases/latest'

// Chave do updater do Handy (plugins.updater.pubkey em src-tauri/tauri.conf.json do upstream).
// Se o upstream trocar a chave, a atualização falha até este valor ser trocado também.
export const HANDY_PUBLIC_KEY =
  'dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IEJBQjcyMDk1MjA2NjAxRjkKUldUNUFXWWdsU0MzdXRRZi8zYzhqV2FaNUVDbDd2Rk5VM1IvWWowVXdmRFNKQ1BrMXF5RFFsLy8K'

export const DEFAULT_DICTATION_SHORTCUT = 'CommandOrControl+Alt+Space'

export interface HandyRelease {
  version: string
  assetName: string
  assetUrl: string
  assetSize: number
  signatureUrl: string
}

const ARCH: Record<string, string> = { x64: 'amd64', arm64: 'aarch64' }

export function handyArch(nodeArch: string): string | null {
  return ARCH[nodeArch] ?? null
}

interface GithubAsset {
  name?: unknown
  browser_download_url?: unknown
  size?: unknown
}

export function parseHandyRelease(json: unknown, arch: string): HandyRelease | null {
  if (!json || typeof json !== 'object') return null
  const { tag_name: tag, assets } = json as { tag_name?: unknown; assets?: unknown }
  if (typeof tag !== 'string' || !Array.isArray(assets)) return null
  const version = tag.replace(/^v/, '')
  const list = assets as GithubAsset[]
  const assetName = `Handy_${version}_${arch}.AppImage`
  const asset = list.find((item) => item.name === assetName)
  const signature = list.find((item) => item.name === `${assetName}.sig`)
  if (
    !asset ||
    !signature ||
    typeof asset.browser_download_url !== 'string' ||
    typeof signature.browser_download_url !== 'string'
  ) {
    return null
  }
  return {
    version,
    assetName,
    assetUrl: asset.browser_download_url,
    assetSize: typeof asset.size === 'number' ? asset.size : 0,
    signatureUrl: signature.browser_download_url
  }
}

export function compareVersions(a: string, b: string): number {
  const pa = a.split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0)
  const pb = b.split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) return Math.sign(diff)
  }
  return 0
}

export function signedFileName(trustedComment: string): string | null {
  const match = /(?:^|\t)file:([^\t]+)/.exec(trustedComment)
  return match ? match[1] : null
}

const HANDY_MODIFIER: Record<string, string> = {
  CommandOrControl: 'ctrl',
  Alt: 'alt',
  Shift: 'shift',
  Super: 'super'
}

const HANDY_KEY: Record<string, string> = {
  Up: 'arrowup',
  Down: 'arrowdown',
  Left: 'arrowleft',
  Right: 'arrowright'
}

export function handyBinding(accelerator: string): string {
  const parts = accelerator.split('+')
  const key = parts.pop() ?? ''
  const modifiers = parts.map((part) => HANDY_MODIFIER[part] ?? part.toLowerCase())
  return [...modifiers, HANDY_KEY[key] ?? key.toLowerCase()].join('+')
}

export const HANDY_FORCED_SETTINGS = {
  paste_method: 'external_script',
  auto_submit: false,
  autostart_enabled: false,
  update_checks_enabled: false
} as const

type Json = Record<string, unknown>

const isObject = (value: unknown): value is Json =>
  !!value && typeof value === 'object' && !Array.isArray(value)

const isBinding = (value: unknown): value is Json =>
  isObject(value) &&
  ['id', 'name', 'description', 'default_binding', 'current_binding'].every(
    (key) => typeof value[key] === 'string'
  )

export function patchHandySettings(
  store: unknown,
  options: { scriptPath: string; binding: string }
): Json {
  const root = isObject(store) ? store : {}
  const settings = isObject(root.settings) ? root.settings : {}
  const bindings = isObject(settings.bindings) ? settings.bindings : {}
  const transcribe = isBinding(bindings.transcribe)
    ? bindings.transcribe
    : {
        id: 'transcribe',
        name: 'Transcribe',
        description: 'Converts your speech into text.',
        default_binding: 'ctrl+space'
      }
  return {
    ...root,
    settings: {
      ...settings,
      ...HANDY_FORCED_SETTINGS,
      external_script_path: options.scriptPath,
      bindings: { ...bindings, transcribe: { ...transcribe, current_binding: options.binding } }
    }
  }
}

export function needsOnboarding(store: unknown): boolean {
  const settings = isObject(store) && isObject(store.settings) ? store.settings : {}
  return settings.onboarding_completed !== true
}

export function handyLaunchArgs(store: unknown): string[] {
  return needsOnboarding(store) ? [] : ['--start-hidden']
}

export function deliveryScript(inboxDir: string): string {
  return [
    '#!/bin/sh',
    `inbox=${shellQuote(inboxDir)}`,
    'tmp="$inbox/.$$.tmp"',
    'printf \'%s\' "$1" > "$tmp" && mv -f "$tmp" "$inbox/$(date +%s%N)-$$.txt"',
    ''
  ].join('\n')
}

export function toggleCommand(appRunPath: string): string {
  return `${shellQuote(appRunPath)} --toggle-transcription`
}

export function inboxBatch(names: string[]): string[] {
  return names.filter((name) => /^\d+-\d+\.txt$/.test(name)).sort()
}
