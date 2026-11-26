import { execFileSync } from 'child_process'
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { isValidAccelerator } from '@shared/accelerator'
import {
  compareVersions,
  DEFAULT_DICTATION_SHORTCUT,
  deliveryScript,
  handyArch,
  handyBinding,
  handyLaunchArgs,
  inboxBatch,
  parseHandyRelease,
  patchHandySettings,
  signedFileName,
  toggleCommand
} from './handyPlan'

const release = {
  tag_name: 'v0.10.2',
  assets: [
    { name: 'Handy_0.10.2_amd64.deb', browser_download_url: 'https://x/deb', size: 1 },
    { name: 'Handy_0.10.2_amd64.AppImage', browser_download_url: 'https://x/app', size: 124 },
    { name: 'Handy_0.10.2_amd64.AppImage.sig', browser_download_url: 'https://x/sig', size: 4 },
    { name: 'Handy_0.10.2_aarch64.AppImage', browser_download_url: 'https://x/arm', size: 116 }
  ]
}

describe('release do GitHub', () => {
  it('escolhe o AppImage da arquitetura e a assinatura dele', () => {
    expect(parseHandyRelease(release, handyArch('x64')!)).toEqual({
      version: '0.10.2',
      assetName: 'Handy_0.10.2_amd64.AppImage',
      assetUrl: 'https://x/app',
      assetSize: 124,
      signatureUrl: 'https://x/sig'
    })
  })

  it('sem assinatura, sem release', () => {
    expect(parseHandyRelease(release, 'aarch64')).toBeNull()
    expect(parseHandyRelease({ message: 'rate limit' }, 'amd64')).toBeNull()
    expect(handyArch('ia32')).toBeNull()
  })

  it('compara versões por número', () => {
    expect(compareVersions('0.10.2', '0.9.9')).toBe(1)
    expect(compareVersions('0.10.2', '0.10.2')).toBe(0)
    expect(compareVersions('0.10', '0.10.1')).toBe(-1)
  })

  it('lê o nome do arquivo no comentário confiável', () => {
    expect(signedFileName('timestamp:1795492684\tfile:Handy_0.10.2_amd64.AppImage')).toBe(
      'Handy_0.10.2_amd64.AppImage'
    )
    expect(signedFileName('timestamp:1')).toBeNull()
  })
})

describe('configuração do Handy', () => {
  it('converte o acelerador para o formato do Handy', () => {
    expect(handyBinding('CommandOrControl+Alt+Space')).toBe('ctrl+alt+space')
    expect(handyBinding('Super+Up')).toBe('super+arrowup')
    expect(handyBinding('CommandOrControl+Shift+F9')).toBe('ctrl+shift+f9')
    expect(isValidAccelerator(DEFAULT_DICTATION_SHORTCUT)).toBe(true)
  })

  it('força a entrega pelo script e preserva o resto', () => {
    const store = {
      settings: {
        selected_model: 'parakeet',
        auto_submit: true,
        paste_method: 'shift_insert',
        bindings: {
          cancel: { id: 'cancel', current_binding: 'escape' },
          transcribe: {
            id: 'transcribe',
            name: 'Transcribe',
            description: 'd',
            default_binding: 'ctrl+space',
            current_binding: 'ctrl+space'
          }
        }
      },
      other: 1
    }
    const patched = patchHandySettings(store, { scriptPath: '/s', binding: 'ctrl+alt+space' })
    const settings = patched.settings as Record<string, unknown>
    expect(patched.other).toBe(1)
    expect(settings).toMatchObject({
      selected_model: 'parakeet',
      paste_method: 'external_script',
      external_script_path: '/s',
      auto_submit: false,
      autostart_enabled: false,
      update_checks_enabled: false
    })
    const bindings = settings.bindings as Record<string, Record<string, string>>
    expect(bindings.cancel).toEqual({ id: 'cancel', current_binding: 'escape' })
    expect(bindings.transcribe.current_binding).toBe('ctrl+alt+space')
    expect(bindings.transcribe.description).toBe('d')
  })

  it('sem arquivo, cria o atalho completo e abre a janela para o primeiro uso', () => {
    const patched = patchHandySettings(undefined, { scriptPath: '/s', binding: 'super+f9' })
    const transcribe = (patched.settings as { bindings: Record<string, Record<string, string>> })
      .bindings.transcribe
    expect(Object.keys(transcribe).sort()).toEqual([
      'current_binding',
      'default_binding',
      'description',
      'id',
      'name'
    ])
    expect(handyLaunchArgs(patched)).toEqual([])
    expect(handyLaunchArgs({ settings: { onboarding_completed: true } })).toEqual([
      '--start-hidden'
    ])
  })

  it('monta o comando do atalho com aspas no caminho', () => {
    expect(toggleCommand('/home/a b/AppRun')).toBe('"/home/a b/AppRun" --toggle-transcription')
  })
})

describe('entrega do texto', () => {
  it('o script grava o texto inteiro na caixa de entrada', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'handy-inbox-'))
    const script = path.join(dir, 'entregar.sh')
    writeFileSync(script, deliveryScript(dir), { mode: 0o755 })
    const text = 'Olá, "mundo" $HOME `x`\nsegunda linha'
    execFileSync(script, [text])
    const [name] = inboxBatch(readdirSync(dir))
    expect(readFileSync(path.join(dir, name), 'utf8')).toBe(text)
  })

  it('só pega arquivos completos, em ordem', () => {
    expect(inboxBatch(['2-9.txt', '.123.tmp', '1-9.txt', 'entregar.sh'])).toEqual([
      '1-9.txt',
      '2-9.txt'
    ])
  })
})
