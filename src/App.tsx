import React from 'react';
import { Toaster } from 'react-hot-toast';
import Modal from 'react-modal';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import './App.css';
import AdminDashboard from './components/AdminDashboard';
import { default as DoctorDashboard } from './components/Doctors';
import PaymentPage from './components/financial/PaymentPage';
import Home from './components/Home';
import Login from './components/Login';
import AppChat from './components/mkt/whatsapp/AppChat';
import PatientEvolution from './components/patients/PatientEvolution';
import PatientSelection from './components/patients/PatientSelection';
import SignUp from './components/SignUp';
import { PrivateRoute } from './utils/PrivateRoute';

// Importe as novas páginas
import EvolutionPage from './components/pages/evolution/[id]';
import PatientDashboard from './components/patients/PatientDashboard';
import CreateAppointmentPage from './pages/appointments/create';
import DashboardPage from './pages/dashboard';
import ProfessionalProfilePage from './pages/professional/profile';
import SchedulePage from './pages/schedule';
import SpecialtyRouter from './routes/SpecialtyRouter';
//import usePaymentNotifications from './hooks/usePaymentNotifications';

const App: React.FC = () => {
  Modal.setAppElement('#root');
  // qdo configurar o socket, descomentar
  //usePaymentNotifications();

  return (

    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          //repetido analsiar merge com outros compoentes
          {/*   <Route path="/doctor" element={<Doctor />} /> */}

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

          <Route
            path="/select-patient"
            element={
              <PrivateRoute allowedRoles={['admin', 'professional']}>
                <PatientSelection />
              </PrivateRoute>
            }
          />

          {/* Rotas para agendamentos */}
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

          {/* Rotas para evoluções */}
          <Route
            path="/evolution/:id"
            element={
              <PrivateRoute allowedRoles={['admin', 'professional']}>
                <EvolutionPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/evolutions/:id"
            element={
              <PrivateRoute allowedRoles={['admin', 'professional']}>
                <PatientEvolution />
              </PrivateRoute>
            }
          />

          {/* Rota para dashboard */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute allowedRoles={['admin', 'doctor']}>
                <DashboardPage />
              </PrivateRoute>
            }
          />

          {/* Rota para perfil profissional */}
          <Route
            path="/profile"
            element={
              <PrivateRoute allowedRoles={['admin', 'doctor']}>
                <ProfessionalProfilePage />
              </PrivateRoute>
            }
          />

          {/* Rotas financeiras */}
          <Route
            path="/financeiro"
            element={
              <PrivateRoute allowedRoles={['admin', 'financial']}>
                <PaymentPage />
              </PrivateRoute>
            }
          />

          {/* Rotas para marketing */}
          <Route
            path="/whatsapp"
            element={
              <PrivateRoute allowedRoles={['admin', 'marketing']}>
                <AppChat />
              </PrivateRoute>
            }
          />

          {/* Roteamento especializado por especialidade */}
          <Route
            path="/specialty/*"
            element={
              <PrivateRoute allowedRoles={['admin', 'professional']}>
                <SpecialtyRouter />
              </PrivateRoute>
            }
          />

          {/* Rota curinga para redirecionamento */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-center" />
      </div>
    </Router>
  );
}

export default App;