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
  const mono = { fontFamily: token.fontFamilyCode }

  async function regenerate(): Promise<void> {
    setRegenerating(true)
    try {
      onStatusChange(await window.api.mcpRegenerateToken())
      message.success('Token regenerado. Registre o servidor de novo com o comando novo.')
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
        'Todo cliente já registrado (Claude Code, ponte stdio) para de funcionar até você registrá-lo de novo com o comando novo. Suas tarefas não mudam.',
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
            onChange={async (checked) => onStatusChange(await window.api.mcpSetEnabled(checked))}
          />
        </SettingRow>
      </SettingsCard>
      <SettingsCard title="Registrar no Claude Code">
        <SettingRow
          title="Comando de registro"
          description="Rode no terminal. Contém o token de acesso: não compartilhe."
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
          description="Clientes já registrados param de funcionar até rodar o comando de novo."
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
