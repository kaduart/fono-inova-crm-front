import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import StrictErrorBoundary from './components/errors-utils/StrictErrorBoundary'

createRoot(document.getElementById('root')!).render(
   
  //<StrictMode>
  //qdo implementar o notificacao pix 
// <NotificationProvider>
////<App />
////</NotificationProvider> 
////<App />
//   </StrictMode>,

   <StrictMode>
    <StrictErrorBoundary>
      <App />
    </StrictErrorBoundary>
  </StrictMode>,
)
