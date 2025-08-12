// src/pages/doctor/DashboardPage.tsx
import { useState } from 'react';
import AppointmentsSection from '../components/doctor/AppointmentsSection';
import DashboardHeader from '../components/doctor/DashboardHeader';
import TabsNavigation from '../components/doctor/TabsNavigation';
import useDoctorDashboard from '../hooks/useDoctorDashboard';
import PatientsTable from './doctor/PatientsTable';
import ReportsSection from './doctor/ReportsSection';
import SpecialtyStatsCard from './doctor/SpecialtyStatsCard';
import TherapyEvolution from './doctor/TherapyEvolution';
import TodayAppointmentsCard from './doctor/TodayAppointmentsCard';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { Tabs, TabsContent } from './ui/Tabs';

export default function DoctorDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [showTodayAppointments, setShowTodayAppointments] = useState(true);

  const {
    loading,
    doctorData,
    patients,
    appointments,
    stats,
    futureAppointments,
    handleUpdateStatus
  } = useDoctorDashboard();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <DashboardHeader doctorData={doctorData} />

      {/* Envolva tudo em um único componente Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsNavigation
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        {/* Agora os TabsContent estão DENTRO do componente Tabs */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
        </TabsContent>

        <TabsContent value="patients">
          <PatientsTable patients={patients} />
        </TabsContent>

        <TabsContent value="therapy">
          <TherapyEvolution patients={patients} />
        </TabsContent>

        <TabsContent value="appointments">
          <AppointmentsSection
            futureAppointments={futureAppointments}
            patients={patients}
            doctorData={doctorData}
            onUpdateStatus={handleUpdateStatus}
          />
        </TabsContent>

        <TabsContent value="reports">
          <ReportsSection />
        </TabsContent>
      </Tabs> {/* Fechamento do componente Tabs */}
    </div>
  );
}