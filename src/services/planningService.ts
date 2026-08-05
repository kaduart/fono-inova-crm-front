// src/services/planningService.ts
import api from './api';

export interface Planning {
    _id: string;
    type: 'daily' | 'weekly' | 'monthly';
    period: {
        start: string;
        end: string;
    };
    targets: {
        totalSessions: number;
        workHours: number;
        availableSlots: number;
        expectedRevenue: number;
        averageTicket?: number;
        commercialTicket?: number;
    };
    actual: {
        completedSessions: number;
        workedHours: number;
        usedSlots: number;
        actualRevenue: number;
    };
    progress: {
        sessionsPercentage: number;
        hoursPercentage: number;
        slotsPercentage: number;
        revenuePercentage: number;
        overallStatus: 'on_track' | 'at_risk' | 'behind' | 'achieved';
        gapRevenue?: number;
    };
    calculationStatus?: 'idle' | 'processing' | 'completed' | 'failed';
    lastCalculatedAt?: string;
    lastCalculationError?: string;
    byDoctor?: Array<{
        doctor: any;
        targetSessions: number;
        completedSessions: number;
        targetHours: number;
        workedHours: number;
    }>;
    notes?: string;
    createdBy: any;
    createdAt: string;
    updatedAt: string;
}

export interface MonthlyProjection {
    projectedRevenue: number;
    composition: {
        pacotes: number;
        convenios: number;
        perSession: number;
        recorrentes: number;
    };
    totalAppointments: number;
    breakdownByStatus: Record<string, { count: number; projected: number }>;
}

export interface StrategicOverview {
    revenueGoal: number;
    committedRevenue: number;
    gap: number;
    averageTicket: number;
    patientsNeeded: number;
    totalAppointments: number;
}

export const planningService = {
    // Criar planejamento
    create: async (data: Partial<Planning>) => {
        const response = await api.post('/planning', data);
        return response.data;
    },

    // Listar planejamentos
    getAll: async (filters?: { type?: string; status?: string; startDate?: string; endDate?: string; month?: number; year?: number }) => {
        const response = await api.get('/planning', { params: filters });
        return response.data as { success: boolean; count: number; data: Planning[]; projection?: MonthlyProjection };
    },

    // Atualizar planejamento
    update: async (id: string, data: Partial<Planning>) => {
        const response = await api.put(`/planning/${id}`, data);
        return response.data;
    },

    // Excluir planejamento
    delete: async (id: string) => {
        const response = await api.delete(`/planning/${id}`);
        return response.data;
    },

    // Atualizar progresso
    updateProgress: async (id: string) => {
        const response = await api.patch(`/planning/${id}/update-progress`);
        return response.data;
    },

    // Criar semanal rápido
    createWeekly: async (startDate: string) => {
        const response = await api.post('/planning/quick/weekly', { startDate });
        return response.data;
    },

    // Criar mensal rápido
    createMonthly: async (month: number, year: number) => {
        const response = await api.post('/planning/quick/monthly', { month, year });
        return response.data;
    },

    // Atualizar TODOS os planejamentos (admin)
    refreshAll: async () => {
        const response = await api.post('/planning/refresh-all');
        return response.data;
    },

    // Buscar com atualização automática
    getAllWithRefresh: async (filters?: { type?: string; status?: string; startDate?: string; endDate?: string; month?: number; year?: number }) => {
        const response = await api.get('/planning', { params: { ...filters, refresh: true } });
        return response.data as { success: boolean; count: number; data: Planning[]; projection?: MonthlyProjection; refreshQueued?: boolean };
    },

    // Buscar detalhes completos de um planejamento
    getDetails: async (id: string) => {
        const response = await api.get(`/planning/${id}/details`);
        return response.data;
    },

    // Gerar todas as semanas de um mês dividindo a meta mensal proporcionalmente
    generateWeeklyForMonth: async (params: { month: number; year: number; monthlyRevenue: number; totalSessions?: number; workHours?: number; averageTicket?: number }) => {
        const response = await api.post('/planning/generate-weekly-for-month', params);
        return response.data;
    },

    // Criar mensal e gerar semanais/diários automaticamente
    autoGenerate: async (payload: {
        month: number;
        year: number;
        targets: {
            expectedRevenue: number;
            totalSessions: number;
            workHours: number;
            averageTicket: number;
            commercialTicket?: number;
        };
        bySpecialty?: Array<{ specialty: string; sessions: number; revenue: number }>;
        notes?: string;
    }) => {
        const response = await api.post('/planning/auto-generate', payload);
        return response.data;
    },

    // Recalcular metas futuras de um mês
    recalculateFutureTargets: async (month: number, year: number) => {
        const response = await api.patch(`/planning/${month}/${year}/recalculate`);
        return response.data;
    }
};