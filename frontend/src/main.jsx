import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import App from './App.jsx'
import { ElectricBorderDefs } from './components/ui/ElectricBorder.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import './index.css'

function GlassBackground() {
  return (
    <div className="bg-blobs" aria-hidden="true">
      <div className="bg-blob bg-blob-1" />
      <div className="bg-blob bg-blob-2" />
      <div className="bg-blob bg-blob-3" />
      <div className="bg-blob bg-blob-4" />
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GlassBackground />
    <ElectricBorderDefs />
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
