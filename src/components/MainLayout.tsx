// src/layouts/MainLayout.tsx
import { Outlet } from 'react-router-dom';
import { Header } from './Header';

const MainLayout = () => {
    return (
        <div className="app-container">
            <Header />
            <main className="main-content">
                <Outlet />
            </main>
            <footer />
        </div>
    );
};

export default MainLayout;