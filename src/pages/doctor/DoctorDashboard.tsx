// src/pages/doctor/DashboardPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { toDateString } from '../../utils/dateUtils';
import DashboardHeader from '../../components/doctor/DashboardHeader';
import { PatientModal } from '../../components/patients/PatientModal';
import useDoctorDashboard from '../../hooks/useDoctorDashboard';
import patientService from '../../services/patientService';
import { IPatient } from '../../utils/types/types';
import { extractErrorMessage } from '../../utils/errorUtils';
import AppointmentsSection from '../../components/doctor/AppointmentsSection';
import AttendanceOverview from '../../components/doctor/AttendanceOverview';
import PatientDetail from '../../components/doctor/patient/PatientDetail';
import PatientsTable from '../../components/doctor/patient/PatientsTable';
import ReportsSection from '../../components/doctor/ReportsSection';
import SpecialtyStatsCard from '../../components/doctor/SpecialtyStatsCard';
import TherapyEvolution from '../../components/doctor/TherapyEvolution';
import TodayAppointmentsCard from '../../components/doctor/TodayAppointmentsCard';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

import { Activity, Calendar, CheckCircle, Users } from 'lucide-react';
import KPICard from '../../components/doctor/DoctorKPICard';
import AlertsPanel from '../../components/doctor/AlertsPanel';
import QuickActions from '../../components/doctor/QuickActions';

// Estado inicial do paciente
const initialPatientState: IPatient = {
  fullName: '',
  dateOfBirth: '',
  gender: '',
  maritalStatus: '',
  profession: '',
  placeOfBirth: '',
  address: {
    street: '',
    number: '',
    district: '',
    city: '',
    state: '',
    zipCode: ''
  },
  phone: '',
  email: '',
  cpf: '',
  rg: '',
  specialties: [],
  mainComplaint: '',
  clinicalHistory: '',
  medications: '',
  allergies: '',
  familyHistory: '',
  healthPlan: {
    name: '',
    policyNumber: ''
  },
  legalGuardian: '',
  emergencyContact: {
    name: '',
    phone: '',
    relationship: ''
  },
  appointments: [],
  imageAuthorization: false,
  birthCertificate: '',
  packages: [],
  nextAppointment: '',
  lastAppointment: ''
};

export default function DoctorDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [showTodayAppointments, setShowTodayAppointments] = useState(true);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<IPatient | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list'); // 'list' ou 'detail'
  const [isLoading, setIsLoading] = useState(false);

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
  } = useDoctorDashboard({ skipCache: true });

  // 🐛 Debug logs
  console.log('🩺 DoctorDashboard:', {
    loading,
    doctorDataId: doctorData?._id,
    patientsCount: patients?.length,
    appointmentsCount: appointments?.length,
    stats
  });

  // Função para abrir modal do paciente (clique rápido no nome/avatar)
  const handleOpenPatientModal = (patient: IPatient) => {
    setSelectedPatient(patient);
    setIsPatientModalOpen(true);
  };

  // Função para visualização completa (PatientDetail)
  const handleViewPatientDetails = (patient: IPatient) => {
    setSelectedPatient(patient);
    setViewMode('detail');
    setActiveTab('patients'); // Garante que está na aba de pacientes
  };

  // Função para voltar para a lista
  const handleBackToList = () => {
    setViewMode('list');
    setSelectedPatient(null);
  };

  // Função para criar anamnese
  const handleCreateAnamnesis = (patient: IPatient) => {
    setSelectedPatient(patient);
    setViewMode('detail');
    setActiveTab('patients');
    // Aqui você pode adicionar lógica para abrir direto na aba de anamnese
    toast.info(`Criar anamnese para ${patient.fullName}`);
  };

  // Função para criar relatório escolar
  const handleCreateSchoolReport = (patient: IPatient) => {
    setSelectedPatient(patient);
    setViewMode('detail');
    setActiveTab('patients');
    // Aqui você pode adicionar lógica para abrir direto na aba de relatórios escolares
    toast.info(`Criar relatório escolar para ${patient.fullName}`);
  };

  // Função para ver relatórios médicos
  const handleViewMedicalReports = (patient: IPatient) => {
    setSelectedPatient(patient);
    setViewMode('detail');
    setActiveTab('patients');
    // Aqui você pode adicionar lógica para abrir direto na aba de relatórios médicos
    toast.info(`Ver relatórios médicos de ${patient.fullName}`);
  };

  // Função para adicionar novo paciente
  const handleAddNewPatient = () => {
    setSelectedPatient(null);
    setIsPatientModalOpen(true);
  };

  // Função para fechar modal
  const handleClosePatientModal = () => {
    setIsPatientModalOpen(false);
    setSelectedPatient(null);
  };

  // Função para salvar paciente
  const handleSavePatient = async (formData: IPatient) => {
    setIsLoading(true);
    try {
      if (formData._id) {
        await patientService.update(formData._id, {
          ...formData,
          dateOfBirth: new Date(formData.dateOfBirth).toISOString()
        });
        toast.success("Paciente atualizado com sucesso!");
      } else {
        await patientService.create({
          ...formData,
          dateOfBirth: new Date(formData.dateOfBirth).toISOString()
        });
        toast.success("Paciente criado com sucesso!");
      }
      return true;
    } catch (error: any) {
      toast.error(extractErrorMessage(error, 'Erro ao salvar paciente.'));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    navigate('/logout');
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Se mudar de aba e não estiver na de pacientes, volta para a lista
    if (tab !== 'patients') {
      setViewMode('list');
      setSelectedPatient(null);
    }
  };

  const calculateKPIs = () => {
    const today = new Date().toISOString().split('T')[0];
    const appointmentsList = appointments ?? [];
    const todayAppointments = appointmentsList.filter(
      apt => toDateString(apt.date) === today
    );

    // Total de pacientes ativos
    const patientsList = patients ?? [];
    const activePatients = patientsList.filter(p =>
      p.appointments && p.appointments.length > 0
    ).length;

    // Consultas do mês
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthAppointments = appointmentsList.filter(apt => {
      const aptDate = new Date(apt.date);
      return aptDate.getMonth() === currentMonth &&
        aptDate.getFullYear() === currentYear &&
        apt.status === 'completed';
    }).length;

    // Taxa de comparecimento
    const completedAppointments = appointmentsList.filter(
      apt => apt.status === 'completed'
    ).length;
    const totalScheduled = appointmentsList.length;
    const attendanceRate = totalScheduled > 0
      ? Math.round((completedAppointments / totalScheduled) * 100)
      : 0;

    // Próxima consulta
    const nextAppointment = (futureAppointments ?? [])[0];
    const nextAppointmentTime = nextAppointment
      ? `${nextAppointment.time}`
      : 'Nenhuma';

    return {
      activePatients,
      monthAppointments,
      attendanceRate,
      todayCount: todayAppointments.length,
      nextAppointmentTime
    };
  };

  const generateAlerts = () => {
    const alerts: any[] = [];
    const patientsList = patients ?? [];
    const appointmentsList = appointments ?? [];

    // Pacientes sem evolução há 30+ dias
    const patientsWithoutEvolution = patientsList.filter(p => {
      if (!p.lastAppointment) return false;
      const daysSinceLastAppointment = Math.floor(
        (Date.now() - new Date(p.lastAppointment).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSinceLastAppointment >= 30;
    });

    if (patientsWithoutEvolution.length > 0) {
      alerts.push({
        id: 'no-evolution',
        type: 'warning',
        title: 'Pacientes sem evolução recente',
        description: `${patientsWithoutEvolution.length} pacientes sem registro há mais de 30 dias`,
        count: patientsWithoutEvolution.length,
        onClick: () => handleTabChange('patients')
      });
    }

    // Consultas de hoje
    const today = new Date().toISOString().split('T')[0];
    const todayPending = appointmentsList.filter(
      apt => toDateString(apt.date) === today && apt.status === 'scheduled'
    );

    if (todayPending.length > 0) {
      alerts.push({
        id: 'today-pending',
        type: 'info',
        title: 'Consultas pendentes hoje',
        description: `${todayPending.length} consultas agendadas aguardando atendimento`,
        count: todayPending.length
      });
    }

    // Exemplo: Relatórios pendentes (você pode adicionar lógica real aqui)
    // alerts.push({
    //     id: 'reports-pending',
    //     type: 'urgent',
    //     title: 'Relatórios médicos pendentes',
    //     description: 'Há relatórios aguardando sua assinatura',
    //     count: 3,
    //     onClick: () => handleTabChange('reports')
    // });

    return alerts;
  };

  // ✅ FUNÇÃO PARA IR À EVOLUÇÃO DO PACIENTE
  const handleGoToEvolution = (patient: any) => {
    setSelectedPatient(patient);
    setActiveTab('therapy');
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
        const kpis = calculateKPIs();
        const alerts = generateAlerts();

        return (
          <div className="space-y-6 p-6">
            {/* KPI CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="Pacientes Ativos"
                value={kpis.activePatients}
                icon={Users}
                color="primary"
                onClick={() => handleTabChange('patients')}
              />
              <KPICard
                title="Consultas este Mês"
                value={kpis.monthAppointments}
                icon={Calendar}
                color="success"
              />
              <KPICard
                title="Taxa de Comparecimento"
                value={`${kpis.attendanceRate}%`}
                icon={CheckCircle}
                color="info"
                trend={{
                  value: 5,
                  isPositive: true
                }}
              />
              <KPICard
                title="Próxima Consulta"
                value={kpis.nextAppointmentTime}
                icon={Activity}
                color="warning"
              />
            </div>

            {/* ALERTAS E HOJE */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AlertsPanel alerts={alerts} />

              <TodayAppointmentsCard
                appointments={appointments ?? []}
                showAll={showTodayAppointments}
                onToggleShow={() => setShowTodayAppointments(!showTodayAppointments)}
                onUpdateStatus={handleUpdateStatus}
                onPatientClick={handleGoToEvolution} // ✅ IR PARA EVOLUÇÃO
              />
            </div>

            {/* AÇÕES RÁPIDAS E STATS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <QuickActions
                onNewAppointment={() => handleTabChange('appointments')}
                onNewPatient={handleAddNewPatient}
                onQuickEvolution={() => handleTabChange('therapy')}
                onViewCalendar={() => handleTabChange('appointments')}
              />

              <SpecialtyStatsCard
                doctorData={doctorData}
                stats={stats}
              />
            </div>
          </div>
        );

      case 'patients':
        // Se estiver no modo detail, mostra o PatientDetail completo
        if (viewMode === 'detail' && selectedPatient) {
          return (
            <div className="p-6">
              <PatientDetail
                patientId={selectedPatient._id}
                onBack={handleBackToList}
              />
            </div>
          );
        }

        // Modo lista - mostra a tabela de pacientes
        return (
          <div className="p-6">
            <PatientsTable
              patients={patients ?? []}
              onPatientClick={handleOpenPatientModal}
              onViewPatientDetails={handleViewPatientDetails}
              onCreateAnamnesis={handleCreateAnamnesis}
              onCreateSchoolReport={handleCreateSchoolReport}
              onViewMedicalReports={handleViewMedicalReports}
              onAddNewPatient={handleAddNewPatient}
            />
          </div>
        );

      case 'therapy':
        return (
          <div className="p-6">
            <TherapyEvolution
              patients={patients ?? []}
              selectedPatient={selectedPatient}
              onSelectPatient={setSelectedPatient}
              // opcional: se quiser abrir o prontuário completo a partir da aba Terapia
              onOpenPatientDetail={handleViewPatientDetails}
            />
          </div>
        );


      case 'appointments':
        return (
          <div className="p-6">
            <AppointmentsSection
              futureAppointments={futureAppointments ?? []}
              calendarEvents={calendarEvents ?? []}
              patients={patients ?? []}
              doctorData={doctorData}
              onUpdateStatus={handleUpdateStatus}
              onPatientClick={handleOpenPatientModal}
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
            <AttendanceOverview
              doctorId={doctorData?._id}
              onPatientClick={handleOpenPatientModal}
            />
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

  // 🔄 Mostra loading enquanto carrega dados
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

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
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm ">
          {renderTabContent()}
        </div>
      </div>

      {/* 🔹 MODAL DO PACIENTE (para edição rápida) */}
      {isPatientModalOpen && (
        <PatientModal
          open={isPatientModalOpen}
          patient={selectedPatient || initialPatientState}
          onClose={handleClosePatientModal}
          onSaveSuccess={async (formData) => {
            const success = await handleSavePatient(formData);
            if (success) {
              handleClosePatientModal();
              // Aqui você pode adicionar um refresh dos dados se necessário
            }
          }}
        />
      )}
    </div>
  );
}