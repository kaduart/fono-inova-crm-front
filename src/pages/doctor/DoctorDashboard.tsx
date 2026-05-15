// src/pages/doctor/DoctorDashboard.tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Box, Card, CardContent, Grid, Paper, Skeleton, Typography } from '@mui/material';
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
import { Activity, Calendar, CheckCircle, Users } from 'lucide-react';
import KPICard from '../../components/doctor/DoctorKPICard';
import AlertsPanel from '../../components/doctor/AlertsPanel';
import QuickActions from '../../components/doctor/QuickActions';

// Skeleton para KPI
const KPICardSkeleton = () => (
  <Card className="rounded-2xl border border-gray-200 shadow-sm">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Skeleton variant="text" width={120} height={20} className="mb-2" />
          <Skeleton variant="text" width={60} height={48} />
        </div>
        <Skeleton variant="circular" width={48} height={48} />
      </div>
    </CardContent>
  </Card>
);

// Skeleton para o Dashboard completo
const DashboardSkeleton = () => (
  <div className="min-h-screen bg-gray-50">
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton variant="circular" width={48} height={48} />
            <div>
              <Skeleton variant="text" width={250} height={32} />
              <Skeleton variant="text" width={180} height={20} />
            </div>
          </div>
          <Skeleton variant="rectangular" width={120} height={40} className="rounded-full" />
        </div>
      </div>
    </div>
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <Grid container spacing={3} className="mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} lg={3} key={i}>
              <KPICardSkeleton />
            </Grid>
          ))}
        </Grid>
      </div>
    </div>
  </div>
);

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
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [showTodayAppointments, setShowTodayAppointments] = useState(true);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<IPatient | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [isLoading, setIsLoading] = useState(false);

  const {
    doctorData,
    doctorId,
    patients,
    appointments,
    stats,
    futureAppointments,
    calendarEvents,
    therapySessions,
    attendanceSummary,
    loading,
    loadOverview,
    loadAppointments,
    loadTherapy,
    loadAttendance,
    loadPatients,
    patientsPagination,
    setPatientsPagination,
    handleUpdateStatus
  } = useDoctorDashboard();

  // 🚀 Lazy loading: carrega dados da aba ativa
  useEffect(() => {
    if (!doctorId) return;
    
    switch (activeTab) {
      case 'overview':
        loadOverview();
        break;
      case 'patients':
        loadPatients();
        break;
      case 'appointments':
        loadAppointments();
        break;
      case 'therapy':
        loadTherapy();
        loadPatients();
        break;
      case 'attendance':
        loadAttendance();
        break;
    }
  }, [activeTab, doctorId]); // Só recarrega quando muda a aba ou carrega o doctorId

  const handleOpenPatientModal = useCallback((patient: IPatient) => {
    setSelectedPatient(patient);
    setIsPatientModalOpen(true);
  }, []);

  const handleViewPatientDetails = useCallback((patient: IPatient) => {
    setSelectedPatient(patient);
    setViewMode('detail');
    setActiveTab('patients');
  }, []);

  const handleBackToList = useCallback(() => {
    setViewMode('list');
    setSelectedPatient(null);
  }, []);

  const handleCreateAnamnesis = useCallback((patient: IPatient) => {
    setSelectedPatient(patient);
    setViewMode('detail');
    setActiveTab('patients');
    toast.info(`Criar anamnese para ${patient.fullName}`);
  }, []);

  const handleCreateSchoolReport = useCallback((patient: IPatient) => {
    setSelectedPatient(patient);
    setViewMode('detail');
    setActiveTab('patients');
    toast.info(`Criar relatório escolar para ${patient.fullName}`);
  }, []);

  const handleViewMedicalReports = useCallback((patient: IPatient) => {
    setSelectedPatient(patient);
    setViewMode('detail');
    setActiveTab('patients');
    toast.info(`Ver relatórios médicos de ${patient.fullName}`);
  }, []);

  const handleAddNewPatient = useCallback(() => {
    setSelectedPatient(null);
    setIsPatientModalOpen(true);
  }, []);

  const handleClosePatientModal = useCallback(() => {
    setIsPatientModalOpen(false);
    setSelectedPatient(null);
  }, []);

  const handleSavePatient = useCallback(async (formData: IPatient) => {
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
      // Recarrega pacientes se estiver na aba
      if (activeTab === 'patients') {
        loadPatients(true);
      }
      return true;
    } catch (error: any) {
      toast.error(extractErrorMessage(error, 'Erro ao salvar paciente.'));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, loadPatients]);

  const handleLogout = useCallback(() => {
    navigate('/logout');
  }, [navigate]);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    if (tab !== 'patients') {
      setViewMode('list');
      setSelectedPatient(null);
    }
  }, []);

  const handleGoToEvolution = useCallback((patient: any) => {
    setSelectedPatient(patient);
    setActiveTab('therapy');
  }, []);

  const calculateKPIs = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const appointmentsList = appointments ?? [];
    const todayAppointments = appointmentsList.filter(
      apt => toDateString(apt.date) === today
    );

    const nextAppointment = (futureAppointments ?? [])[0];
    const nextAppointmentTime = nextAppointment
      ? `${nextAppointment.time}`
      : 'Nenhuma';

    return {
      activePatients: (stats as any)?.activePatients ?? 0,
      monthAppointments: (stats as any)?.monthlyAppointments ?? 0,
      attendanceRate: (stats as any)?.attendanceRate ?? 0,
      todayCount: todayAppointments.length,
      nextAppointmentTime
    };
  }, [stats, appointments, futureAppointments]);

  const generateAlerts = useMemo(() => {
    const alerts: any[] = [];
    const patientsList = patients ?? [];
    const appointmentsList = appointments ?? [];

    const patientsWithoutEvolution = patientsList.filter(p => {
      const lastAppointmentDate = p.lastAppointment || p.stats?.lastAppointmentDate;
      if (!lastAppointmentDate) return false;
      const daysSinceLastAppointment = Math.floor(
        (Date.now() - new Date(lastAppointmentDate).getTime()) / (1000 * 60 * 60 * 24)
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

    return alerts;
  }, [patients, appointments, handleTabChange]);

  // Skeleton enquanto carrega dados iniciais
  if (!doctorData || !doctorId) {
    return <DashboardSkeleton />;
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6 p-6">
            {loading.overview ? (
              <Grid container spacing={3}>
                {[1, 2, 3, 4].map((i) => (
                  <Grid item xs={12} sm={6} lg={3} key={i}>
                    <KPICardSkeleton />
                  </Grid>
                ))}
              </Grid>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <KPICard
                    title="Pacientes Ativos"
                    value={calculateKPIs.activePatients}
                    icon={Users}
                    color="primary"
                    onClick={() => handleTabChange('patients')}
                  />
                  <KPICard
                    title="Consultas este Mês"
                    value={calculateKPIs.monthAppointments}
                    icon={Calendar}
                    color="success"
                  />
                  <KPICard
                    title="Taxa de Comparecimento"
                    value={`${calculateKPIs.attendanceRate}%`}
                    icon={CheckCircle}
                    color="info"
                    trend={{ value: 5, isPositive: true }}
                  />
                  <KPICard
                    title="Próxima Consulta"
                    value={calculateKPIs.nextAppointmentTime}
                    icon={Activity}
                    color="warning"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <AlertsPanel alerts={generateAlerts} />
                  <TodayAppointmentsCard
                    appointments={appointments ?? []}
                    showAll={showTodayAppointments}
                    onToggleShow={() => setShowTodayAppointments(!showTodayAppointments)}
                    onUpdateStatus={handleUpdateStatus}
                    onPatientClick={handleGoToEvolution}
                  />
                </div>

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
              </>
            )}
          </div>
        );

      case 'patients':
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
        return (
          <div className="p-6">
            <PatientsTable
              patients={patients ?? []}
              pagination={patientsPagination}
              onPageChange={(page) => {
                setPatientsPagination(prev => ({ ...prev, page }));
                loadPatients(true, page);
              }}
              onSearchChange={(search) => {
                setPatientsPagination(prev => ({ ...prev, search, page: 1 }));
                loadPatients(true, 1, search);
              }}
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

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        doctorData={doctorData}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onLogout={handleLogout}
      />

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm ">
          {renderTabContent()}
        </div>
      </div>

      {isPatientModalOpen && (
        <PatientModal
          open={isPatientModalOpen}
          patient={selectedPatient || initialPatientState}
          onClose={handleClosePatientModal}
          onSaveSuccess={handleSavePatient}
        />
      )}
    </div>
  );
}
