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
    /** Preenchido quando a despesa é uma ocorrência gerada de uma despesa fixa. */
    fixedExpenseId?: string | null;
    competenceMonth?: string;
    createdBy: any;
    createdAt: string;
    updatedAt: string;
}

export type ExpenseOrigin = 'fixed' | 'commission' | 'manual';

export interface ExpenseOriginTotals {
    fixed: { total: number; count: number };
    commission: { total: number; count: number };
    manual: { total: number; count: number };
}

/** Subcategorias aceitas pelo backend (enum de Expense/FixedExpense). */
export const EXPENSE_SUBCATEGORIES: Array<{ value: string; label: string }> = [
    { value: 'salary', label: 'Salário' },
    { value: 'bonus', label: 'Bônus / gratificação' },
    { value: 'transport', label: 'Vale-transporte' },
    { value: 'meal_voucher', label: 'Vale-refeição' },
    { value: 'health_insurance', label: 'Plano de saúde' },
    { value: 'rent', label: 'Aluguel' },
    { value: 'utilities', label: 'Água, luz, internet' },
    { value: 'supplies', label: 'Material' },
    { value: 'maintenance', label: 'Manutenção' },
    { value: 'advertising', label: 'Publicidade' },
    { value: 'other', label: 'Outra' }
];

/** Origem derivada dos próprios campos (mesma regra do backend). */
export const getExpenseOrigin = (e: Pick<Expense, 'fixedExpenseId' | 'category'>): ExpenseOrigin =>
    e.fixedExpenseId ? 'fixed' : e.category === 'commission' ? 'commission' : 'manual';

export interface ExpenseFilters {
    month?: number;
    year?: number;
    doctorId?: string;
    category?: string;
    subcategory?: string;
    status?: string;
    origin?: ExpenseOrigin | '';
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

    // Cancelar despesa (V2) — mantém o documento
    cancel: async (id: string) => {
        const response = await api.delete(`/v2/expenses/${id}`);
        return response.data;
    },

    // Excluir de verdade — backend só aceita despesa AVULSA pendente (senão 409)
    deletePermanently: async (id: string) => {
        const response = await api.delete(`/v2/expenses/${id}`, { params: { permanent: true } });
        return response.data;
    },

    // Gerar comissões manualmente (mantém V1)
    generateCommissions: async (month?: number, year?: number, regenerate?: boolean) => {
        const response = await api.post('/expenses/generate-commissions', { month, year, regenerate });
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
// ─── Despesas fixas (modelos + geração mensal) ──────────────────────────────

export interface FixedExpense {
    _id: string;
    description: string;
    category: Exclude<Expense['category'], 'commission'>;
    subcategory?: string | null;
    amount: number;
    dueDay: number;
    paymentMethod: string;
    frequency: 'monthly';
    startDate: string;
    endDate?: string | null;
    active: boolean;
    notes?: string;
    /** Nº de ocorrências já geradas (inclui canceladas) — decide excluir x desativar. */
    occurrences?: number;
}

export type FixedExpenseInput = Omit<FixedExpense, '_id' | 'frequency' | 'occurrences'>;

export interface FixedGenerationResult {
    success: boolean;
    competenceMonth: string;
    created: Array<{ expenseId: string; description: string; amount: number; date: string }>;
    skipped: Array<{ fixedExpenseId: string; description: string; reason: string }>;
    errors: Array<{ fixedExpenseId: string; description: string; reason: string }>;
}

export interface FixedPendingGeneration {
    competenceMonth: string;
    count: number;
    total: number;
    items: Array<{ _id: string; description: string; amount: number; dueDate: string }>;
}

export const fixedExpenseService = {
    list: async (): Promise<FixedExpense[]> => {
        const response = await api.get('/v2/fixed-expenses');
        return response.data.data;
    },

    create: async (data: Partial<FixedExpenseInput>) => {
        const response = await api.post('/v2/fixed-expenses', data);
        return response.data;
    },

    /** applyToOccurrence: aplica também à ocorrência PENDENTE daquela competência. */
    update: async (id: string, data: Partial<FixedExpenseInput>, applyToOccurrence?: { year: number; month: number }) => {
        const response = await api.patch(`/v2/fixed-expenses/${id}`, { ...data, ...(applyToOccurrence ? { applyToOccurrence } : {}) });
        return response.data;
    },

    /** softDeleted=true quando o modelo já tinha ocorrências e só foi desativado. */
    remove: async (id: string): Promise<{ softDeleted: boolean; message: string }> => {
        const response = await api.delete(`/v2/fixed-expenses/${id}`);
        return response.data;
    },

    // Objeto { year, month } (e não 2 números posicionais): trocar a ordem passava no TypeScript
    // e só estourava como 400 no backend.
    pendingGeneration: async ({ year, month }: { year: number; month: number }): Promise<FixedPendingGeneration> => {
        const response = await api.get('/v2/fixed-expenses/pending-generation', { params: { year, month } });
        return response.data.data;
    },

    generate: async ({ year, month }: { year: number; month: number }): Promise<FixedGenerationResult> => {
        // 207 (só erros) também traz o corpo com created/skipped/errors
        const response = await api.post('/v2/fixed-expenses/generate', { year, month }, { validateStatus: (s) => s === 200 || s === 207 });
        return response.data;
    }
};
