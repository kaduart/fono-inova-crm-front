import React, { Suspense, useEffect, useRef } from "react";
import { socketManager } from "./utils/socketManager";
import { ToastContainer } from "react-toastify";
import { Toaster } from "react-hot-toast";
import "./App.css";
import AppRoutes from "./AppRoutes";
import { LoadingSpinner } from "./components/ui/LoadingSpinner";
import { useWhatsAppDeliveryError } from "./hooks/useWhatsAppDeliveryError";
// 🆕 Novo popup de alertas de sistema no canto inferior direito
import { SystemAlertPopup } from "./components/notifications/SystemAlertPopup";
import PixNotificationPopup from "./components/financial/PixNotificationPopup";
import { ChatNotificationPopup } from "./components/mkt/whatsapp/ChatNotificationPopup";
import { MediaNotificationPopup } from "./components/mkt/whatsapp/MediaNotificationPopup";
import SessionExpiryHandler from "./components/SessionExpiryHandler";
import { AppointmentsProvider } from "./contexts/AppointmentsContext";
import { DoctorsProvider } from "./contexts/DoctorsContext";
import { PatientsProvider } from "./contexts/PatientsContext";
import { PaymentsProvider } from "./contexts/PaymentsContext";
import { ChatNavigationProvider } from "./contexts/ChatNavigationContext";
import { PreAgendamentoNotificationPopup } from "./components/patients/PreAgendamentoNotificationPopup";
import { WhatsAppMessagePopup } from "./components/notifications/WhatsAppMessagePopup";

const App: React.FC = () => {
  const didInitSocket = useRef(false);

  // 🆕 Inicializa listener de falhas de entrega WhatsApp
  useWhatsAppDeliveryError();
  
  // 🆕 Alertas de sistema (silence/anomaly) usam popup no canto inferior direito
  // SystemAlertPopup component escuta o socket 'system:alert'

  return (
    <ChatNavigationProvider>
      <SessionExpiryHandler />

      <Suspense fallback={<LoadingSpinner centered size="large" color="border-emerald-600" className="min-h-screen" />}>
        <DoctorsProvider>
          <PatientsProvider>
            <PaymentsProvider>
              <AppointmentsProvider>
                <AppRoutes />
              </AppointmentsProvider>
            </PaymentsProvider>
          </PatientsProvider>
        </DoctorsProvider>

        <ToastContainer
          position="top-right"
          autoClose={4000}
          newestOnTop
          closeOnClick
          draggable
          pauseOnHover
          theme="colored"
          style={{ zIndex: 100000, top: 20, right: 20 }}
        />
        <Toaster position="top-right" containerStyle={{ top: 20, right: 20 }} />
      </Suspense>

      <PixNotificationPopup />
      <MediaNotificationPopup />
      <ChatNotificationPopup />
      <PreAgendamentoNotificationPopup />
      <WhatsAppMessagePopup />
      {/* <SystemAlertPopup /> */}
    </ChatNavigationProvider>
  );
};

export default App;
