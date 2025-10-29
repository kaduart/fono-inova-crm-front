// src/AppRoutes.tsx
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import ContactsPage from './components/mkt/whatsapp/ContactsPage';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { useAuth } from './contexts/AuthContext';
import { PrivateRoute } from './utils/PrivateRoute';

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

// Novas páginas de paciente e relatórios
const PatientsTable = lazy(() => import('./components/doctor/patient/PatientsTable'));
const PatientDetail = lazy(() => import('./components/doctor/patient/PatientDetail'));
//const AnamnesisReport = lazy(() => import('./components/doctor/patient/report/AnamnesisReport'));
//const SchoolReport = lazy(() => import('./components/doctor/patient/reports/SchoolReport'));
const MedicalReportsSection = lazy(() => import('./components/doctor/patient/reports/MedicalReportsSection'));

const AppRoutes = () => {
    const { isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) return <LoadingSpinner fullscreen />;

    // 🔒 Protege domínio
    if (
        window.location.hostname !== 'app.clinicafonoinova.com.br' &&
        window.location.hostname !== 'localhost'
    ) {
        window.location.replace(`https://app.clinicafonoinova.com.br${location.pathname}`);
        return <LoadingSpinner fullscreen />;
    }

    return (
        <Suspense fallback={<LoadingSpinner fullscreen />}>
            <Routes location={location}>
                {/* PÚBLICAS */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="/reset-password/:token" element={<ResetPassword />} />
                <Route path="/contacts" element={<ContactsPage />} />

                {/* PRIVADAS COM LAYOUT */}
                <Route
                    element={
                        <PrivateRoute allowedRoles={['admin', 'professional', 'doctor', 'patient']}>
                            <MainLayout />
                        </PrivateRoute>
                    }
                >
                    <Route path="admin/*" element={<AdminDashboard />} />
                    <Route path="doctors" element={<DoctorDashboard />} />
                    <Route path="patient" element={<PatientDashboard />} />
                    <Route path="patient-dashboard/:id" element={<PatientDashboard />} />
                    <Route path="create-appointment" element={<CreateAppointmentPage />} />
                    <Route path="schedule" element={<SchedulePage />} />

                    {/* NOVAS ROTAS PARA GESTÃO DE PACIENTES - CORRIGIDAS */}
                    <Route path="patients" element={<PatientsTable />} />
                    <Route path="patients/:id" element={<PatientDetail />} />
                 {/*    <Route path="patients/:id/anamnesis" element={<AnamnesisReport />} />
                    <Route path="patients/:id/school-report" element={<SchoolReport />} /> */}
                    <Route path="patients/:id/medical-reports" element={<MedicalReportsSection />} />

                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Suspense>
    );
};

export default AppRoutes;