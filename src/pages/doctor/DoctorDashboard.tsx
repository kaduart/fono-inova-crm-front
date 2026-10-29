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

import DoctorCalendarTab from '../../components/doctor/tabs/DoctorCalendarTab';
import PatientDetail from '../../components/doctor/patient/PatientDetail';
import MyPatientsPanel from '../../components/doctor/patient/MyPatientsPanel';
import DoctorInsightsSection from '../../components/doctor/DoctorInsightsSection';
import useDoctorInsights from '../../hooks/useDoctorInsights';
import ScheduleAppointmentModal from '../../components/patients/ScheduleAppointmentModal';
import appointmentService from '../../services/appointmentService';
import TherapyEvolution from '../../components/doctor/TherapyEvolution';
import DoctorFinancialTab from '../../components/doctor/tabs/DoctorFinancialTab';
import { AlertTriangle, CalendarDays, FileText, Plus, RefreshCw, UserPlus } from 'lucide-react';
import DayBar from '../../components/doctor/overview/DayBar';
import TodayAgendaPanel from '../../components/doctor/overview/TodayAgendaPanel';
import PatientQuickSearch from '../../components/doctor/overview/PatientQuickSearch';
import { MonthPanel, PendingPanel, TomorrowPanel } from '../../components/doctor/overview/OverviewSidePanels';
import { aptDateTime, isCanceled, isOpen, patientOf, todayLocal } from '../../components/doctor/overview/agendaUtils';

const quickBtn = 'inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500';
import { notifyApiError } from '../../utils/notifyApiError';

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
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<IPatient | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [isLoading, setIsLoading] = useState(false);

  // ── Insights: schedule modal ──────────────────────────────────────────────
  const [scheduleRiskTarget, setScheduleRiskTarget] = useState<{ _id: string; fullName: string; lastSessionType?: string } | null>(null);
  const [scheduleModalLoading, setScheduleModalLoading] = useState(false);
  const [scheduleModalSignal, setScheduleModalSignal] = useState(0);
  const [patientsRefreshKey, setPatientsRefreshKey] = useState(0);

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
    overviewError,
    loadOverview,
    loadAppointments,
    loadTherapy,
    loadPatients,
    ensurePatientsLoaded,
    pendingEvolutions
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
        setPatientsRefreshKey(k => k + 1);
      }
      return true;
    } catch (error: any) {
      notifyApiError(error, 'Erro ao salvar paciente.');
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

  // "Hoje" é a data LOCAL (toISOString virava o dia seguinte depois das 21h)
  const todayAppointments = useMemo(() => {
    const today = todayLocal();
    return (appointments ?? []).filter(apt => toDateString(apt.date) === today);
  }, [appointments]);

  // Próxima sessão: a primeira de hoje ainda em aberto (tolerância de 10 min); senão a primeira futura
  const nextAppointment = useMemo(() => {
    const now = Date.now();
    const openToday = todayAppointments
      .filter(a => isOpen(a) && (aptDateTime(a)?.getTime() ?? 0) >= now - 10 * 60000)
      .sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
    if (openToday[0]) return { apt: openToday[0], isToday: true };
    const future = (futureAppointments ?? [])
      .filter(a => !isCanceled(a) && toDateString(a.date) !== todayLocal())
      .sort((a, b) => (aptDateTime(a)?.getTime() ?? 0) - (aptDateTime(b)?.getTime() ?? 0));
    return future[0] ? { apt: future[0], isToday: false } : null;
  }, [todayAppointments, futureAppointments]);

  const pendingEvolutionIds = useMemo(() => new Set(pendingEvolutions.map(p => p._id)), [pendingEvolutions]);

  // Métricas do mês: todas vêm do backend (/doctors/appointments/stats). Sem tendência inventada.
  const overviewKpis = useMemo(() => {
    const st = (stats as any) || {};
    const next = nextAppointment?.apt;
    const nextDay = next
      ? nextAppointment!.isToday ? 'hoje' : aptDateTime(next)?.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
      : null;
    return [
      { label: 'Pacientes ativos', value: st.activePatients ?? '—', hint: 'atendidos neste mês', onClick: () => handleTabChange('patients') },
      { label: 'Sessões no mês', value: st.monthlyAppointments ?? '—', hint: typeof st.monthlyCompleted === 'number' ? `${st.monthlyCompleted} concluídas` : '' },
      { label: 'Comparecimento', value: typeof st.attendanceRate === 'number' ? `${st.attendanceRate}%` : '—', hint: 'concluídas ÷ previstas até hoje' },
      { label: 'Próxima consulta', value: next?.time || '—', hint: next ? `${nextDay} · ${patientOf(next).fullName.split(' ')[0]}` : 'nenhuma marcada' },
    ] as { label: string; value: string | number; hint?: string; onClick?: () => void }[];
  }, [stats, nextAppointment, handleTabChange]);

  // 🎂 Aniversariantes do mês (apenas pacientes deste terapeuta)
  // 🐛 FIX (2026-09-22): dateOfBirth é gravado como meia-noite UTC representando o dia
  // pretendido. Sempre getUTCMonth()/getUTCDate() aqui (mesmo bug de BirthdayCard.tsx).
  const birthdayPatients = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentDay = new Date().getDate();
    return (patients ?? []).filter(p => {
      if (!p.dateOfBirth) return false;
      try { return new Date(p.dateOfBirth).getUTCMonth() === currentMonth; } catch { return false; }
    }).sort((a, b) => {
      const distA = ((new Date(a.dateOfBirth!).getUTCDate() - currentDay) + 31) % 31;
      const distB = ((new Date(b.dateOfBirth!).getUTCDate() - currentDay) + 31) % 31;
      return distA - distB;
    });
  }, [patients]);

  const openPatient = useCallback((p: { _id: string; fullName: string }) => {
    if (!p?._id) return;
    handleViewPatientDetails(p as IPatient);
  }, [handleViewPatientDetails]);

  // Skeleton enquanto carrega dados iniciais
  if (!doctorData || !doctorId) {
    return <DashboardSkeleton />;
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-4 text-left">
            {!overviewError && <DayBar
              doctorName={doctorData?.fullName || doctorData?.name || ''}
              specialty={doctorData?.specialty}
              todayAppointments={todayAppointments}
              nextAppointment={nextAppointment?.apt ?? null}
              nextIsToday={!!nextAppointment?.isToday}
            />}

            <div className="flex flex-wrap items-center gap-2">
              <PatientQuickSearch patients={allPatients ?? []} onPick={handleViewPatientDetails} />
              <button type="button" onClick={() => handleTabChange('appointments')} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-emerald-700 bg-emerald-700 px-3 text-sm font-medium text-white hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1">
                <Plus className="h-4 w-4" aria-hidden />Nova consulta
              </button>
              <button type="button" onClick={handleAddNewPatient} className={quickBtn}>
                <UserPlus className="h-4 w-4" aria-hidden />Novo paciente
              </button>
              <button type="button" onClick={() => handleTabChange('therapy')} className={quickBtn}>
                <FileText className="h-4 w-4" aria-hidden />Evolução rápida
              </button>
              <button type="button" onClick={() => handleTabChange('appointments')} className={quickBtn}>
                <CalendarDays className="h-4 w-4" aria-hidden />Ver agenda
              </button>
            </div>

            {overviewError ? (
              <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4">
                <div className="flex min-w-0 items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" aria-hidden />
                  <div className="min-w-0">
                    <p className="font-semibold text-red-900">Não foi possível carregar a agenda e os números de hoje.</p>
                    <p className="text-sm text-red-800">Verifique a conexão e tente de novo. A busca de paciente e os atalhos acima continuam funcionando.</p>
                  </div>
                </div>
                <button type="button" onClick={() => loadOverview(true)} disabled={loading.overview} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 text-sm font-medium text-red-800 hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-60">
                  <RefreshCw className={`h-4 w-4 ${loading.overview ? 'animate-spin' : ''}`} aria-hidden />{loading.overview ? 'Carregando…' : 'Tentar de novo'}
                </button>
              </div>
            ) : loading.overview && !stats ? (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-busy="true">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-[76px] animate-pulse rounded-xl bg-gray-100" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {overviewKpis.map(k => {
                  const body = (
                    <>
                      <span className="text-xs font-medium text-gray-600">{k.label}</span>
                      <span className="text-2xl font-bold leading-tight tabular-nums text-gray-900">{k.value}</span>
                      {k.hint && <span className="text-xs text-gray-600">{k.hint}</span>}
                    </>
                  );
                  return k.onClick ? (
                    <button key={k.label} type="button" onClick={k.onClick} className="flex flex-col rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-left hover:border-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">{body}</button>
                  ) : (
                    <div key={k.label} className="flex flex-col rounded-xl border border-gray-200 bg-white px-4 py-2.5">{body}</div>
                  );
                })}
              </div>
            )}

            {!overviewError && <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <TodayAgendaPanel
                appointments={todayAppointments}
                nextAppointmentId={nextAppointment?.isToday ? nextAppointment.apt._id : null}
                pendingEvolutionIds={pendingEvolutionIds}
                loading={loading.overview}
                onRegisterEvolution={handleGoToEvolution}
                onOpenPatient={openPatient}
              />
              <div className="flex flex-col gap-4">
                <PendingPanel
                  pendingEvolutions={pendingEvolutions}
                  todayAppointments={todayAppointments}
                  birthdayPatients={birthdayPatients}
                  onRegisterEvolution={handleGoToEvolution}
                  onOpenPatient={openPatient}
                  onSeeAgenda={() => handleTabChange('appointments')}
                />
                <TomorrowPanel futureAppointments={futureAppointments ?? []} />
                <MonthPanel stats={stats} />
              </div>
            </div>}
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
          <div>
            <MyPatientsPanel
              pendingEvolutionIds={pendingEvolutionIds}
              refreshKey={patientsRefreshKey}
              onOpenPatient={(p) => handleViewPatientDetails(p as IPatient)}
              onCreateAnamnesis={(p) => handleCreateAnamnesis(p as IPatient)}
              onCreateSchoolReport={(p) => handleCreateSchoolReport(p as IPatient)}
              onViewReports={(p) => handleViewMedicalReports(p as IPatient)}
              onRegisterEvolution={handleGoToEvolution}
              onSchedule={(p) => handleScheduleRiskPatient(p._id, p.fullName)}
              onAddNewPatient={handleAddNewPatient}
            />
          </div>
        );

      case 'therapy':
        return (
          <TherapyEvolution
            patients={allPatients ?? []}
            selectedPatient={selectedPatient}
            onSelectPatient={setSelectedPatient}
            onOpenPatientDetail={handleViewPatientDetails}
            onEvolutionChanged={() => loadOverview(true)}
          />
        );

      case 'appointments':
        return (
          <div className="p-6">
            {doctorId ? (
              <DoctorCalendarTab
                doctorId={doctorId}
                pendingEvolutionIds={pendingEvolutionIds}
                onRegisterEvolution={handleGoToEvolution}
                onOpenPatient={handleViewPatientHistory}
              />
            ) : (
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Carregando agenda...</h2>
              </div>
            )}
          </div>
        );

      case 'insights':
        return (
          <DoctorInsightsSection
              insights={doctorInsights.insights}
              loading={doctorInsights.loading}
              error={doctorInsights.error}
              timeRange={doctorInsights.timeRange}
              onTimeRangeChange={doctorInsights.setTimeRange}
              onRefresh={doctorInsights.refresh}
              onPatientClick={handleViewPatientHistory}
              onSchedule={handleScheduleRiskPatient}
              onViewHistory={handleViewPatientHistory}
            />
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
        {/* Dashboard tem painéis próprios: sem o card externo (evita card dentro de card) */}
        <div className={activeTab === 'overview' || activeTab === 'therapy' || activeTab === 'insights' || (activeTab === 'patients' && viewMode !== 'detail') ? '' : 'bg-white rounded-2xl border border-gray-200 shadow-sm'}>
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
