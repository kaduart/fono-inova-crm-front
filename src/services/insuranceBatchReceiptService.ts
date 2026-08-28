import API from './api';

export interface InvoiceReceivableGuide {
    guideId: string | null;
    number: string;
    specialty: string | null;
    sessions: number;
    grossAmount: number;
    receivedSessions: number;
    receivedAmount: number;
    pendingSessions: number;
    pendingAmount: number;
    status: 'pending' | 'partial' | 'received';
    // InsuranceBatch(es) de origem desta guia — uma mesma guia pode ter sido
    // enviada em remessas separadas sob a mesma NF; a baixa precisa acionar
    // cada batch de origem.
    batchIds: string[];
}

export interface InvoiceReceivable {
    batchId: string;
    // Todos os InsuranceBatch mesclados sob este número de NF (ver
    // mergeReceivablesByInvoice no backend). Para uma NF sem duplicidade,
    // é um array de 1 elemento igual a [batchId].
    batchIds: string[];
    billingSubmissionId: string | null;
    invoiceNumber: string;
    invoiceDate: string | null;
    invoiceDocumentId: string | null;
    patient: { _id: string; fullName: string } | null;
    insuranceProvider: string;
    status: 'sent' | 'processing' | 'partial' | 'received';
    origin: 'current_billing' | 'legacy_reconciliation';
    sessions: number;
    guides: InvoiceReceivableGuide[];
    totalGross: number;
    issRate: number | null;
    issAmount: number | null;
    totalNet: number;
    receivedAmount: number;
    pendingAmount: number;
    receivedAt: string | null;
    createdAt: string;
}

export async function getInvoiceReceivables(status: 'pending' | 'received' | 'all' = 'pending') {
    const response = await API.get<{ success: boolean; data: InvoiceReceivable[] }>(
        '/v2/insurance-batches/receivables',
        { params: { status } }
    );
    return response.data.data;
}

export async function receiveInvoiceBatch(
    batchId: string,
    data: { receivedDate: string; guideIds?: string[] }
) {
    const response = await API.post<{ success: boolean; data: {
        idempotent: boolean;
        batchId: string;
        invoiceNumber: string;
        status: string;
        paymentsReceived: number;
        receivedAmount: number;
    } }>(`/v2/insurance-batches/${batchId}/receive`, data);
    return response.data.data;
}

export async function updateInvoiceNumber(
    batchId: string,
    invoiceNumber: string
) {
    const response = await API.patch<{ success: boolean; data: {
        batchId: string;
        invoiceNumber: string;
        previousInvoiceNumber: string | null;
    } }>(`/v2/insurance-batches/${batchId}/invoice-number`, { invoiceNumber });
    return response.data.data;
}

