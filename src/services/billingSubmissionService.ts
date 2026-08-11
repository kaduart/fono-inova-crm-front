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

export const finalizeBillingSubmission = (id: string) =>
    api.post<{ success: boolean; data: BillingSubmissionDetail & { idempotent: boolean } }>(`/v2/billing-submissions/${id}/finalize`);

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
