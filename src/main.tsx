import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ConfigErrorBoundary } from './components/common/ConfigErrorBoundary'
import { registerServiceWorker } from './lib/registerSW'
import { initMonitoring } from './lib/monitoring'

// Initialize monitoring and error tracking
initMonitoring();

// Register service worker for PWA support
if (import.meta.env.PROD) {
  registerServiceWorker();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigErrorBoundary>
      <App />
    </ConfigErrorBoundary>
  </StrictMode>,
)
