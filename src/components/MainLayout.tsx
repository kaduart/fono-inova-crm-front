import { Outlet } from "react-router-dom";
import { usePixSocket } from "../hooks/useSocketNotifications";
import { Header } from "./Header";

const MainLayout = () => {
  usePixSocket();

  return (
    <div className="app-container">
      <Header />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
