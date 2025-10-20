// src/layouts/MainLayout.tsx
import { Outlet } from "react-router-dom";
import { useNotification } from "../contexts/NotificationContext"; // ✅ Contexto global
import { usePixSocket } from "../hooks/useSocketNotifications"; // ✅ Hook socket atual
import PixNotificationPopup from "./financial/PixNotificationPopup";
import { Header } from "./Header";
import { MediaNotificationPopup } from "./mkt/whatsapp/MediaNotificationPopup";
import { ChatNotificationPopup } from "./mkt/whatsapp/ChatNotificationPopup";

const MainLayout = () => {
  usePixSocket(); // ✅ Conecta ao Socket.IO e escuta eventos Pix + mídia
  const { showMediaNotification } = useNotification(); // ✅ Função do contexto

  return (
    <div className="app-container">
      <Header />
      <main className="main-content">
        <Outlet />
      </main>

      {/* Popups globais de notificação */}
      <PixNotificationPopup />
      <MediaNotificationPopup />
      <ChatNotificationPopup />
    </div>
  );
};

export default MainLayout;
