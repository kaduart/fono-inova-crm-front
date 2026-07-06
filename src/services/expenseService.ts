// src/services/expenseService.ts
import api from './api';

export interface Expense {
    _id: string;
    description: string;
    category: 'payroll' | 'commission' | 'benefit' | 'operational' | 'equipment' | 'marketing' | 'other';
    subcategory?: string;
    amount: number;
    date: string;
    relatedDoctor?: {
        _id: string;
        fullName: string;
        specialty: string;
    };
    workPeriod?: {
        start: string;
        end: string;
        sessionsCount: number;
        revenueGenerated: number;
    };
    paymentMethod: string;
    status: 'paid' | 'pending' | 'scheduled' | 'canceled';
    isRecurring?: boolean;
    recurrence?: {
        frequency: string;
        nextOccurrence: string;
        endDate: string;
    };
    notes?: string;
    createdBy: any;
    createdAt: string;
    updatedAt: string;
}

export interface ExpenseFilters {
    month?: number;
    year?: number;
    doctorId?: string;
    category?: string;
    subcategory?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
}

export const expenseService = {
    // Criar despesa (V2)
    create: async (data: Partial<Expense>) => {
        const response = await api.post('/v2/expenses', data);
        return response.data;
    },

    // Listar despesas (V2 - com cache)
    getAll: async (filters?: ExpenseFilters) => {
        const response = await api.get('/v2/expenses', { params: filters });
        return response.data;
    },

    // Buscar por profissional (mantém V1 - não tem V2 ainda)
    getByDoctor: async (doctorId: string, filters?: { month?: number; year?: number }) => {
        const response = await api.get(`/expenses/by-doctor/${doctorId}`, { params: filters });
        return response.data;
    },

    // Atualizar despesa (V2)
    update: async (id: string, data: Partial<Expense>) => {
        const response = await api.patch(`/v2/expenses/${id}`, data);
        return response.data;
    },

    // Cancelar despesa (V2)
    cancel: async (id: string) => {
        const response = await api.delete(`/v2/expenses/${id}`);
        return response.data;
    },

    // Gerar comissões manualmente (mantém V1)
    generateCommissions: async (month?: number, year?: number) => {
        const response = await api.post('/expenses/generate-commissions', { month, year });
        return response.data;
    },

    // Consultar status da geração assíncrona de comissões
    getCommissionGenerationStatus: async (eventId: string) => {
        const response = await api.get(`/expenses/generate-commissions/status/${eventId}`);
        return response.data;
    },

    // Polling do status da geração de comissões
    pollCommissionGenerationStatus: async (
        eventId: string,
        maxAttempts: number = 30,
        intervalMs: number = 2000
    ) => {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const response = await api.get(`/expenses/generate-commissions/status/${eventId}`);
            const status = response.data?.data;

            if (!status) {
                throw new Error('Resposta inválida ao consultar status');
            }

            if (status.status === 'processed' || status.status === 'completed') {
                return { success: true, status };
            }

            if (status.status === 'failed' || status.status === 'dead_letter') {
                return {
                    success: false,
                    status,
                    error: status.error?.message || 'Falha na geração de comissões'
                };
            }

            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, intervalMs));
            }
        }

        return {
            success: false,
            status: null,
            timeout: true,
            error: 'A geração ainda está em andamento. Recarregue a página em alguns instantes.'
        };
    }
};