/**
 * @hook useDoctorStats
 * @description Hook especializado para estatísticas do profissional
 * @version 1.0.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import doctorService from '../services/doctorService';
import API from '../services/api';
import {
  subscribeToCacheInvalidation,
  invalidateCache as invalidateGlobalCache,
  isCacheValid,
  getCache,
  setCache
} from '../utils/cacheManager';

// Tipos
export interface DoctorStats {
  today: number;
  confirmed: number;
  totalPatients: number;
  specialties: Record<string, number>;
  clinical?: {
    pending: number;
    inProgress: number;
    completed: number;
    noShow: number;
  };
  operational?: {
    scheduled: number;
    confirmed: number;
    canceled: number;
    paid: number;
  };
}

export interface AttendanceSummary {
  patient: {
    _id: string;
    fullName: string;
  };
  total: number;
  attended: number;
  missed: number;
  canceled: number;
  pending: number;
  frequency: number;
  lastSession: string;
}

export interface DoctorOverview {
  totalDoctors: number;
  activeDoctors: number;
  inactiveDoctors: number;
  bySpecialty: Record<string, number>;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  extendedProps: {
    status: string;
    clinicalStatus: string;
    operationalStatus: string;
    specialty: string;
    reason: string;
    patient: any;
    doctor: any;
    time: string;
    date: string;
  };
}

interface UseDoctorStatsOptions {
  doctorId?: string;
  autoFetch?: boolean;
  onError?: (error: Error) => void;
}

interface UseDoctorStatsReturn {
  stats: DoctorStats | null;
  attendanceSummary: AttendanceSummary[];
  doctorOverview: DoctorOverview | null;
  calendarEvents: CalendarEvent[];
  totalDoctors: number;
  loadingStats: boolean;
  loadingAttendance: boolean;
  loadingOverview: boolean;
  loadingCalendar: boolean;
  loading: boolean;
  error: string | null;
  hasError: boolean;
  refreshStats: () => Promise<void>;
  refreshAttendance: () => Promise<void>;
  refreshOverview: () => Promise<void>;
  refreshCalendar: () => Promise<void>;
  refreshAll: () => Promise<void>;
  lastUpdated: Date | null;
}

/**
 * Hook para estatísticas do profissional
 */
export const useDoctorStats = (options: UseDoctorStatsOptions = {}): UseDoctorStatsReturn => {
  const { doctorId, autoFetch = true, onError } = options;
  
  const cachedData = getCache<any>('doctorStats');
  
  // Estados
  const [stats, setStats] = useState<DoctorStats | null>(cachedData?.stats || null);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary[]>(cachedData?.attendanceSummary || []);
  const [doctorOverview, setDoctorOverview] = useState<DoctorOverview | null>(cachedData?.doctorOverview || null);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(cachedData?.calendarEvents || []);
  const [totalDoctors, setTotalDoctors] = useState(cachedData?.totalDoctors || 0);
  
  // Loadings individuais
  const [loadingStats, setLoadingStats] = useState(!cachedData);
  const [loadingAttendance, setLoadingAttendance] = useState(!cachedData);
  const [loadingOverview, setLoadingOverview] = useState(!cachedData);
  const [loadingCalendar, setLoadingCalendar] = useState(!cachedData);
  
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(cachedData ? new Date() : null);
  
  // Refs
  const isMountedRef = useRef(true);
  const isLoadingRef = useRef(false);

  const loadAll = useCallback(async (forceRefresh = false) => {
    if (isLoadingRef.current) return;
    
    if (!forceRefresh && isCacheValid('doctorStats')) {
      console.log('📦 useDoctorStats: Usando cache');
      const cached = getCache<any>('doctorStats');
      if (cached && isMountedRef.current) {
        setStats(cached.stats);
        setAttendanceSummary(cached.attendanceSummary);
        setDoctorOverview(cached.doctorOverview);
        setCalendarEvents(cached.calendarEvents);
        setTotalDoctors(cached.totalDoctors);
      }
      return;
    }

    isLoadingRef.current = true;
    
    try {
      // Busca tudo em paralelo
      const [overviewRes, totalRes] = await Promise.all([
        doctorService.getDoctorOverview(),
        doctorService.getTotalDoctors()
      ]);

      if (isMountedRef.current) {
        setDoctorOverview(overviewRes);
        setStats(overviewRes.stats || null);
        setTotalDoctors(totalRes.totalDoctors);
      }

      // Busca dados específicos se tem doctorId
      if (doctorId) {
        const [attendanceRes, calendarData] = await Promise.all([
          doctorService.getAttendanceSummary(doctorId),
          doctorService.getAppointmentCalendarDoctor(doctorId)
        ]);

        if (isMountedRef.current) {
          setAttendanceSummary(attendanceRes.data?.data || []);
          setCalendarEvents(calendarData);
        }
      }

      // Salva no cache
      setCache('doctorStats', {
        stats: overviewRes.stats,
        attendanceSummary,
        doctorOverview: overviewRes,
        calendarEvents,
        totalDoctors: totalRes.totalDoctors
      });
      
      if (isMountedRef.current) {
        setLastUpdated(new Date());
      }
    } catch (err: any) {
      console.error('[useDoctorStats] Erro:', err);
      if (isMountedRef.current) {
        setError(err?.response?.data?.message || 'Erro ao carregar estatísticas');
        onError?.(err);
      }
    } finally {
      isLoadingRef.current = false;
      if (isMountedRef.current) {
        setLoadingStats(false);
        setLoadingAttendance(false);
        setLoadingOverview(false);
        setLoadingCalendar(false);
      }
    }
  }, [doctorId, attendanceSummary, calendarEvents, onError]);

  // Refresh individual (só marca loading específico)
  const refreshStats = useCallback(async () => {
    setLoadingStats(true);
    await loadAll(true);
  }, [loadAll]);

  const refreshAttendance = useCallback(async () => {
    if (!doctorId) return;
    setLoadingAttendance(true);
    try {
      const response = await doctorService.getAttendanceSummary(doctorId);
      setAttendanceSummary(response.data?.data || []);
    } finally {
      setLoadingAttendance(false);
    }
  }, [doctorId]);

  const refreshOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const [overviewRes, totalRes] = await Promise.all([
        doctorService.getDoctorOverview(),
        doctorService.getTotalDoctors()
      ]);
      setDoctorOverview(overviewRes);
      setStats(overviewRes.stats || null);
      setTotalDoctors(totalRes.totalDoctors);
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  const refreshCalendar = useCallback(async () => {
    if (!doctorId) return;
    setLoadingCalendar(true);
    try {
      const data = await doctorService.getAppointmentCalendarDoctor(doctorId);
      setCalendarEvents(data);
    } finally {
      setLoadingCalendar(false);
    }
  }, [doctorId]);

  const refreshAll = useCallback(async () => {
    invalidateGlobalCache('doctorStats');
    await loadAll(true);
  }, [loadAll]);

  // 🔔 Subscribe para invalidação de cache externa
  useEffect(() => {
    const unsubscribe = subscribeToCacheInvalidation('doctorStats', () => {
      console.log('🔄 useDoctorStats: Cache invalidado externamente');
      loadAll(true);
    });

    return () => unsubscribe();
  }, [loadAll]);

  // Efeito inicial
  useEffect(() => {
    isMountedRef.current = true;
    if (autoFetch) {
      loadAll();
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [autoFetch, loadAll]);

  const loading = loadingStats || loadingAttendance || loadingOverview || loadingCalendar;

  return {
    stats,
    attendanceSummary,
    doctorOverview,
    calendarEvents,
    totalDoctors,
    loadingStats,
    loadingAttendance,
    loadingOverview,
    loadingCalendar,
    loading,
    error,
    hasError: error !== null,
    refreshStats,
    refreshAttendance,
    refreshOverview,
    refreshCalendar,
    refreshAll,
    lastUpdated
  };
};

/**
 * Invalida cache de estatísticas
 */
export const invalidateDoctorStatsCache = (): void => {
  console.log('[useDoctorStats] Invalidando cache via cacheManager');
  invalidateGlobalCache('doctorStats');
};

export default useDoctorStats;
