import { useEffect, useState } from 'react'
import { Input, Switch, theme } from 'antd'
import { usePersistedState } from '@renderer/hooks/usePersistedState'
import { TERMINAL_AUTO_TIMER_KEY, TERMINAL_SHELL_KEY } from '@renderer/lib/terminalPrefs'
import { KeyCombo } from '@renderer/components/shell/Kbd'
import {
  TERMINAL_MAXIMIZE_SHORTCUT_LABEL,
  TERMINAL_SHORTCUT_LABEL
} from '@renderer/components/terminal/terminalKeys'
import { SettingRow, SettingsCard } from './SettingsLayout'

export function TerminalSection(): React.JSX.Element {
  const { token } = theme.useToken()
  const [shell, setShell] = usePersistedState(TERMINAL_SHELL_KEY, '')
  const [autoTimer, setAutoTimer] = usePersistedState(TERMINAL_AUTO_TIMER_KEY, true)
  const [draft, setDraft] = useState(shell)

  useEffect(() => setDraft(shell), [shell])

  return (
    <SettingsCard title="Terminal embutido">
      <SettingRow
        title="Shell"
        description="Caminho do executável. Vazio usa o $SHELL do sistema. Vale para os próximos terminais."
      >
        <Input
          aria-label="Shell"
          value={draft}
          placeholder="/bin/zsh"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => setShell(draft.trim())}
          onPressEnter={(e) => e.currentTarget.blur()}
          style={{ width: 220, fontFamily: token.fontFamilyCode }}
        />
      </SettingRow>
      <SettingRow
        title="Iniciar o timer no primeiro comando"
        description="O primeiro Enter num terminal de tarefa inicia o timer dela, se ainda não estiver rodando."
      >
        <Switch
          checked={autoTimer}
          onChange={setAutoTimer}
          aria-label="Iniciar o timer no primeiro comando"
        />
      </SettingRow>
      <SettingRow title="Atalho do painel" description="Mostra e esconde o painel de terminais.">
        <KeyCombo keys={TERMINAL_SHORTCUT_LABEL.split(' + ')} />
      </SettingRow>
      <SettingRow title="Tela cheia" description="Abre o painel ocupando a janela inteira.">
        <KeyCombo keys={TERMINAL_MAXIMIZE_SHORTCUT_LABEL.split(' + ')} />
      </SettingRow>
    </SettingsCard>
  )
}
