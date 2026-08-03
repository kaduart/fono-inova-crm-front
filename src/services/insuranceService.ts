// src/services/insuranceService.ts
/**
 * Service para gerenciamento de Convênios e Insurance
 */

import api from './api';

export type BillingMode = 'per_month' | 'per_guide';

export type RenewalType = 'end_of_month' | 'until_consumed' | 'fixed_date' | 'authorization_validity' | 'advance_authorization';
export type RenewalDay = 'last_day' | 'fixed_day';
export type MigrationStrategy = 'eligible' | 'manual' | 'none';

export interface GuidePolicy {
    renewalType: RenewalType;
    renewalDay?: RenewalDay;
    renewalDayOfMonth?: number | null;
    expirationWarningDays?: number;
    autoSuggestRenewal?: boolean;
    defaultMigrationStrategy?: MigrationStrategy;
    /** Dia do mês limite para envio da fatura/guia ao convênio (ex: 29) */
    billingSubmissionDay?: number | null;
    /** Para renewalType 'advance_authorization': dia do mês anterior para enviar a solicitação (ex: 20) */
    priorAuthRequestDay?: number | null;
    /** Para renewalType 'advance_authorization': e-mail de destino da solicitação de autorização prévia */
    priorAuthEmail?: string;
    /** E-mail de destino do faturamento (NF + lista de presença) — genérico, qualquer tipo de convênio */
    billingEmail?: string;
    /** Prazo pra emitir a NF em dias corridos a partir do atendimento (ex: 30) — quando não é dia fixo do mês */
    billingDeadlineDays?: number | null;
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
    /** Razão social — destinatário da NF */
    legalName?: string;
    /** CNPJ — destinatário da NF */
    taxId?: string;
    /** Alíquota (%) de imposto retido na fonte pelo convênio ao pagar (ex: ISS Unimed = 2.01) */
    issRate?: number;
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
    legalName?: string;
    taxId?: string;
    issRate?: number;
}

export interface UpdateConvenioData {
    name?: string;
    sessionValue?: number;
    billingMode?: BillingMode;
    notes?: string;
    active?: boolean;
    guidePolicy?: GuidePolicy;
    defaultSessions?: number | null;
    legalName?: string;
    taxId?: string;
    issRate?: number;
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
// AUTOMAÇÃO CONVÊNIOS
// ============================================
// NOTA (2026-07-29): getInsuranceBatches/getInsuranceBatch/createInsuranceBatch/
// sealBatch/reprocessBatch/getPendingSessions/createBatchAuto/getConvenioStats/
// getDashboardSummary foram removidos por não terem nenhum chamador na UI
// (investigação de arquitetura de convênio, ver back/docs para o pipeline real
// de faturamento em uso hoje). processConvenioReturn e importConvenios continuam
// aqui — pendentes de confirmação operacional antes de decidir remoção.

export const processConvenioReturn = async (batchId: string, data: {
    items: any[];
    receivedAmount: number;
    returnFile?: string;
}): Promise<{ totalApproved: number; totalRejected: number; totalGlosa: number }> => {
    const response = await api.post(`/insurance/lotes/${batchId}/processar-retorno`, data);
    return response.data.data;
};
