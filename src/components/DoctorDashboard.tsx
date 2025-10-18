// src/pages/doctor/DashboardPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '../components/doctor/DashboardHeader';
import useDoctorDashboard from '../hooks/useDoctorDashboard';
import AppointmentsSection from './doctor/AppointmentsSection';
import PatientsTable from './doctor/PatientsTable';
import ReportsSection from './doctor/ReportsSection';
import SpecialtyStatsCard from './doctor/SpecialtyStatsCard';
import TherapyEvolution from './doctor/TherapyEvolution';
import TodayAppointmentsCard from './doctor/TodayAppointmentsCard';
import { LoadingSpinner } from './ui/LoadingSpinner';
import AttendanceOverview from './doctor/AttendanceOverview';

export default function DoctorDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [showTodayAppointments, setShowTodayAppointments] = useState(true);
  const navigate = useNavigate();

  const {
    loading,
    doctorData,
    patients,
    appointments,
    stats,
    futureAppointments,
    calendarEvents,
    handleUpdateStatus
  } = useDoctorDashboard();

  const handleLogout = () => {
    navigate('/logout');
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-60vh">
        <LoadingSpinner />
      </div>
    );
  }

  // Renderização condicional do conteúdo baseado na tab ativa
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            <TodayAppointmentsCard
              appointments={appointments}
              showAll={showTodayAppointments}
              onToggleShow={() => setShowTodayAppointments(!showTodayAppointments)}
              onUpdateStatus={handleUpdateStatus}
            />
            <SpecialtyStatsCard
              doctorData={doctorData}
              stats={stats}
            />
          </div>
        );

      case 'patients':
        return (
          <div className="p-6">
            <PatientsTable patients={patients} />
          </div>
        );

      case 'therapy':
        return (
          <div className="p-6">
            <TherapyEvolution patients={patients} />
          </div>
        );

      case 'appointments':
        return (
          <div className="p-6">
            <AppointmentsSection
              futureAppointments={futureAppointments}
              calendarEvents={calendarEvents}
              patients={patients}
              doctorData={doctorData}
              onUpdateStatus={handleUpdateStatus}
            />
          </div>
        );

      case 'reports':
        return (
          <div className="p-6">
            <ReportsSection />
          </div>
        );

      case 'attendance':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Frequência dos Pacientes
            </h2>
            <AttendanceOverview doctorId={doctorData?._id} />
          </div>
        );


      case 'messages':
        return (
          <div className="p-6">
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Mensagens</h2>
              <p className="text-gray-600">Sistema de mensagens em desenvolvimento</p>
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="p-6">
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Meu Perfil</h2>
              <p className="text-gray-600">Página de perfil em desenvolvimento</p>
            </div>
          </div>
        );

      default:
        return (
          <div className="p-6">
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Página não encontrada</h2>
              <p className="text-gray-600">Selecione uma opção no menu superior</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        doctorData={doctorData}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onLogout={handleLogout}
      />

      {/* 🔹 CONTEÚDO PRINCIPAL */}
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}