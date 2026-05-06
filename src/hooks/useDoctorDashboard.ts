// src/hooks/useDoctorDashboard.ts
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import API from '../services/api';
import doctorService, {
  fetchFutureAppointments,
  fetchPatients,
  fetchStats,
  fetchTherapySessions,
  fetchTodaysAppointments,
  updateClinicalStatus
} from '../services/doctorService';
import { Appointment } from '../utils/types';
import { IPatient } from '../utils/types/types';
import { extractErrorMessage } from '../utils/errorUtils';

interface UseDoctorDashboardOptions {
  skipCache?: boolean;
}

export default function useDoctorDashboard(options: UseDoctorDashboardOptions = {}) {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [doctorData, setDoctorData] = useState<any>(null);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  
  // Dados por aba
  const [overviewData, setOverviewData] = useState({
    patients: [] as IPatient[],
    appointments: [] as Appointment[],
    stats: null as any,
    futureAppointments: [] as Appointment[],
  });

  // Paginação de pacientes
  const [patientsPagination, setPatientsPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    search: ''
  });
  
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [therapySessions, setTherapySessions] = useState<any[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [totalDoctors, setTotalDoctors] = useState<number>(0);
  const [doctorOverview, setDoctorOverview] = useState<any>(null);
  
  // Loading por aba
  const [loadingTabsState, setLoadingTabsState] = useState<Record<string, boolean>>({
    overview: false,
    appointments: false,
    therapy: false,
    attendance: false,
    patients: false
  });

  const isDoctor = userRole === 'doctor';
  const { skipCache = false } = options;

  // Carrega role do usuário (apenas uma vez)
  useEffect(() => {
    const storedRole = localStorage.getItem('userRole');
    if (storedRole) {
      try {
        setUserRole(JSON.parse(storedRole));
      } catch {
        setUserRole(storedRole);
      }
    } else {
      setUserRole('doctor');
    }
  }, []);

  // Carrega dados básicos do médico (apenas uma vez)
  useEffect(() => {
    if (!userRole) return;
    
    const loadDoctorProfile = async () => {
      try {
        const doctorRes = await API.get('/users/me');
        const docId = doctorRes.data?.id || doctorRes.data?._id;
        setDoctorData(doctorRes.data);
        setDoctorId(docId);
      } catch (error) {
        console.error('[useDoctorDashboard] Erro ao carregar perfil:', error);
        toast.error('Erro ao carregar dados do perfil');
      }
    };
    
    loadDoctorProfile();
  }, [userRole]);

  // 🎯 Carrega dados da aba Overview (KPIs, alertas, pacientes de hoje)
  const loadOverview = useCallback(async (force = false) => {
    if (!doctorId) return;
    if (loadingTabsState.overview && !force) return;

    setLoadingTabsState(prev => ({ ...prev, overview: true }));

    try {
      const [patientsRes, appointmentsRes, statsRes, futureRes] = await Promise.all([
        fetchPatients(doctorId),
        fetchTodaysAppointments(doctorId),
        fetchStats(doctorId),
        fetchFutureAppointments(doctorId)
      ]);

      setOverviewData({
        patients: patientsRes || [],
        appointments: appointmentsRes || [],
        stats: statsRes || {},
        futureAppointments: futureRes || []
      });
    } catch (error) {
      console.error('[useDoctorDashboard] Erro ao carregar overview:', error);
      toast.error('Erro ao carregar overview');
    } finally {
      setLoadingTabsState(prev => ({ ...prev, overview: false }));
    }
  }, [doctorId, loadingTabsState.overview]);

  // 🎯 Carrega dados da aba Appointments (calendário completo)
  const loadAppointments = useCallback(async (force = false) => {
    if (!doctorId) return;
    if (loadingTabsState.appointments && !force) return;

    setLoadingTabsState(prev => ({ ...prev, appointments: true }));

    try {
      const [calendarData, futureApps] = await Promise.all([
        doctorService.getAppointmentCalendarDoctor(doctorId),
        fetchFutureAppointments(doctorId)
      ]);

      // Formata eventos para o calendário
      const allAppointments = [...(calendarData || []), ...(futureApps || [])];
      const events = allAppointments.map((apt: any) => {
        let startDate;
        if (apt.date && apt.time) {
          const datePart = apt.date.includes('T') ? apt.date.split('T')[0] : apt.date;
          startDate = `${datePart}T${apt.time}`;
        } else {
          startDate = apt.date;
        }
        
        return {
          id: apt._id || apt.id,
          title: `${apt.patient?.fullName || 'Paciente'}`,
          start: startDate,
          extendedProps: apt
        };
      });

      setCalendarEvents(events);
    } catch (error) {
      console.error('[useDoctorDashboard] Erro ao carregar agendamentos:', error);
      toast.error('Erro ao carregar agendamentos');
    } finally {
      setLoadingTabsState(prev => ({ ...prev, appointments: false }));
    }
  }, [doctorId, loadingTabsState.appointments]);

  // 🎯 Carrega dados da aba Therapy (sessões)
  const loadTherapy = useCallback(async (force = false) => {
    if (!doctorId) return;
    if (loadingTabsState.therapy && !force) return;

    setLoadingTabsState(prev => ({ ...prev, therapy: true }));

    try {
      const sessionsRes = await fetchTherapySessions(doctorId);
      setTherapySessions(sessionsRes || []);
    } catch (error) {
      console.error('[useDoctorDashboard] Erro ao carregar sessões:', error);
      toast.error('Erro ao carregar sessões');
    } finally {
      setLoadingTabsState(prev => ({ ...prev, therapy: false }));
    }
  }, [doctorId, loadingTabsState.therapy]);

  // 🎯 Carrega dados da aba Attendance (frequência)
  const loadAttendance = useCallback(async (force = false) => {
    if (!doctorId) return;
    if (loadingTabsState.attendance && !force) return;

    setLoadingTabsState(prev => ({ ...prev, attendance: true }));

    try {
      const attendanceRes = await doctorService.getAttendanceSummary(doctorId);
      setAttendanceSummary(attendanceRes.data?.data || []);
    } catch (error) {
      console.error('[useDoctorDashboard] Erro ao carregar frequência:', error);
      toast.error('Erro ao carregar frequência');
    } finally {
      setLoadingTabsState(prev => ({ ...prev, attendance: false }));
    }
  }, [doctorId, loadingTabsState.attendance]);

  // 🎯 Carrega dados da aba Patients (lista completa com paginação)
  const loadPatients = useCallback(async (force = false, page?: number, search?: string) => {
    if (!doctorId) return;
    if (loadingTabsState.patients && !force) return;

    setLoadingTabsState(prev => ({ ...prev, patients: true }));

    try {
      const currentPage = page || patientsPagination.page;
      const currentSearch = search !== undefined ? search : patientsPagination.search;
      const patientsRes = await fetchPatients({
        page: currentPage,
        limit: patientsPagination.limit,
        search: currentSearch
      });
      // Backend retorna { data, meta } ou array direto
      const patientList = Array.isArray(patientsRes) ? patientsRes : (patientsRes?.data || []);
      const meta = patientsRes?.meta || {};
      setOverviewData(prev => ({ ...prev, patients: patientList }));
      setPatientsPagination(prev => ({
        ...prev,
        page: meta.page || currentPage,
        total: meta.total || patientList.length,
        totalPages: meta.totalPages || 1,
        search: currentSearch
      }));
    } catch (error) {
      console.error('[useDoctorDashboard] Erro ao carregar pacientes:', error);
      toast.error('Erro ao carregar pacientes');
    } finally {
      setLoadingTabsState(prev => ({ ...prev, patients: false }));
    }
  }, [doctorId, loadingTabsState.patients]);

  // Admin: carrega lista de médicos
  const fetchDoctors = useCallback(async () => {
    if (isDoctor) {
      toast.error('Apenas administradores podem listar todos profissionais');
      return;
    }
    try {
      const response = await doctorService.getAllDoctors();
      setDoctors(response.data);
    } catch (error) {
      toast.error('Erro ao atualizar lista de profissionais');
    }
  }, [isDoctor]);

  // Admin: carrega overview
  const loadAdminData = useCallback(async () => {
    if (isDoctor) return;
    try {
      const [doctorsRes, totalDoctorsRes, doctorOverviewRes] = await Promise.all([
        doctorService.getAllDoctors(),
        doctorService.getTotalDoctors(),
        doctorService.getDoctorOverview()
      ]);

      setDoctors(doctorsRes.data);
      setTotalDoctors(totalDoctorsRes.totalDoctors);
      setDoctorOverview(doctorOverviewRes);
    } catch (error) {
      toast.error('Erro ao carregar dados administrativos');
    }
  }, [isDoctor]);

  const handleUpdateStatus = useCallback(async (appointmentId: string, status: string) => {
    try {
      await updateClinicalStatus(appointmentId, status);
      // Recarrega dados relevantes
      const todayRes = await fetchTodaysAppointments(doctorId || '');
      setOverviewData(prev => ({ ...prev, appointments: todayRes || [] }));
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  }, [doctorId]);

  const handleCompleteSession = useCallback(async (sessionId: string) => {
    try {
      const updated = await doctorService.completeTherapySession(sessionId);
      toast.success('Sessão marcada como concluída!');
      setTherapySessions(prev =>
        prev.map(s => s._id === sessionId ? { ...s, status: "completed" } : s)
      );
      return updated;
    } catch (err) {
      toast.error('Erro ao completar sessão');
      throw err;
    }
  }, []);

  const createDoctor = useCallback(async (doctor: any) => {
    if (isDoctor) {
      toast.error('Apenas administradores podem criar profissionais');
      throw new Error('Unauthorized');
    }
    try {
      await doctorService.createDoctor(doctor);
      const allDoctors = await doctorService.getAllDoctors();
      setDoctors(allDoctors.data);
      toast.success('Profissional criado com sucesso!');
    } catch (error: any) {
      toast.error(extractErrorMessage(error, "Erro ao criar profissional"));
      throw error;
    }
  }, [isDoctor]);

  const updateDoctor = useCallback(async (doctor: any) => {
    if (!doctor._id) throw new Error("ID do profissional é obrigatório");
    if (isDoctor) {
      toast.error('Apenas administradores podem atualizar profissionais');
      throw new Error('Unauthorized');
    }
    try {
      await doctorService.updateDoctor(doctor._id, doctor);
      const allDoctors = await doctorService.getAllDoctors();
      setDoctors(allDoctors.data);
      toast.success('Profissional atualizado com sucesso!');
    } catch (error: any) {
      toast.error(extractErrorMessage(error, "Erro ao atualizar profissional"));
      throw error;
    }
  }, [isDoctor]);

  // Força refresh de uma aba específica
  const refreshTab = useCallback((tab: string) => {
    switch (tab) {
      case 'overview': loadOverview(true); break;
      case 'appointments': loadAppointments(true); break;
      case 'therapy': loadTherapy(true); break;
      case 'attendance': loadAttendance(true); break;
      case 'patients': loadPatients(true); break;
    }
  }, [loadOverview, loadAppointments, loadTherapy, loadAttendance, loadPatients]);

  return {
    // Dados do médico
    doctorData,
    doctorId,
    userRole,
    isDoctor,
    
    // Dados por aba
    patients: overviewData.patients,
    appointments: overviewData.appointments,
    stats: overviewData.stats,
    futureAppointments: overviewData.futureAppointments,
    calendarEvents,
    therapySessions,
    attendanceSummary,

    // Admin data
    doctors,
    totalDoctors,
    doctorOverview,

    // Loading por aba
    loading: loadingTabsState,

    // Paginação de pacientes
    patientsPagination,
    setPatientsPagination,

    // Funções de carregamento lazy
    loadOverview,
    loadAppointments,
    loadTherapy,
    loadAttendance,
    loadPatients,
    loadAdminData,

    // Ações
    handleUpdateStatus,
    handleCompleteSession,
    createDoctor,
    updateDoctor,
    fetchDoctors,
    refreshTab
  };
}
