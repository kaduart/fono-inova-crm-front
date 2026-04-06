/**
 * 🚀 Hook useDashboardV2 - Dashboard Event-Driven
 * 
 * Hook consolidado para dados do dashboard usando API V2.
 * Substitui useDashboard legado com:
 * - Endpoints V2 otimizados
 * - Cache inteligente
 * - Dados financeiros em tempo real
 * 
 * Uso:
 * const { overview, financial, stats, loading, refresh } = useDashboardV2();
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DashboardStatsV2,
  DashboardChartsV2,
  DoctorOverviewV2,
  UpcomingAppointmentV2,
  FinancialOverviewV2,
  QuickStatsResponse,
  dashboardServiceV2
} from '../services/dashboardService.v2';
import { 
  subscribeToCacheInvalidation, 
  invalidateCache as invalidateGlobalCache,
  isCacheValid,
  getCache,
  setCache
} from '../utils/cacheManager';

// ============================================
// TYPES
// ============================================

interface UseDashboardV2Return {
  // Dados principais
  overview: {
    stats: DashboardStatsV2 | null;
    charts: DashboardChartsV2 | null;
    doctorsOverview: DoctorOverviewV2[];
    upcomingAppointments: UpcomingAppointmentV2[];
    generatedAt: string | null;
  } | null;
  
  // Dados financeiros V2
  financial: FinancialOverviewV2 | null;
  
  // Quick stats (cards)
  quickStats: QuickStatsResponse['data'] | null;
  
  // Estados
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  // Ações
  refresh: () => Promise<void>;
  invalidateCache: () => Promise<void>;
  refreshFinancial: (params?: { date?: string; period?: 'day' | 'week' | 'month' | 'year' }) => Promise<void>;
}

// ============================================
// CACHE KEYS
// ============================================

const CACHE_KEY_DASHBOARD = 'dashboardV2';
const CACHE_KEY_FINANCIAL = 'financialV2';

// ============================================
// HOOK
// ============================================

export const useDashboardV2 = (): UseDashboardV2Return => {
  // Estados
  const [overview, setOverview] = useState<UseDashboardV2Return['overview']>(
    getCache(CACHE_KEY_DASHBOARD) || null
  );
  const [financial, setFinancial] = useState<FinancialOverviewV2 | null>(
    getCache(CACHE_KEY_FINANCIAL) || null
  );
  const [quickStats, setQuickStats] = useState<QuickStatsResponse['data'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(
    getCache(CACHE_KEY_DASHBOARD) ? new Date() : null
  );

  // Refs
  const isMounted = useRef(true);
  const isInitialLoad = useRef(true);
  const loadPromiseRef = useRef<Promise<void> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ==========================================
  // LOAD FUNCTIONS
  // ==========================================

  /**
   * 🔄 Carrega visão geral do dashboard
   */
  const loadOverview = useCallback(async (forceRefresh = false) => {
    // Verificar cache global
    if (!forceRefresh && isCacheValid(CACHE_KEY_DASHBOARD)) {
      const cached = getCache<UseDashboardV2Return['overview']>(CACHE_KEY_DASHBOARD);
      if (cached && isMounted.current) {
        console.log('📦 useDashboardV2: Usando cache overview');
        setOverview(cached);
        return;
      }
    }

    // Se já está carregando, esperar
    if (loadPromiseRef.current) {
      await loadPromiseRef.current;
      return;
    }

    const loadPromise = (async () => {
      try {
        const data = await dashboardServiceV2.fetchOverview(forceRefresh);

        if (isMounted.current) {
          const overviewData = {
            stats: data.stats,
            charts: data.charts,
            doctorsOverview: data.doctorsOverview,
            upcomingAppointments: data.upcomingAppointments,
            generatedAt: data.generatedAt
          };
          
          setOverview(overviewData);
          setCache(CACHE_KEY_DASHBOARD, overviewData);
        }
      } catch (err: any) {
        console.error('❌ useDashboardV2: Erro ao carregar overview:', err);
        if (isMounted.current) {
          setError(err.message || 'Erro ao carregar dashboard');
        }
      }
    })();

    loadPromiseRef.current = loadPromise;
    await loadPromise;
    loadPromiseRef.current = null;
  }, []);

  /**
   * 💰 Car dados financeiros V2
   */
  const loadFinancial = useCallback(async (
    params?: { date?: string; period?: 'day' | 'week' | 'month' | 'year' }
  ) => {
    try {
      // Cancela requisição anterior
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const data = await dashboardServiceV2.fetchFinancialOverview(params);

      if (isMounted.current) {
        setFinancial(data);
        setCache(CACHE_KEY_FINANCIAL, data);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('❌ useDashboardV2: Erro ao carregar financial:', err);
    }
  }, []);

  /**
   * 📊 Carrega quick stats
   */
  const loadQuickStats = useCallback(async () => {
    try {
      const data = await dashboardServiceV2.fetchQuickStats();
      if (isMounted.current) {
        setQuickStats(data);
      }
    } catch (err: any) {
      console.error('❌ useDashboardV2: Erro ao carregar quick stats:', err);
    }
  }, []);

  /**
   * 🔄 Carrega todos os dados
   */
  const loadAll = useCallback(async (forceRefresh = false) => {
    if (isMounted.current) setLoading(true);
    setError(null);

    try {
      await Promise.all([
        loadOverview(forceRefresh),
        loadFinancial({ period: 'month' }),
        loadQuickStats()
      ]);

      if (isMounted.current) {
        setLastUpdated(new Date());
      }
    } catch (err: any) {
      console.error('❌ useDashboardV2: Erro ao carregar dados:', err);
      if (isMounted.current) {
        setError(err.message || 'Erro ao carregar dados');
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [loadOverview, loadFinancial, loadQuickStats]);

  // ==========================================
  // PUBLIC ACTIONS
  // ==========================================

  /**
   * 🔄 Força atualização de todos os dados
   */
  const refresh = useCallback(async () => {
    await loadAll(true);
  }, [loadAll]);

  /**
   * 🗑️ Invalida cache no backend e local
   */
  const handleInvalidateCache = useCallback(async () => {
    try {
      await dashboardServiceV2.invalidateCache();
      invalidateGlobalCache(CACHE_KEY_DASHBOARD);
      invalidateGlobalCache(CACHE_KEY_FINANCIAL);
      await loadAll(true);
    } catch (err) {
      console.error('❌ useDashboardV2: Erro ao invalidar cache:', err);
    }
  }, [loadAll]);

  /**
   * 💰 Atualiza apenas dados financeiros
   */
  const refreshFinancial = useCallback(async (
    params?: { date?: string; period?: 'day' | 'week' | 'month' | 'year' }
  ) => {
    await loadFinancial(params);
  }, [loadFinancial]);

  // ==========================================
  // EFFECTS
  // ==========================================

  // Subscribe para invalidação de cache externa
  useEffect(() => {
    const unsubscribe = subscribeToCacheInvalidation(CACHE_KEY_DASHBOARD, () => {
      console.log('🔄 useDashboardV2: Cache invalidado externamente');
      loadAll(true);
    });

    return () => unsubscribe();
  }, [loadAll]);

  // Carregamento inicial
  useEffect(() => {
    isMounted.current = true;

    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      loadAll();
    }

    return () => {
      isMounted.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadAll]);

  // ==========================================
  // RETURN
  // ==========================================

  return {
    overview,
    financial,
    quickStats,
    loading,
    error,
    lastUpdated,
    refresh,
    invalidateCache: handleInvalidateCache,
    refreshFinancial
  };
};

// ============================================
// HOOKS ESPECIALIZADOS
// ============================================

/**
 * 📊 Hook apenas para estatísticas rápidas
 */
export const useDashboardQuickStats = () => {
  const [stats, setStats] = useState<QuickStatsResponse['data'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dashboardServiceV2.fetchQuickStats();
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
 * 💰 Hook apenas para dados financeiros
 */
export const useFinancialOverview = (params?: {
  date?: string;
  period?: 'day' | 'week' | 'month' | 'year';
}) => {
  const [data, setData] = useState<FinancialOverviewV2 | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await dashboardServiceV2.fetchFinancialOverview(params);
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [params?.date, params?.period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
};

export default useDashboardV2;
