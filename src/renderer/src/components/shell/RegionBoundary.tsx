import { App, Button, Result } from 'antd'
import { Copy, RotateCcw } from 'lucide-react'
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary'
import { formatErrorDetails } from './regionError'

interface RegionBoundaryProps {
  region: string
  resetKeys?: unknown[]
  children: React.ReactNode
}

function RegionFallback({
  region,
  error,
  resetErrorBoundary
}: FallbackProps & { region: string }): React.JSX.Element {
  const { message } = App.useApp()

  const copyDetails = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(formatErrorDetails(region, error, new Date()))
      message.success('Detalhes copiados')
    } catch {
      message.error('Não foi possível copiar os detalhes')
    }
  }

  return (
    <Result
      status="warning"
      title={`Esta área falhou: ${region}`}
      subTitle="O resto do app continua funcionando. Seus dados estão salvos no banco local."
      extra={[
        <Button
          key="retry"
          type="primary"
          icon={<RotateCcw size={16} strokeWidth={1.75} />}
          onClick={resetErrorBoundary}
        >
          Tentar de novo
        </Button>,
        <Button key="copy" icon={<Copy size={16} strokeWidth={1.75} />} onClick={copyDetails}>
          Copiar detalhes
        </Button>
      ]}
    />
  )
}

export function RegionBoundary({
  region,
  resetKeys,
  children
}: RegionBoundaryProps): React.JSX.Element {
  return (
    <ErrorBoundary
      resetKeys={resetKeys}
      fallbackRender={(props) => <RegionFallback region={region} {...props} />}
    >
      {children}
    </ErrorBoundary>
  )
}
