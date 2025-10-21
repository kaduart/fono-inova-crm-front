import React, { Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import './App.css';
import AppRoutes from './AppRoutes';
import PixNotificationPopup from './components/financial/PixNotificationPopup';
import SessionExpiryHandler from './components/SessionExpiryHandler';
import { LoadingOverlay } from './components/ui/LoadingOverlay';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { AppointmentsProvider } from './contexts/AppointmentsContext';
import { useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext'; // ✅ ADICIONE AQUI

const App: React.FC = () => {
  const { isLoading } = useAuth();

  return (
    <BrowserRouter>
      <NotificationProvider> {/* ✅ AGORA O CONTEXTO EXISTE */}

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

      </NotificationProvider> {/* ✅ FECHA O PROVIDER */}
    </BrowserRouter>
  );
};

export default App;
