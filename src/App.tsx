import React, { Suspense, useEffect, useRef, useCallback } from "react";
import { socketManager } from "./utils/socketManager";
import { ToastContainer } from "react-toastify";
import { Toaster, toast } from "react-hot-toast";
import "./App.css";
import AppRoutes from "./AppRoutes";
import PixNotificationPopup from "./components/financial/PixNotificationPopup";
import { ChatNotificationPopup } from "./components/mkt/whatsapp/ChatNotificationPopup";
import { MediaNotificationPopup } from "./components/mkt/whatsapp/MediaNotificationPopup";
import SessionExpiryHandler from "./components/SessionExpiryHandler";
import { LoadingOverlay } from "./components/ui/LoadingOverlay";
import { LoadingSpinner } from "./components/ui/LoadingSpinner";
import { AppointmentsProvider } from "./contexts/AppointmentsContext";
import { useAuth } from "./contexts/AuthContext";
import { ChatNavigationProvider } from "./contexts/ChatNavigationContext";
import { useNotification } from "./contexts/NotificationContext";
import { PreAgendamentoNotificationPopup } from "./components/patients/PreAgendamentoNotificationPopup";

const App: React.FC = () => {
  const { isLoading } = useAuth();
  const didInit = useRef(false);
  const { showPreAgendamentoNotification } = useNotification();

  // ✅ Função para lidar com novo pré-agendamento
  const handlePreAgendamento = useCallback((data: any) => {
    console.log("📅 >>> HANDLE PREAGENDAMENTO CHAMADO:", data);
    showPreAgendamentoNotification({
      id: data.id,
      patientName: data.patientName || data.patientInfo?.fullName,
      specialty: data.specialty,
      phone: data.phone || data.patientInfo?.phone,
      preferredDate: data.preferredDate || data.date
    });
    toast.success(`Novo pré-agendamento: ${data.patientName || data.patientInfo?.fullName}`, {
      icon: '📋',
      duration: 5000
    });
  }, [showPreAgendamentoNotification]);

  // ✅ Função para lidar com importação
  const handleImported = useCallback((data: any) => {
    console.log("✅ >>> HANDLE IMPORTED CHAMADO:", data);
    toast.success(`Agendamento confirmado: ${data.patientName || 'Paciente'}`, {
      icon: '✅',
      duration: 3000
    });
  }, []);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    console.log("🔌 Inicializando App e Socket...");
    socketManager.initialize();

    // ✅ REGISTRA LISTENERS IMEDIATAMENTE
    console.log("📡 Registrando listeners de pré-agendamento...");

    const offNew = socketManager.on("preagendamento:new", (data) => {
      console.log("📡 EVENTO RECEBIDO: preagendamento:new", data);
      handlePreAgendamento(data);
    });

    const offImported = socketManager.on("preagendamento:imported", (data) => {
      console.log("📡 EVENTO RECEBIDO: preagendamento:imported", data);
      handleImported(data);
    });

    // ✅ Debug: escuta todos os eventos
    const debugAll = (event: string, data: any) => {
      if (event.includes('preagendamento') || event.includes('message')) {
        console.log(`📡 [DEBUG GLOBAL] ${event}:`, data);
      }
    };
    socketManager.onAny?.(debugAll);

    console.log("✅ Listeners registrados");

    return () => {
      console.log("🧹 Removendo listeners...");
      offNew();
      offImported();
      socketManager.offAny?.(debugAll);
    };
  }, [handlePreAgendamento, handleImported]);

  return (
    <ChatNavigationProvider>
      <SessionExpiryHandler />
      <LoadingOverlay show={isLoading} zIndex={100001} spinnerSize="large" message="Autenticando..." />

      <Suspense fallback={<LoadingSpinner />}>
        <AppointmentsProvider>
          <AppRoutes />
        </AppointmentsProvider>

        <ToastContainer position="top-center" autoClose={4000} newestOnTop closeOnClick draggable pauseOnHover theme="colored" style={{ zIndex: 100000 }} />
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