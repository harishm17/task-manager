import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ConfigErrorBoundary } from './components/common/ConfigErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigErrorBoundary>
      <App />
    </ConfigErrorBoundary>
  </StrictMode>,
)
