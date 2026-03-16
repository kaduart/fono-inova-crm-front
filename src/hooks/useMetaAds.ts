/**
 * 🎯 useMetaAds Hook
 * Gerenciamento de estado para Meta Ads no dashboard
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import { metaAdsApi, Campaign, AggregatedMetrics, SpecialtyMetrics, LeadWithTracking } from '../services/metaAdsApi';

export type FilterPeriod = '7d' | '30d' | 'this_month' | 'all';

export interface UseMetaAdsReturn {
  // Dados
  campaigns: Campaign[];
  metrics: AggregatedMetrics | null;
  specialties: SpecialtyMetrics[];
  leads: LeadWithTracking[];
  
  // Estado
  loading: boolean;
  syncing: boolean;
  error: string | null;
  hasLoaded: boolean;
  
  // Paginação
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  
  // Filtros
  selectedSpecialty: string;
  selectedPeriod: FilterPeriod;
  setSelectedSpecialty: (specialty: string) => void;
  setSelectedPeriod: (period: FilterPeriod) => void;
  
  // Ações
  load: (page?: number) => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  sync: () => Promise<void>;
  
  // Dados calculados
  filteredCampaigns: Campaign[];
  totalSpend: number;
  totalLeads: number;
  avgCPL: number | null;
}

const SPECIALTIES = [
  { value: '', label: 'Todas Especialidades' },
  { value: 'psicologia', label: 'Psicologia' },
  { value: 'fono', label: 'Fonoaudiologia' },
  { value: 'fisio', label: 'Fisioterapia' },
  { value: 'neuropsicologia', label: 'Neuropsicologia' },
  { value: 'psicopedagogia', label: 'Psicopedagogia' },
];

const PERIODS = [
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: 'this_month', label: 'Este mês' },
  { value: 'all', label: 'Todo período' },
];

export function useMetaAds(options?: { lazy?: boolean }): UseMetaAdsReturn {
  const lazy = options?.lazy ?? true; // Por padrão, lazy loading ativado
  
  // Estados
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [metrics, setMetrics] = useState<AggregatedMetrics | null>(null);
  const [specialties, setSpecialties] = useState<SpecialtyMetrics[]>([]);
  const [leads, setLeads] = useState<LeadWithTracking[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false); // Controle de lazy loading
  
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<FilterPeriod>('30d');

  // Estados de paginação
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    hasMore: false
  });

  /**
   * Busca dados com paginação
   */
  const fetchData = useCallback(async (forceRefresh = false, page = 1, limit = 20) => {
    setLoading(true);
    setError(null);
    
    try {
      const [campaignsData, metricsData, specialtiesData] = await Promise.all([
        metaAdsApi.getCampaigns({ 
          specialty: selectedSpecialty,
          refresh: forceRefresh,
          page,
          limit
        }),
        metaAdsApi.getInsights(),
        metaAdsApi.getBySpecialty()
      ]);
      
      setCampaigns(campaignsData.campaigns || campaignsData);
      setMetrics(metricsData);
      setSpecialties(specialtiesData);
      setPagination(campaignsData.pagination || { page: 1, limit: 20, total: campaignsData.length || 0, totalPages: 1, hasMore: false });
      setHasLoaded(true);
      
    } catch (err: any) {
      console.error('Erro ao buscar dados Meta Ads:', err);
      setError(err.message || 'Erro ao carregar dados');
      toast.error('Erro ao carregar dados do Meta Ads');
    } finally {
      setLoading(false);
    }
  }, [selectedSpecialty]);
  
  /**
   * Carrega dados manualmente (para lazy loading)
   */
  const load = useCallback(async (page = 1) => {
    if (!hasLoaded || campaigns.length === 0 || page > 1) {
      await fetchData(false, page);
    }
  }, [fetchData, hasLoaded, campaigns.length]);

  /**
   * Carrega mais dados (próxima página)
   */
  const loadMore = useCallback(async () => {
    if (pagination.hasMore && !loading) {
      await fetchData(false, pagination.page + 1);
    }
  }, [fetchData, pagination.hasMore, pagination.page, loading]);

  /**
   * Sincroniza com Meta API
   */
  const sync = useCallback(async () => {
    setSyncing(true);
    
    try {
      toast.info('Sincronizando com Meta Ads...');
      const result = await metaAdsApi.sync();
      
      if (result.success) {
        toast.success(`Sincronizado! ${result.synced} campanhas atualizadas`);
        await fetchData(true);  // Recarrega dados
      } else {
        toast.error('Erro na sincronização');
      }
    } catch (err: any) {
      console.error('Erro na sincronização:', err);
      toast.error('Erro ao sincronizar com Meta');
    } finally {
      setSyncing(false);
    }
  }, [fetchData]);

  /**
   * Recarrega dados
   */
  const refresh = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  // Carrega dados iniciais apenas se não estiver em modo lazy
  useEffect(() => {
    if (!lazy) {
      fetchData();
    }
  }, [fetchData, lazy]);

  /**
   * Campanhas filtradas por período
   */
  const filteredCampaigns = useMemo(() => {
    // Aqui poderíamos filtrar por data se tivéssemos histórico
    // Por enquanto retorna todas
    return campaigns;
  }, [campaigns]);

  /**
   * Métricas calculadas
   */
  const { totalSpend, totalLeads, avgCPL } = useMemo(() => {
    const spend = campaigns.reduce((acc, camp) => acc + (camp.insights?.spend || 0), 0);
    const leads = campaigns.reduce((acc, camp) => acc + camp.leadsCount, 0);
    const cpl = leads > 0 ? spend / leads : null;
    
    return {
      totalSpend: spend,
      totalLeads: leads,
      avgCPL: cpl
    };
  }, [campaigns]);

  return {
    // Dados
    campaigns,
    metrics,
    specialties,
    leads,
    
    // Estado
    loading,
    syncing,
    error,
    hasLoaded,
    
    // Paginação
    pagination,
    
    // Filtros
    selectedSpecialty,
    selectedPeriod,
    setSelectedSpecialty,
    setSelectedPeriod,
    
    // Ações
    load,
    loadMore,
    refresh,
    sync,
    
    // Calculados
    filteredCampaigns,
    totalSpend,
    totalLeads,
    avgCPL,
  };
}

export { SPECIALTIES, PERIODS };
export default useMetaAds;
