/**
 * 🚀 Hook useDashboard - Dados Otimizados do Dashboard
 * 
 * Hook consolidado que substitui múltiplos hooks (usePatients, useAdmin parcialmente)
 * com uma única chamada de API e cache inteligente.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    DashboardCharts,
    DashboardOverview,
    DashboardStats,
    DoctorOverview,
    fetchDashboardCharts,
    fetchDashboardOverview,
    fetchDashboardStats,
    fetchDoctorsOverview,
    invalidateDashboardCache,
    UpcomingAppointment
} from '../services/dashboardService';
import { 
  subscribeToCacheInvalidation, 
  invalidateCache as invalidateGlobalCache,
  isCacheValid,
  getCache,
  setCache
} from '../utils/cacheManager';

interface UseDashboardReturn {
    // Dados
    overview: DashboardOverview | null;
    stats: DashboardStats | null;
    charts: DashboardCharts | null;
    doctors: DoctorOverview[];
    upcomingAppointments: UpcomingAppointment[];

    // Estados
    loading: boolean;
    error: string | null;
    lastUpdated: Date | null;

    // Ações
    refresh: () => Promise<void>;
    invalidateCache: () => Promise<void>;
}

export const useDashboard = (): UseDashboardReturn => {
    // Estados locais
    const [overview, setOverview] = useState<DashboardOverview | null>(getCache('dashboard'));
    const [stats, setStats] = useState<DashboardStats | null>(getCache('dashboard')?.stats || null);
    const [charts, setCharts] = useState<DashboardCharts | null>(getCache('dashboard')?.charts || null);
    const [doctors, setDoctors] = useState<DoctorOverview[]>(getCache('dashboard')?.doctorsOverview || []);
    const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>(getCache('dashboard')?.upcomingAppointments || []);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(
      getCache('dashboard') ? new Date() : null
    );

    // Refs para controle de mount e race conditions
    const isMounted = useRef(true);
    const isInitialLoad = useRef(true);
    const loadPromiseRef = useRef<Promise<void> | null>(null);

    /**
     * 🔄 Carrega dados do dashboard
     */
    const loadDashboard = useCallback(async (forceRefresh = false) => {
        // Verificar cache global
        if (!forceRefresh && isCacheValid('dashboard')) {
            const cached = getCache<DashboardOverview>('dashboard');
            if (cached) {
                console.log('📦 useDashboard: Usando cache:', {
                    statsTotalPatients: cached?.stats?.totalPatients,
                    doctorsCount: cached?.doctorsOverview?.length,
                    upcomingAppointmentsCount: cached?.upcomingAppointments?.length
                });
                if (isMounted.current) {
                    setOverview(cached);
                    setStats(cached.stats);
                    setCharts(cached.charts);
                    setDoctors(cached.doctorsOverview || []);
                    setUpcomingAppointments(cached.upcomingAppointments || []);
                    setLastUpdated(new Date());
                }
                return;
            }
        }

        // Se já está carregando, esperar
        if (loadPromiseRef.current) {
            await loadPromiseRef.current;
            return;
        }

        // Iniciar carregamento
        if (isMounted.current) setLoading(true);
        setError(null);

        const loadPromise = (async () => {
            try {
                // 🎯 Uma única chamada para obter tudo!
                const data = await fetchDashboardOverview(forceRefresh);

                if (isMounted.current) {
                    setOverview(data);
                    setStats(data.stats);
                    setCharts(data.charts);
                    setDoctors(data.doctorsOverview || []);
                    setUpcomingAppointments(data.upcomingAppointments || []);
                    setLastUpdated(new Date());
                }

                // Atualizar cache global
                setCache('dashboard', data);
            } catch (err: any) {
                console.error('Erro ao carregar dashboard:', err);
                if (isMounted.current) {
                    setError(err.message || 'Erro ao carregar dados do dashboard');
                }
            } finally {
                if (isMounted.current) setLoading(false);
                loadPromiseRef.current = null;
            }
        })();

        loadPromiseRef.current = loadPromise;
        await loadPromise;
    }, []);

    /**
     * 🔄 Força atualização dos dados
     */
    const refresh = useCallback(async () => {
        await loadDashboard(true);
    }, [loadDashboard]);

    /**
     * 🗑️ Invalida cache no backend e local
     */
    const handleInvalidateCache = useCallback(async () => {
        try {
            await invalidateDashboardCache();
            invalidateGlobalCache('dashboard');
            await loadDashboard(true);
        } catch (err) {
            console.error('Erro ao invalidar cache:', err);
        }
    }, [loadDashboard]);

    // 🔔 Subscribe para invalidação de cache externa
    useEffect(() => {
        const unsubscribe = subscribeToCacheInvalidation('dashboard', () => {
            console.log('🔄 useDashboard: Cache invalidado externamente, recarregando...');
            loadDashboard(true);
        });

        return () => unsubscribe();
    }, [loadDashboard]);

    // Efeito inicial de carregamento
    useEffect(() => {
        isMounted.current = true;

        if (isInitialLoad.current) {
            isInitialLoad.current = false;
            loadDashboard();
        }

        return () => {
            isMounted.current = false;
        };
    }, [loadDashboard]);

    // Retornar dados derivados
    return {
        overview,
        stats,
        charts,
        doctors,
        upcomingAppointments,
        loading,
        error,
        lastUpdated,
        refresh,
        invalidateCache: handleInvalidateCache
    };
};

/**
 * 📊 Hook simplificado apenas para estatísticas
 */
export const useDashboardStats = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchDashboardStats();
            setStats(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    return { stats, loading, error, refresh: fetchStats };
};

/**
 * 📈 Hook simplificado apenas para gráficos
 */
export const useDashboardCharts = () => {
    const [charts, setCharts] = useState<DashboardCharts | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchCharts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchDashboardCharts();
            setCharts(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCharts();
    }, [fetchCharts]);

    return { charts, loading, error, refresh: fetchCharts };
};

/**
 * 👥 Hook para visão dos profissionais
 */
export const useDoctorsOverview = () => {
    const [doctors, setDoctors] = useState<DoctorOverview[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDoctors = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchDoctorsOverview();
            setDoctors(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDoctors();
    }, [fetchDoctors]);

    return { doctors, loading, error, refresh: fetchDoctors };
};
