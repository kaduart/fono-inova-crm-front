import { PaymentTotalsResponse } from "../utils/types/types";
import API from "./api";

export interface FinancialRecord {
    _id: string;
    date: string;
    description: string;
    amount: number;
    paid: boolean;
    status: string;
    specialty: string;
    createdAt: string;
    patientId: string;
    doctorId: string;
    doctor?: { _id: string; fullName?: string; specialty?: string };
    serviceType: string;
    paymentMethod: string;
    billingType?: 'particular' | 'convenio' | 'liminar' | 'sus';
    notes: string;
    packageId: string;
    package?: { _id: string; name?: string };
    advanceSessions?: any[];
    sessionId: string;
    advancedSessions: string[];
    patient?: { _id: string; fullName?: string; email?: string; phoneNumber?: string };
    appointment?: { date: string; time: string; status: string };
    // 🚨 Campos para identificar registros de appointment (não são payments reais)
    __isAppointmentRecord?: boolean;
    __appointmentId?: string;
    // 🚨 Flag para saber se tem payment real editável
    __hasPayment?: boolean;
    __realPaymentId?: string;
    __isPackageAppointment?: boolean;
}

export interface Summary {
    total: number;
    paidCount: number;
    unpaidCount: number;
}

// ============================================================
// 🏥 CONVÊNIOS
// ============================================================

export interface InsurancePaymentData {
    patientId: string;
    doctorId: string;
    sessionId?: string;
    packageId?: string;
    serviceType?: string;
    insuranceProvider: string;
    grossAmount: number;
    authorizationCode?: string;
    paymentDate?: string;  // Data do atendimento
    notes?: string;
}

export interface InsurancePayment {
    _id: string;
    patient: { _id: string; fullName: string };
    doctor: { _id: string; fullName: string };
    serviceType: string;
    paymentDate: string;
    billingType: 'convenio';
    insurance: {
        provider: string;
        grossAmount: number;
        status: 'pending_billing' | 'billed' | 'received' | 'partial' | 'glosa';
        authorizationCode?: string;
        billedAt?: string;
        receivedAt?: string;
        expectedReceiptDate?: string;
        receivedAmount?: number;
        glosaReason?: string;
    };
}

export interface InsuranceReceivableGroup {
    _id: string; // provider name
    totalPending: number;
    count: number;
    patients: Array<{
        patientId: string;
        patientName: string;
        total: number;
        count: number;
        payments: Array<{
            paymentId: string;
            grossAmount: number;
            status: string;
            paymentDate: string;
            authorizationCode?: string;
        }>;
    }>;
}

// Registrar atendimento de convênio
export const createInsurancePayment = (data: InsurancePaymentData) =>
    API.post<{ success: boolean; data: InsurancePayment }>('/payments/insurance', data);

// Listar contas a receber de convênios (V2)
export const getInsuranceReceivables = (filters?: { provider?: string; status?: string; month?: string }) =>
    API.get<{ success: boolean; data: InsuranceReceivableGroup[]; summary: { totalProviders: number; grandTotal: number } }>(
        '/v2/payments/insurance/receivables',
        { params: filters }
    );

// Listar todos os pagamentos de convênio
export const getInsurancePayments = (filters?: { provider?: string; status?: string }) =>
    API.get<{ success: boolean; data: InsurancePayment[] }>(
        '/payments',
        { params: { ...filters, billingType: 'convenio' } }
    );

// Marcar como faturado
export const markInsuranceAsBilled = (id: string) =>
    API.patch<{ success: boolean; data: InsurancePayment }>(`/payments/insurance/${id}/bill`);

// Registrar recebimento
export const receiveInsurancePayment = (id: string, data: { receivedAmount?: number; receivedDate?: string; notes?: string }) =>
    API.patch<{ success: boolean; data: InsurancePayment }>(`/payments/insurance/${id}/receive`, data);

// Faturar em lote (V2)
export const faturarConvenioLote = (data: { paymentIds: string[]; dataFaturamento: string; notaFiscal?: string }) =>
    API.post<{ success: boolean; data: any }>('/v2/financial/convenio/faturar-lote', data);

// Receber em lote (V2)
export const receberConvenioLote = (data: { paymentIds: string[]; dataRecebimento: string }) =>
    API.post<{ success: boolean; data: any }>('/v2/financial/convenio/receber-lote', data);

// 🆕 V2: Faturar / Receber convênio por sessionId (ledger + transaction garantidos)
export const billInsuranceSession = (sessionId: string, data?: { billedAmount?: number; billedAt?: string; notes?: string }) =>
    API.patch<{ success: boolean; data: any }>(`/v2/insurance/session/${sessionId}/bill`, data);

export const receiveInsuranceSession = (sessionId: string, data: { receivedAmount: number; receivedDate?: string }) =>
    API.patch<{ success: boolean; data: any }>(`/v2/insurance/session/${sessionId}/receive`, data);

// CRUD básicos
export const getPayments = (filters: Record<string, any> = {}) =>
    API.get<FinancialRecord[]>('/payments', { params: filters });

// 🚀 NOVO: V2 Payments Projection (rápido, sem populate)
// Substitui getPayments() para leitura - mantém legado para compatibilidade
export const getPaymentsV2 = (filters: {
    month?: string;
    startDate?: string;
    endDate?: string;
    status?: 'paid' | 'pending' | 'partial' | 'all';
    category?: 'particular' | 'package' | 'insurance' | 'expense' | 'all';
    method?: 'pix' | 'cash' | 'card' | 'insurance' | 'all';
    search?: string;
    page?: number;
    limit?: number;
} = {}) =>
    API.get('/v2/payments', { params: filters });

// Feature Flag para usar V2 ou legado
export const USE_V2_PAYMENTS = true;

// 🚀 Feature Flag: USE_V2_TOTALS
// Quando true: usa /v2/totals (event-driven + snapshot)
// Quando false: usa /payments/totals (legado síncrono)
const USE_V2_TOTALS = true;

export const getPaymentTotals = async (filters: {
    period?: "day" | "week" | "month" | "year" | "custom";
    startDate?: string;
    endDate?: string;
    doctorId?: string;
    paymentMethod?: string;
    serviceType?: string;
    status?: "paid" | "pending" | "partial";
} = {}): Promise<PaymentTotalsResponse> => {
    if (USE_V2_TOTALS) {
        // 🚀 V2: Event-driven com snapshot (mais rápido, escalável)
        try {
            const res = await API.get<PaymentTotalsResponse>("/v2/totals", {
                params: {
                    date: filters.startDate || new Date().toISOString().split('T')[0],
                    period: filters.period || 'month',
                    clinicId: filters.doctorId, // V2 usa clinicId, não doctorId
                },
            });
            return res.data;
        } catch (error) {
            console.warn('[PaymentService] V2 totals falhou, fallback para legado:', error);
            // Fallback para legado se V2 falhar
        }
    }
    
    // Legado: Síncrono (mantido para compatibilidade)
    const res = await API.get<PaymentTotalsResponse>("/payments/totals", {
        params: filters,
    });
    return res.data;
};

// ============================================================
// 🚀 MIGRAÇÃO V2 — Adapter de Payments
// ============================================================
export const USE_V2_PAYMENT_WRITES = true;

/**
 * Converte payload V1 para contrato V2 de /v2/payments/request
 * ⚠️ V2 ainda NÃO suporta advanceServices/isAdvancePayment
 */
export function buildPaymentPayloadV2(data: Partial<FinancialRecord>): {
    type: string;
    patientId: string;
    amount: number;
    paymentMethod: string;
    notes?: string;
    doctorId?: string;
    appointmentId?: string;
    [key: string]: any;
} {
    const type = data.appointment?._id || data.__appointmentId
        ? 'appointment_payment'
        : 'standalone';

    return {
        type,
        patientId: data.patientId || data.patient?._id || '',
        doctorId: data.doctorId || data.doctor?._id,
        appointmentId: data.__appointmentId || data.appointment?._id,
        amount: typeof data.amount === 'number' ? data.amount : 0,
        paymentMethod: data.paymentMethod || 'pix',
        notes: data.notes || data.description,
    };
}

/**
 * Detecta se o pagamento usa recursos ainda não suportados pelo V2
 */
function requiresV1(data: Partial<FinancialRecord>): boolean {
    return !!(
        data.advanceSessions?.length ||
        data.advancedSessions?.length ||
        (data as any).isAdvancePayment ||
        (data as any).advanceServices?.length
    );
}

export const getPayment = (id: string) =>
    API.get<FinancialRecord>(`/payments/${id}`);

export const createPayment = async (data: Partial<FinancialRecord>) => {
    // 🚀 V2: pagamentos simples (sem advanceServices)
    if (USE_V2_PAYMENT_WRITES && !requiresV1(data)) {
        const v2Payload = buildPaymentPayloadV2(data);
        console.log('[PaymentService] createPayment → V2 (standalone)', v2Payload);
        const res = await API.post<{ success: boolean; data: any }>('/v2/payments/request', v2Payload);
        return res.data?.data || res.data;
    }

    // 🔄 Legado: pagamentos com advanceServices (V2 ainda não suporta)
    console.log('[PaymentService] createPayment → V1 (advanceServices detected)');
    const res = await API.post<FinancialRecord>('/payments', data);
    return res.data;
};

export const updatePayment = async (
    id: string,
    data: {
        status?: 'pending' | 'paid' | 'canceled';
        amount?: number;
        date?: string | Date;
        specialty?: string;
        paymentMethod?: string;
        serviceType?: string;
        advanceServices?: any[];
    }
) => {
    const processedData = {
        ...data,
        date: data.date instanceof Date ? data.date.toISOString() : data.date
    };

    // 🚀 V2: updates simples (sem advanceServices)
    if (USE_V2_PAYMENT_WRITES && !data.advanceServices?.length) {
        const v2Payload: any = {};
        if (data.amount !== undefined) v2Payload.amount = data.amount;
        if (data.paymentMethod !== undefined) v2Payload.paymentMethod = data.paymentMethod;
        if (data.status !== undefined) v2Payload.status = data.status;
        if (data.serviceType !== undefined) v2Payload.serviceType = data.serviceType;
        if (data.specialty !== undefined) v2Payload.specialty = data.specialty;
        if (data.date !== undefined) v2Payload.paymentDate = processedData.date;

        if (Object.keys(v2Payload).length > 0) {
            console.log('[PaymentService] updatePayment → V2', v2Payload);
            const res = await API.patch<{ success: boolean; data: any }>(`/v2/payments/${id}`, v2Payload);
            return res.data?.data || res.data;
        }
    }

    // 🔄 Legado
    console.log('[PaymentService] updatePayment → V1');
    const res = await API.patch<FinancialRecord>(`/payments/${id}`, processedData);
    return res.data;
};

export const markPaymentAsPaid = async (paymentId: string) => {
    if (USE_V2_PAYMENT_WRITES) {
        console.log('[PaymentService] markPaymentAsPaid → V2');
        const res = await API.patch<{ success: boolean; data: any }>(`/v2/payments/${paymentId}`, {
            status: 'paid'
        });
        return res.data?.data || res.data;
    }

    const response = await API.patch(`/payments/${paymentId}/mark-as-paid`);
    return response.data;
};

export const deletePayment = (id: string) =>
    API.delete<void>(`/payments/${id}`);



// Detalhes de sessões agendadas
// Relatórios e exportação
export const getReport = (params: any) => API.get('/payments/report', { params });
export const getPaymentSummary = () => API.get<Summary>('/payments/report/summary');

// Export CSV
export const exportCSV = (filters: Record<string, any> = {}) => {
    return API.get<Blob>('/payments/export/csv', {
        params: filters,
        responseType: 'blob',
    });
};

// Export PDF
export const exportPDF = (filters: Record<string, any> = {}) => {
    return API.get<Blob>('/payments/export/pdf', {
        params: filters,
        responseType: 'blob',
    });
};

export const addManualPayment = (data: {
    packageId: string;
    amount: number;
    paymentMethod?: string;
    paymentDate?: string;
    note?: string;
}) => API.post('/payments/add', data);

// ============================================================
// 💰 SALDO DEVEDOR / CONTA CORRENTE
// ============================================================

export const getPatientBalance = async (patientId: string) => {
    // Adiciona timestamp para evitar cache
    const response = await API.get(`/payments/balance/${patientId}?_t=${Date.now()}`);
    return response.data?.data || response.data;
};

export const addBalanceDebit = (patientId: string, data: {
    amount: number;
    description?: string;
    sessionId?: string;
    appointmentId?: string;
}) => {
    return API.post(`/payments/balance/${patientId}/debit`, data);
};

export const addBalancePayment = (patientId: string, data: {
    amount: number;
    paymentMethod: string;
    description?: string;
    sessionId?: string;
    appointmentId?: string;
}) => {
    return API.post(`/payments/balance/${patientId}/payment`, data);
};

// 💰 Nova função para múltiplas formas de pagamento
export const addBalancePaymentMulti = (patientId: string, data: {
    payments: Array<{
        amount: number;
        paymentMethod: string;
        description?: string;
        sessionId?: string;
        appointmentId?: string;
    }>;
    totalAmount: number;
    debitIds: string[]; // IDs dos débitos selecionados para marcar como pagos
}) => {
    return API.post(`/payments/balance/${patientId}/payment-multi`, data);
};

export const getBalanceDebtors = () => {
    return API.get('/payments/balance/debtors');
};

export const deleteBalanceTransaction = (patientId: string, transactionId: string, reason: string) => {
    return API.delete(`/payments/balance/${patientId}/transaction/${transactionId}`, { data: { reason } });
};

export const editBalanceTransaction = (patientId: string, transactionId: string, data: { amount?: number; description?: string }) => {
    return API.patch(`/payments/balance/${patientId}/transaction/${transactionId}`, data);
};

// ============================================================
// 🚀 V2 EVENT-DRIVEN (NOVA ARQUITETURA)
// ============================================================

// Feature Flags V2
const USE_V2_PAYMENT_CREATE = true;
const USE_V2_PAYMENT_MULTI = true;

// Tipos V2
export interface V2PaymentRequest {
    appointmentId?: string;
    patientId: string;
    doctorId?: string;
    amount: number;
    paymentMethod?: string;
    notes?: string;
    debitIds?: string[];
    payments?: Array<{
        amount: number;
        paymentMethod: string;
        description?: string;
    }>;
    isMultiPayment?: boolean;
}

export interface V2PaymentResponse {
    success: boolean;
    data: {
        eventId: string;
        correlationId: string;
        idempotencyKey: string;
        jobId: string;
        status: 'pending' | 'processing' | 'processed' | 'failed';
        amount: number;
        paymentMethod: string;
        checkStatusUrl: string;
    };
}

export interface V2PaymentStatus {
    success: boolean;
    data: {
        eventId: string;
        eventType: string;
        status: 'pending' | 'processing' | 'processed' | 'failed';
        aggregateId: string;
        correlationId: string;
        createdAt: string;
        processedAt?: string;
        error?: string;
        payment?: {
            id: string;
            status: string;
            amount: number;
            method: string;
            paidAt?: string;
        };
    };
}

// Flag para cancelar polling
let pollingCancelled = false;
export const cancelPaymentPolling = () => {
    pollingCancelled = true;
};

/**
 * 🔍 POLLING DE STATUS V2
 * Consulta status do pagamento até completar ou falhar
 * 
 * @param eventId - ID do evento retornado na criação
 * @param maxAttempts - Máximo de tentativas (default: 20)
 * @param interval - Intervalo entre tentativas em ms (default: 1500)
 * @returns Status final do pagamento
 */
export const pollPaymentStatus = async (
    eventId: string, 
    maxAttempts = 20, 
    interval = 1500
): Promise<V2PaymentStatus['data']> => {
    console.log(`[V2] Iniciando polling para eventId: ${eventId}`);
    pollingCancelled = false;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Verifica se foi cancelado
        if (pollingCancelled) {
            throw new Error('POLLING_CANCELLED');
        }
        
        try {
            const response = await API.get<V2PaymentStatus>(`/v2/payments/status/${eventId}`);
            const status = response.data?.data?.status;
            
            console.log(`[V2] Poll ${attempt + 1}/${maxAttempts} - Status: ${status}`);
            
            // Sucesso
            if (status === 'processed') {
                console.log(`[V2] Pagamento processado com sucesso:`, response.data.data);
                return response.data.data;
            }
            
            // Falha
            if (status === 'failed') {
                console.error(`[V2] Pagamento falhou:`, response.data.data.error);
                throw new Error(`PAYMENT_FAILED: ${response.data.data.error || 'Erro no processamento'}`);
            }
            
            // Ainda processando, aguarda
            await new Promise(resolve => setTimeout(resolve, interval));
            
        } catch (error: any) {
            // Se for erro de polling cancelado, propaga
            if (error.message === 'POLLING_CANCELLED') {
                throw error;
            }
            
            // Loga erro mas continua tentando
            console.warn(`[V2] Erro no poll ${attempt + 1}:`, error.message);
            
            // Se for 404, pode ser que o evento ainda não foi persistido
            if (error.response?.status === 404) {
                console.log(`[V2] Evento ainda não encontrado, aguardando...`);
            }
            
            await new Promise(resolve => setTimeout(resolve, interval));
        }
    }
    
    throw new Error('POLLING_TIMEOUT');
};

/**
 * 💳 CRIAR PAGAMENTO V2 (Event-Driven)
 * POST /api/v2/payments/request
 * 
 * Fluxo:
 * 1. Envia request para fila
 * 2. Retorna imediatamente com eventId
 * 3. Worker processa em background
 * 
 * @param data - Dados do pagamento
 * @returns Resposta V2 com eventId para polling
 */
export const createPaymentV2 = async (data: V2PaymentRequest): Promise<V2PaymentResponse> => {
    console.log('[V2] Criando pagamento:', { patientId: data.patientId, amount: data.amount });
    
    const response = await API.post<V2PaymentResponse>('/v2/payments/request', data);
    
    console.log('[V2] Pagamento enfileirado:', {
        eventId: response.data.data.eventId,
        jobId: response.data.data.jobId,
        status: response.data.data.status
    });
    
    return response.data;
};

/**
 * 💰 PAYMENT-MULTI V2 (Event-Driven)
 * POST /api/v2/payments/balance/:patientId/multi
 * 
 * Para pagamentos de saldo devedor com múltiplas formas
 * 
 * @param patientId - ID do paciente
 * @param data - Dados do pagamento múltiplo
 * @returns Resposta V2 com eventId para polling
 */
export const addBalancePaymentMultiV2 = async (
    patientId: string,
    data: {
        payments: Array<{
            amount: number;
            paymentMethod: string;
            description?: string;
        }>;
        totalAmount: number;
        debitIds: string[];
    }
): Promise<V2PaymentResponse> => {
    console.log('[V2] Criando payment-multi:', { 
        patientId, 
        totalAmount: data.totalAmount,
        debitsCount: data.debitIds.length 
    });
    
    const response = await API.post<V2PaymentResponse>(
        `/v2/payments/balance/${patientId}/multi`, 
        data
    );
    
    console.log('[V2] Payment-multi enfileirado:', {
        eventId: response.data.data.eventId,
        debitsCount: data.debitIds.length
    });
    
    return response.data;
};

/**
 * 🔄 CRIAR PAGAMENTO COM FALLBACK V2 → V1
 * 
 * Tenta V2 primeiro (event-driven), se falhar usa legado (sync)
 * Implementa polling automático para V2
 * 
 * @param data - Dados do pagamento
 * @returns Resultado do pagamento (V2 ou V1)
 */
export const createPaymentWithFallback = async (data: V2PaymentRequest) => {
    // Tenta V2 se feature flag estiver ativa
    if (USE_V2_PAYMENT_CREATE) {
        try {
            console.log('[PaymentService] Tentando V2...');
            
            // 1. Cria na V2
            const v2Response = await createPaymentV2(data);
            const { eventId } = v2Response.data;
            
            // 2. Faz polling do status
            const finalStatus = await pollPaymentStatus(eventId);
            
            console.log('[PaymentService] V2 sucesso:', {
                eventId,
                paymentId: finalStatus.payment?.id,
                status: finalStatus.status
            });
            
            return {
                success: true,
                source: 'v2' as const,
                eventId,
                data: finalStatus.payment,
                status: finalStatus
            };
            
        } catch (error: any) {
            // Se foi cancelado, não faz fallback
            if (error.message === 'POLLING_CANCELLED') {
                console.log('[PaymentService] Polling cancelado pelo usuário');
                throw error;
            }
            
            console.warn('[PaymentService] V2 falhou, fallback para V1:', error.message);
            // Continua para fallback
        }
    }
    
    // Fallback para V1 (legado)
    console.log('[PaymentService] Usando V1 (legado)');
    const v1Response = await createPayment(data as Partial<FinancialRecord>);
    
    return {
        success: true,
        source: 'v1' as const,
        data: v1Response.data,
        status: { status: 'completed' }
    };
};

/**
 * 🔄 PAYMENT-MULTI COM FALLBACK V2 → V1
 * 
 * Tenta V2 primeiro, se falhar usa legado
 * 
 * @param patientId - ID do paciente  
 * @param data - Dados do pagamento múltiplo
 * @returns Resultado do pagamento (V2 ou V1)
 */
export const addBalancePaymentMultiWithFallback = async (
    patientId: string,
    data: {
        payments: Array<{
            amount: number;
            paymentMethod: string;
            description?: string;
        }>;
        totalAmount: number;
        debitIds: string[];
    }
) => {
    // Tenta V2 se feature flag estiver ativa
    if (USE_V2_PAYMENT_MULTI) {
        try {
            console.log('[PaymentService] Tentando V2 multi...');
            
            // 1. Cria na V2
            const v2Response = await addBalancePaymentMultiV2(patientId, data);
            const { eventId } = v2Response.data;
            
            // 2. Faz polling do status
            const finalStatus = await pollPaymentStatus(eventId);
            
            console.log('[PaymentService] V2 multi sucesso:', {
                eventId,
                paymentId: finalStatus.payment?.id,
                debitsPaid: data.debitIds.length
            });
            
            return {
                success: true,
                source: 'v2' as const,
                eventId,
                data: finalStatus.payment,
                status: finalStatus
            };
            
        } catch (error: any) {
            // Se foi cancelado, não faz fallback
            if (error.message === 'POLLING_CANCELLED') {
                console.log('[PaymentService] Polling cancelado pelo usuário');
                throw error;
            }
            
            console.warn('[PaymentService] V2 multi falhou, fallback:', error.message);
            // Continua para fallback
        }
    }
    
    // Fallback para V1 (legado)
    console.log('[PaymentService] Usando V1 multi (legado)');
    const v1Response = await addBalancePaymentMulti(patientId, data);
    
    return {
        success: true,
        source: 'v1' as const,
        data: v1Response.data,
        status: { status: 'completed' }
    };
};
