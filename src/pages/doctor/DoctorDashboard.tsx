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
import DoctorCalendarTab from '../../components/doctor/tabs/DoctorCalendarTab';
import PatientDetail from '../../components/doctor/patient/PatientDetail';
import PatientsTable from '../../components/doctor/patient/PatientsTable';
import DoctorInsightsSection from '../../components/doctor/DoctorInsightsSection';
import SpecialtyStatsCard from '../../components/doctor/SpecialtyStatsCard';
import useDoctorInsights from '../../hooks/useDoctorInsights';
import ScheduleAppointmentModal from '../../components/patients/ScheduleAppointmentModal';
import appointmentService from '../../services/appointmentService';
import TherapyEvolution from '../../components/doctor/TherapyEvolution';
import TodayAppointmentsCard from '../../components/doctor/TodayAppointmentsCard';
import DoctorFinancialTab from '../../components/doctor/tabs/DoctorFinancialTab';
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

  // ── Insights: schedule modal ──────────────────────────────────────────────
  const [scheduleRiskTarget, setScheduleRiskTarget] = useState<{ _id: string; fullName: string; lastSessionType?: string } | null>(null);
  const [scheduleModalLoading, setScheduleModalLoading] = useState(false);
  const [scheduleModalSignal, setScheduleModalSignal] = useState(0);

  const {
    doctorData,
    doctorId,
    patients,
    allPatients,
    appointments,
    stats,
    futureAppointments,
    calendarEvents,
    therapySessions,
    loading,
    loadOverview,
    loadAppointments,
    loadTherapy,
    loadPatients,
    ensurePatientsLoaded,
    patientsPagination,
    setPatientsPagination,
    handleUpdateStatus
  } = useDoctorDashboard();

  const doctorInsights = useDoctorInsights(doctorId);

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
      case 'insights':
        doctorInsights.refresh();
        break;
      case 'financial':
        // DoctorFinancialTab carrega seus próprios dados
        break;
    }
  }, [activeTab, doctorId]); // Só recarrega quando muda a aba ou carrega o doctorId

  // ── Insights: agenda paciente em risco ───────────────────────────────────
  const handleScheduleRiskPatient = useCallback((patientId: string, patientName: string, hints?: { lastSessionType?: string }) => {
    setScheduleRiskTarget({ _id: patientId, fullName: patientName, lastSessionType: hints?.lastSessionType });
    ensurePatientsLoaded();
  }, [ensurePatientsLoaded]);

  const handleSaveRiskSchedule = useCallback(async (data: any) => {
    setScheduleModalLoading(true);
    try {
      await appointmentService.create(data);
      toast.success('Consulta reagendada com sucesso!');
      setScheduleModalSignal(s => s + 1); // fecha modal via closeModalSignal
      loadOverview(true);       // atualiza consultas de hoje
      doctorInsights.refresh(); // atualiza métricas de risco
    } catch (err: any) {
      throw err; // deixa o modal exibir a mensagem inline
    } finally {
      setScheduleModalLoading(false);
    }
  }, [doctorInsights, loadOverview]);

  // ── Insights: ver histórico do paciente ──────────────────────────────────
  const handleViewPatientHistory = useCallback((patientId: string, patientName: string) => {
    // Navega para detalhe do paciente (PatientDetail busca seus próprios dados por ID)
    setSelectedPatient({ _id: patientId, fullName: patientName } as IPatient);
    setViewMode('detail');
    setActiveTab('patients');
  }, []);

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

    // 🎂 Aniversariantes do mês (apenas pacientes deste médico)
    const currentMonth = new Date().getMonth();
    const currentDay = new Date().getDate();
    const birthdayPatients = patientsList.filter(p => {
      if (!p.dateOfBirth) return false;
      try {
        const birthMonth = new Date(p.dateOfBirth).getMonth();
        return birthMonth === currentMonth;
      } catch { return false; }
    }).sort((a, b) => {
      const dayA = new Date(a.dateOfBirth!).getDate();
      const dayB = new Date(b.dateOfBirth!).getDate();
      // Hoje primeiro, depois ordem crescente
      const distA = ((dayA - currentDay) + 31) % 31;
      const distB = ((dayB - currentDay) + 31) % 31;
      return distA - distB;
    });

    if (birthdayPatients.length > 0) {
      const todayBirthdays = birthdayPatients.filter(p => new Date(p.dateOfBirth!).getDate() === currentDay);
      const preview = birthdayPatients.slice(0, 3).map(p => p.fullName).join(', ');
      const extra = birthdayPatients.length > 3 ? ` e mais ${birthdayPatients.length - 3}` : '';
      alerts.push({
        id: 'birthdays',
        type: todayBirthdays.length > 0 ? 'urgent' : 'info',
        title: todayBirthdays.length > 0
          ? `🎂 Aniversário hoje: ${todayBirthdays.map(p => p.fullName).join(', ')}`
          : `🎂 Aniversariantes do mês (${birthdayPatients.length})`,
        description: todayBirthdays.length > 0
          ? `Não esqueça de parabenizar!`
          : `${preview}${extra}`,
        count: birthdayPatients.length,
        onClick: () => handleTabChange('patients')
      });
    }

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
              patients={allPatients ?? []}
              selectedPatient={selectedPatient}
              onSelectPatient={setSelectedPatient}
              onOpenPatientDetail={handleViewPatientDetails}
            />
          </div>
        );

      case 'appointments':
        return (
          <div className="p-6">
            {doctorId ? (
              <DoctorCalendarTab doctorId={doctorId} />
            ) : (
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Carregando agenda...</h2>
              </div>
            )}
          </div>
        );

      case 'insights':
        return (
          <div className="p-6">
            <DoctorInsightsSection
              insights={doctorInsights.insights}
              loading={doctorInsights.loading}
              error={doctorInsights.error}
              timeRange={doctorInsights.timeRange}
              onTimeRangeChange={doctorInsights.setTimeRange}
              onRefresh={doctorInsights.refresh}
              onPatientClick={(patientId, patientName) => {
                const found = patients?.find(p => p._id === patientId);
                if (found) handleOpenPatientModal(found);
              }}
              onSchedule={handleScheduleRiskPatient}
              onViewHistory={handleViewPatientHistory}
            />
          </div>
        );

      case 'financial':
        return (
          <div className="p-6">
            <DoctorFinancialTab
              doctorId={doctorId}
              appointments={appointments ?? []}
              patients={patients ?? []}
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

      {/* ── Modal de reagendamento (risk cards) ── */}
      {scheduleRiskTarget && (
        <ScheduleAppointmentModal
          isOpen={!!scheduleRiskTarget}
          onClose={() => setScheduleRiskTarget(null)}
          onSave={handleSaveRiskSchedule}
          isLoading={scheduleModalLoading}
          closeModalSignal={scheduleModalSignal}
          initialData={{
            patientId: scheduleRiskTarget._id,
            doctorId: doctorId || '',
            date: '',
            time: '',
            sessionType: scheduleRiskTarget.lastSessionType || 'individual_session',
          } as any}
          patients={patients?.length ? patients : [{ _id: scheduleRiskTarget._id, fullName: scheduleRiskTarget.fullName } as any]}
          doctors={doctorData ? [{ _id: doctorId, fullName: doctorData.fullName || doctorData.name }] as any : []}
        />
      )}
    </div>
  );
}
