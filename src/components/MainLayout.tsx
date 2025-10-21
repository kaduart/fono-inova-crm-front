import { Outlet } from "react-router-dom";
import { usePixSocket } from "../hooks/useSocketNotifications";
import PixNotificationPopup from "./financial/PixNotificationPopup";
import { Header } from "./Header";
import { ChatNotificationPopup } from "./mkt/whatsapp/ChatNotificationPopup";
import { MediaNotificationPopup } from "./mkt/whatsapp/MediaNotificationPopup";

const MainLayout = () => {
  usePixSocket();

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
