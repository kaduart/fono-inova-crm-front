import React, { Suspense } from 'react';
import Modal from 'react-modal';
import './App.css';

// Importe as novas páginas
//import usePaymentNotifications from './hooks/usePaymentNotifications';
import { BrowserRouter } from 'react-router-dom';
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
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;