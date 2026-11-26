import { app } from 'electron'
import { spawn, type ChildProcess } from 'child_process'
import { once } from 'events'
import {
  chmodSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  unlinkSync,
  watch,
  writeFileSync,
  type FSWatcher
} from 'fs'
import os from 'os'
import path from 'path'
import { ACCELERATOR_RULE, isValidAccelerator } from '@shared/accelerator'
import type { HandyStatus, HandyUpdateInfo } from '@shared/types'
import {
  DICTATION_SLOT,
  isGnomeKeybindingCurrent,
  readGnomeKeybinding,
  removeGnomeKeybinding,
  writeGnomeKeybinding,
  type GsettingsRun
} from './gnomeKeybinding'
import {
  compareVersions,
  DEFAULT_DICTATION_SHORTCUT,
  deliveryScript,
  HANDY_LATEST_RELEASE_URL,
  HANDY_PUBLIC_KEY,
  handyArch,
  handyBinding,
  handyLaunchArgs,
  inboxBatch,
  parseHandyRelease,
  patchHandySettings,
  signedFileName,
  toggleCommand,
  type HandyRelease
} from './handyPlan'
import { minisignPrehash, parseMinisignPublicKey, verifyMinisign } from './minisign'

export interface HandyDeps {
  usesGnomeKeybinding: () => boolean
  runGsettings: GsettingsRun
  deliver: (text: string) => void
  onStatus: (status: HandyStatus) => void
  reservedShortcuts: () => string[]
}

interface HandyConfig {
  enabled: boolean
  version: string | null
  shortcut: string
}

const DEFAULT_CONFIG: HandyConfig = {
  enabled: false,
  version: null,
  shortcut: DEFAULT_DICTATION_SHORTCUT
}

const configPath = (): string => path.join(app.getPath('userData'), 'handy-config.json')
const baseDir = (): string => path.join(app.getPath('userData'), 'handy')
const appDir = (): string => path.join(baseDir(), 'app')
const appRunPath = (): string => path.join(appDir(), 'squashfs-root', 'AppRun')
const inboxDir = (): string => path.join(baseDir(), 'inbox')
const scriptPath = (): string => path.join(baseDir(), 'entregar.sh')
const pidPath = (): string => path.join(baseDir(), 'handy.pid')
const handyStorePath = (): string =>
  path.join(
    process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share'),
    'com.pais.handy',
    'settings_store.json'
  )

let deps: HandyDeps | null = null
let child: ChildProcess | null = null
let watcher: FSWatcher | null = null
let installing: HandyStatus['installing'] = null
let progress: number | null = null
let lastError: string | null = null
let gnomeShortcutActive = false

function readConfig(): HandyConfig {
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(readFileSync(configPath(), 'utf8')) }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

function writeConfig(patch: Partial<HandyConfig>): HandyConfig {
  const next = { ...readConfig(), ...patch }
  writeFileSync(configPath(), JSON.stringify(next, null, 2))
  return next
}

const isSupported = (): boolean => process.platform === 'linux' && !!handyArch(process.arch)
const isInstalled = (config: HandyConfig): boolean => !!config.version && existsSync(appRunPath())
const usesGnome = (): boolean => deps?.usesGnomeKeybinding() ?? false
const errorText = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

function buildStatus(): HandyStatus {
  const config = readConfig()
  const installed = isInstalled(config)
  const active = config.enabled && installed && (usesGnome() ? gnomeShortcutActive : !!child)
  return {
    supported: isSupported(),
    installed,
    version: installed ? config.version : null,
    enabled: config.enabled,
    running: !!child,
    shortcut: config.shortcut,
    shortcutActive: active,
    installing,
    progress,
    error: lastError
  }
}

function emit(): void {
  deps?.onStatus(buildStatus())
}

export async function getHandyStatus(): Promise<HandyStatus> {
  if (usesGnome() && deps) {
    try {
      const current = await readGnomeKeybinding(deps.runGsettings, DICTATION_SLOT)
      gnomeShortcutActive = isGnomeKeybindingCurrent(
        current,
        readConfig().shortcut,
        toggleCommand(appRunPath())
      )
    } catch (error) {
      console.error('[handy] não foi possível ler o atalho do GNOME:', error)
      gnomeShortcutActive = false
    }
  }
  return buildStatus()
}

function readHandyStore(): unknown {
  try {
    return JSON.parse(readFileSync(handyStorePath(), 'utf8'))
  } catch {
    return undefined
  }
}

function drainInbox(): void {
  let names: string[]
  try {
    names = inboxBatch(readdirSync(inboxDir()))
  } catch {
    return
  }
  for (const name of names) {
    const file = path.join(inboxDir(), name)
    let text: string
    try {
      text = readFileSync(file, 'utf8')
      unlinkSync(file)
    } catch {
      continue
    }
    if (text) deps?.deliver(text)
  }
}

function startWatcher(): void {
  if (watcher) return
  watcher = watch(inboxDir(), () => drainInbox())
  watcher.on('error', (error) => {
    console.error('[handy] falha ao observar a caixa de entrada:', error)
    watcher = null
  })
}

function stopWatcher(): void {
  watcher?.close()
  watcher = null
}

function killGroup(pid: number): void {
  try {
    process.kill(-pid, 'SIGTERM')
  } catch {
    try {
      process.kill(pid, 'SIGTERM')
    } catch {
      // já tinha saído
    }
  }
}

async function waitForExit(pid: number, timeoutMs = 3000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (existsSync(`/proc/${pid}`) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}

function killOrphan(): number | null {
  let killed: number | null = null
  try {
    const pid = Number(readFileSync(pidPath(), 'utf8'))
    const cmdline = readFileSync(`/proc/${pid}/cmdline`, 'utf8')
    if (pid > 0 && cmdline.includes(appDir())) {
      killGroup(pid)
      killed = pid
    }
  } catch {
    // sem processo antigo
  }
  rmSync(pidPath(), { force: true })
  return killed
}

function stopHandy(): number | null {
  const proc = child
  child = null
  if (proc?.pid) killGroup(proc.pid)
  rmSync(pidPath(), { force: true })
  return proc?.pid ?? null
}

async function stopAndWait(): Promise<void> {
  const pids = [killOrphan(), stopHandy()].filter((pid): pid is number => pid !== null)
  await Promise.all(pids.map((pid) => waitForExit(pid)))
}

function prepareDelivery(config: HandyConfig): unknown {
  mkdirSync(inboxDir(), { recursive: true })
  for (const name of readdirSync(inboxDir())) rmSync(path.join(inboxDir(), name), { force: true })
  writeFileSync(scriptPath(), deliveryScript(inboxDir()))
  chmodSync(scriptPath(), 0o755)
  const store = readHandyStore()
  const patched = patchHandySettings(store, {
    scriptPath: scriptPath(),
    binding: handyBinding(config.shortcut)
  })
  mkdirSync(path.dirname(handyStorePath()), { recursive: true })
  writeFileSync(handyStorePath(), JSON.stringify(patched, null, 2))
  return store
}

async function startHandy(visible = false): Promise<void> {
  await stopAndWait()
  const config = readConfig()
  const store = prepareDelivery(config)
  startWatcher()
  lastError = null
  const proc = spawn(appRunPath(), visible ? [] : handyLaunchArgs(store), {
    detached: true,
    stdio: 'ignore'
  })
  child = proc
  if (proc.pid) writeFileSync(pidPath(), String(proc.pid))
  proc.on('error', (error) => {
    if (child !== proc) return
    child = null
    lastError = `Não foi possível abrir o Handy: ${error.message}`
    emit()
  })
  proc.on('exit', (code, signal) => {
    if (child !== proc) return
    child = null
    rmSync(pidPath(), { force: true })
    lastError = code === 0 ? 'O Handy foi fechado.' : `O Handy fechou com erro (${code ?? signal}).`
    emit()
  })
  emit()
}

async function applyShortcut(config: HandyConfig): Promise<void> {
  if (!usesGnome() || !deps) return
  try {
    await writeGnomeKeybinding(
      deps.runGsettings,
      config.shortcut,
      toggleCommand(appRunPath()),
      DICTATION_SLOT
    )
  } catch (error) {
    throw new Error(`Não foi possível definir o atalho no sistema: ${errorText(error)}`)
  }
}

export function handyShortcut(): string {
  return readConfig().shortcut
}

export function initHandy(handyDeps: HandyDeps): void {
  deps = handyDeps
  const config = readConfig()
  if (!config.enabled || !isInstalled(config) || !isSupported()) return
  startHandy().catch((error) => {
    lastError = `Não foi possível abrir o Handy: ${errorText(error)}`
    console.error('[handy] falha ao iniciar:', error)
    emit()
  })
}

export function shutdownHandy(): void {
  stopHandy()
  stopWatcher()
}

export async function setHandyEnabled(enabled: boolean): Promise<HandyStatus> {
  const current = readConfig()
  if (enabled && !isInstalled(current)) throw new Error('Instale o Handy primeiro.')
  const config = writeConfig({ enabled })
  if (enabled) {
    await startHandy()
    await applyShortcut(config)
  } else {
    shutdownHandy()
    lastError = null
    if (usesGnome() && deps) {
      await removeGnomeKeybinding(deps.runGsettings, DICTATION_SLOT).catch((error) => {
        console.error('[handy] falha ao remover o atalho do GNOME:', error)
      })
    }
  }
  return getHandyStatus()
}

export async function setHandyShortcut(accelerator: unknown): Promise<HandyStatus> {
  if (!isValidAccelerator(accelerator)) throw new Error(`Atalho inválido. ${ACCELERATOR_RULE}`)
  if (deps?.reservedShortcuts().includes(accelerator)) {
    throw new Error('Esse atalho já abre a captura rápida.')
  }
  const config = writeConfig({ shortcut: accelerator })
  if (config.enabled && isInstalled(config)) {
    await applyShortcut(config)
    if (!usesGnome()) await startHandy()
  }
  return getHandyStatus()
}

export async function openHandy(): Promise<HandyStatus> {
  const config = readConfig()
  if (!config.enabled || !isInstalled(config)) throw new Error('Ligue o ditado para abrir o Handy.')
  if (child) spawn(appRunPath(), [], { detached: true, stdio: 'ignore' }).unref()
  else await startHandy(true)
  return getHandyStatus()
}

async function fetchRelease(): Promise<HandyRelease> {
  const arch = handyArch(process.arch)
  if (!arch) throw new Error('O Handy não tem versão para este computador.')
  const response = await fetch(HANDY_LATEST_RELEASE_URL, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'CrafyTask' }
  })
  if (!response.ok) throw new Error(`O GitHub respondeu ${response.status}.`)
  const release = parseHandyRelease(await response.json(), arch)
  if (!release)
    throw new Error('A última versão do Handy não tem AppImage assinado para este computador.')
  return release
}

export async function checkHandyUpdate(): Promise<HandyUpdateInfo> {
  const release = await fetchRelease()
  const config = readConfig()
  const current = isInstalled(config) ? config.version : null
  return {
    latest: release.version,
    current,
    available: !current || compareVersions(release.version, current) > 0
  }
}

async function downloadFile(url: string, destination: string, expected: number): Promise<Buffer> {
  const response = await fetch(url)
  if (!response.ok || !response.body) throw new Error(`O download respondeu ${response.status}.`)
  const total = Number(response.headers.get('content-length')) || expected
  const hash = minisignPrehash()
  const out = createWriteStream(destination)
  let received = 0
  try {
    for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
      hash.update(chunk)
      received += chunk.length
      if (!out.write(chunk)) await once(out, 'drain')
      const percent = total ? Math.min(100, Math.floor((received * 100) / total)) : null
      if (percent !== progress) {
        progress = percent
        emit()
      }
    }
  } finally {
    out.end()
    await once(out, 'close')
  }
  return hash.digest()
}

function extractAppImage(file: string, cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(file, ['--appimage-extract'], { cwd, stdio: 'ignore' })
    proc.on('error', reject)
    proc.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`a extração saiu com código ${code}`))
    )
  })
}

export async function installHandy(): Promise<HandyStatus> {
  if (installing) throw new Error('A instalação do Handy já está em andamento.')
  installing = 'download'
  progress = 0
  lastError = null
  emit()
  mkdirSync(baseDir(), { recursive: true })
  const download = path.join(baseDir(), 'download.AppImage')
  const staging = path.join(baseDir(), 'app.new')
  try {
    const release = await fetchRelease()
    const signatureResponse = await fetch(release.signatureUrl)
    if (!signatureResponse.ok) throw new Error('Não foi possível baixar a assinatura.')
    const signature = await signatureResponse.text()
    const prehash = await downloadFile(release.assetUrl, download, release.assetSize)
    const trusted = verifyMinisign(parseMinisignPublicKey(HANDY_PUBLIC_KEY), signature, prehash)
    if (signedFileName(trusted) !== release.assetName) {
      throw new Error('A assinatura é de outro arquivo.')
    }
    installing = 'extract'
    progress = null
    emit()
    chmodSync(download, 0o755)
    rmSync(staging, { recursive: true, force: true })
    mkdirSync(staging, { recursive: true })
    await extractAppImage(download, staging)
    if (!existsSync(path.join(staging, 'squashfs-root', 'AppRun'))) {
      throw new Error('O pacote veio sem o AppRun.')
    }
    await stopAndWait()
    rmSync(appDir(), { recursive: true, force: true })
    renameSync(staging, appDir())
    const config = writeConfig({ version: release.version })
    if (config.enabled) await startHandy()
  } catch (error) {
    lastError = `Falha ao instalar o Handy: ${errorText(error)}`
    throw new Error(lastError)
  } finally {
    installing = null
    progress = null
    rmSync(download, { force: true })
    rmSync(staging, { recursive: true, force: true })
    emit()
  }
  return getHandyStatus()
}
