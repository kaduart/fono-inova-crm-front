import { Outlet } from 'react-router-dom';
import { usePixSocket } from '../hooks/usePixSocket';
import { Header } from './DoctorHeader';
import PixNotificationPopup from './financial/PixNotificationPopup';


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
