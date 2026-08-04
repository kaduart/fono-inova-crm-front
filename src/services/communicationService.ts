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
    guideNumber?: string | null;
    specialty?: string;
    requestedSessions?: number;
    purpose: CommunicationPurpose;
    status: CommunicationStatus;
    notes?: string;
    packageStatus?: 'draft' | 'sent' | 'resent' | 'failed';
    lastEmailStatus?: 'success' | 'error' | null;
    lastEmailType?: CommunicationEmailType | null;
    lastEmailTo?: string | null;
    lastEmailSubject?: string | null;
    lastEmailSentAt?: string | null;
    lastEmailProtocol?: string | null;
    lastEmailAttachments?: Array<{ name?: string; mimeType?: string; size?: number }>;
    invoiceNumber?: string | null;
    invoiceDate?: string | null;
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

// Constante compartilhada com o backend (models/CommunicationEmailLog.js EmailLogType) —
// nunca usar string solta ('resend', 'complement'...) pra não divergir dos dois lados.
export const CommunicationEmailType = {
    FIRST_SEND: 'first_send',
    RESEND: 'resend',
    COMPLEMENT: 'complement',
    MANUAL: 'manual'
} as const;
export type CommunicationEmailType = typeof CommunicationEmailType[keyof typeof CommunicationEmailType];

// Rótulo de exibição por tipo — badge só aparece pra tentativas que não são o 1º envio
// (por isso FIRST_SEND fica de fora). Centralizado aqui pra EnviosTab e DocumentSendDrawer
// nunca divergirem no texto mostrado pro mesmo tipo.
export const CommunicationEmailTypeLabels: Partial<Record<CommunicationEmailType, string>> = {
    [CommunicationEmailType.RESEND]: 'Reenvio',
    [CommunicationEmailType.COMPLEMENT]: 'Complemento',
    [CommunicationEmailType.MANUAL]: 'Manual'
};

export interface CommunicationEmailLog {
    _id: string;
    to: string;
    subject: string;
    message?: string | null;
    status: 'success' | 'error' | 'pending';
    type?: CommunicationEmailType;
    reason?: string | null;
    provider?: string | null;
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

// Uma linha por TENTATIVA de envio (não por comunicação) — junta o log com o
// contexto do paciente/convênio/guia, pra alimentar a aba "Envios" como um
// histórico/auditoria de verdade, não um resumo do último envio.
export interface CommunicationEmailLogEntry extends CommunicationEmailLog {
    communicationId: string;
    patientId?: string;
    patientName?: string;
    insuranceProvider: string;
    insuranceName?: string;
    guideNumber?: string | null;
    purpose: CommunicationPurpose;
    communicationStatus?: CommunicationStatus;
}

export interface CommunicationEmailLogFilters {
    purpose?: CommunicationPurpose;
    insurance?: string;
    patientId?: string;
    page?: number;
    limit?: number;
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
    invoiceNumber?: string;
    invoiceDate?: string;
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
    sendType?: typeof CommunicationEmailType.RESEND | typeof CommunicationEmailType.COMPLEMENT;
    reason?: string;
}) => api.post<{ success: boolean; data: { jobId: string; status: string; message: string } }>(`/v2/communications/${id}/send`, payload);

export const getCommunicationEmailLogs = (filters: CommunicationEmailLogFilters = {}) =>
    api.get<{ success: boolean; data: CommunicationEmailLogEntry[]; pagination: PaginationResponse }>('/v2/communications/email-logs', { params: filters });

export interface PaginationResponse {
    total: number;
    page: number;
    limit: number;
    pages: number;
}

export const getPatientDocuments = (patientId: string, type?: string) =>
    api.get<{ success: boolean; data: PatientDocument[]; pagination: PaginationResponse }>(`/v2/patient-documents/patient/${patientId}`, { params: { type } });

// Timeout dedicado (bem acima do padrão global de 15s da instância `api`): uploads
// de documentos de convênio costumam ter alguns MB e, em upload mais lento, passavam
// dos 15s e o axios abortava a conexão no meio do multipart (Request aborted no
// multer) — achado em produção em 2026-07-27.
const DOCUMENT_UPLOAD_TIMEOUT_MS = 60000;

export const uploadPatientDocument = (formData: FormData) =>
    api.post<{ success: boolean; data: PatientDocument }>('/v2/patient-documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: DOCUMENT_UPLOAD_TIMEOUT_MS
    });

export const pastePatientDocument = (data: {
    patientId: string;
    type: string;
    name?: string;
    base64Image: string;
    mimeType?: string;
}) => api.post<{ success: boolean; data: PatientDocument }>('/v2/patient-documents/paste', data, {
    timeout: DOCUMENT_UPLOAD_TIMEOUT_MS
});

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
