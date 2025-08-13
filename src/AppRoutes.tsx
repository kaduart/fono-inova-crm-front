import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { useAuth } from './contexts/AuthContext';
import { PrivateRoute } from './utils/PrivateRoute';

// Layouts (descomente se necessário)
// const MainLayout = lazy(() => import('./layouts/MainLayout'));

// Páginas públicas
const Home = lazy(() => import('./components/Home'));
const Login = lazy(() => import('./components/Login'));
const SignUp = lazy(() => import('./components/SignUp'));
const ResetPassword = lazy(() => import('./components/ResetPassword'));

// Páginas privadas
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const DoctorDashboard = lazy(() => import('./components/DoctorDashboard'));
const PatientDashboard = lazy(() => import('./components/patients/PatientDashboard'));
const CreateAppointmentPage = lazy(() => import('./pages/appointments/create'));
const SchedulePage = lazy(() => import('./pages/schedule'));

const AppRoutes = () => {
  const { isLoading, isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner fullscreen />;
  }

  // Redirecionamento seguro para o domínio correto
  if (window.location.hostname !== 'app.clinicafonoinova.com.br' && 
      window.location.hostname !== 'localhost') {
    window.location.replace(`https://app.clinicafonoinova.com.br${location.pathname}`);
    return <LoadingSpinner fullscreen />;
  }

  return (
    <Suspense fallback={<LoadingSpinner fullscreen />}>
      <Routes location={location}>
        {/* Rotas públicas */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* Rotas administrativas */}
        <Route
          path="/admin/*"
          element={
            <PrivateRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </PrivateRoute>
          }
        />

        {/* Rotas para médicos */}
        <Route
          path="/doctors"
          element={
            <PrivateRoute allowedRoles={['doctor']}>
              <DoctorDashboard />
            </PrivateRoute>
          }
        />

        {/* Rotas para pacientes */}
        <Route
          path="/patient"
          element={
            <PrivateRoute allowedRoles={['admin', 'professional', 'patient']}>
              <PatientDashboard />
            </PrivateRoute>
          }
        />
        
        <Route
          path="/patient-dashboard/:id"
          element={
            <PrivateRoute allowedRoles={['admin', 'professional', 'patient']}>
              <PatientDashboard />
            </PrivateRoute>
          }
        />

        {/* Agendamentos */}
        <Route
          path="/create-appointment"
          element={
            <PrivateRoute allowedRoles={['admin', 'professional']}>
              <CreateAppointmentPage />
            </PrivateRoute>
          }
        />
        
        <Route
          path="/schedule"
          element={
            <PrivateRoute allowedRoles={['admin', 'professional']}>
              <SchedulePage />
            </PrivateRoute>
          }
        />

        {/* Rota curinga - 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;