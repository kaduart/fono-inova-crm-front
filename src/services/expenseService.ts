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
    // Criar despesa
    create: async (data: Partial<Expense>) => {
        const response = await api.post('/expenses', data);
        return response.data;
    },

    // Listar despesas
    getAll: async (filters?: ExpenseFilters) => {
        const response = await api.get('/expenses', { params: filters });
        return response.data;
    },

    // Buscar por profissional
    getByDoctor: async (doctorId: string, filters?: { month?: number; year?: number }) => {
        const response = await api.get(`/expenses/by-doctor/${doctorId}`, { params: filters });
        return response.data;
    },

    // Atualizar despesa
    update: async (id: string, data: Partial<Expense>) => {
        const response = await api.patch(`/expenses/${id}`, data);
        return response.data;
    },

    // Cancelar despesa
    cancel: async (id: string) => {
        const response = await api.delete(`/expenses/${id}`);
        return response.data;
    },

    // Gerar comissões manualmente
    generateCommissions: async () => {
        const response = await api.post('/expenses/generate-commissions');
        return response.data;
    }
};