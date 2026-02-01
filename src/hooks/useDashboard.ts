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

// Cache global entre instâncias do hook
const globalCache = {
    overview: null as DashboardOverview | null,
    timestamp: 0,
    isLoading: false,
    promise: null as Promise<void> | null
};

const CACHE_DURATION = 3 * 60 * 1000; // 3 minutos

// Funções de debug expostas globalmente
if (typeof window !== 'undefined') {
    (window as any).clearUseDashboardCache = () => {
        globalCache.overview = null;
        globalCache.timestamp = 0;
        globalCache.isLoading = false;
        globalCache.promise = null;
        console.log('🧹 useDashboard cache limpo');
    };
    (window as any).getUseDashboardCache = () => ({
        hasData: !!globalCache.overview,
        timestamp: globalCache.timestamp,
        age: Date.now() - globalCache.timestamp,
        isLoading: globalCache.isLoading
    });
}

export const useDashboard = (): UseDashboardReturn => {
    // Estados locais
    const [overview, setOverview] = useState<DashboardOverview | null>(globalCache.overview);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [charts, setCharts] = useState<DashboardCharts | null>(null);
    const [doctors, setDoctors] = useState<DoctorOverview[]>([]);
    const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    
    // Refs para controle de mount e race conditions
    const isMounted = useRef(true);
    const isInitialLoad = useRef(true);

    /**
     * 🔄 Carrega dados do dashboard
     */
    const loadDashboard = useCallback(async (forceRefresh = false) => {
        const now = Date.now();

        // Verificar cache global
        if (!forceRefresh && globalCache.overview && (now - globalCache.timestamp < CACHE_DURATION)) {
            // ✅ CORREÇÃO: Verificar se o cache tem todos os dados necessários
            const hasCompleteData = globalCache.overview.upcomingAppointments !== undefined &&
                                   globalCache.overview.doctorsOverview !== undefined &&
                                   globalCache.overview.stats !== undefined;
            if (hasCompleteData) {
                console.log('📦 useDashboard: Usando cache global:', {
                    statsTotalPatients: globalCache.overview?.stats?.totalPatients,
                    doctorsCount: globalCache.overview?.doctorsOverview?.length,
                    upcomingAppointmentsCount: globalCache.overview?.upcomingAppointments?.length
                });
                if (isMounted.current) {
                    setOverview(globalCache.overview);
                    setStats(globalCache.overview.stats);
                    setCharts(globalCache.overview.charts);
                    setDoctors(globalCache.overview.doctorsOverview || []);
                    setUpcomingAppointments(globalCache.overview.upcomingAppointments || []);
                    setLastUpdated(new Date(globalCache.timestamp));
                }
                return;
            }
            // Se o cache está incompleto, continua para recarregar
            console.log('🔄 Cache incompleto, recarregando...');
        }

        // Se já está carregando, esperar
        if (globalCache.isLoading && globalCache.promise) {
            await globalCache.promise;
            if (isMounted.current && globalCache.overview) {
                setOverview(globalCache.overview);
                setStats(globalCache.overview.stats);
                setCharts(globalCache.overview.charts);
                setDoctors(globalCache.overview.doctorsOverview);
                setUpcomingAppointments(globalCache.overview.upcomingAppointments);
            }
            return;
        }

        // Iniciar carregamento
        globalCache.isLoading = true;
        if (isMounted.current) setLoading(true);
        setError(null);

        const loadPromise = (async () => {
            try {
                // 🎯 Uma única chamada para obter tudo!
                const data = await fetchDashboardOverview(forceRefresh);
                console.log('📊 Dashboard data received:', {
                    hasStats: !!data?.stats,
                    hasCharts: !!data?.charts,
                    doctorsCount: data?.doctorsOverview?.length || 0,
                    upcomingAppointmentsCount: data?.upcomingAppointments?.length || 0
                });
                
                if (isMounted.current) {
                    setOverview(data);
                    setStats(data.stats);
                    setCharts(data.charts);
                    setDoctors(data.doctorsOverview || []);
                    setUpcomingAppointments(data.upcomingAppointments || []);
                    setLastUpdated(new Date());
                    
                    console.log('✅ Estados atualizados no useDashboard');
                }

                // Atualizar cache global
                globalCache.overview = data;
                globalCache.timestamp = Date.now();
            } catch (err: any) {
                console.error('Erro ao carregar dashboard:', err);
                if (isMounted.current) {
                    setError(err.message || 'Erro ao carregar dados do dashboard');
                }
            } finally {
                globalCache.isLoading = false;
                if (isMounted.current) setLoading(false);
            }
        })();

        globalCache.promise = loadPromise;
        await loadPromise;
        globalCache.promise = null;
    }, []);

    /**
     * 🔄 Força atualização dos dados
     */
    const refresh = useCallback(async () => {
        globalCache.timestamp = 0; // Invalidar cache
        await loadDashboard(true);
    }, [loadDashboard]);

    /**
     * 🗑️ Invalida cache no backend e local
     */
    const handleInvalidateCache = useCallback(async () => {
        try {
            await invalidateDashboardCache();
            globalCache.timestamp = 0;
            globalCache.overview = null;
            await loadDashboard(true);
        } catch (err) {
            console.error('Erro ao invalidar cache:', err);
        }
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
