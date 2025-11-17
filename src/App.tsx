import React, { Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import './App.css';
import AppRoutes from './AppRoutes';
import PixNotificationPopup from './components/financial/PixNotificationPopup';
import { ChatNotificationPopup } from './components/mkt/whatsapp/ChatNotificationPopup';
import { MediaNotificationPopup } from './components/mkt/whatsapp/MediaNotificationPopup';
import SessionExpiryHandler from './components/SessionExpiryHandler';
import { LoadingOverlay } from './components/ui/LoadingOverlay';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { AppointmentsProvider } from './contexts/AppointmentsContext';
import { useAuth } from './contexts/AuthContext';
import { ChatNavigationProvider } from './contexts/ChatNavigationContext'; 

const App: React.FC = () => {
  const { isLoading } = useAuth();

  return (
    <BrowserRouter>
      <ChatNavigationProvider>
        <SessionExpiryHandler />

        <LoadingOverlay
          show={isLoading}
          zIndex={100001}
          spinnerSize="large"
          message="Autenticando..."
        />

        <Suspense fallback={<LoadingSpinner />}>
          <AppointmentsProvider>
            <AppRoutes />
          </AppointmentsProvider>

          <ToastContainer
            position="top-center"
            autoClose={4000}
            newestOnTop
            closeOnClick
            draggable
            pauseOnHover
            theme="colored"
            style={{ zIndex: 100000 }}
          />
        </Suspense>

        {/* Popups globais de notificação */}
        <PixNotificationPopup />
        <MediaNotificationPopup />
        <ChatNotificationPopup />
      </ChatNavigationProvider>
    </BrowserRouter>
  );
};

export default App;
