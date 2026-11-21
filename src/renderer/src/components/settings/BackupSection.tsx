import { useEffect, useState } from 'react'
import { Alert, App, Button, Flex, Space, Switch, Table, Tooltip, Typography, theme } from 'antd'
import { FolderOpen, RotateCcw, Save } from 'lucide-react'
import type { BackupCounts, BackupSnapshot, BackupStatus } from '@shared/types'
import { AUTO_BACKUP_KEEP } from '@shared/appPrefs'
import { SettingRow, SettingsCard } from './SettingsLayout'
import { errorMessage } from './settingsStatus'

const ICON = { size: 16, strokeWidth: 1.75, 'aria-hidden': true } as const

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function describeCounts(counts: BackupCounts): string {
  const part = (value: number | null, label: string): string => `${value ?? '?'} ${label}`
  return [
    part(counts.tasks, 'tarefas'),
    part(counts.projects, 'projetos'),
    part(counts.timeEntries, 'registros de tempo')
  ].join(' · ')
}

export function BackupSection(): React.JSX.Element {
  const { token } = theme.useToken()
  const { message, modal } = App.useApp()
  const [status, setStatus] = useState<BackupStatus | null>(null)
  const [busy, setBusy] = useState<'backup' | 'restore' | null>(null)
  const mono = { fontFamily: token.fontFamilyCode, fontVariantNumeric: 'tabular-nums' as const }

  const [autoBackup, setAutoBackup] = useState<boolean | null>(null)
  const [savingAuto, setSavingAuto] = useState(false)
  const [autoFailed, setAutoFailed] = useState(false)

  useEffect(() => {
    const load = (): void => {
      window.api
        .backupGetStatus()
        .then(setStatus)
        .catch((error) => message.error(errorMessage(error)))
    }
    load()
    window.api
      .getAppPrefs()
      .then((prefs) => setAutoBackup(prefs.autoBackup))
      .catch((error) => {
        setAutoFailed(true)
        message.error(errorMessage(error))
      })
    return window.api.onBackupChanged(load)
  }, [message])

  async function toggleAutoBackup(enabled: boolean): Promise<void> {
    setSavingAuto(true)
    try {
      const prefs = await window.api.setAutoBackup(enabled)
      setAutoBackup(prefs.autoBackup)
      message.success(
        prefs.autoBackup
          ? 'Backup automático ligado. O primeiro sai hoje, se ainda não houver backup de hoje.'
          : 'Backup automático desligado'
      )
    } catch (error) {
      message.error(errorMessage(error))
    } finally {
      setSavingAuto(false)
    }
  }

  async function chooseFolder(): Promise<void> {
    try {
      const next = await window.api.backupChooseFolder()
      if (next) setStatus(next)
    } catch (error) {
      message.error(errorMessage(error))
    }
  }

  async function backupNow(): Promise<void> {
    setBusy('backup')
    try {
      const snapshot = await window.api.backupCreate()
      setStatus(await window.api.backupGetStatus())
      message.success(`Backup criado: ${describeCounts(snapshot.counts)}.`)
    } catch (error) {
      message.error(errorMessage(error))
    } finally {
      setBusy(null)
    }
  }

  async function restore(snapshot: BackupSnapshot): Promise<void> {
    setBusy('restore')
    try {
      await window.api.backupRestore(snapshot.path)
    } catch (error) {
      message.error(errorMessage(error))
      setBusy(null)
    }
  }

  async function askRestore(dir: string): Promise<void> {
    let snapshot: BackupSnapshot
    try {
      snapshot = await window.api.backupInspect(dir)
    } catch (error) {
      message.error(errorMessage(error))
      return
    }
    modal.confirm({
      title: 'Restaurar este backup?',
      content: `Backup de ${formatDate(snapshot.createdAt)}, banco conferido (integrity_check ok): ${describeCounts(snapshot.counts)}. Os dados atuais são substituídos, mas uma cópia fica numa pasta pre-restore dentro da pasta de dados do app. A conexão com o Google Calendar não volta com o backup. O CrafyTask reinicia em seguida.`,
      okText: 'Restaurar e reiniciar',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: () => restore(snapshot)
    })
  }

  async function restoreFromOtherFolder(): Promise<void> {
    try {
      const dir = await window.api.backupChooseSnapshot()
      if (dir) await askRestore(dir)
    } catch (error) {
      message.error(errorMessage(error))
    }
  }

  const disabled = busy !== null
  const snapshots = status?.snapshots ?? []

  return (
    <Flex vertical gap={16}>
      <SettingsCard title="Pasta de backup">
        <SettingRow
          title={
            <span style={mono} title={status?.folder ?? undefined}>
              {status?.folder ?? 'Nenhuma pasta escolhida'}
            </span>
          }
          description={
            status?.folder
              ? 'Cada backup vira uma pasta com data e hora dentro dela.'
              : 'Prefira um HD externo ou uma pasta sincronizada na nuvem.'
          }
        >
          <Space wrap>
            <Button icon={<FolderOpen {...ICON} />} onClick={chooseFolder} disabled={disabled}>
              {status?.folder ? 'Trocar' : 'Escolher pasta'}
            </Button>
            <Button
              type="primary"
              icon={<Save {...ICON} />}
              loading={busy === 'backup'}
              disabled={disabled || !status?.folder}
              onClick={backupNow}
            >
              Fazer backup agora
            </Button>
          </Space>
        </SettingRow>
        <SettingRow
          title="Backup automático"
          description={`Diário, mantendo os últimos ${AUTO_BACKUP_KEEP}. Roda com o app aberto e não apaga os backups feitos à mão.`}
        >
          <Tooltip
            title={
              autoFailed
                ? 'Não foi possível ler esta preferência.'
                : status?.folder
                  ? undefined
                  : 'Escolha uma pasta primeiro.'
            }
          >
            <Switch
              aria-label="Backup automático"
              checked={!!autoBackup}
              loading={savingAuto || (autoBackup === null && !autoFailed)}
              disabled={!status?.folder || autoFailed}
              onChange={(checked) => void toggleAutoBackup(checked)}
            />
          </Tooltip>
        </SettingRow>
      </SettingsCard>

      <SettingsCard
        title="Backups nesta pasta"
        extra={
          <Button
            size="small"
            type="link"
            icon={<RotateCcw size={14} strokeWidth={1.75} aria-hidden />}
            disabled={disabled}
            onClick={restoreFromOtherFolder}
          >
            Restaurar de outra pasta…
          </Button>
        }
      >
        <Table<BackupSnapshot>
          size="small"
          rowKey="path"
          pagination={false}
          style={{ margin: '0 -16px' }}
          scroll={{ x: 'max-content' }}
          locale={{
            emptyText: status?.folder ? 'Nenhum backup ainda.' : 'Escolha uma pasta de backup.'
          }}
          dataSource={snapshots}
          columns={[
            {
              title: 'Criado em',
              key: 'created',
              render: (_, row) => <span style={mono}>{formatDate(row.createdAt)}</span>
            },
            {
              title: 'Tarefas',
              key: 'tasks',
              align: 'right',
              render: (_, row) => <span style={mono}>{row.counts.tasks ?? '?'}</span>
            },
            {
              title: 'Projetos',
              key: 'projects',
              align: 'right',
              responsive: ['md'],
              render: (_, row) => <span style={mono}>{row.counts.projects ?? '?'}</span>
            },
            {
              title: 'Tamanho',
              key: 'size',
              align: 'right',
              render: (_, row) => <span style={mono}>{formatSize(row.sizeBytes)}</span>
            },
            {
              title: '',
              key: 'action',
              align: 'right',
              render: (_, row) => (
                <Button size="small" disabled={disabled} onClick={() => void askRestore(row.path)}>
                  Restaurar
                </Button>
              )
            }
          ]}
        />
      </SettingsCard>

      {busy === 'restore' && (
        <Typography.Text type="secondary">Restaurando… o CrafyTask vai reiniciar.</Typography.Text>
      )}

      <Alert
        type="info"
        showIcon
        title="O que vai no backup"
        description="O banco (tarefas, projetos, tempos, notas e desenhos), as imagens das notas e as configurações do Notion e do servidor MCP. A conexão com o Google não vai junto: depois de restaurar em outro computador, reconecte na seção Google."
      />
      <Alert
        type="warning"
        showIcon
        title="O backup contém a API Key do Notion e o token do MCP. Guarde a pasta em local seguro."
      />
    </Flex>
  )
}
