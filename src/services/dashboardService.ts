/**
 * 🚀 Dashboard Service - API V2
 *
 * Serviço consolidado para estatísticas do dashboard admin.
 * Fonte única: /v2/admin/dashboard/overview
 */

import API from './api';

// ── Interfaces V2 ───────────────────────────────────────────────────────────

export interface DashboardStats {
    totalDoctors: number;
    totalPatients: number;
    activePatients: number;
    todayAppointments: number;
    weekAppointments: number;
    todayRevenue: number;
    monthRevenue: number;
    pendingPayments: number;
    monthLeads: number;
    leadsByStatus: Record<string, number>;
    calculatedAt: string;
}

export interface DashboardCharts {
    appointmentsChart: Array<{ date: string; count: number }>;
    revenueChart: Array<{ date: string; value: number }>;
    leadsByOrigin: Array<{ _id: string; count: number }>;
    patientsBySpecialty: Array<{ _id: string; count: number }>;
    calculatedAt: string;
}

export interface DoctorOverview {
    _id: string;
    name: string;
    specialty: string;
    patients: number;
    appointments: number;
}

export interface UpcomingAppointment {
    _id: string;
    date: string;
    time: string;
    reason: string;
    status: string;
    patientName: string;
    professionalName: string;
    specialty?: string;
}

export interface DashboardMeta {
    generatedAt: string;
    version: string;
    included: string[];
}

export interface DashboardOverview {
    stats: DashboardStats;
    charts: DashboardCharts;
    doctorsOverview: DoctorOverview[];
    upcomingAppointments: UpcomingAppointment[];
    meta: DashboardMeta;
}

// ── Cache local ─────────────────────────────────────────────────────────────

const cache: {
    overview: DashboardOverview | null;
    timestamp: number;
    promise: Promise<DashboardOverview> | null;
} = {
    overview: null,
    timestamp: 0,
    promise: null
};

const CACHE_TTL = 3 * 60 * 1000; // 3 minutos

/**
 * 🎯 Busca visão completa do dashboard V2
 *
 * @param include — blocos a carregar: 'stats' | 'charts' | 'doctors' | 'upcoming'
 * @param forceRefresh — ignorar cache local
 */
export const fetchDashboardOverview = async (
    forceRefresh = false,
    include?: string[]
): Promise<DashboardOverview> => {
    const now = Date.now();
    console.log('📡 dashboardService: fetchDashboardOverview chamado, forceRefresh=', forceRefresh, 'include=', include);

    // Retornar cache se válido
    if (!forceRefresh && cache.overview && (now - cache.timestamp < CACHE_TTL)) {
        console.log('📦 dashboardService: Usando cache local');
        return cache.overview;
    }

    // Se já está carregando, esperar
    if (cache.promise) {
        console.log('⏳ dashboardService: Aguardando promise existente');
        return cache.promise;
    }

    cache.promise = (async () => {
        try {
            const params: Record<string, string> = {};
            if (include && include.length > 0) {
                params.include = include.join(',');
            }
            if (forceRefresh) {
                params.refresh = 'true';
            }

            console.log('🌐 dashboardService: Chamando API /v2/admin/dashboard/overview');
            const response = await API.get<DashboardOverview>('/v2/admin/dashboard/overview', { params });
            const dashboardData = response.data?.data || response.data;

            console.log('✅ dashboardService: Resposta recebida:', {
                hasStats: !!dashboardData.stats,
                doctorsCount: Array.isArray(dashboardData.doctorsOverview) ? dashboardData.doctorsOverview.length : 'N/A',
                upcomingCount: Array.isArray(dashboardData.upcomingAppointments) ? dashboardData.upcomingAppointments.length : 'N/A',
                included: dashboardData.meta?.included
            });

            cache.overview = dashboardData;
            cache.timestamp = now;

            return dashboardData;
        } finally {
            cache.promise = null;
        }
    })();

    return cache.promise;
};

/**
 * 🗑️ Invalida cache no backend V2 e limpa cache local
 */
export const invalidateDashboardCache = async (): Promise<void> => {
    await API.post('/v2/admin/dashboard/invalidate-cache');
    clearDashboardCache();
};

export const getCacheState = () => ({
    hasData: !!cache.overview,
    timestamp: cache.timestamp,
    age: Date.now() - cache.timestamp,
    isLoading: !!cache.promise
});

export const clearDashboardCache = (): void => {
    cache.overview = null;
    cache.timestamp = 0;
    cache.promise = null;
    console.log('🧹 Cache do dashboardService limpo');
};

if (typeof window !== 'undefined') {
    (window as any).clearDashboardCache = clearDashboardCache;
    (window as any).getDashboardCache = getCacheState;
}
