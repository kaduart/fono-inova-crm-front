import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import './index.css'

createRoot(document.getElementById('root')!).render(

  //<StrictMode>
  //qdo implementar o notificacao pix 
  // <NotificationProvider>
  ////<App />
  ////</NotificationProvider> 
  ////<App />
  //   </StrictMode>,

  <StrictMode>
    {/*    <StrictErrorBoundary> */}

    <AuthProvider>
      <App />
    </AuthProvider>

    {/*  </StrictErrorBoundary> */}
  </StrictMode>,
)
