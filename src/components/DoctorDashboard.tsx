// src/pages/doctor/DashboardPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import DashboardHeader from '../components/doctor/DashboardHeader';
import { PatientModal } from '../components/patients/PatientModal';
import useDoctorDashboard from '../hooks/useDoctorDashboard';
import { usePatients } from '../hooks/usePatients';
import { IPatient } from '../utils/types/types';
import AppointmentsSection from './doctor/AppointmentsSection';
import AttendanceOverview from './doctor/AttendanceOverview';
import PatientDetail from './doctor/patient/PatientDetail';
import PatientsTable from './doctor/patient/PatientsTable';
import ReportsSection from './doctor/ReportsSection';
import SpecialtyStatsCard from './doctor/SpecialtyStatsCard';
import TherapyEvolution from './doctor/TherapyEvolution';
import TodayAppointmentsCard from './doctor/TodayAppointmentsCard';
import { LoadingSpinner } from './ui/LoadingSpinner';

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
  const { updatePatient, createPatient } = usePatients();

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
        await updatePatient(formData._id, {
          ...formData,
          dateOfBirth: new Date(formData.dateOfBirth).toISOString()
        });
        toast.success("Paciente atualizado com sucesso!");
      } else {
        await createPatient({
          ...formData,
          dateOfBirth: new Date(formData.dateOfBirth).toISOString()
        });
        toast.success("Paciente criado com sucesso!");
      }
      return true;
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao salvar paciente.');
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
              onPatientClick={handleOpenPatientModal}
            />
            <SpecialtyStatsCard
              doctorData={doctorData}
              stats={stats}
            />
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
              patients={patients}
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
              patients={patients}
              onPatientClick={handleOpenPatientModal}
            />
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