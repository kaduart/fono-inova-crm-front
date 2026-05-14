/**
 * useMetaAds Hook — alinhado com /api/meta (Graph API v21.0)
 * Faz merge de campaigns + insights client-side e computa specialties agregadas.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import { metaAdsApi, Campaign, AggregatedMetrics, SpecialtyMetrics } from '../services/metaAdsApi';

export type FilterPeriod = '7d' | '30d' | 'this_month' | 'all';

const PERIOD_PRESET: Record<FilterPeriod, string> = {
  '7d': 'last_7d',
  '30d': 'last_30d',
  'this_month': 'this_month',
  'all': 'maximum',
};

export const SPECIALTIES = [
  { value: '', label: 'Todas Especialidades' },
  { value: 'psicologia', label: 'Psicologia' },
  { value: 'fonoaudiologia', label: 'Fonoaudiologia' },
  { value: 'fisioterapia', label: 'Fisioterapia' },
  { value: 'terapia_ocupacional', label: 'Terapia Ocupacional' },
  { value: 'neuropsicologia', label: 'Neuropsicologia' },
  { value: 'psicopedagogia', label: 'Psicopedagogia' },
  { value: 'musicoterapia', label: 'Musicoterapia' },
];

export const PERIODS = [
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: 'this_month', label: 'Este mês' },
  { value: 'all', label: 'Todo período' },
];

const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function mergeAndEnrich(
  rawCampaigns: Awaited<ReturnType<typeof metaAdsApi.getCampaigns>>,
  insights: Awaited<ReturnType<typeof metaAdsApi.getInsights>>
): Campaign[] {
  const insightMap = new Map(insights.map(i => [i.campaignId, i]));

  return rawCampaigns.map(c => {
    const ins = insightMap.get(c.campaignId);
    const spend = ins?.spend ?? 0;
    const leads = ins?.leads ?? 0;

    return {
      ...c,
      insights: {
        spend,
        clicks: ins?.clicks ?? 0,
        impressions: ins?.impressions ?? 0,
        ctr: ins?.ctr ?? 0,
        cpc: ins?.cpc ?? 0,
        cpm: ins?.cpm ?? 0,
      },
      leadsCount: leads,
      patientsCount: 0,
      cpl: ins?.cpl ?? null,
      cpa: null,
      formattedSpend: fmt.format(spend),
    };
  });
}

function computeSpecialties(campaigns: Campaign[]): SpecialtyMetrics[] {
  const map = new Map<string, SpecialtyMetrics>();

  for (const c of campaigns) {
    const sp = c.specialty || 'geral';
    const prev = map.get(sp) ?? { specialty: sp, campaignCount: 0, spend: 0, leads: 0, clicks: 0, impressions: 0, cpl: null, ctr: null };
    map.set(sp, {
      ...prev,
      campaignCount: prev.campaignCount + 1,
      spend: prev.spend + c.insights.spend,
      leads: prev.leads + c.leadsCount,
      clicks: prev.clicks + c.insights.clicks,
      impressions: prev.impressions + c.insights.impressions,
    });
  }

  return Array.from(map.values()).map(s => ({
    ...s,
    cpl: s.leads > 0 ? s.spend / s.leads : null,
    ctr: s.impressions > 0 ? (s.clicks / s.impressions) * 100 : null,
  }));
}

export interface UseMetaAdsReturn {
  campaigns: Campaign[];
  metrics: AggregatedMetrics | null;
  specialties: SpecialtyMetrics[];
  loading: boolean;
  syncing: boolean;
  error: string | null;
  hasLoaded: boolean;
  pagination: { page: number; limit: number; total: number; totalPages: number; hasMore: boolean };
  selectedSpecialty: string;
  selectedPeriod: FilterPeriod;
  setSelectedSpecialty: (v: string) => void;
  setSelectedPeriod: (v: FilterPeriod) => void;
  load: (page?: number) => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  sync: () => Promise<void>;
  filteredCampaigns: Campaign[];
  totalSpend: number;
  totalLeads: number;
  avgCPL: number | null;
}

export function useMetaAds(options?: { lazy?: boolean }): UseMetaAdsReturn {
  const lazy = options?.lazy ?? true;

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [metrics, setMetrics] = useState<AggregatedMetrics | null>(null);
  const [specialties, setSpecialties] = useState<SpecialtyMetrics[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<FilterPeriod>('30d');

  const pagination = useMemo(() => ({
    page: 1,
    limit: campaigns.length,
    total: campaigns.length,
    totalPages: 1,
    hasMore: false,
  }), [campaigns.length]);

  const fetchData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      const datePreset = PERIOD_PRESET[selectedPeriod];

      const [rawCampaigns, insights] = await Promise.all([
        metaAdsApi.getCampaigns({ status: undefined, refresh: forceRefresh }),
        metaAdsApi.getInsights({ level: 'campaign', datePreset }),
      ]);

      const enriched = mergeAndEnrich(rawCampaigns, insights);

      const filtered = selectedSpecialty
        ? enriched.filter(c => c.specialty === selectedSpecialty)
        : enriched;

      const totalSpend = filtered.reduce((s, c) => s + c.insights.spend, 0);
      const totalLeads = filtered.reduce((s, c) => s + c.leadsCount, 0);
      const totalClicks = filtered.reduce((s, c) => s + c.insights.clicks, 0);
      const totalImpressions = filtered.reduce((s, c) => s + c.insights.impressions, 0);

      setCampaigns(filtered);
      setSpecialties(computeSpecialties(enriched));
      setMetrics({
        totalSpend,
        totalLeads,
        totalClicks,
        totalImpressions,
        avgCPL: totalLeads > 0 ? totalSpend / totalLeads : null,
        campaignCount: filtered.length,
      });
      setHasLoaded(true);
    } catch (err: any) {
      console.error('[useMetaAds]', err);
      setError(err.message || 'Erro ao carregar dados');
      toast.error('Erro ao carregar dados do Meta Ads');
    } finally {
      setLoading(false);
    }
  }, [selectedSpecialty, selectedPeriod]);

  const load = useCallback(async () => {
    if (!hasLoaded) await fetchData(false);
  }, [fetchData, hasLoaded]);

  const loadMore = useCallback(async () => {
    // Sem paginação server-side neste momento
  }, []);

  const refresh = useCallback(() => fetchData(true), [fetchData]);

  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      toast.info('Sincronizando com Meta Ads...');
      const result = await metaAdsApi.sync();
      if (result.success) {
        toast.success(`Sincronizado! ${result.synced} campanhas atualizadas`);
        await fetchData(true);
      } else {
        toast.error('Erro na sincronização');
      }
    } catch (err: any) {
      console.error('[useMetaAds] sync', err);
      toast.error('Erro ao sincronizar com Meta');
    } finally {
      setSyncing(false);
    }
  }, [fetchData]);

  useEffect(() => {
    if (!lazy) fetchData();
  }, [fetchData, lazy]);

  // Re-fetch quando o filtro de período muda (se já carregou)
  useEffect(() => {
    if (hasLoaded) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod, selectedSpecialty]);

  const { totalSpend, totalLeads, avgCPL } = useMemo(() => {
    const spend = campaigns.reduce((s, c) => s + c.insights.spend, 0);
    const leads = campaigns.reduce((s, c) => s + c.leadsCount, 0);
    return { totalSpend: spend, totalLeads: leads, avgCPL: leads > 0 ? spend / leads : null };
  }, [campaigns]);

  return {
    campaigns,
    metrics,
    specialties,
    loading,
    syncing,
    error,
    hasLoaded,
    pagination,
    selectedSpecialty,
    selectedPeriod,
    setSelectedSpecialty,
    setSelectedPeriod,
    load,
    loadMore,
    refresh,
    sync,
    filteredCampaigns: campaigns,
    totalSpend,
    totalLeads,
    avgCPL,
  };
}

export default useMetaAds;
