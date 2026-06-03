/**
 * 🚀 AppRoutes Consolidado
 * 
 * Versão unificada com lazy loading para componentes pesados,
 * reduzindo o bundle inicial e melhorando o tempo de carregamento.
 * Mantém todas as rotas das versões anteriores.
 */

import React, { lazy, Suspense, Component, type ReactNode } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation, useSearchParams } from 'react-router-dom';
import { Box, LinearProgress } from '@mui/material';
import { useAuth } from './contexts/AuthContext';
import MainLayout from './components/MainLayout';

// Importação síncrona de componentes críticos (login, home)
import Home from './components/Home';
import Login from './components/Login';
import ResetPassword from './components/ResetPassword';
import SignUp from './components/SignUp';

// 🔧 Helper para lazy loading com retry em caso de falha de chunk
const lazyWithRetry = (importFn: () => Promise<any>, retries = 3, delay = 1500) => {
  return lazy(() => {
    let attempts = 0;
    
    const tryLoad = (): Promise<any> => {
      attempts++;
      return importFn().catch((error: any) => {
        // Se for erro de chunk não encontrado (atualização de build)
        const isChunkError = error?.name === 'TypeError' || 
                           error?.message?.includes('Failed to fetch dynamically imported module') ||
                           error?.message?.includes('load failed');
        
        if (isChunkError) {
          console.warn(`[AppRoutes] Chunk load failed (attempt ${attempts}/${retries})`);
          
          // Se ainda tem tentativas, aguarda e tenta novamente
          if (attempts < retries) {
            return new Promise((resolve) => {
              setTimeout(() => {
                resolve(tryLoad());
              }, delay * attempts); // Backoff exponencial simples
            });
          }
          
          // Última tentativa falhou - provavelmente novo deploy, recarrega a página
          console.error('[AppRoutes] Chunk failed after all retries. Reloading page...');
          window.location.reload();
          return new Promise(() => {}); // Nunca resolve, aguarda o reload
        }
        
        throw error;
      });
    };
    
    return tryLoad();
  });
};

// 🎯 Lazy loading de componentes pesados (com retry automático)
const AdminDashboard = lazyWithRetry(() => import('./components/AdminDashboard'));
const DoctorDashboard = lazyWithRetry(() => import('./pages/doctor/DoctorDashboard'));
const PatientDashboard = lazyWithRetry(() => import('./components/patients/PatientDashboard'));
const CreateAppointmentPage = lazyWithRetry(() => import('./pages/appointments/create'));
const AppointmentPage = lazyWithRetry(() => import('./components/AppointmentPage'));
const SchedulePage = lazyWithRetry(() => import('./pages/schedule'));
const PatientsTable = lazyWithRetry(() => import('./components/doctor/patient/PatientsTable'));
const PreAgendamentosPage = lazyWithRetry(() => import('./pages/Secretaria/PreAgendamentosPage'));
const PatientDetail = lazyWithRetry(() => import('./components/doctor/patient/PatientDetail'));
const MedicalReportsSection = lazyWithRetry(() => import('./components/doctor/patient/reports/MedicalReportsSection'));
const ContactsPage = lazyWithRetry(() => import('./components/mkt/whatsapp/ContactsPage'));

// Lazy loading de sub-features do Admin
const SiteAnalyticsDashboard = lazyWithRetry(() => import('./components/Dashboard/SiteAnalyticsDashboard'));
const MarketingDashboard = lazyWithRetry(() => import('./components/Dashboard/MarketingDashboard'));

const FollowupDashboard = lazyWithRetry(() => import('./components/Dashboard/FollowupDashboard'));
const AppChat = lazyWithRetry(() => import('./components/mkt/whatsapp/AppChat'));
const CarteiraView = lazyWithRetry(() => import('./components/calendar/CarteiraView'));
const FinancialDashboard = lazyWithRetry(() => import('./pages/Financial/FinancialDashboard'));

const PaymentPage = lazyWithRetry(() => import('./components/financial/PaymentPage'));
const ManageDoctors = lazyWithRetry(() => import('./components/ManageDoctors/ManageDoctors'));
const DoctorAgenda = lazyWithRetry(() => import('./components/ManageDoctors/DoctorAgenda'));
const EnhancedCalendar = lazyWithRetry(() => import('./components/calendar/EnhancedCalendar'));
const FollowupPage = lazyWithRetry(() => import('./pages/FollowupPage'));
const SalesList = lazyWithRetry(() => import('./pages/Financial/SalesList'));
const SaleForm = lazyWithRetry(() => import('./pages/Financial/SaleForm'));
const ProvisionamentoTab = lazyWithRetry(() => import('./pages/Financial/tabs/ProvisionamentoTab'));

// Componente de loading simples para Suspense (só barra de progresso)
const PageLoader = () => (
    <Box sx={{ width: '100%', minHeight: '100vh' }}>
        <LinearProgress />
    </Box>
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
            case 'doctor-private':
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
    const { user, isLoading } = useAuth();
    const location = useLocation();
    const [searchParams] = useSearchParams();

    if (isLoading) return <PageLoader />;

    // 🔒 Protege domínio - redireciona para o domínio oficial se necessário
    const APP_URL = import.meta.env.VITE_APP_URL || 'https://app.clinicafonoinova.com.br';
    const ALLOWED_HOSTNAMES = [
        new URL(APP_URL).hostname,
        'localhost',
        '127.0.0.1'
    ];
    
    if (!ALLOWED_HOSTNAMES.includes(window.location.hostname)) {
        window.location.replace(`${APP_URL}${location.pathname}`);
        return <PageLoader />;
    }

    // 🔑 Verifica se deve forçar tela de login (sessão expirada)
    const forceLogin = searchParams.get('forceLogin') === 'true';

    return (
        <Suspense fallback={<PageLoader />}>
            <Routes>
                {/* ==================== ROTAS PÚBLICAS ==================== */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={
                    user && !forceLogin ? <Navigate to={`/${user.role === 'doctor-private' ? 'doctor' : user.role}`} replace /> : <Login />
                } />
                <Route path="/signup" element={
                    user && !forceLogin ? <Navigate to={`/${user.role === 'doctor-private' ? 'doctor' : user.role}`} replace /> : <SignUp />
                } />
                <Route path="/reset-password/:token" element={<ResetPassword />} />

                {/* ==================== ROTAS COM LAYOUT (inclui socket listeners) ==================== */}
                <Route element={<MainLayout />}>
                    {/* Públicas com layout */}
                    <Route path="/contacts" element={<ContactsPage />} />

                    {/* ==================== ROTAS PRIVADAS ==================== */}
                    
                    {/* Admin Dashboard (com abas internas) */}
                    <Route path="/admin" element={
                        <PrivateRoute allowedRoles={['admin']}>
                            <AdminDashboard />
                        </PrivateRoute>
                    } />

                {/* Sub-rotas do Admin - Lazy Loaded */}
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

                {/* Rotas de Doctor */}
                <Route path="/doctor" element={
                    <PrivateRoute allowedRoles={['doctor', 'doctor-private', 'admin']}>
                        <DoctorDashboard />
                    </PrivateRoute>
                } />

                {/* Rotas de Patient */}
                <Route path="/patient" element={
                    <PrivateRoute allowedRoles={['patient', 'admin']}>
                        <PatientDashboard />
                    </PrivateRoute>
                } />
                <Route path="/patient-dashboard/:id" element={
                    <PrivateRoute allowedRoles={['patient', 'admin']}>
                        <PatientDashboard />
                    </PrivateRoute>
                } />

                {/* Gestão de Pacientes */}
                <Route path="/patients" element={
                    <PrivateRoute allowedRoles={['admin', 'doctor', 'doctor-private']}>
                        <PatientsTable />
                    </PrivateRoute>
                } />
                <Route path="/patients/:id" element={
                    <PrivateRoute allowedRoles={['admin', 'doctor', 'doctor-private']}>
                        <PatientDetail />
                    </PrivateRoute>
                } />
                <Route path="/patients/:id/medical-reports" element={
                    <PrivateRoute allowedRoles={['admin', 'doctor', 'doctor-private']}>
                        <MedicalReportsSection />
                    </PrivateRoute>
                } />

                {/* Agendamentos */}
                <Route path="/appointments-v2" element={
                    <PrivateRoute allowedRoles={['admin', 'doctor', 'doctor-private', 'recepcao']}>
                        <AppointmentPage />
                    </PrivateRoute>
                } />
                <Route path="/create-appointment" element={
                    <PrivateRoute allowedRoles={['admin', 'doctor', 'doctor-private']}>
                        <CreateAppointmentPage />
                    </PrivateRoute>
                } />
                <Route path="/schedule" element={
                    <PrivateRoute allowedRoles={['admin', 'doctor', 'doctor-private']}>
                        <SchedulePage />
                    </PrivateRoute>
                } />
                <Route path="/pre-agendamentos" element={
                    <PrivateRoute allowedRoles={['admin', 'doctor', 'doctor-private']}>
                        <PreAgendamentosPage />
                    </PrivateRoute>
                } />

                {/* Financeiro */}
                <Route path="/vendas" element={
                    <PrivateRoute allowedRoles={['admin']}>
                        <SalesList />
                    </PrivateRoute>
                } />
                <Route path="/vendas/nova" element={
                    <PrivateRoute allowedRoles={['admin']}>
                        <SaleForm />
                    </PrivateRoute>
                } />
                <Route path="/provisionamento" element={
                    <PrivateRoute allowedRoles={['admin']}>
                        <ProvisionamentoTab />
                    </PrivateRoute>
                } />
                <Route path="/retention" element={
                    <PrivateRoute allowedRoles={['admin', 'doctor', 'doctor-private']}>
                        <CarteiraView />
                    </PrivateRoute>
                } />

                </Route>{/* ← Fim do MainLayout */}

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
