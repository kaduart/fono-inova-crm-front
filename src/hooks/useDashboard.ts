/**
 * 🚀 Hook useDashboard — Dashboard Admin V2
 *
 * Hook consolidado com cache inteligente.
 * Fonte única: /v2/admin/dashboard/overview
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    DashboardCharts,
    DashboardOverview,
    DashboardStats,
    DoctorOverview,
    fetchDashboardOverview,
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
    overview: DashboardOverview | null;
    stats: DashboardStats | null;
    charts: DashboardCharts | null;
    doctors: DoctorOverview[];
    upcomingAppointments: UpcomingAppointment[];
    loading: boolean;
    error: string | null;
    lastUpdated: Date | null;
    refresh: () => Promise<void>;
    invalidateCache: () => Promise<void>;
}

// 🐛 FIX (2026-09-17): AdminDashboard chamava useDashboard() incondicionalmente,
// mesmo abrindo direto numa aba que não é a Dashboard (ex: Financeiro) — a busca de
// /v2/admin/dashboard/overview (a chamada mais pesada do carregamento inicial, ~1.3s)
// disparava sempre, competindo com as chamadas que a aba realmente aberta precisa.
// `enabled=false` só adia o fetch automático do mount — refresh()/invalidateCache()
// continuam funcionando normalmente quando chamados explicitamente (ex: depois de
// completar um agendamento em outra aba, pra manter o cache do Dashboard fresco).
export const useDashboard = (enabled: boolean = true): UseDashboardReturn => {
    const [overview, setOverview] = useState<DashboardOverview | null>(getCache('dashboard'));
    const [stats, setStats] = useState<DashboardStats | null>(getCache('dashboard')?.stats || null);
    const [charts, setCharts] = useState<DashboardCharts | null>(getCache('dashboard')?.charts || null);
    const [doctors, setDoctors] = useState<DoctorOverview[]>(Array.isArray(getCache('dashboard')?.doctorsOverview) ? getCache('dashboard')!.doctorsOverview : []);
    const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>(Array.isArray(getCache('dashboard')?.upcomingAppointments) ? getCache('dashboard')!.upcomingAppointments : []);
    const [loading, setLoading] = useState(!isCacheValid('dashboard'));
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(
        getCache('dashboard') ? new Date() : null
    );

    const isMounted = useRef(true);
    const isInitialLoad = useRef(true);
    const loadPromiseRef = useRef<Promise<void> | null>(null);

    const loadDashboard = useCallback(async (forceRefresh = false) => {
        console.log('🔄 useDashboard: loadDashboard chamado, forceRefresh=', forceRefresh);
        if (!forceRefresh && isCacheValid('dashboard')) {
            const cached = getCache<DashboardOverview>('dashboard');
            if (cached) {
                console.log('📦 useDashboard: Usando cache global');
                if (isMounted.current) {
                    setOverview(cached);
                    setStats(cached.stats || null);
                    setCharts(cached.charts || null);
                    setDoctors(Array.isArray(cached.doctorsOverview) ? cached.doctorsOverview : []);
                    setUpcomingAppointments(Array.isArray(cached.upcomingAppointments) ? cached.upcomingAppointments : []);
                    setLastUpdated(new Date());
                }
                return;
            }
        }

        if (loadPromiseRef.current) {
            await loadPromiseRef.current;
            return;
        }

        if (isMounted.current) setLoading(true);
        setError(null);

        const loadPromise = (async () => {
            try {
                // 🐛 FIX (2026-09-17): não pede mais 'doctors' aqui — o único consumidor
                // vivo deste hook (AdminDashboard.tsx) já busca médicos via
                // useDoctorsOverview() em paralelo, e como os dois efeitos disparam no
                // mesmo tick, sem essa exclusão o bloco 'doctors' era buscado da rede
                // DUAS VEZES (uma vez por cada hook) sempre que a aba Dashboard estava
                // ativa — nenhum dos dois via o cache do outro a tempo, porque nenhuma
                // resposta tinha voltado ainda quando o segundo pedido saía. `doctors`
                // deste hook fica sempre vazio agora (único outro leitor é
                // components/admin/tabs/DashboardTab.tsx, componente órfão — não é
                // importado/renderizado em lugar nenhum do app, confirmado por busca no
                // repo — então não há consumidor real afetado).
                const data = await fetchDashboardOverview(forceRefresh, ['stats', 'charts', 'upcoming']);
                console.log('📊 useDashboard: Dados recebidos:', {
                    hasStats: !!data.stats,
                    doctorsCount: Array.isArray(data.doctorsOverview) ? data.doctorsOverview.length : 'N/A',
                    upcomingCount: Array.isArray(data.upcomingAppointments) ? data.upcomingAppointments.length : 'N/A',
                    included: data.meta?.included
                });

                if (isMounted.current) {
                    setOverview(data);
                    setStats(data.stats || null);
                    setCharts(data.charts || null);
                    setDoctors(Array.isArray(data.doctorsOverview) ? data.doctorsOverview : []);
                    setUpcomingAppointments(Array.isArray(data.upcomingAppointments) ? data.upcomingAppointments : []);
                    setLastUpdated(new Date());
                }

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

    const refresh = useCallback(async () => {
        await loadDashboard(true);
    }, [loadDashboard]);

    const handleInvalidateCache = useCallback(async () => {
        try {
            await invalidateDashboardCache();
            invalidateGlobalCache('dashboard');
            await loadDashboard(true);
        } catch (err) {
            console.error('Erro ao invalidar cache:', err);
        }
    }, [loadDashboard]);

    useEffect(() => {
        const unsubscribe = subscribeToCacheInvalidation('dashboard', () => {
            console.log('🔄 useDashboard: Cache invalidado externamente, recarregando...');
            loadDashboard(true);
        });

        return () => unsubscribe();
    }, [loadDashboard]);

    useEffect(() => {
        isMounted.current = true;

        if (enabled && isInitialLoad.current) {
            isInitialLoad.current = false;
            loadDashboard();
        }

        return () => {
            isMounted.current = false;
        };
    }, [loadDashboard, enabled]);

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
            const data = await fetchDashboardOverview(false, ['stats']);
            setStats(data.stats || null);
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
            const data = await fetchDashboardOverview(false, ['charts']);
            setCharts(data.charts || null);
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

    // 🐛 FIX (2026-09-17): forceRefresh era sempre false — depois de uma mutação
    // real (inativar/reativar profissional), chamar refresh() podia só devolver
    // o cache de até 2 minutos atrás (TTL do bloco 'doctors'), em vez do dado
    // realmente atualizado. `refresh(true)` agora bypassa o cache de verdade.
    const fetchDoctors = useCallback(async (forceRefresh = false) => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchDashboardOverview(forceRefresh, ['doctors']);
            setDoctors(data.doctorsOverview || []);
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
