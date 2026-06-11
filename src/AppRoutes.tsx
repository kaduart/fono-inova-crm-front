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

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
    state = { hasError: false, error: null };

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[ErrorBoundary]', error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="text-center p-8 max-w-md">
                        <h2 className="text-xl font-semibold text-gray-800 mb-2">Algo deu errado</h2>
                        <p className="text-gray-500 text-sm mb-4">Ocorreu um erro ao carregar esta página.</p>
                        {this.state.error && (
                            <p className="text-xs text-red-500 bg-red-50 rounded p-2 mb-4 text-left break-words">
                                {this.state.error.message}
                            </p>
                        )}
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm hover:bg-emerald-700"
                        >
                            Recarregar
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

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
        const msg = error?.message?.toLowerCase() ?? '';
        const isChunkError = error?.name === 'TypeError' ||
                           msg.includes('failed to fetch dynamically imported module') ||
                           msg.includes('load failed') ||
                           msg.includes('loading chunk') ||
                           msg.includes('dynamically imported module');
        
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
const ManagePatients = lazyWithRetry(() => import('./components/ManagePatients/ManagePatients'));
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
            case 'secretary':
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
        <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
            <Routes>
                {/* ==================== ROTAS PÚBLICAS ==================== */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={
                    user && !forceLogin ? <Navigate to={`/${user.role === 'doctor-private' ? 'doctor' : (user.role === 'secretary' ? 'admin' : user.role)}`} replace /> : <Login />
                } />
                <Route path="/signup" element={
                    user && !forceLogin ? <Navigate to={`/${user.role === 'doctor-private' ? 'doctor' : (user.role === 'secretary' ? 'admin' : user.role)}`} replace /> : <SignUp />
                } />
                <Route path="/reset-password/:token" element={<ResetPassword />} />

                {/* ==================== ROTAS COM LAYOUT (inclui socket listeners) ==================== */}
                <Route element={<MainLayout />}>
                    {/* Públicas com layout */}
                    <Route path="/contacts" element={<ContactsPage />} />

                    {/* ==================== ROTAS PRIVADAS ==================== */}
                    
                    {/* Admin Dashboard (com abas internas) */}
                    <Route path="/admin" element={
                        <PrivateRoute allowedRoles={['admin', 'secretary']}>
                            <AdminDashboard />
                        </PrivateRoute>
                    } />

                {/* Sub-rotas do Admin - Lazy Loaded */}
                <Route path="/admin/analytics" element={
                    <PrivateRoute allowedRoles={['admin', 'secretary']}>
                        <SiteAnalyticsDashboard />
                    </PrivateRoute>
                } />
                <Route path="/admin/marketing" element={
                    <PrivateRoute allowedRoles={['admin', 'secretary']}>
                        <MarketingDashboard />
                    </PrivateRoute>
                } />

                <Route path="/admin/followup" element={
                    <PrivateRoute allowedRoles={['admin', 'secretary']}>
                        <FollowupDashboard />
                    </PrivateRoute>
                } />
                <Route path="/admin/leads" element={
                    <PrivateRoute allowedRoles={['admin', 'secretary']}>
                        <FollowupPage />
                    </PrivateRoute>
                } />
                <Route path="/admin/messages" element={
                    <PrivateRoute allowedRoles={['admin', 'secretary']}>
                        <AppChat />
                    </PrivateRoute>
                } />
                <Route path="/admin/contacts" element={
                    <PrivateRoute allowedRoles={['admin', 'secretary']}>
                        <ContactsPage />
                    </PrivateRoute>
                } />
                <Route path="/admin/financial" element={
                    <PrivateRoute allowedRoles={['admin', 'secretary']}>
                        <FinancialDashboard />
                    </PrivateRoute>
                } />

                <Route path="/admin/payments" element={
                    <PrivateRoute allowedRoles={['admin', 'secretary']}>
                        <PaymentPage patients={[]} initialPayments={[]} doctors={[]} />
                    </PrivateRoute>
                } />
                <Route path="/admin/doctors" element={
                    <PrivateRoute allowedRoles={['admin', 'secretary']}>
                        <ManageDoctors />
                    </PrivateRoute>
                } />
                <Route path="/admin/patients" element={
                    <PrivateRoute allowedRoles={['admin', 'secretary']}>
                        <ManagePatients />
                    </PrivateRoute>
                } />
                <Route path="/admin/doctors/:id/agenda" element={
                    <PrivateRoute allowedRoles={['admin', 'secretary']}>
                        <DoctorAgenda />
                    </PrivateRoute>
                } />
                <Route path="/admin/calendar" element={
                    <PrivateRoute allowedRoles={['admin', 'secretary']}>
                        <EnhancedCalendar />
                    </PrivateRoute>
                } />

                {/* Rotas de Doctor */}
                <Route path="/doctor" element={
                    <PrivateRoute allowedRoles={['doctor', 'doctor-private', 'admin', 'secretary']}>
                        <DoctorDashboard />
                    </PrivateRoute>
                } />

                {/* Rotas de Patient */}
                <Route path="/patient" element={
                    <PrivateRoute allowedRoles={['patient', 'admin', 'secretary']}>
                        <PatientDashboard />
                    </PrivateRoute>
                } />
                <Route path="/patient-dashboard/:id" element={
                    <PrivateRoute allowedRoles={['patient', 'admin', 'secretary']}>
                        <PatientDashboard />
                    </PrivateRoute>
                } />

                {/* Gestão de Pacientes */}
                <Route path="/patients" element={
                    <PrivateRoute allowedRoles={['admin', 'secretary', 'doctor', 'doctor-private']}>
                        <PatientsTable />
                    </PrivateRoute>
                } />
                <Route path="/patients/:id" element={
                    <PrivateRoute allowedRoles={['admin', 'secretary', 'doctor', 'doctor-private']}>
                        <PatientDetail />
                    </PrivateRoute>
                } />
                <Route path="/patients/:id/medical-reports" element={
                    <PrivateRoute allowedRoles={['admin', 'secretary', 'doctor', 'doctor-private']}>
                        <MedicalReportsSection />
                    </PrivateRoute>
                } />

                {/* Agendamentos */}
                <Route path="/appointments-v2" element={
                    <PrivateRoute allowedRoles={['admin', 'secretary', 'doctor', 'doctor-private', 'recepcao']}>
                        <AppointmentPage />
                    </PrivateRoute>
                } />
                <Route path="/create-appointment" element={
                    <PrivateRoute allowedRoles={['admin', 'secretary', 'doctor', 'doctor-private']}>
                        <CreateAppointmentPage />
                    </PrivateRoute>
                } />
                <Route path="/schedule" element={
                    <PrivateRoute allowedRoles={['admin', 'secretary', 'doctor', 'doctor-private']}>
                        <SchedulePage />
                    </PrivateRoute>
                } />
                <Route path="/pre-agendamentos" element={
                    <PrivateRoute allowedRoles={['admin', 'secretary', 'doctor', 'doctor-private']}>
                        <PreAgendamentosPage />
                    </PrivateRoute>
                } />

                {/* Financeiro */}
                <Route path="/vendas" element={
                    <PrivateRoute allowedRoles={['admin', 'secretary']}>
                        <SalesList />
                    </PrivateRoute>
                } />
                <Route path="/vendas/nova" element={
                    <PrivateRoute allowedRoles={['admin', 'secretary']}>
                        <SaleForm />
                    </PrivateRoute>
                } />
                <Route path="/provisionamento" element={
                    <PrivateRoute allowedRoles={['admin', 'secretary']}>
                        <ProvisionamentoTab />
                    </PrivateRoute>
                } />
                <Route path="/retention" element={
                    <PrivateRoute allowedRoles={['admin', 'secretary', 'doctor', 'doctor-private']}>
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
        </ErrorBoundary>
    );
};

export default AppRoutes;
