import React, { Suspense } from 'react';
import './App.css';

// Importe as novas páginas
//import usePaymentNotifications from './hooks/usePaymentNotifications';
import { BrowserRouter } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import AppRoutes from './AppRoutes';
import PixNotificationPopup from './components/financial/PixNotificationPopup';
import { LoadingOverlay } from './components/ui/LoadingOverlay';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { AppointmentsProvider } from './contexts/AppointmentsContext';
import { useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { usePixSocket } from './hooks/usePixSocket';

const App: React.FC = () => {
  const { isLoading } = useAuth();

  usePixSocket();

  return (
    <BrowserRouter>
      <LoadingOverlay
        show={isLoading}
        zIndex={100001}
        spinnerSize="large"
        message="Autenticando..."
      />
      <Suspense fallback={<LoadingSpinner />}>

          <AppointmentsProvider>

            <AppRoutes />
            <PixNotificationPopup />

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
    </BrowserRouter>
  );
}

export default App;