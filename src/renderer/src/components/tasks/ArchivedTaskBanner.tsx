import { Alert, Button } from 'antd'
import { Archive, ArchiveRestore } from 'lucide-react'
import { formatArchivedDate } from './archiveView'

const ICON = { size: 14, strokeWidth: 1.75, 'aria-hidden': true } as const

interface ArchivedTaskBannerProps {
  archivedAt: string | null | undefined
  onUnarchive: () => void
}

export function ArchivedTaskBanner({
  archivedAt,
  onUnarchive
}: ArchivedTaskBannerProps): React.JSX.Element {
  const date = formatArchivedDate(archivedAt)
  return (
    <Alert
      type="info"
      showIcon
      icon={<Archive size={16} strokeWidth={1.75} aria-hidden />}
      style={{ marginBottom: 12 }}
      message={`Arquivada${date ? ` em ${date}` : ''} · só leitura`}
      description="Notas, desenho, campos e timer ficam travados. Desarquive para editar; a tarefa volta ao status que tinha."
      action={
        <Button size="small" icon={<ArchiveRestore {...ICON} />} onClick={onUnarchive}>
          Desarquivar
        </Button>
      }
    />
  )
}
