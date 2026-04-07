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
    generateCommissions: async () => {
        const response = await api.post('/expenses/generate-commissions');
        return response.data;
    }
};