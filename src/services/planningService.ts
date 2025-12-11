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
    };
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

export const planningService = {
    // Criar planejamento
    create: async (data: Partial<Planning>) => {
        const response = await api.post('/planning', data);
        return response.data;
    },

    // Listar planejamentos
    getAll: async (filters?: { type?: string; status?: string; startDate?: string; endDate?: string }) => {
        const response = await api.get('/planning', { params: filters });
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
    }
};