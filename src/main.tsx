import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
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
    <App />
    {/*  </StrictErrorBoundary> */}
  </StrictMode>,
)
