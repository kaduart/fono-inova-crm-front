import React, { Suspense } from 'react';
import Modal from 'react-modal';
import './App.css';

// Importe as novas páginas
//import usePaymentNotifications from './hooks/usePaymentNotifications';
import { BrowserRouter } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import AppRoutes from './AppRoutes';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { AuthProvider } from './contexts/AuthContext';

const App: React.FC = () => {
  Modal.setAppElement('#root');
  // qdo configurar o socket, descomentar
  //usePaymentNotifications();

  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<LoadingSpinner />}>
          <AppRoutes />
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
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;