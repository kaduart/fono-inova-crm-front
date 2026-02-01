/**
 * 🚀 AppRoutes Otimizado
 * 
 * Configuração de rotas com lazy loading para componentes pesados,
 * reduzindo o bundle inicial e melhorando o tempo de carregamento.
 */

import React, { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { useAuth } from './contexts/AuthContext';

// Importação síncrona de componentes críticos (login, home)
import Home from './components/Home';
import Login from './components/Login';
import ResetPassword from './components/ResetPassword';
import SignUp from './components/SignUp';

// 🎯 Lazy loading de componentes pesados
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const DoctorDashboard = lazy(() => import('./components/DoctorDashboard'));
const PatientDashboard = lazy(() => import('./components/patients/PatientDashboard'));
const SiteAnalyticsDashboard = lazy(() => import('./components/Dashboard/SiteAnalyticsDashboard'));
const MarketingDashboard = lazy(() => import('./components/Dashboard/MarketingDashboard'));
const FollowupDashboard = lazy(() => import('./components/Dashboard/FollowupDashboard'));
const AppChat = lazy(() => import('./components/mkt/whatsapp/AppChat'));
const ContactsPage = lazy(() => import('./components/mkt/whatsapp/ContactsPage'));
const FinancialDashboard = lazy(() => import('./pages/Financial/FinancialDashboard'));
const PaymentPage = lazy(() => import('./components/financial/PaymentPage'));
const ManageDoctors = lazy(() => import('./components/ManageDoctors/ManageDoctors'));
const DoctorAgenda = lazy(() => import('./components/ManageDoctors/DoctorAgenda'));
const EnhancedCalendar = lazy(() => import('./components/calendar/EnhancedCalendar'));
const FollowupPage = lazy(() => import('./pages/FollowupPage'));

// Componente de loading para Suspense
const PageLoader = () => (
    <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" message="Carregando..." />
    </div>
);

// Wrapper para rotas privadas
interface PrivateRouteProps {
    children: React.ReactNode;
    allowedRoles?: string[];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, allowedRoles }) => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <PageLoader />;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Redirecionar para dashboard apropriado baseado na role
        switch (user.role) {
            case 'admin':
                return <Navigate to="/admin" replace />;
            case 'doctor':
                return <Navigate to="/doctor" replace />;
            case 'patient':
                return <Navigate to="/patient" replace />;
            default:
                return <Navigate to="/" replace />;
        }
    }

    return <>{children}</>;
};

const AppRoutes: React.FC = () => {
    const { user } = useAuth();

    return (
        <Suspense fallback={<PageLoader />}>
            <Routes>
                {/* Rotas públicas */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={
                    user ? <Navigate to={`/${user.role}`} replace /> : <Login />
                } />
                <Route path="/signup" element={
                    user ? <Navigate to={`/${user.role}`} replace /> : <SignUp />
                } />
                <Route path="/reset-password" element={<ResetPassword />} />

                {/* Rotas de Admin */}
                <Route path="/admin" element={
                    <PrivateRoute allowedRoles={['admin']}>
                        <AdminDashboard />
                    </PrivateRoute>
                } />

                {/* Rotas de Doctor */}
                <Route path="/doctor" element={
                    <PrivateRoute allowedRoles={['doctor', 'admin']}>
                        <DoctorDashboard />
                    </PrivateRoute>
                } />

                {/* Rotas de Patient */}
                <Route path="/patient" element={
                    <PrivateRoute allowedRoles={['patient', 'admin']}>
                        <PatientDashboard />
                    </PrivateRoute>
                } />

                {/* Features do Admin - Lazy Loaded */}
                <Route path="/admin/analytics" element={
                    <PrivateRoute allowedRoles={['admin']}>
                        <SiteAnalyticsDashboard />
                    </PrivateRoute>
                } />
                <Route path="/admin/marketing" element={
                    <PrivateRoute allowedRoles={['admin']}>
                        <MarketingDashboard />
                    </PrivateRoute>
                } />
                <Route path="/admin/followup" element={
                    <PrivateRoute allowedRoles={['admin']}>
                        <FollowupDashboard />
                    </PrivateRoute>
                } />
                <Route path="/admin/leads" element={
                    <PrivateRoute allowedRoles={['admin']}>
                        <FollowupPage />
                    </PrivateRoute>
                } />
                <Route path="/admin/messages" element={
                    <PrivateRoute allowedRoles={['admin']}>
                        <AppChat />
                    </PrivateRoute>
                } />
                <Route path="/admin/contacts" element={
                    <PrivateRoute allowedRoles={['admin']}>
                        <ContactsPage />
                    </PrivateRoute>
                } />
                <Route path="/admin/financial" element={
                    <PrivateRoute allowedRoles={['admin']}>
                        <FinancialDashboard />
                    </PrivateRoute>
                } />
                <Route path="/admin/payments" element={
                    <PrivateRoute allowedRoles={['admin']}>
                        <PaymentPage patients={[]} initialPayments={[]} doctors={[]} />
                    </PrivateRoute>
                } />
                <Route path="/admin/doctors" element={
                    <PrivateRoute allowedRoles={['admin']}>
                        <ManageDoctors />
                    </PrivateRoute>
                } />
                <Route path="/admin/doctors/:id/agenda" element={
                    <PrivateRoute allowedRoles={['admin']}>
                        <DoctorAgenda />
                    </PrivateRoute>
                } />
                <Route path="/admin/calendar" element={
                    <PrivateRoute allowedRoles={['admin']}>
                        <EnhancedCalendar />
                    </PrivateRoute>
                } />

                {/* Rota de fallback */}
                <Route path="*" element={
                    <div className="min-h-screen flex items-center justify-center">
                        <div className="text-center">
                            <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
                            <p className="text-gray-600 mb-6">Página não encontrada</p>
                            <a href="/" className="text-blue-600 hover:underline">
                                Voltar para home
                            </a>
                        </div>
                    </div>
                } />
            </Routes>
        </Suspense>
    );
};

export default AppRoutes;
