import api from './api';

export type CommunicationPurpose = 'authorization' | 'billing' | 'appeal' | 'documentation';

export type CommunicationStatus =
    | 'draft'
    | 'ready'
    | 'sending'
    | 'sent'
    | 'approved'
    | 'denied';

export interface PatientDocument {
    _id: string;
    patientId: string;
    type: string;
    name: string;
    originalName?: string;
    url: string;
    publicId?: string;
    mimeType?: string;
    size?: number;
    source: 'upload' | 'paste' | 'generated';
    createdAt: string;
}

export interface CommunicationRequest {
    _id: string;
    patientId: string;
    patientName?: string;
    insuranceProvider: string;
    insuranceName?: string;
    guideId?: string;
    specialty?: string;
    requestedSessions?: number;
    purpose: CommunicationPurpose;
    status: CommunicationStatus;
    notes?: string;
    packageStatus?: 'draft' | 'sent' | 'resent' | 'failed';
    lastEmailStatus?: 'success' | 'error' | null;
    createdAt: string;
    updatedAt: string;
}

export interface CommunicationPackage {
    _id: string;
    communicationId: string;
    attachments: Array<{
        documentId: PatientDocument | string;
        type: string;
        filename: string;
        hash: string;
        mimeType: string;
        size: number;
        includedAt: string;
    }>;
    status: 'draft' | 'sent' | 'resent' | 'failed';
    attempt: number;
    lastAttemptAt?: string;
    sentAt?: string;
    resentAt?: string;
}

export interface CommunicationEmailLog {
    _id: string;
    to: string;
    subject: string;
    status: 'success' | 'error';
    sentAt: string;
    protocol?: string;
    attempt: number;
    lastAttemptAt?: string;
    durationMs?: number;
    attachments: Array<{
        documentId?: string;
        publicId?: string;
        url?: string;
        name?: string;
        hash?: string;
        mimeType?: string;
        size?: number;
    }>;
}

export interface CommunicationRules {
    defaultEmail?: string;
    defaultSubject?: string;
    requiredDocuments?: Array<{
        type: string;
        label: string;
        required: boolean;
    }>;
}

export interface CommunicationDetail extends CommunicationRequest {
    package?: CommunicationPackage;
    emailLogs?: CommunicationEmailLog[];
    communicationRules?: CommunicationRules | null;
}

export interface CommunicationFilters {
    status?: CommunicationStatus;
    insurance?: string;
    patientId?: string;
    purpose?: CommunicationPurpose;
    month?: string;
    page?: number;
    limit?: number;
}

export interface CommunicationListResponse {
    success: boolean;
    data: CommunicationRequest[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}

export interface CommunicationDetailResponse {
    success: boolean;
    data: CommunicationDetail;
}

export const getCommunications = (filters: CommunicationFilters = {}) =>
    api.get<CommunicationListResponse>('/v2/communications', { params: filters });

export const getCommunication = (id: string) =>
    api.get<CommunicationDetailResponse>(`/v2/communications/${id}`);

export const createCommunication = (data: {
    patientId: string;
    insuranceProvider: string;
    guideId?: string;
    purpose?: CommunicationPurpose;
    specialty?: string;
    requestedSessions?: number;
    notes?: string;
}) => api.post<{ success: boolean; data: CommunicationRequest }>('/v2/communications', {
    ...data,
    purpose: data.purpose || 'authorization'
});

export const updateCommunicationStatus = (id: string, status: CommunicationStatus) =>
    api.patch<{ success: boolean; data: CommunicationRequest }>(`/v2/communications/${id}/status`, { status });

export const setCommunicationPackage = (id: string, documentIds: string[]) =>
    api.post<{ success: boolean; data: CommunicationPackage }>(`/v2/communications/${id}/package`, { documentIds });

export const sendCommunication = (id: string, payload: {
    to?: string;
    subject?: string;
    message?: string;
    template?: string;
}) => api.post<{ success: boolean; data: { jobId: string; status: string; message: string } }>(`/v2/communications/${id}/send`, payload);

export interface PaginationResponse {
    total: number;
    page: number;
    limit: number;
    pages: number;
}

export const getPatientDocuments = (patientId: string, type?: string) =>
    api.get<{ success: boolean; data: PatientDocument[]; pagination: PaginationResponse }>(`/v2/patient-documents/patient/${patientId}`, { params: { type } });

export const uploadPatientDocument = (formData: FormData) =>
    api.post<{ success: boolean; data: PatientDocument }>('/v2/patient-documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });

export const pastePatientDocument = (data: {
    patientId: string;
    type: string;
    name?: string;
    base64Image: string;
    mimeType?: string;
}) => api.post<{ success: boolean; data: PatientDocument }>('/v2/patient-documents/paste', data);

export const getCommunicationJobStatus = (id: string, jobId: string) =>
    api.get<{ success: boolean; data: { jobId: string; state: string; attemptsMade: number; failedReason: string | null; updatedAt: string } }>(`/v2/communications/${id}/job/${jobId}/status`);

export const getCommunicationRules = (insurance: string, purpose: CommunicationPurpose = 'authorization') =>
    api.get<{ success: boolean; data: CommunicationRules }>(`/v2/communications/insurance/${insurance}/rules`, { params: { purpose } });

export interface CommunicationRulesInput {
    defaultEmail?: string;
    defaultSubject?: string;
    requiredDocuments?: Array<{
        type: string;
        label: string;
        required?: boolean;
    }>;
    notes?: string;
}

export const updateCommunicationRules = (insurance: string, data: CommunicationRulesInput, purpose: CommunicationPurpose = 'authorization') =>
    api.patch<{ success: boolean; data: CommunicationRules }>(`/v2/communications/insurance/${insurance}/rules`, data, { params: { purpose } });
