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
    notes: string;
    packageId: string;
    package?: { _id: string; name?: string };
    advanceSessions?: any[];
    sessionId: string;
    advancedSessions: string[];
    patient?: { _id: string; fullName?: string; email?: string; phoneNumber?: string };
    appointment?: { date: string; time: string; status: string };
}

export interface Summary {
    total: number;
    paidCount: number;
    unpaidCount: number;
}

// Tipos para fechamento diário
export interface DailyClosingReport {
    date: string;
    period: {
        start: string;
        end: string;
    };
    totals: {
        scheduled: {
            count: number;
            value: number;
        };
        completed: {
            count: number;
            value: number;
        };
        confirmed: {
            count: number;
            value: number;
        };
        payments: {
            count: number;
            value: number;
            methods: {
                dinheiro: number;
                pix: number;
                cartão: number;
            };
        };
        absences: {
            count: number;
            estimatedLoss: number;
        };
    };
    byProfessional: Array<{
        doctorId: string;
        doctorName: string;
        specialty: string;
        scheduled: number;
        scheduledValue: number;
        completed: number;
        completedValue: number;
        absences: number;
        payments: {
            total: number;
            methods: {
                dinheiro: number;
                pix: number;
                cartão: number;
            };
        };
    }>;
}

export interface DailySession {
    id: string;
    date: string;
    time: string;
    patient: string;
    patientPhone?: string;
    patientEmail?: string;
    doctor: string;
    specialty: string;
    sessionType: string;
    value: number;
    status?: string;
    confirmedAbsence?: boolean;
    notes?: string;
    duration?: number;
}

export interface DailyPayment {
    id: string;
    date: string;
    patient: string;
    doctor: string;
    specialty: string;
    sessionType: string;
    sessionDate?: string;
    amount: number;
    paymentMethod: string;
    notes?: string;
}

export interface DailyAbsence {
    id: string;
    date: string;
    time: string;
    patient: string;
    patientPhone?: string;
    doctor: string;
    specialty: string;
    sessionType: string;
    value: number;
    confirmedAbsence: boolean;
    notes?: string;
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

// CRUD básicos
export const getPayments = (filters: Record<string, any> = {}) =>
    API.get<FinancialRecord[]>('/payments', { params: filters });

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

export const getPayment = (id: string) =>
    API.get<FinancialRecord>(`/payments/${id}`);

export const createPayment = (data: Partial<FinancialRecord>) =>
    API.post<FinancialRecord>('/payments', data);

export const updatePayment = (
    id: string,
    data: {
        status?: 'pending' | 'paid' | 'canceled';
        amount?: number;
        date?: string | Date;
        specialty?: string,
        paymentMethod?: string;
        serviceType?: string;
    }
) => {
    const processedData = {
        ...data,
        date: data.date instanceof Date ? data.date.toISOString() : data.date
    };

    return API.patch<FinancialRecord>(`/payments/${id}`, processedData);
};

export const markPaymentAsPaid = async (paymentId: string) => {
    const response = await API.patch(`/payments/${paymentId}/mark-as-paid`);
    return response.data;
};

export const deletePayment = (id: string) =>
    API.delete<void>(`/payments/${id}`);

// 🚀 Feature Flag: USE_V2_DAILY_CLOSING
const USE_V2_DAILY_CLOSING = false;

// Fechamento diário completo (V2 com fallback para legado)
export const getDailyClosing = async (date?: string): Promise<DailyClosingReport> => {
    if (USE_V2_DAILY_CLOSING) {
        // 🚀 V2: Event-driven (GET separado do POST /run)
        try {
            const res = await API.get<{ success: boolean; data: DailyClosingReport; message?: string }>('/v2/daily-closing', {
                params: { date }
            });
            // V2 retorna { success: true, data: {...} }
            return res.data.data;
        } catch (error: any) {
            // Se 404, relatório ainda não foi processado
            if (error.response?.status === 404) {
                console.log('[PaymentService] V2 daily-closing não processado, chamando POST /run...');
                // Dispara processamento
                await API.post('/v2/daily-closing/run', { date });
                // Fallback para legado imediato (não espera processamento)
                console.log('[PaymentService] Usando legado enquanto V2 processa...');
            } else {
                console.warn('[PaymentService] V2 daily-closing erro:', error.message);
            }
        }
    }
    
    // Legado (fallback imediato)
    const res = await API.get<DailyClosingReport>('/payments/daily-closing', {
        params: { date }
    });
    return res.data;
};

// Detalhes de pagamentos diários
export const getDailyPayments = (date?: string) => {
    return API.get<DailyPayment[]>('/payments/daily-payments-details', {
        params: { date }
    });
};

// Detalhes de sessões agendadas
export const getDailyScheduledDetails = (date?: string) => {
    return API.get<DailySession[]>('/payments/daily-scheduled-details', {
        params: { date }
    });
};

// Detalhes de sessões realizadas
export const getDailyCompletedSessions = (date?: string) => {
    return API.get<DailySession[]>('/payments/daily-completed-details', {
        params: { date }
    });
};

// Detalhes de faltas
export const getDailyAbsences = (date?: string) => {
    return API.get<DailyAbsence[]>('/payments/daily-absences-details', {
        params: { date }
    });
};

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
