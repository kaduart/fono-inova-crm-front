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
