import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Modal from 'react-modal'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { NotificationProvider } from './contexts/NotificationContext'
import './index.css'

Modal.setAppElement('#root');


createRoot(document.getElementById('root')!).render(

  <StrictMode>
    {/*    <StrictErrorBoundary> */}

    <AuthProvider>
      <NotificationProvider>
        <App />
      </NotificationProvider>

    </AuthProvider>

    {/*  </StrictErrorBoundary> */}
  </StrictMode>,
)
