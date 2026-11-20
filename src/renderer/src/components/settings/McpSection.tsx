import { useState } from 'react'
import { App, Button, Flex, Switch, Typography, theme } from 'antd'
import { KeyRound } from 'lucide-react'
import type { McpStatus } from '@shared/types'
import { SettingRow, SettingsCard } from './SettingsLayout'
import { errorMessage } from './settingsStatus'

export function McpSection({
  status,
  onStatusChange
}: {
  status: McpStatus
  onStatusChange: (status: McpStatus) => void
}): React.JSX.Element {
  const { token } = theme.useToken()
  const { message, modal } = App.useApp()
  const [regenerating, setRegenerating] = useState(false)
  const [switching, setSwitching] = useState(false)

  async function toggle(checked: boolean): Promise<void> {
    setSwitching(true)
    try {
      onStatusChange(await window.api.mcpSetEnabled(checked))
    } catch (error) {
      message.error(errorMessage(error))
    } finally {
      setSwitching(false)
    }
  }
  const mono = { fontFamily: token.fontFamilyCode, fontVariantNumeric: 'tabular-nums' as const }

  async function regenerate(): Promise<void> {
    setRegenerating(true)
    try {
      onStatusChange(await window.api.mcpRegenerateToken())
      message.success('Token regenerado.')
    } catch (error) {
      message.error(`Erro ao regenerar token: ${errorMessage(error)}`)
    } finally {
      setRegenerating(false)
    }
  }

  const confirmRegenerate = (): void => {
    modal.confirm({
      title: 'Regenerar o token do MCP?',
      content:
        'O token atual deixa de valer. Clientes que você configurou à mão por HTTP com ele param até receber o novo. Quem registrou com o comando acima continua funcionando, e suas tarefas não mudam.',
      okText: 'Regenerar',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: regenerate
    })
  }

  const stateText = !status.enabled ? (
    'Desligado'
  ) : status.running ? (
    <span>
      Rodando em <span style={mono}>127.0.0.1:{status.port}</span>
    </span>
  ) : (
    <Typography.Text type="danger">
      Falha ao iniciar na porta <span style={mono}>{status.port}</span>. Verifique se ela já está em
      uso.
    </Typography.Text>
  )

  return (
    <Flex vertical gap={16}>
      <SettingsCard title="Servidor">
        <SettingRow title="Servidor MCP" description={stateText}>
          <Switch
            checked={status.enabled}
            aria-label="Servidor MCP"
            loading={switching}
            onChange={(checked) => void toggle(checked)}
          />
        </SettingRow>
      </SettingsCard>
      <SettingsCard title="Registrar no Claude Code">
        <SettingRow
          title="Comando de registro"
          description="Rode uma vez no terminal: registra a ponte local do CrafyTask no Claude Code."
          vertical
        >
          <Typography.Paragraph
            className="ct-codeblock"
            copyable={{ text: status.command, tooltips: ['Copiar', 'Copiado'] }}
          >
            {status.command}
          </Typography.Paragraph>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Registrou antes com o nome antigo? Remova com{' '}
            <Typography.Text code>claude mcp remove ticktask --scope user</Typography.Text> antes de
            registrar de novo, ou o Claude Code verá o servidor duas vezes.
          </Typography.Text>
        </SettingRow>
        <SettingRow
          title="Regenerar token"
          description="Só param os clientes configurados à mão por HTTP com o token atual. A ponte registrada pelo comando continua valendo."
        >
          <Button
            danger
            icon={<KeyRound size={16} strokeWidth={1.75} aria-hidden />}
            loading={regenerating}
            onClick={confirmRegenerate}
          >
            Regenerar
          </Button>
        </SettingRow>
      </SettingsCard>
    </Flex>
  )
}
