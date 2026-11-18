import { App, Button, Result, theme } from 'antd'
import { Copy, RotateCcw } from 'lucide-react'
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary'
import { formatErrorDetails } from './regionError'

interface RegionBoundaryProps {
  region: string
  resetKeys?: unknown[]
  surface?: boolean
  children: React.ReactNode
}

function RegionFallback({
  region,
  surface,
  error,
  resetErrorBoundary
}: FallbackProps & { region: string; surface?: boolean }): React.JSX.Element {
  const { message } = App.useApp()
  const { token } = theme.useToken()

  const copyDetails = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(formatErrorDetails(region, error, new Date()))
      message.success('Detalhes copiados')
    } catch {
      message.error('Não foi possível copiar os detalhes')
    }
  }

  const result = (
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

  if (!surface) return result
  return (
    <div
      style={{
        height: '100%',
        overflow: 'auto',
        background: token.colorBgContainer,
        color: token.colorText
      }}
    >
      {result}
    </div>
  )
}

export function RegionBoundary({
  region,
  resetKeys,
  surface,
  children
}: RegionBoundaryProps): React.JSX.Element {
  return (
    <ErrorBoundary
      resetKeys={resetKeys}
      fallbackRender={(props) => <RegionFallback region={region} surface={surface} {...props} />}
    >
      {children}
    </ErrorBoundary>
  )
}
