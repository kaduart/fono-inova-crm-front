/**
 * 🚀 Dashboard Service - API Otimizada
 * 
 * Serviço consolidado para estatísticas do dashboard,
 * reduzindo múltiplas chamadas para uma única requisição.
 */

import API from './api';

// Interface para estatísticas gerais
export interface DashboardStats {
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

// Interface para dados de gráficos
export interface DashboardCharts {
    appointmentsChart: Array<{ date: string; count: number }>;
    leadsByOrigin: Array<{ _id: string; count: number }>;
    revenueChart: Array<{ date: string; value: number }>;
    patientsBySpecialty: Array<{ _id: string; count: number }>;
    calculatedAt: string;
}

// Interface para overview de profissionais
export interface DoctorOverview {
    _id: string;
    name: string;
    specialty: string;
    patients: number;
    appointments: number;
}

// Interface para próximas consultas
export interface UpcomingAppointment {
    _id: string;
    date: string;
    time: string;
    reason: string;
    status: string;
    patient: string;
    doctor: string;
}

// Interface para visão completa
export interface DashboardOverview {
    stats: DashboardStats;
    charts: DashboardCharts;
    doctorsOverview: DoctorOverview[];
    upcomingAppointments: UpcomingAppointment[];
    generatedAt: string;
}

// Cache local no frontend (em memória)
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
 * 🎯 Busca visão completa do dashboard (endpoint consolidado)
 * Substitui 5+ chamadas individuais
 * 🚀 V2: Usa /v2/admin/dashboard/overview
 */
export const fetchDashboardOverview = async (
    forceRefresh = false
): Promise<DashboardOverview> => {
    const now = Date.now();

    // Retornar cache se válido
    if (!forceRefresh && cache.overview && (now - cache.timestamp < CACHE_TTL)) {
        // ✅ Verificar se o cache tem dados completos
        const hasCompleteData = cache.overview.upcomingAppointments !== undefined &&
            cache.overview.doctorsOverview !== undefined &&
            cache.overview.stats !== undefined;
        if (hasCompleteData) {
            console.log('📦 Usando cache do dashboardService:', {
                statsTotalPatients: cache.overview?.stats?.totalPatients,
                doctorsCount: cache.overview?.doctorsOverview?.length,
                upcomingAppointmentsCount: cache.overview?.upcomingAppointments?.length
            });
            return cache.overview;
        }
        console.log('📦 Cache incompleto, recarregando...');
    }

    // Se já está carregando, esperar a promise existente
    if (cache.promise) {
        return cache.promise;
    }

    // Criar nova promise de carregamento
    cache.promise = (async () => {
        try {
            // 🚀 V2: Usa endpoint V2 do admin dashboard
            const response = await API.get<DashboardOverview>('/v2/admin/dashboard/overview');

            // ✅ CORREÇÃO: Extrair dados do formato { success, data }
            const dashboardData = response.data?.data || response.data;

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
 * 📊 Busca apenas estatísticas (mais leve)
 */
export const fetchDashboardStats = async (): Promise<DashboardStats> => {
    const response = await API.get<DashboardStats>('/dashboard/stats');
    return response.data?.data || response.data;
};

/**
 * 📈 Busca apenas dados de gráficos
 */
export const fetchDashboardCharts = async (): Promise<DashboardCharts> => {
    const response = await API.get<DashboardCharts>('/dashboard/charts');
    return response.data?.data || response.data;
};

/**
 * 👥 Busca visão geral dos profissionais
 */
export const fetchDoctorsOverview = async (): Promise<DoctorOverview[]> => {
    const response = await API.get<DoctorOverview[]>('/dashboard/doctors-overview');
    return response.data?.data || response.data;
};

/**
 * 📅 Busca próximas consultas
 */
export const fetchUpcomingAppointments = async (
    limit = 10
): Promise<UpcomingAppointment[]> => {
    const response = await API.get<UpcomingAppointment[]>('/dashboard/upcoming', {
        params: { limit }
    });
    return response.data?.data || response.data;
};

/**
 * 🗑️ Invalida cache no backend
 */
export const invalidateDashboardCache = async (): Promise<void> => {
    await API.post('/dashboard/invalidate-cache');

    // Limpar cache local também
    cache.overview = null;
    cache.timestamp = 0;
};

// Exportar cache para debugging (DEVE vir antes do uso)
export const getCacheState = () => ({
    hasData: !!cache.overview,
    timestamp: cache.timestamp,
    age: Date.now() - cache.timestamp,
    isLoading: !!cache.promise
});

/**
 * 🧹 Limpa cache local
 */
export const clearDashboardCache = (): void => {
    cache.overview = null;
    cache.timestamp = 0;
    cache.promise = null;
    console.log('🧹 Cache do dashboardService limpo');
};

// Expor função global para debug (DEPOIS das declarações)
if (typeof window !== 'undefined') {
    (window as any).clearDashboardCache = clearDashboardCache;
    (window as any).getDashboardCache = getCacheState;
}
