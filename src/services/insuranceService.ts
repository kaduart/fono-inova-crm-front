// src/services/insuranceService.ts
/**
 * Service para gerenciamento de Convênios e Insurance
 */

import api from './api';

export type BillingMode = 'per_month' | 'per_guide';

export type RenewalType = 'end_of_month' | 'until_consumed' | 'fixed_date' | 'authorization_validity';
export type RenewalDay = 'last_day' | 'fixed_day';
export type MigrationStrategy = 'eligible' | 'manual' | 'none';

export interface GuidePolicy {
    renewalType: RenewalType;
    renewalDay?: RenewalDay;
    renewalDayOfMonth?: number | null;
    expirationWarningDays?: number;
    autoSuggestRenewal?: boolean;
    defaultMigrationStrategy?: MigrationStrategy;
}

export interface Convenio {
    _id: string;
    code: string;
    name: string;
    sessionValue: number;
    active: boolean;
    billingMode: BillingMode;
    notes?: string;
    guidePolicy?: GuidePolicy;
    defaultSessions?: number | null;
    createdAt: string;
    updatedAt: string;
    stats?: {
        recentBatches: number;
        pendingSessions: number;
        estimatedRevenue: number;
    };
}

export interface CreateConvenioData {
    code: string;
    name: string;
    sessionValue: number;
    billingMode?: BillingMode;
    notes?: string;
    guidePolicy?: GuidePolicy;
    defaultSessions?: number | null;
}

export interface UpdateConvenioData {
    name?: string;
    sessionValue?: number;
    billingMode?: BillingMode;
    notes?: string;
    active?: boolean;
    guidePolicy?: GuidePolicy;
    defaultSessions?: number | null;
}

export interface InsuranceBatch {
    _id: string;
    batchNumber: string;
    insuranceProvider: string;
    status: string;
    totalSessions: number;
    totalGross: number;
    totalNet: number;
    receivedAmount: number;
    createdAt: string;
}

// ============================================
// CONVÊNIOS - CRUD
// ============================================

export const getConvenios = async (includeInactive = false): Promise<Convenio[]> => {
    const response = await api.get('/insurance/admin/convenios', {
        params: { includeInactive }
    });
    return response.data.data;
};

export const getConvenio = async (code: string): Promise<Convenio> => {
    const response = await api.get(`/insurance/admin/convenios/${code}`);
    return response.data.data;
};

export const createConvenio = async (data: CreateConvenioData): Promise<Convenio> => {
    const response = await api.post('/insurance/admin/convenios', data);
    return response.data.data;
};

export const updateConvenio = async (code: string, data: UpdateConvenioData): Promise<Convenio> => {
    const response = await api.put(`/insurance/admin/convenios/${code}`, data);
    return response.data.data;
};

export const deactivateConvenio = async (code: string): Promise<void> => {
    await api.delete(`/insurance/admin/convenios/${code}`);
};

export const activateConvenio = async (code: string): Promise<Convenio> => {
    const response = await api.post(`/insurance/admin/convenios/${code}/ativar`);
    return response.data.data;
};

export const validateConvenioCode = async (code: string): Promise<{ valid: boolean; available: boolean; message?: string }> => {
    const response = await api.get(`/insurance/admin/convenios/validar-codigo/${code}`);
    return response.data;
};

export const importConvenios = async (convenios: CreateConvenioData[]): Promise<{ created: string[]; updated: string[]; errors: any[] }> => {
    const response = await api.post('/insurance/admin/convenios/importar', { convenios });
    return response.data.data;
};

// ============================================
// LOTES E FATURAMENTO
// ============================================

export const getInsuranceBatches = async (params?: { status?: string; month?: string }): Promise<InsuranceBatch[]> => {
    const response = await api.get('/insurance/batches', { params });
    return response.data.data;
};

export const getInsuranceBatch = async (id: string): Promise<InsuranceBatch> => {
    const response = await api.get(`/insurance/batches/${id}`);
    return response.data.data;
};

export const createInsuranceBatch = async (data: {
    insuranceProvider: string;
    startDate: string;
    endDate: string;
    items: any[];
}): Promise<{ batchId: string; batchNumber: string }> => {
    const response = await api.post('/insurance/batches', data);
    return response.data.data;
};

export const sealBatch = async (id: string): Promise<void> => {
    await api.post(`/insurance/batches/${id}/seal`);
};

export const reprocessBatch = async (id: string, data?: { itemIds?: string[]; reason?: string }): Promise<void> => {
    await api.post(`/insurance/batches/${id}/reprocess`, data);
};

// ============================================
// AUTOMAÇÃO CONVÊNIOS
// ============================================

export const getPendingSessions = async (code: string, startDate: string, endDate: string): Promise<{
    sessionsCount: number;
    sessionValue: number;
    totalEstimated: number;
    sessions: any[];
}> => {
    const response = await api.get(`/insurance/convenios/${code}/sessoes-pendentes`, {
        params: { startDate, endDate }
    });
    return response.data.data;
};

export const createBatchAuto = async (code: string, data: { startDate: string; endDate: string }): Promise<{
    batchId: string;
    batchNumber: string;
    sessionsCount: number;
    totalGross: number;
}> => {
    const response = await api.post(`/insurance/convenios/${code}/criar-lote`, data);
    return response.data.data;
};

export const getConvenioStats = async (code: string, startDate?: string, endDate?: string): Promise<{
    byStatus: Record<string, any>;
    pendingSessions: number;
    period: { startDate: string; endDate: string };
}> => {
    const response = await api.get(`/insurance/convenios/${code}/estatisticas`, {
        params: { startDate, endDate }
    });
    return response.data.data;
};

export const getDashboardSummary = async (): Promise<{
    batchesByStatus: Record<string, any>;
    convenios: Convenio[];
    totals: {
        totalSessions: number;
        totalGross: number;
        totalReceived: number;
        totalGlosa: number;
    };
}> => {
    const response = await api.get('/insurance/resumo');
    return response.data.data;
};

export const processConvenioReturn = async (batchId: string, data: {
    items: any[];
    receivedAmount: number;
    returnFile?: string;
}): Promise<{ totalApproved: number; totalRejected: number; totalGlosa: number }> => {
    const response = await api.post(`/insurance/lotes/${batchId}/processar-retorno`, data);
    return response.data.data;
};
