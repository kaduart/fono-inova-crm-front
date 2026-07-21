// src/services/billingDocumentService.ts
import API from './api';

export interface ComposeBillingDocumentsPayload {
    patientId: string;
    guideId: string;
    sessionIds?: string[];
    persist?: boolean;
}

export interface GeneratedDocument {
    patientDocumentId?: string;
    type: string;
    filename: string;
    url?: string;
    size?: number;
    metadata?: Record<string, any>;
}

export interface ExistingDocument {
    patientDocumentId: string;
    type: string;
    filename: string;
    url: string;
    createdAt: string;
}

export interface MissingDocument {
    type: string;
    label: string;
    required: boolean;
    reason: string;
}

export interface ComposeBillingDocumentsResult {
    patientId: string;
    guideId: string;
    insuranceProvider: string;
    patientName: string;
    generated: GeneratedDocument[];
    existing: ExistingDocument[];
    missing: MissingDocument[];
    periodLabel: string;
    sessionCount: number;
    totalGross: number;
    totalNet: number;
}

export async function composeBillingDocuments(payload: ComposeBillingDocumentsPayload) {
    return API.post<{ success: boolean; data: ComposeBillingDocumentsResult; error?: string }>(
        '/v2/billing-documents/compose',
        payload
    );
}
