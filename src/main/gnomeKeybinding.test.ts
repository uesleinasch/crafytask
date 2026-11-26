import { describe, expect, it } from 'vitest'
import {
  CRAFYTASK_PATH,
  CUSTOM_SCHEMA,
  DICTATION_SLOT,
  MEDIA_KEYS_SCHEMA,
  formatStrv,
  gnomeBinding,
  gvariantString,
  isGnomeKeybindingCurrent,
  parseStrv,
  readGnomeKeybinding,
  removeGnomeKeybinding,
  shellQuote,
  writeGnomeKeybinding,
  type GsettingsRun
} from './gnomeKeybinding'

function fakeGsettings(initial: Record<string, string> = {}): {
  run: GsettingsRun
  store: Record<string, string>
} {
  const store: Record<string, string> = {
    [`${MEDIA_KEYS_SCHEMA} custom-keybindings`]: '@as []',
    ...initial
  }
  const run: GsettingsRun = async ([cmd, schema, key, value]) => {
    if (cmd === 'get') return store[`${schema} ${key}`] ?? "''"
    if (cmd === 'set') store[`${schema} ${key}`] = value
    if (cmd === 'reset-recursively') {
      for (const k of Object.keys(store)) if (k.startsWith(`${schema} `)) delete store[k]
    }
    return ''
  }
  return { run, store }
}

describe('conversões', () => {
  it('leva o acelerador do Electron para o formato do GNOME', () => {
    expect(gnomeBinding('CommandOrControl+Shift+Space')).toBe('<Control><Shift>space')
    expect(gnomeBinding('CommandOrControl+Alt+J')).toBe('<Control><Alt>j')
    expect(gnomeBinding('Super+PageUp')).toBe('<Super>Page_Up')
    expect(gnomeBinding('Super+F9')).toBe('<Super>F9')
  })

  it('lê e escreve listas e strings do GVariant', () => {
    expect(parseStrv('@as []')).toEqual([])
    expect(parseStrv("['/a/', '/b/']")).toEqual(['/a/', '/b/'])
    expect(formatStrv(['/a/', "/b'c/"])).toBe("['/a/', '/b\\'c/']")
    expect(gvariantString('"/opt/TickTask App/ticktask" --quick-capture')).toBe(
      `'"/opt/TickTask App/ticktask" --quick-capture'`
    )
  })

  it('põe aspas no caminho com espaço', () => {
    expect(shellQuote('/usr/bin/ticktask')).toBe('/usr/bin/ticktask')
    expect(shellQuote('/opt/TickTask App/ticktask')).toBe('"/opt/TickTask App/ticktask"')
  })
})

describe('atalho personalizado do GNOME', () => {
  const command = '"/opt/TickTask App/ticktask" --quick-capture'

  it('cria, relê e mantém os atalhos que já existiam', async () => {
    const { run, store } = fakeGsettings({
      [`${MEDIA_KEYS_SCHEMA} custom-keybindings`]: "['/org/x/custom0/']"
    })
    expect(await readGnomeKeybinding(run)).toBeNull()
    await writeGnomeKeybinding(run, 'CommandOrControl+Alt+J', command)
    expect(parseStrv(store[`${MEDIA_KEYS_SCHEMA} custom-keybindings`])).toEqual([
      '/org/x/custom0/',
      CRAFYTASK_PATH
    ])
    const current = await readGnomeKeybinding(run)
    expect(current).toEqual({ binding: '<Control><Alt>j', command })
    expect(isGnomeKeybindingCurrent(current, 'CommandOrControl+Alt+J', command)).toBe(true)
    expect(isGnomeKeybindingCurrent(current, 'CommandOrControl+Shift+Space', command)).toBe(false)
  })

  it('atualizar não duplica o caminho', async () => {
    const { run, store } = fakeGsettings({
      [`${MEDIA_KEYS_SCHEMA} custom-keybindings`]: "['/org/x/custom0/']"
    })
    await writeGnomeKeybinding(run, 'CommandOrControl+Alt+J', command)
    await writeGnomeKeybinding(run, 'Super+F9', command)
    expect(parseStrv(store[`${MEDIA_KEYS_SCHEMA} custom-keybindings`])).toHaveLength(2)
    expect(store[`${CUSTOM_SCHEMA}:${CRAFYTASK_PATH} binding`]).toBe("'<Super>F9'")
  })

  it('o atalho do ditado vive num caminho próprio e sai sem levar o da captura', async () => {
    const { run, store } = fakeGsettings()
    await writeGnomeKeybinding(run, 'CommandOrControl+Shift+Space', command)
    await writeGnomeKeybinding(run, 'CommandOrControl+Alt+Space', 'ditar', DICTATION_SLOT)
    expect(await readGnomeKeybinding(run, DICTATION_SLOT)).toEqual({
      binding: '<Control><Alt>space',
      command: 'ditar'
    })
    expect(store[`${CUSTOM_SCHEMA}:${DICTATION_SLOT.path} name`]).toBe("'CrafyTask: ditado'")

    await removeGnomeKeybinding(run, DICTATION_SLOT)
    expect(parseStrv(store[`${MEDIA_KEYS_SCHEMA} custom-keybindings`])).toEqual([CRAFYTASK_PATH])
    expect(await readGnomeKeybinding(run, DICTATION_SLOT)).toBeNull()
    expect((await readGnomeKeybinding(run))?.command).toBe(command)
  })
})
