// src/routes/AppRoutes.tsx
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { useAuth } from './contexts/AuthContext';
import SchedulePage from './pages/schedule';
import { PrivateRoute } from './utils/PrivateRoute';

/* // Layouts
const MainLayout = lazy(() => import('./src/layouts/MainLayout'));
 */
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
// ... outros imports lazy

const AppRoutes = () => {
    const { isLoading, isAuthenticated, user } = useAuth();

    if (isLoading) {
        return <LoadingSpinner fullscreen />;
    }

    return (
        <Suspense fallback={<LoadingSpinner fullscreen />}>
            <Routes>
                {/* Rotas públicas */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="/reset-password/:token" element={<ResetPassword />} />

                <Route>
                    {/* Rotas administrativas */}
                    <Route
                        path="/admin/*"
                        element={
                            isAuthenticated && user?.role === 'admin' ? (
                                <AdminDashboard />
                            ) : (
                                <Navigate to="/login" />
                            )
                        }
                    />
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

                    {/* Adicione outras rotas seguindo o mesmo padrão */}

                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Suspense>
    );
};

export default AppRoutes;