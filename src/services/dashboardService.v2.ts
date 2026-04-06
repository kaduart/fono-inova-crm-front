/**
 * Dashboard Service V2 - CQRS + Event-Driven
 * 
 * Service consolidado para estatísticas do dashboard financeiro,
 * usando endpoints V2 otimizados com projection e cache.
 */

import API from './api';

// ============================================
// CONFIG
// ============================================

const USE_V2_DASHBOARD = import.meta.env.VITE_USE_V2_DASHBOARD === 'true' || true;

// ============================================
// TYPES
// ============================================

export interface FinancialOverviewV2 {
  totals: {
    totalReceived: number;
    totalProduction: number;
    totalPending: number;
    countReceived: number;
    countPending: number;
    particularReceived: number;
    insurance: {
      pendingBilling: number;
      billed: number;
      received: number;
    };
    packageCredit: {
      contractedRevenue: number;
      cashReceived: number;
      deferredRevenue: number;
      deferredSessions: number;
      recognizedRevenue: number;
      recognizedSessions: number;
      totalSessions: number;
      activePackages: number;
    };
    patientBalance: {
      totalDebt: number;
      totalCredit: number;
      totalDebited: number;
      totalCredited: number;
      patientsWithDebt: number;
      patientsWithCredit: number;
    };
  };
  period: string;
  date: string;
  periodStart: string;
  periodEnd: string;
  source: 'snapshot' | 'sync_fallback';
  backgroundUpdate: boolean;
}

export interface DashboardStatsV2 {
  totalPatients: number;
  totalDoctors: number;
  todayAppointments: number;
  weekAppointments: number;
  pendingPayments: number;
  monthRevenue: number;
  monthLeads: number;
  leadsByStatus: Record<string, number>;
  calculatedAt: string;
}

export interface DashboardChartsV2 {
  appointmentsChart: Array<{ date: string; count: number }>;
  leadsByOrigin: Array<{ _id: string; count: number }>;
  revenueChart: Array<{ date: string; value: number }>;
  patientsBySpecialty: Array<{ _id: string; count: number }>;
  calculatedAt: string;
}

export interface DoctorOverviewV2 {
  _id: string;
  name: string;
  specialty: string;
  patients: number;
  appointments: number;
}

export interface UpcomingAppointmentV2 {
  _id: string;
  date: string;
  time: string;
  reason: string;
  status: string;
  patient: string;
  doctor: string;
}

export interface DashboardOverviewResponse {
  success: boolean;
  data: {
    stats: DashboardStatsV2;
    charts: DashboardChartsV2;
    doctorsOverview: DoctorOverviewV2[];
    upcomingAppointments: UpcomingAppointmentV2[];
    financialOverview?: FinancialOverviewV2;
    generatedAt: string;
  };
  correlationId: string;
}

export interface QuickStatsResponse {
  success: boolean;
  data: {
    patients: { total: number; newThisMonth: number };
    doctors: { total: number; active: number };
    appointments: { today: number; week: number; month: number };
    payments: { pending: number; received: number; total: number };
    revenue: { month: number; projected: number };
  };
  correlationId: string;
}

export interface PaymentsSummaryResponse {
  success: boolean;
  data: {
    byMethod: Record<string, number>;
    byStatus: Record<string, number>;
    byPeriod: Array<{ period: string; amount: number; count: number }>;
    total: number;
    received: number;
    pending: number;
  };
  correlationId: string;
}

// ============================================
// CACHE
// ============================================

const CACHE_TTL = 3 * 60 * 1000; // 3 minutos

const cache: {
  overview: DashboardOverviewResponse['data'] | null;
  financial: FinancialOverviewV2 | null;
  timestamp: number;
  promise: Promise<any> | null;
} = {
  overview: null,
  financial: null,
  timestamp: 0,
  promise: null
};

// ============================================
// SERVICE V2
// ============================================

export const dashboardServiceV2 = {
  USE_V2: USE_V2_DASHBOARD,

  // ==========================================
  // READ (síncrono, rápido)
  // ==========================================

  /**
   * 🎯 Busca visão completa do dashboard (consolidado)
   * Endpoint: GET /v2/admin/dashboard/overview
   */
  async fetchOverview(
    forceRefresh = false
  ): Promise<DashboardOverviewResponse['data']> {
    const now = Date.now();

    // Retornar cache se válido
    if (!forceRefresh && cache.overview && (now - cache.timestamp < CACHE_TTL)) {
      console.log('📦 dashboardServiceV2: Usando cache');
      return cache.overview;
    }

    // Se já está carregando, esperar
    if (cache.promise) {
      return cache.promise;
    }

    // Criar nova promise de carregamento
    cache.promise = (async () => {
      try {
        const response = await API.get<DashboardOverviewResponse>(
          '/v2/admin/dashboard/overview'
        );

        const dashboardData = response.data?.data || response.data;

        cache.overview = dashboardData;
        cache.timestamp = now;

        return dashboardData;
      } finally {
        cache.promise = null;
      }
    })();

    return cache.promise;
  },

  /**
   * 📊 Quick Stats - Dados rápidos para cards
   * Endpoint: GET /v2/admin/dashboard/quick-stats
   */
  async fetchQuickStats(): Promise<QuickStatsResponse['data']> {
    const response = await API.get<QuickStatsResponse>(
      '/v2/admin/dashboard/quick-stats'
    );
    return response.data?.data || response.data;
  },

  /**
   * 💰 Financial Overview - Dados financeiros completos
   * Endpoint: GET /v2/totals
   */
  async fetchFinancialOverview(params?: {
    date?: string;
    period?: 'day' | 'week' | 'month' | 'year';
    clinicId?: string;
  }): Promise<FinancialOverviewV2> {
    const response = await API.get<{ success: boolean; data: FinancialOverviewV2 }>(
      '/v2/totals',
      { params }
    );
    return response.data?.data || response.data;
  },

  /**
   * 💳 Payments Summary - Resumo de pagamentos
   * Endpoint: GET /v2/admin/dashboard/payments-summary
   */
  async fetchPaymentsSummary(
    startDate?: string,
    endDate?: string
  ): Promise<PaymentsSummaryResponse['data']> {
    const response = await API.get<PaymentsSummaryResponse>(
      '/v2/admin/dashboard/payments-summary',
      {
        params: { startDate, endDate }
      }
    );
    return response.data?.data || response.data;
  },

  /**
   * 📈 Charts Data - Dados para gráficos
   * Endpoint: GET /v2/admin/dashboard/charts
   */
  async fetchCharts(): Promise<DashboardChartsV2> {
    const response = await API.get<{ success: boolean; data: DashboardChartsV2 }>(
      '/v2/admin/dashboard/charts'
    );
    return response.data?.data || response.data;
  },

  /**
   * 👥 Doctors Overview - Visão dos profissionais
   * Endpoint: GET /v2/admin/dashboard/doctors-overview
   */
  async fetchDoctorsOverview(): Promise<DoctorOverviewV2[]> {
    const response = await API.get<{ success: boolean; data: DoctorOverviewV2[] }>(
      '/v2/admin/dashboard/doctors-overview'
    );
    return response.data?.data || response.data;
  },

  /**
   * 📅 Upcoming Appointments - Próximas consultas
   * Endpoint: GET /v2/admin/dashboard/upcoming
   */
  async fetchUpcomingAppointments(limit = 10): Promise<UpcomingAppointmentV2[]> {
    const response = await API.get<{ success: boolean; data: UpcomingAppointmentV2[] }>(
      '/v2/admin/dashboard/upcoming',
      { params: { limit } }
    );
    return response.data?.data || response.data;
  },

  // ==========================================
  // CACHE MANAGEMENT
  // ==========================================

  /**
   * 🗑️ Invalida cache no backend e local
   */
  async invalidateCache(): Promise<void> {
    await API.post('/v2/admin/dashboard/invalidate-cache');
    this.clearLocalCache();
  },

  /**
   * 🧹 Limpa cache local
   */
  clearLocalCache(): void {
    cache.overview = null;
    cache.financial = null;
    cache.timestamp = 0;
    cache.promise = null;
    console.log('🧹 Cache do dashboardServiceV2 limpo');
  },

  /**
   * 📊 Retorna estado do cache
   */
  getCacheState() {
    return {
      hasOverview: !!cache.overview,
      hasFinancial: !!cache.financial,
      timestamp: cache.timestamp,
      age: Date.now() - cache.timestamp,
      isLoading: !!cache.promise
    };
  }
};

// ============================================
// FALLBACK V1 (compatibilidade)
// ============================================

import {
  fetchDashboardOverview as fetchDashboardOverviewV1,
  fetchDashboardStats as fetchDashboardStatsV1,
  fetchDashboardCharts as fetchDashboardChartsV1,
  fetchDoctorsOverview as fetchDoctorsOverviewV1,
  fetchUpcomingAppointments as fetchUpcomingAppointmentsV1,
  invalidateDashboardCache as invalidateDashboardCacheV1
} from './dashboardService';

export const dashboardServiceHybrid = {
  USE_V2: USE_V2_DASHBOARD,

  async fetchOverview(forceRefresh = false) {
    if (USE_V2_DASHBOARD) {
      return dashboardServiceV2.fetchOverview(forceRefresh);
    }
    const data = await fetchDashboardOverviewV1(forceRefresh);
    return data;
  },

  async fetchQuickStats() {
    if (USE_V2_DASHBOARD) {
      return dashboardServiceV2.fetchQuickStats();
    }
    // Fallback: retorna stats básicos
    const overview = await fetchDashboardOverviewV1();
    return {
      patients: { total: overview.stats.totalPatients, newThisMonth: 0 },
      doctors: { total: overview.stats.totalDoctors, active: overview.stats.totalDoctors },
      appointments: { today: overview.stats.todayAppointments, week: overview.stats.weekAppointments, month: 0 },
      payments: { pending: overview.stats.pendingPayments, received: 0, total: 0 },
      revenue: { month: overview.stats.monthRevenue, projected: 0 }
    };
  },

  async fetchFinancialOverview(params?: { date?: string; period?: 'day' | 'week' | 'month' | 'year' }) {
    if (USE_V2_DASHBOARD) {
      return dashboardServiceV2.fetchFinancialOverview(params);
    }
    throw new Error('FinancialOverview só disponível na V2');
  },

  async fetchPaymentsSummary(startDate?: string, endDate?: string) {
    if (USE_V2_DASHBOARD) {
      return dashboardServiceV2.fetchPaymentsSummary(startDate, endDate);
    }
    throw new Error('PaymentsSummary só disponível na V2');
  },

  async fetchCharts() {
    if (USE_V2_DASHBOARD) {
      return dashboardServiceV2.fetchCharts();
    }
    return fetchDashboardChartsV1();
  },

  async fetchDoctorsOverview() {
    if (USE_V2_DASHBOARD) {
      return dashboardServiceV2.fetchDoctorsOverview();
    }
    return fetchDoctorsOverviewV1();
  },

  async fetchUpcomingAppointments(limit = 10) {
    if (USE_V2_DASHBOARD) {
      return dashboardServiceV2.fetchUpcomingAppointments(limit);
    }
    return fetchUpcomingAppointmentsV1(limit);
  },

  async invalidateCache() {
    if (USE_V2_DASHBOARD) {
      return dashboardServiceV2.invalidateCache();
    }
    return invalidateDashboardCacheV1();
  },

  clearLocalCache() {
    dashboardServiceV2.clearLocalCache();
  },

  getCacheState() {
    return dashboardServiceV2.getCacheState();
  }
};

export default dashboardServiceHybrid;
