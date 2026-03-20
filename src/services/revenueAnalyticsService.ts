/**
 * 💰 Revenue Analytics Service
 * 
 * Serviço para consumir endpoints de analytics de receita
 */

import api from './api';

export interface RevenueBySource {
  source: string;
  totalRevenue: number;
  appointments: number;
  avgTicket: number;
  uniqueLeads: number;
}

export interface RevenueByCampaign {
  campaign: string;
  source: string;
  totalRevenue: number;
  appointments: number;
  avgTicket: number;
  uniqueLeads: number;
}

export interface RevenueSummary {
  totalRevenue: number;
  totalAppointments: number;
  avgTicket: number;
  sourcesCount: number;
  campaignsCount: number;
}

export interface RevenueDashboard {
  summary: RevenueSummary;
  bySource: RevenueBySource[];
  byCampaign: RevenueByCampaign[];
  gmb: RevenueByCampaign[];
  topCampaign: RevenueByCampaign | null;
  bestSource: RevenueBySource | null;
}

export interface ConversionFunnel {
  leads: number;
  appointments: number;
  paid: number;
  revenue: number;
  conversionRates: {
    leadToAppointment: number;
    appointmentToPaid: number;
    leadToPaid: number;
  };
}

/**
 * 🎯 Revenue por origem
 */
export const getRevenueBySource = async (
  startDate?: string,
  endDate?: string
): Promise<RevenueBySource[]> => {
  const response = await api.get('/analytics/revenue/revenue-by-source', {
    params: { startDate, endDate }
  });
  return response.data.data;
};

/**
 * 🎯 Revenue por campanha
 */
export const getRevenueByCampaign = async (
  startDate?: string,
  endDate?: string,
  source?: string
): Promise<RevenueByCampaign[]> => {
  const response = await api.get('/analytics/revenue/revenue-by-campaign', {
    params: { startDate, endDate, source }
  });
  return response.data.data;
};

/**
 * 🎯 Revenue específico do GMB
 */
export const getGMBRevenue = async (
  startDate?: string,
  endDate?: string
): Promise<RevenueByCampaign[]> => {
  const response = await api.get('/analytics/revenue/gmb-revenue', {
    params: { startDate, endDate }
  });
  return response.data.data;
};

/**
 * 📊 Dashboard consolidado
 */
export const getRevenueDashboard = async (
  startDate?: string,
  endDate?: string
): Promise<RevenueDashboard> => {
  const response = await api.get('/analytics/revenue/dashboard', {
    params: { startDate, endDate }
  });
  return response.data.data;
};

/**
 * 🔄 Funnel de conversão
 */
export const getConversionFunnel = async (
  startDate?: string,
  endDate?: string,
  source?: string
): Promise<ConversionFunnel> => {
  const response = await api.get('/analytics/revenue/conversion-funnel', {
    params: { startDate, endDate, source }
  });
  return response.data.data;
};

export default {
  getRevenueBySource,
  getRevenueByCampaign,
  getGMBRevenue,
  getRevenueDashboard,
  getConversionFunnel
};
