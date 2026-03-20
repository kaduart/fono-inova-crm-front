// src/hooks/useDoctorDashboard.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import API from '../services/api';
import {
  doctorService,
  fetchFutureAppointments,
  fetchPatients,
  fetchStats,
  fetchTherapySessions,
  fetchTodaysAppointments,
  updateClinicalStatus
} from '../services/doctorService';
import { Appointment } from '../utils/types';
import { IPatient } from '../utils/types/types';

import {
  subscribeToCacheInvalidation,
  invalidateCache,
  isCacheValid,
  getCache,
  setCache
} from '../utils/cacheManager';

// Cache local para controle de loading
const localCache = {
  isLoading: false,
  promise: null as Promise<void> | null
};

/**
 * @deprecated Este hook será substituído por useDoctorList e useDoctorStats
 * Mantido para compatibilidade com código existente
 * @see useDoctorList - Para lista de médicos
 * @see useDoctorStats - Para estatísticas
 */
interface UseDoctorDashboardOptions {
  skipCache?: boolean;
}

export default function useDoctorDashboard(options: UseDoctorDashboardOptions = {}) {
  // 🎯 Verifica se o usuário é médico antes de carregar qualquer coisa
  const [userRole, setUserRole] = useState<string | null>(null);
  
  useEffect(() => {
    const storedRole = localStorage.getItem('userRole');
    console.log('👤 useDoctorDashboard: Role lido do localStorage:', storedRole);
    if (storedRole) {
      try {
        setUserRole(JSON.parse(storedRole));
      } catch {
        setUserRole(storedRole);
      }
    } else {
      // Se não tiver role, tenta usar 'doctor' como fallback
      console.log('⚠️ useDoctorDashboard: Role não encontrado, usando fallback');
      setUserRole('doctor');
    }
  }, []);
  
  const isDoctor = userRole === 'doctor';
  
  const cachedData = getCache<any>('doctors');
  
  const [loading, setLoading] = useState(!cachedData && isDoctor);
  const [doctorData, setDoctorData] = useState<any>(cachedData?.doctorData || null);
  const [patients, setPatients] = useState<IPatient[]>(cachedData?.patients || []);
  const [appointments, setAppointments] = useState<Appointment[]>(cachedData?.appointments || []);
  const [therapySessions, setTherapySessions] = useState<any[]>(cachedData?.therapySessions || []);
  const [stats, setStats] = useState<any>(cachedData?.stats || {
    today: 0,
    confirmed: 0,
    totalPatients: 0,
    specialties: {}
  });
  const [futureAppointments, setFutureAppointments] = useState<Appointment[]>(cachedData?.futureAppointments || []);
  const [totalDoctors, setTotalDoctors] = useState<number>(cachedData?.totalDoctors || 0);
  const [doctorOverview, setDoctorOverview] = useState<any>(cachedData?.doctorOverview || null);
  const [doctors, setDoctors] = useState<any[]>(cachedData?.doctors || []);
  const [calendarEvents, setCalendarEvents] = useState<any[]>(cachedData?.calendarEvents || []);
  const [attendanceSummary, setAttendanceSummary] = useState<any[]>(cachedData?.attendanceSummary || []);

  const isMounted = useRef(true);

  // ✅ CORREÇÃO: Usar ref para evitar stale closure sem causar re-renderizações
  const isDoctorRef = useRef(isDoctor);
  isDoctorRef.current = isDoctor;
  
  const { skipCache = false } = options;

  const loadData = useCallback(async (forceRefresh = false) => {
    // 🚀 Verifica cache (se skipCache for true, ignora)
    if (!skipCache && !forceRefresh && isCacheValid('doctors')) {
      const cached = getCache<any>('doctors');
      if (cached) {
        console.log('📦 useDoctorDashboard: Usando cache');
        if (isMounted.current) {
          setDoctorData(cached.doctorData);
          setPatients(cached.patients);
          setAppointments(cached.appointments);
          setTherapySessions(cached.therapySessions);
          setStats(cached.stats);
          setCalendarEvents(cached.calendarEvents);
          setFutureAppointments(cached.futureAppointments);
          setDoctors(cached.doctors);
          setTotalDoctors(cached.totalDoctors);
          setDoctorOverview(cached.doctorOverview);
          setAttendanceSummary(cached.attendanceSummary);
        }
        return;
      }
    }

    // 🚀 Se já está carregando, espera
    if (localCache.isLoading && localCache.promise) {
      await localCache.promise;
      return;
    }

    localCache.isLoading = true;
    if (isMounted.current) setLoading(true);

    const loadPromise = (async () => {
      try {
        console.log('🔄 useDoctorDashboard: Iniciando carregamento de dados...');
        
        // ✅ Otimizado: Primeira leva de chamadas (COMUNS a todos os usuários)
        const [doctorRes, patientsRes, appointmentsRes, sessionsRes, statsRes] = await Promise.all([
          API.get('/users/me'),
          fetchPatients(),
          fetchTodaysAppointments(),
          fetchTherapySessions(),
          fetchStats()
        ]);

        console.log('✅ useDoctorDashboard: Dados carregados:', {
          doctor: doctorRes.data?._id,
          patientsCount: patientsRes?.length,
          appointmentsCount: appointmentsRes?.length,
          sessionsCount: sessionsRes?.length,
          stats: statsRes
        });

        if (isMounted.current) {
          setDoctorData(doctorRes.data);
          setPatients(patientsRes || []);
          setAppointments(appointmentsRes || []);
          setTherapySessions(sessionsRes || []);
          setStats(statsRes || {});
        }

        let extendedData = {};
        if (doctorRes.data && doctorRes.data._id) {
          // ✅ Chamadas específicas para MÉDICOS (dados próprios)
          const [calendarData, futureApps, attendanceRes] = await Promise.all([
            doctorService.getAppointmentCalendarDoctor(doctorRes.data._id),
            fetchFutureAppointments(),
            doctorService.getAttendanceSummary(doctorRes.data._id)
          ]);

          if (isMounted.current) {
            setCalendarEvents(calendarData);
            setFutureAppointments(futureApps);
            setAttendanceSummary(attendanceRes.data?.data || []);
          }

          extendedData = {
            calendarEvents: calendarData,
            futureAppointments: futureApps,
            attendanceSummary: attendanceRes.data?.data || []
          };

          // 🔥 Só carrega dados de ADMIN se NÃO for médico (usa ref para evitar re-render)
          if (!isDoctorRef.current) {
            const [doctorsRes, totalDoctorsRes, doctorOverviewRes] = await Promise.all([
              doctorService.getAllDoctors(),
              doctorService.getTotalDoctors(),
              doctorService.getDoctorOverview()
            ]);

            if (isMounted.current) {
              setDoctors(doctorsRes.data);
              setTotalDoctors(totalDoctorsRes.totalDoctors);
              setDoctorOverview(doctorOverviewRes);
            }

            extendedData = {
              ...extendedData,
              doctors: doctorsRes.data,
              totalDoctors: totalDoctorsRes.totalDoctors,
              doctorOverview: doctorOverviewRes
            };
          }
        }

        // 🚀 Atualiza cache global
        setCache('doctors', {
          doctorData: doctorRes.data,
          patients: patientsRes,
          appointments: appointmentsRes,
          therapySessions: sessionsRes,
          stats: statsRes,
          ...extendedData
        });

      } catch (error) {
        toast.error('Erro ao carregar dados do dashboard');
        console.error('Erro no dashboard:', error);
      } finally {
        localCache.isLoading = false;
        if (isMounted.current) setLoading(false);
      }
    })();

    localCache.promise = loadPromise;
    await loadPromise;
    localCache.promise = null;
  }, [skipCache]); // 🔄 Inclui skipCache nas deps

  // ✅ CORREÇÃO: Controle de carregamento único (respeita skipCache)
  const hasLoadedRef = useRef(false);
  
  useEffect(() => {
    isMounted.current = true;
    
    // 🚀 Reseta o localCache se estiver preso (prevenção de deadlock)
    if (skipCache) {
      localCache.isLoading = false;
      localCache.promise = null;
    }
    
    // 🚀 Carrega quando o role estiver definido (ou se skipCache for true, sempre recarrega)
    if (userRole !== null && (!hasLoadedRef.current || skipCache)) {
      hasLoadedRef.current = true;
      console.log('🚀 useDoctorDashboard: Carregando dados (role:', userRole + ', skipCache:', skipCache + ')');
      loadData(skipCache);
    }
    
    return () => {
      isMounted.current = false;
    };
  }, [loadData, userRole, skipCache]);

  // 🔔 Subscribe para invalidação de cache externa
  useEffect(() => {
    const unsubscribe = subscribeToCacheInvalidation('doctors', () => {
      console.log('🔄 useDoctorDashboard: Cache invalidado externamente, recarregando...');
      loadData(true);
    });

    return () => unsubscribe();
  }, [loadData]);

  const handleCompleteSession = async (sessionId: string) => {
    try {
      const updated = await doctorService.completeTherapySession(sessionId);
      toast.success('Sessão marcada como concluída!');

      setTherapySessions((prev) =>
        prev.map((s) =>
          s._id === sessionId ? { ...s, status: "completed" } : s
        )
      );

      return updated;
    } catch (err) {
      console.error("Erro ao completar sessão:", err);
      throw err;
    }
  };

  // ✅ NOVO: fetchDoctors otimizado (sem useEffect duplicado)
  const fetchDoctors = useCallback(async () => {
    // 🔒 Apenas admin pode listar todos médicos
    if (isDoctor) {
      toast.error('Apenas administradores podem listar todos profissionais');
      return;
    }
    try {
      const response = await doctorService.getAllDoctors();
      setDoctors(response.data);
    } catch (error) {
      toast.error('Erro ao atualizar lista de profissionais');
      console.error('Erro ao atualizar profissionais:', error);
    }
  }, [isDoctor]);

  const handleUpdateStatus = async (appointmentId: string, status: string) => {
    try {
      await updateClinicalStatus({ appointmentId, status });
      const response = await fetchTodaysAppointments();
      setAppointments(response);
      const newStats = await fetchStats();
      setStats(newStats);
    } catch (error) {
      toast.error('Erro ao atualizar status');
      console.error('Erro ao atualizar status:', error);
    }
  };

  // 🚀 Força refresh invalidando cache
  const refreshData = useCallback(async () => {
    invalidateCache('doctors');
    await loadData(true);
  }, [loadData]);

  const createDoctor = async (doctor: any) => {
    // 🔒 Apenas admin pode criar médicos
    if (isDoctor) {
      toast.error('Apenas administradores podem criar profissionais');
      throw new Error('Unauthorized');
    }
    setLoading(true);
    try {
      await doctorService.createDoctor(doctor);
      // 🚀 Invalida cache e propaga para hooks relacionados
      invalidateCache('doctors');
      const allDoctors = await doctorService.getAllDoctors();
      setDoctors(allDoctors.data);
      toast.success('Profissional criado com sucesso!');
    } catch (error: any) {
      console.error("Erro ao criar profissional:", error);
      toast.error(error.message || "Erro ao criar profissional");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateDoctor = async (doctor: any) => {
    if (!doctor._id) throw new Error("ID do profissional é obrigatório");
    // 🔒 Apenas admin pode atualizar outros médicos (médico pode atualizar si próprio via outra rota)
    if (isDoctor) {
      toast.error('Apenas administradores podem atualizar profissionais');
      throw new Error('Unauthorized');
    }
    setLoading(true);
    try {
      await doctorService.updateDoctor(doctor._id, doctor);
      // 🚀 Invalida cache e propaga para hooks relacionados
      invalidateCache('doctors');
      const allDoctors = await doctorService.getAllDoctors();
      setDoctors(allDoctors.data);
      toast.success('Profissional atualizado com sucesso!');
    } catch (error: any) {
      console.error("Erro ao atualizar profissional:", error);
      toast.error(error.message || "Erro ao atualizar profissional");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    doctorData,
    patients,
    appointments,
    therapySessions,
    stats,
    futureAppointments,

    // 🔥 novos retornos
    doctors,
    totalDoctors,
    doctorOverview,
    attendanceSummary,
    handleCompleteSession,
    handleUpdateStatus,
    refreshData, // 🚀 Agora invalida cache antes de recarregar
    createDoctor,
    fetchPatients,
    calendarEvents,
    updateDoctor,
    fetchDoctors // ✅ Mantido para compatibilidade
  };
}
