import React, { Suspense, useEffect, useRef } from "react";
import { socketManager } from "./utils/socketManager";
import { ToastContainer } from "react-toastify";
import { Toaster } from "react-hot-toast";
import "./App.css";
import AppRoutes from "./AppRoutes";
import { useWhatsAppDeliveryError } from "./hooks/useWhatsAppDeliveryError";
import PixNotificationPopup from "./components/financial/PixNotificationPopup";
import { ChatNotificationPopup } from "./components/mkt/whatsapp/ChatNotificationPopup";
import { MediaNotificationPopup } from "./components/mkt/whatsapp/MediaNotificationPopup";
import SessionExpiryHandler from "./components/SessionExpiryHandler";
import { LoadingOverlay } from "./components/ui/LoadingOverlay";
import { LoadingSpinner } from "./components/ui/LoadingSpinner";
import { AppointmentsProvider } from "./contexts/AppointmentsContext";
import { useAuth } from "./contexts/AuthContext";
import { ChatNavigationProvider } from "./contexts/ChatNavigationContext";
import { PreAgendamentoNotificationPopup } from "./components/patients/PreAgendamentoNotificationPopup";

const App: React.FC = () => {
  const { isLoading } = useAuth();
  const didInitSocket = useRef(false);

  // 🆕 Inicializa listener de falhas de entrega WhatsApp
  useWhatsAppDeliveryError();

  return (
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
        <Toaster position="top-center" />
      </Suspense>

      <PixNotificationPopup />
      <MediaNotificationPopup />
      <ChatNotificationPopup />
      <PreAgendamentoNotificationPopup />
    </ChatNavigationProvider>
  );
};

export default App;
