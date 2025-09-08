import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import PixNotificationPopup from './financial/PixNotificationPopup';
import { usePixSocket } from '../hooks/usePixSocket';


//nao sendo usado


const MainLayout = () => {
  usePixSocket(); // conecta ao Socket.IO para receber notificações

  return (
    <div className="app-container">
      <Header />
      <main className="main-content">
        <Outlet />
      </main>
      <footer />
      <PixNotificationPopup />
    </div>
  );
};

export default MainLayout;
