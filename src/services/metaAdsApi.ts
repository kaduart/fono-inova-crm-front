/**
 * 🎯 Meta Ads API Service
 * Chamadas HTTP para o backend de Meta Ads
 */

import API from './api';

export interface Campaign {
  _id: string;
  campaignId: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';
  objective: string;
  specialty: string;
  dailyBudget: number | null;
  insights: {
    spend: number;
    clicks: number;
    impressions: number;
    reach: number;
    cpc: number;
    ctr: number;
    cpm: number;
    conversions: number;
    costPerConversion: number;
  };
  leadsCount: number;
  patientsCount: number;
  cpl: number | null;  // Virtual
  cpa: number | null;  // Virtual
  formattedSpend: string;  // Virtual
  lastSyncAt: string;
}

export interface CampaignFilters {
  specialty?: string;
  status?: string;
  refresh?: boolean;
}

export interface AggregatedMetrics {
  totalSpend: number;
  totalClicks: number;
  totalImpressions: number;
  totalLeads: number;
  totalPatients: number;
  avgCPL: number | null;
  avgCPA: number | null;
  avgCTR: number | null;
  campaignCount: number;
}

export interface SpecialtyMetrics {
  specialty: string;
  campaignCount: number;
  spend: number;
  leads: number;
  patients: number;
  clicks: number;
  impressions: number;
  cpl: number | null;
  cpa: number | null;
  ctr: number | null;
}

export interface LeadWithTracking {
  _id: string;
  name: string;
  contact: {
    phone?: string;
    email?: string;
  };
  status: string;
  stage: string;
  metaTracking: {
    source: string;
    campaign: string;
    campaignId: string;
    specialty: string;
    firstMessage: string;
  };
  createdAt: string;
}

class MetaAdsApi {
  /**
   * Busca campanhas do Meta Ads
   */
  async getCampaigns(filters: CampaignFilters = {}): Promise<Campaign[]> {
    const params = new URLSearchParams();
    if (filters.specialty) params.append('specialty', filters.specialty);
    if (filters.status) params.append('status', filters.status);
    if (filters.refresh) params.append('refresh', 'true');
    
    const response = await API.get(`/meta-ads/campaigns?${params.toString()}`);
    return response.data.campaigns;
  }

  /**
   * Busca detalhes de uma campanha específica
   */
  async getCampaign(id: string, datePreset?: string): Promise<Campaign> {
    const params = datePreset ? `?datePreset=${datePreset}` : '';
    const response = await API.get(`/meta-ads/campaigns/${id}${params}`);
    return response.data.campaign;
  }

  /**
   * Busca métricas agregadas (totais)
   */
  async getInsights(): Promise<AggregatedMetrics> {
    const response = await API.get('/meta-ads/insights');
    return response.data.metrics;
  }

  /**
   * Força sincronização com Meta API
   */
  async sync(): Promise<{ success: boolean; synced: number; errors: number }> {
    const response = await API.post('/meta-ads/sync');
    return response.data;
  }

  /**
   * Busca leads que vieram do Meta Ads
   */
  async getLeads(params: {
    campaignId?: string;
    specialty?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}): Promise<LeadWithTracking[]> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) queryParams.append(key, String(value));
    });
    
    const response = await API.get(`/meta-ads/leads?${queryParams.toString()}`);
    return response.data.leads;
  }

  /**
   * Associa um lead a uma campanha
   */
  async associateLead(leadId: string, campaignId: string): Promise<void> {
    await API.post(`/meta-ads/leads/${leadId}/associate`, { campaignId });
  }

  /**
   * Detecta origem de uma mensagem (utilitário)
   */
  async detectSource(data: {
    message?: string;
    fbclid?: string;
    utmCampaign?: string;
    utmSource?: string;
    utmMedium?: string;
  }): Promise<{
    source: string;
    campaign: string | null;
    specialty: string;
    specialtyDetected: string;
  }> {
    const response = await API.post('/meta-ads/detect-source', data);
    return response.data.detection;
  }

  /**
   * Busca métricas agrupadas por especialidade
   */
  async getBySpecialty(): Promise<SpecialtyMetrics[]> {
    const response = await API.get('/meta-ads/by-specialty');
    return response.data.specialties;
  }
}

export const metaAdsApi = new MetaAdsApi();
export default metaAdsApi;
