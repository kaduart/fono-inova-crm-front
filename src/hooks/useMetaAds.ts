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
  
  // Filtros
  selectedSpecialty: string;
  selectedPeriod: FilterPeriod;
  setSelectedSpecialty: (specialty: string) => void;
  setSelectedPeriod: (period: FilterPeriod) => void;
  
  // Ações
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

export function useMetaAds(): UseMetaAdsReturn {
  // Estados
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [metrics, setMetrics] = useState<AggregatedMetrics | null>(null);
  const [specialties, setSpecialties] = useState<SpecialtyMetrics[]>([]);
  const [leads, setLeads] = useState<LeadWithTracking[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<FilterPeriod>('30d');

  /**
   * Busca dados iniciais
   */
  const fetchData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const [campaignsData, metricsData, specialtiesData] = await Promise.all([
        metaAdsApi.getCampaigns({ 
          specialty: selectedSpecialty,
          refresh: forceRefresh 
        }),
        metaAdsApi.getInsights(),
        metaAdsApi.getBySpecialty()
      ]);
      
      setCampaigns(campaignsData);
      setMetrics(metricsData);
      setSpecialties(specialtiesData);
      
    } catch (err: any) {
      console.error('Erro ao buscar dados Meta Ads:', err);
      setError(err.message || 'Erro ao carregar dados');
      toast.error('Erro ao carregar dados do Meta Ads');
    } finally {
      setLoading(false);
    }
  }, [selectedSpecialty]);

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

  // Carrega dados iniciais
  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    
    // Filtros
    selectedSpecialty,
    selectedPeriod,
    setSelectedSpecialty,
    setSelectedPeriod,
    
    // Ações
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
