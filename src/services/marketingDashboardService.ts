/**
 * 📊 Marketing Dashboard Service
 * Integração com APIs de Alerts, Journey e Scoring
 */

import api from './api';

// ═══════════════════════════════════════════
// ALERTS API
// ═══════════════════════════════════════════

export interface Alert {
  _id: string;
  tipo: string;
  prioridade: 'low' | 'medium' | 'high' | 'critical';
  titulo: string;
  mensagem: string;
  status: 'novo' | 'lido' | 'resolvido';
  landingPage?: string;
  criadoEm: string;
  dados?: Record<string, any>;
}

export interface AlertDashboard {
  total: number;
  porPrioridade: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  porCategoria: Array<{ categoria: string; count: number }>;
  recentes: Alert[];
}

export const alertsApi = {
  getAll: (params?: { status?: string; prioridade?: string; landingPage?: string }) =>
    api.get('/alerts', { params }),

  getDashboard: (): Promise<{ data: { data: AlertDashboard } }> =>
    api.get('/alerts/dashboard'),

  getById: (id: string) =>
    api.get(`/alerts/${id}`),

  create: (data: Partial<Alert>) =>
    api.post('/alerts', data),

  ack: (id: string) =>
    api.post(`/alerts/${id}/ack`),

  resolve: (id: string, resolucao?: string) =>
    api.post(`/alerts/${id}/resolve`, { resolucao }),

  delete: (id: string) =>
    api.delete(`/alerts/${id}`),

  getByLandingPage: (slug: string) =>
    api.get(`/alerts/by-landing-page/${slug}`),
};

// ═══════════════════════════════════════════
// JOURNEY API
// ═══════════════════════════════════════════

export interface Journey {
  journeyId: string;
  sessionId: string;
  source: string;
  utm: {
    source?: string;
    medium?: string;
    campaign?: string;
  };
  landingPage: string;
  createdAt: string;
  identifiedAt?: string;
  isIdentified: boolean;
  metrics: {
    totalInteractions: number;
    pageViews: number;
    whatsappClicks: number;
    timeOnSite: number;
    pagesVisited: string[];
    conversionFunnel: {
      awareness: boolean;
      interest: boolean;
      consideration: boolean;
      conversion: boolean;
    };
  };
  timeline: Array<{
    type: string;
    page: string;
    timestamp: string;
    metadata?: Record<string, any>;
  }>;
}

export interface JourneySummary {
  period: number;
  totalJourneys: number;
  identifiedLeads: number;
  identificationRate: number;
  whatsappClicks: number;
  bySource: Array<{ source: string; count: number }>;
}

export interface JourneyFunnel {
  total: number;
  pageViews: number;
  whatsappClicks: number;
  formStarts: number;
  formSubmissions: number;
  identified: number;
}

export const journeyApi = {
  getById: (journeyId: string): Promise<{ data: { data: Journey } }> =>
    api.get(`/journey/${journeyId}`),

  getByIdentifier: (identifier: string): Promise<{ data: { data: Journey } }> =>
    api.get(`/journey/lead/${identifier}`),

  getAnalyticsSummary: (period?: number): Promise<{ data: { data: JourneySummary } }> =>
    api.get('/journey/analytics/summary', { params: { period } }),

  getAnalyticsFunnel: (period?: number): Promise<{ data: { data: JourneyFunnel } }> =>
    api.get('/journey/analytics/funnel', { params: { period } }),

  getByPage: (page: string, params?: { limit?: number; offset?: number }) =>
    api.get(`/journey/by-page/${page}`, { params }),

  // Público (tracking)
  track: (data: { type: string; page?: string; metadata?: Record<string, any> }) =>
    api.post('/journey/track', data),

  identify: (data: { name?: string; email?: string; phone?: string }) =>
    api.post('/journey/identify', data),
};

// ═══════════════════════════════════════════
// SCORING API
// ═══════════════════════════════════════════

export interface LandingPageScore {
  slug: string;
  period: number;
  calculatedAt: string;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  metrics: {
    totalVisits: number;
    totalLeads: number;
    uniqueVisitors: number;
    whatsappClicks: number;
    conversionRate: number;
    whatsappConversionRate: number;
    avgTimeOnPage: number;
    bounceRate: number;
  };
  scores: {
    conversionScore: number;
    velocityScore: number;
    engagementScore: number;
    growthScore: number;
  };
  analysis: {
    alerts: Array<{
      type: string;
      severity: string;
      message: string;
      threshold?: string;
    }>;
    positives: Array<{
      type: string;
      message: string;
    }>;
  };
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    category: string;
    action: string;
    expectedImpact: string;
  }>;
  ranking: {
    percentile: number;
    position: number;
    category: string;
  };
}

export interface RankingData {
  period: number;
  calculatedAt: string;
  totalLandingPages: number;
  averageScore: number;
  topPerformer: LandingPageScore;
  needsAttention: LandingPageScore[];
  results: LandingPageScore[];
}

export interface DailyPriorities {
  generatedAt: string;
  summary: {
    totalIssues: number;
    critical: number;
    high: number;
    quickWins: number;
  };
  priorities: Array<{
    title: string;
    items: Array<{
      landingPage: string;
      issue: string;
      severity: string;
      action: string;
      expectedResult: string;
      effort: string;
      impact: string;
    }>;
  }>;
}

export const scoringApi = {
  getRanking: (period?: number): Promise<{ data: { data: RankingData } }> =>
    api.get('/scoring/ranking', { params: { period } }),

  getLandingPageScore: (slug: string, period?: number): Promise<{ data: { data: LandingPageScore } }> =>
    api.get(`/scoring/landing-page/${slug}`, { params: { period } }),

  getRecommendations: (template?: string) =>
    api.get('/scoring/recommendations', { params: { template } }),

  getPriorities: (): Promise<{ data: { data: DailyPriorities } }> =>
    api.get('/scoring/priorities'),

  getLandingPageRecommendations: (slug: string) =>
    api.get(`/scoring/landing-page/${slug}/recommendations`),

  calculateScores: (slug?: string, period?: number) =>
    api.post('/scoring/calculate', { slug, period }),

  getForecast: (slug: string, periods?: number) =>
    api.get(`/scoring/forecast/${slug}`, { params: { periods } }),
};

// ═══════════════════════════════════════════
// HOOKS REACT
// ═══════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Alerts Hooks
export const useAlertsDashboard = () =>
  useQuery({
    queryKey: ['alerts', 'dashboard'],
    queryFn: async () => {
      const response = await alertsApi.getDashboard();
      return response.data.data;
    },
    refetchInterval: 30000, // 30 segundos
  });

export const useAlerts = (params?: Parameters<typeof alertsApi.getAll>[0]) =>
  useQuery({
    queryKey: ['alerts', params],
    queryFn: async () => {
      const response = await alertsApi.getAll(params);
      return response.data;
    },
  });

export const useAckAlert = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: alertsApi.ack,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
};

export const useResolveAlert = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, resolucao }: { id: string; resolucao?: string }) =>
      alertsApi.resolve(id, resolucao),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
};

// Journey Hooks
export const useJourneySummary = (period?: number) =>
  useQuery({
    queryKey: ['journey', 'summary', period],
    queryFn: async () => {
      const response = await journeyApi.getAnalyticsSummary(period);
      return response.data.data;
    },
  });

export const useJourneyFunnel = (period?: number) =>
  useQuery({
    queryKey: ['journey', 'funnel', period],
    queryFn: async () => {
      const response = await journeyApi.getAnalyticsFunnel(period);
      return response.data.data;
    },
  });

// Scoring Hooks
export const useRanking = (period?: number) =>
  useQuery({
    queryKey: ['scoring', 'ranking', period],
    queryFn: async () => {
      const response = await scoringApi.getRanking(period);
      return response.data.data;
    },
  });

export const useLandingPageScore = (slug: string, period?: number) =>
  useQuery({
    queryKey: ['scoring', 'landing-page', slug, period],
    queryFn: async () => {
      const response = await scoringApi.getLandingPageScore(slug, period);
      return response.data.data;
    },
    enabled: !!slug,
  });

export const usePriorities = () =>
  useQuery({
    queryKey: ['scoring', 'priorities'],
    queryFn: async () => {
      const response = await scoringApi.getPriorities();
      return response.data.data;
    },
    refetchInterval: 60000, // 1 minuto
  });

export const useCalculateScores = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, period }: { slug?: string; period?: number }) =>
      scoringApi.calculateScores(slug, period),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scoring'] });
    },
  });
};

export default {
  alerts: alertsApi,
  journey: journeyApi,
  scoring: scoringApi,
};
