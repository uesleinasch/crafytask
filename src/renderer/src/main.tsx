import '@fontsource/denk-one/400.css'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import './assets/main.css'
// Precisa valer antes de o chunk do Excalidraw ser avaliado, senão ele resolve as fontes pelo
// CDN — que a CSP recusa, deixando o desenho com as fontes do sistema.
import './components/editor/drawingAssetPath'

import { StyleProvider } from '@ant-design/cssinjs'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ThemeProvider } from './theme/ThemeProvider'
import { RegionBoundary } from './components/shell/RegionBoundary'
import { toErrorReport } from './components/shell/regionError'
import { renderDrawingSkeleton } from './lib/drawingRender'
import { shouldBootstrapTimerStore } from './stores/timerWindow'

if (shouldBootstrapTimerStore(window.location.hash)) {
  window.api.onDrawingRenderRequest((requestId, payload) => {
    void renderDrawingSkeleton(payload).then((result) =>
      window.api.sendDrawingRenderResult(requestId, result)
    )
  })
}

const reportError =
  (kind: 'caught' | 'uncaught') =>
  (error: unknown, info: { componentStack?: string | null }): void => {
    void window.api.appLogRendererError(toErrorReport(kind, error, info.componentStack))
  }

createRoot(document.getElementById('root')!, {
  onCaughtError: reportError('caught'),
  onUncaughtError: reportError('uncaught')
}).render(
  <StrictMode>
    <StyleProvider layer>
      <ThemeProvider>
        <RegionBoundary region="aplicativo">
          <App />
        </RegionBoundary>
      </ThemeProvider>
    </StyleProvider>
  </StrictMode>
)
