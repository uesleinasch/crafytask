import { Button, Flex, Tooltip, theme } from 'antd'
import { RefreshCw, Save } from 'lucide-react'

interface NotesActionsProps {
  localExportPath: string | null
  exportingLocal: boolean
  onExportLocal: () => void
  syncingNotes: boolean
  onSaveAndSync: () => void
  showFile: boolean
}

const ICON = { size: 16, strokeWidth: 1.75, 'aria-hidden': true } as const

export function NotesActions({
  localExportPath,
  exportingLocal,
  onExportLocal,
  syncingNotes,
  onSaveAndSync,
  showFile
}: NotesActionsProps): React.JSX.Element {
  const { token } = theme.useToken()
  const fileName = localExportPath ? localExportPath.split(/[\\/]/).pop() || localExportPath : null

  return (
    <Flex gap={2} align="center" style={{ minWidth: 0 }}>
      <Tooltip
        title={
          localExportPath
            ? `Exporta para ${localExportPath} a cada salvamento. Clique para escolher outro arquivo.`
            : 'Salvar como Markdown num arquivo local'
        }
      >
        <Button
          type="text"
          aria-label="Salvar em arquivo local"
          disabled={exportingLocal}
          icon={<Save {...ICON} />}
          onClick={onExportLocal}
          style={{ maxWidth: 200, minWidth: 0 }}
        >
          {fileName && showFile ? (
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontFamily: token.fontFamilyCode,
                fontSize: 12,
                color: token.colorTextSecondary
              }}
            >
              {fileName}
            </span>
          ) : null}
        </Button>
      </Tooltip>
      <Tooltip title={syncingNotes ? 'Sincronizando…' : 'Salvar e sincronizar com o Notion'}>
        <Button
          type="text"
          aria-label="Salvar e sincronizar com o Notion"
          disabled={syncingNotes}
          icon={
            <RefreshCw
              {...ICON}
              className={syncingNotes ? 'animate-spin motion-reduce:animate-none' : undefined}
            />
          }
          onClick={onSaveAndSync}
        />
      </Tooltip>
    </Flex>
  )
}
