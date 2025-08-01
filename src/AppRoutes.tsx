// src/routes/AppRoutes.tsx
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { PrivateRoute } from './utils/PrivateRoute';
import SchedulePage from './pages/schedule';

/* // Layouts
const MainLayout = lazy(() => import('./src/layouts/MainLayout'));
 */
// Páginas públicas
const Home = lazy(() => import('./components/Home'));
const Login = lazy(() => import('./components/Login'));
const SignUp = lazy(() => import('./components/SignUp'));

// Páginas privadas
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const DoctorDashboard = lazy(() => import('./components/Doctors'));
const PatientDashboard = lazy(() => import('./components/patients/PatientDashboard'));
const CreateAppointmentPage = lazy(() => import('./pages/appointments/create'));
// ... outros imports lazy

const AppRoutes = () => {
    return (
        <Suspense fallback={<LoadingSpinner fullscreen />}>
            <Routes>
                {/* Rotas públicas */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<SignUp />} />

                {/* Rotas com layout comum */}
                {/*   <Route element={<MainLayout />}> */}
                <Route>
                    {/* Rotas administrativas */}
                    <Route
                        path="/admin"
                        element={
                            <PrivateRoute allowedRoles={['admin']}>
                                <AdminDashboard />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/admin/doctors"
                        element={
                            <PrivateRoute allowedRoles={['admin']}>
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

                    {/* Rota curinga para 404 */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
            </Routes>
        </Suspense>
    );
};

export default AppRoutes;