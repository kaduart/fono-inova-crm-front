/**
 * Meta Ads API Service — alinhado com /api/meta (Graph API v21.0)
 */

import API from './api';

export interface Campaign {
  campaignId: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';
  objective: string | null;
  specialty: string;
  accountId: string;
  dailyBudget: number | null;
  lifetimeBudget: number | null;
  insights: {
    spend: number;
    clicks: number;
    impressions: number;
    ctr: number;
    cpc: number;
    cpm: number;
  };
  leadsCount: number;
  patientsCount: number;
  cpl: number | null;
  cpa: number | null;
  formattedSpend: string;
}

export interface InsightRow {
  campaignId: string;
  campaignName: string;
  adsetId?: string;
  adsetName?: string;
  adId?: string;
  adName?: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  leads: number;
  cpl: number | null;
}

export interface AggregatedMetrics {
  totalSpend: number;
  totalLeads: number;
  totalImpressions: number;
  totalClicks: number;
  avgCPL: number | null;
  campaignCount: number;
}

export interface SpecialtyMetrics {
  specialty: string;
  campaignCount: number;
  spend: number;
  leads: number;
  clicks: number;
  impressions: number;
  cpl: number | null;
  ctr: number | null;
}

class MetaAdsApi {
  async getAccounts() {
    const { data } = await API.get('/meta/accounts');
    return data.accounts as any[];
  }

  async getCampaigns({ status, refresh }: { status?: string; refresh?: boolean } = {}) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (refresh) params.append('refresh', 'true');
    const { data } = await API.get(`/meta/campaigns?${params}`);
    return data.campaigns as Omit<Campaign, 'insights' | 'leadsCount' | 'patientsCount' | 'cpl' | 'cpa' | 'formattedSpend'>[];
  }

  async createCampaign(payload: { name: string; objective: string; dailyBudget?: number; lifetimeBudget?: number }) {
    const { data } = await API.post('/meta/campaigns', payload);
    return data.campaign;
  }

  async updateCampaign(id: string, fields: { name?: string; status?: string; dailyBudget?: number; lifetimeBudget?: number }) {
    const { data } = await API.patch(`/meta/campaigns/${id}`, fields);
    return data.result;
  }

  async pauseCampaign(id: string) {
    const { data } = await API.patch(`/meta/campaigns/${id}/pause`);
    return data.result;
  }

  async activateCampaign(id: string) {
    const { data } = await API.patch(`/meta/campaigns/${id}/activate`);
    return data.result;
  }

  async getAdSets(campaignId?: string) {
    const params = campaignId ? `?campaignId=${campaignId}` : '';
    const { data } = await API.get(`/meta/adsets${params}`);
    return data.adsets as any[];
  }

  async createAdSet(payload: { campaignId: string; name: string; dailyBudget: number; billingEvent?: string; optimizationGoal?: string; targeting?: object }) {
    const { data } = await API.post('/meta/adsets', payload);
    return data.adset;
  }

  async getAds(adsetId?: string) {
    const params = adsetId ? `?adsetId=${adsetId}` : '';
    const { data } = await API.get(`/meta/ads${params}`);
    return data.ads as any[];
  }

  async createAd(payload: { adsetId: string; name: string; creativeId: string }) {
    const { data } = await API.post('/meta/ads', payload);
    return data.ad;
  }

  async getInsights({ level = 'campaign', datePreset = 'last_30d', ids }: { level?: string; datePreset?: string; ids?: string[] } = {}) {
    const params = new URLSearchParams({ level, datePreset });
    if (ids?.length) params.append('ids', ids.join(','));
    const { data } = await API.get(`/meta/insights?${params}`);
    return data.insights as InsightRow[];
  }

  async sync() {
    const { data } = await API.post('/meta/sync');
    return data as { success: boolean; synced: number; errors: number };
  }

  async debugToken() {
    const { data } = await API.get('/meta/debug-token');
    return data;
  }
}

export const metaAdsApi = new MetaAdsApi();
export default metaAdsApi;
