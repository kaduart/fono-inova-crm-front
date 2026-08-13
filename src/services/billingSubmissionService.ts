import api from './api';
import type { CommunicationRequest } from './communicationService';

export interface BillingSubmissionInvoiceDraft {
    invoiceNumber: string | null;
    invoiceDate: string | null;
    documentId: string | {
        _id: string;
        type: string;
        name: string;
        originalName?: string;
        url: string;
    } | null;
}

export interface BillingSubmissionAllocation {
    _id: string;
    sessionIds: string[];
    invoice: BillingSubmissionInvoiceDraft | null;
}

export interface BillingSubmissionSession {
    _id: string;
    date: string;
    time?: string | null;
    sessionType?: string | null;
    insuranceGuide?: {
        _id: string;
        number: string;
        specialty?: string;
        insurance: string;
    } | null;
}

export interface BillingSubmission {
    _id: string;
    patientId: { _id: string; fullName: string } | string;
    insuranceProviderId: { _id: string; code: string; name: string } | string;
    billingCompetence: string;
    sessionIds: Array<BillingSubmissionSession | string>;
    billingAllocations: BillingSubmissionAllocation[];
    status: 'draft' | 'finalized' | 'cancelled';
    __v: number;
    createdAt: string;
    updatedAt: string;
}

export interface BillingSubmissionDetail {
    submission: BillingSubmission;
    batches: unknown[];
    communications: CommunicationRequest[];
    summary: {
        sessions: number;
        allocations: number;
        invoices: number;
        communications: number;
        financial: { billed: number; received: number; rejected: number; total: number };
    };
}

export interface BillingAllocationInput {
    _id?: string;
    sessionIds: string[];
    invoice: {
        invoiceNumber?: string | null;
        invoiceDate?: string | null;
        documentId?: string | null;
    } | null;
}

export const createBillingSubmission = (data: {
    patientId: string;
    insuranceProviderId: string;
    billingCompetence: string;
    sessionIds: string[];
    billingAllocations?: BillingAllocationInput[];
}) => api.post<{ success: boolean; data: BillingSubmission }>('/v2/billing-submissions', data);

export const getBillingSubmission = (id: string) =>
    api.get<{ success: boolean; data: BillingSubmissionDetail }>(`/v2/billing-submissions/${id}`);

export const updateBillingSubmission = (id: string, data: {
    sessionIds?: string[];
    billingAllocations: BillingAllocationInput[];
    expectedVersion: number;
}) => api.patch<{ success: boolean; data: BillingSubmission }>(`/v2/billing-submissions/${id}`, data);

// Fallback, não solução. O custo por sessão da finalização passou a ser
// aproximadamente constante (escritas em lote no backend), então este teto só
// existe para o caso patológico. Enquanto o timeout global do axios for 15s,
// removê-lo reintroduziria o bug em lotes muito grandes.
const FINALIZE_TIMEOUT_MS = 60_000;

export const finalizeBillingSubmission = (id: string, options: { externalDeliveryReason?: string } = {}) =>
    api.post<{ success: boolean; data: BillingSubmissionDetail & { idempotent: boolean } }>(
        `/v2/billing-submissions/${id}/finalize`,
        options.externalDeliveryReason ? { externalDeliveryReason: options.externalDeliveryReason } : {},
        { timeout: FINALIZE_TIMEOUT_MS }
    );

/**
 * Um timeout de cliente NÃO significa que o backend falhou.
 *
 * Quando o axios aborta, o socket morre mas o handler do Express segue e a
 * transação do Mongo commita normalmente. O sintoma clássico era a interface
 * anunciar "não foi possível concluir" para um faturamento que tinha dado certo,
 * com os lotes já criados no banco.
 *
 * Erro de rede/timeout, portanto, não é resposta — é ausência de resposta. A
 * única leitura honesta é reler o submission e deixar o servidor dizer o que
 * aconteceu.
 */
export const isInconclusiveError = (error: unknown): boolean => {
    const candidate = error as { code?: string; response?: unknown } | null;
    if (!candidate) return false;
    if (candidate.response) return false; // o servidor respondeu: é falha de verdade
    return candidate.code === 'ECONNABORTED'
        || candidate.code === 'ETIMEDOUT'
        || candidate.code === 'ERR_NETWORK';
};

export type FinalizeOutcome =
    | { outcome: 'finalized'; detail: BillingSubmissionDetail }
    | { outcome: 'draft' }
    | { outcome: 'unknown' };

/**
 * Resolve o resultado real de uma finalização inconclusiva.
 *
 * - `finalized`: commitou. Tratar como sucesso — o retry seria no-op de qualquer
 *   forma, porque o backend devolve `idempotent: true`.
 * - `draft`: não commitou. Retry é seguro e usa a mesma chave (o próprio id do
 *   submission), então não duplica nada.
 * - `unknown`: nem a releitura respondeu. Não afirmar sucesso nem falha.
 */
export const confirmFinalizeOutcome = async (id: string): Promise<FinalizeOutcome> => {
    try {
        const response = await getBillingSubmission(id);
        const detail = response.data.data;
        if (detail.submission.status === 'finalized') return { outcome: 'finalized', detail };
        if (detail.submission.status === 'draft') return { outcome: 'draft' };
        return { outcome: 'unknown' };
    } catch {
        return { outcome: 'unknown' };
    }
};

export const cancelBillingSubmission = (id: string) =>
    api.post<{ success: boolean; data: BillingSubmission }>(`/v2/billing-submissions/${id}/cancel`);

export interface BillingSubmissionPagination {
    page: number;
    limit: number;
    total: number;
    pages: number;
}

// Um submission em `draft` reserva as sessões dele: nenhuma outra tentativa de
// faturamento pode usá-las até ele ser finalizado ou cancelado (guard
// BILLING_SUBMISSION_SESSION_RESERVED). Sem esta listagem, um preparo abandonado
// travava as sessões de forma invisível e o único sintoma era um 409 na próxima
// tentativa, sem dizer quem estava segurando.
export const listBillingSubmissions = (params: {
    status?: 'draft' | 'finalized' | 'cancelled';
    patientId?: string;
    insuranceProviderId?: string;
    billingCompetence?: string;
    page?: number;
    limit?: number;
} = {}) => api.get<{ success: boolean; data: BillingSubmission[]; pagination: BillingSubmissionPagination }>(
    '/v2/billing-submissions',
    { params }
);
