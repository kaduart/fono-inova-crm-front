import { Outlet } from "react-router-dom";
import { usePixSocket } from "../routes/hooks/useSocketNotifications";

const MainLayout = () => {
  usePixSocket();

  return (
    <div className="app-container">
      {/*  <Header /> */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
