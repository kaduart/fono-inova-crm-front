import { PaymentTotalsResponse } from "../utils/types/types";
import { buildPaymentPayloadV2 as buildPaymentPayloadV2FromDTO } from '../dtos/payment.dto';
import API from "./api";

const _inflight = new Map<string, Promise<any>>();
function deduped<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (_inflight.has(key)) return _inflight.get(key)!;
    const p = fn().finally(() => _inflight.delete(key));
    _inflight.set(key, p);
    return p;
}

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
            guideId?: string | null;
            guideNumber?: string | null;
            billingMode?: 'per_month' | 'per_guide' | null;
            guideStatus?: string | null;
            guideClosedAt?: string | Date | null;
        }>;
    }>;
}

// Registrar atendimento de convênio
/**
 * ⚠️ LEGADO — CRIAÇÃO MANUAL DE PAYMENT
 *
 * 🚫 NÃO UTILIZAR para fluxo padrão
 * 🚫 Pode gerar duplicidade com completeSession
 *
 * ✅ Fluxo correto:
 * completeSession → ConvenioHandler → cria Payment automaticamente
 *
 * Mantido apenas para compatibilidade temporária (modal "Novo Atendimento").
 * TODO: remover após migração completa do frontend.
 */
export const createInsurancePayment = (data: InsurancePaymentData) =>
    API.post<{ success: boolean; data: InsurancePayment }>('/payments/insurance', data);

// Listar contas a receber de convênios (V2)
export interface InsuranceReceivableSummary {
    totalProviders: number;
    grandTotal: number;
    pendingCount: number;
    prevMonthTotal: number | null;
    change: number | null;
    changePercent: number | null;
}

export const getInsuranceReceivables = (filters?: { provider?: string; status?: string; month?: string }) => {
    const key = `receivables:${filters?.month || ''}:${filters?.status || ''}:${filters?.provider || ''}`;
    return deduped(key, () =>
        API.get<{ success: boolean; data: InsuranceReceivableGroup[]; summary: InsuranceReceivableSummary }>(
            '/v2/payments/insurance/receivables',
            { params: filters }
        )
    );
};

// Listar todos os pagamentos de convênio
export const getInsurancePayments = (filters?: { provider?: string; status?: string }) =>
    API.get<{ success: boolean; data: InsurancePayment[] }>(
        '/payments',
        { params: { ...filters, billingType: 'convenio' } }
    );

// Faturar em lote (V2) - guide-based ou legacy payment-based
export interface GuideBillingClosure {
    guideId: string;
    skipped: boolean;
    reason?: string; // 'not_per_month' | 'guide_not_found' quando skipped=true
    canceled?: number;
    canceledIds?: string[];
    errors?: Array<{ id: string; error: string }>;
    error?: string; // presente se o fechamento falhou (best-effort, faturamento já foi enviado)
}

export const faturarConvenioLote = (data: {
    paymentIds?: string[];
    guideIds?: string[];
    dataFaturamento?: string;
    notaFiscal?: string;
}) => API.post<{
    success: boolean;
    // data.guideClosures / data.totalAppointmentsCanceledOnClosure: fechamento
    // automático de guias per_month faturadas nesse lote (ver GuideBillingClosure)
    data: any;
    error?: string;
}>('/v2/financial/convenio/faturar-lote', data);

// Listar guias pendentes de faturamento (guide-based)
export interface OverdueBillingBucket {
    competence: string; // YYYY-MM
    sessionsCount: number;
    totalValue: number;
    guides: Array<{
        guideId: string;
        number: string;
        insurance: string;
        specialty?: string;
        patient?: { _id: string; fullName?: string };
        sessionsCount: number;
        totalValue: number;
        firstSessionDate: string;
        lastSessionDate: string;
    }>;
    orphanSessions: Array<{
        sessionId: string;
        date: string;
        patient?: { _id: string; fullName?: string };
        specialty?: string | null;
        sessionValue: number;
    }>;
}

export interface OverdueBillingSummary {
    totalValue: number;
    totalSessions: number;
    competenceCount: number;
}

// Quebra do total pendente (guides + orphanSessions) entre o mês corrente do
// servidor e competências anteriores. Não escopa/filtra a listagem — só
// decompõe o mesmo total já retornado, pra evitar recomputar KPI financeiro
// no frontend (ver CLAUDE.md).
export interface CompetenceBreakdown {
    referenceMonth: string;
    current: { value: number; sessions: number };
    previous: { value: number; sessions: number };
}

export const getPendingBillingGuides = (params?: { insurance?: string; patientId?: string; month?: string; page?: number; limit?: number; includeOverdue?: boolean }) =>
    API.get<{ success: boolean; data: any[]; orphanSessions: any[]; overdue: OverdueBillingBucket[] | null; overdueSummary: OverdueBillingSummary | null; competenceBreakdown: CompetenceBreakdown | null; pagination: any }>('/v2/insurance/guides/pending-billing', { params });

// Receber em lote (V2)
export const receberConvenioLote = (data: { paymentIds: string[]; dataRecebimento: string }) =>
    API.post<{ success: boolean; data: any; error?: string }>('/v2/financial/convenio/receber-lote', data);

// Encerrar período de guia per_month manualmente (cancela agendamentos pendentes)
export const encerrarGuia = (data: { guideId: string }) =>
    API.post<{ success: boolean; message: string; data: any; error?: string }>('/v2/financial/convenio/encerrar-guia', data);

// Histórico mês a mês de convênios
export const getInsuranceHistory = (params?: { provider?: string; year?: number }) =>
    API.get<{ success: boolean; data: InsuranceHistoryMonth[]; year: number }>('/v2/insurance/history', { params });

// Sessões individuais de um paciente em um mês/especialidade (lazy expand no drawer)
export interface InsurancePatientSession {
    sessionId: string | null;
    date: string;
    time?: string | null;
    patient: { _id: string; fullName?: string; phone?: string };
    doctor: { _id: string; fullName?: string; specialty?: string };
    specialty: string;
    provider: string;
    guideNumber?: string | null;
    value: number;
    /** Valor bruto faturado (antes de ISS/glosa) */
    grossAmount?: number;
    /** Alíquota de ISS aplicada no recebimento (%) */
    issRate?: number | null;
    /** Valor de ISS retido na fonte */
    issAmount?: number | null;
    billingStatus: 'pending_batch' | 'billed' | 'received';
    batchId?: string | null;
    batchNumber?: string | null;
    sentDate?: string | null;
    invoiceNumber?: string | null;
    billedAt?: string | null;
    receivedAt?: string | null;
    receivedAmount?: number | null;
    paymentId?: string | null;
    appointmentId?: string | null;
    source: 'lote' | 'avulso' | 'guia';
}

export interface InsurancePatientSessionGroup {
    type: 'batch' | 'guide';
    guideNumber?: string | null;
    batchId?: string | null;
    batchNumber?: string | null;
    sentDate?: string | null;
    invoiceNumber?: string | null;
    sessions: InsurancePatientSession[];
    total: number;
}

export interface PatientInsuranceSessionsResponse {
    success: boolean;
    data: InsurancePatientSession[];
    count: number;
    billingModel: 'legacy' | 'current';
    groups: InsurancePatientSessionGroup[];
}

export const getPatientInsuranceSessions = (params: { patientId: string; month: string; specialty?: string; provider?: string; status?: string }) =>
    API.get<PatientInsuranceSessionsResponse>('/v2/insurance/patient-sessions', { params });

export interface InsuranceHistorySpecialty {
    specialty: string;
    sessions: number;
    value: number;
    source: 'package' | 'lote' | 'avulso';
    batchStatus: 'pending_batch' | 'billed' | 'received';
}

export interface InsuranceHistoryPatient {
    name: string;
    patientId?: string;
    phone: string;
    specialties: InsuranceHistorySpecialty[];
    totalSessions: number;
    totalValue: number;
}

export interface InsuranceHistoryProvider {
    provider: string;
    providerLabel: string;
    patients: InsuranceHistoryPatient[];
    totalSessions: number;
    totalValue: number;
    status: 'pending_batch' | 'billed' | 'received';
    /** Envio mais recente pra faturamento nesse convênio+mês (pode haver guias mais antigas com data diferente) */
    lastSentAt: string | null;
}

export interface InsuranceHistoryMonth {
    monthKey: string;
    monthLabel: string;
    providers: InsuranceHistoryProvider[];
    totalSessions: number;
    totalValue: number;
}

// ✅ V2 ATIVO: Faturar convênio por sessionId (ledger + transaction garantidos)
export const billInsuranceSession = (sessionId: string, data?: { billedAmount?: number; billedAt?: string; notes?: string }) =>
    API.patch<{ success: boolean; data: any }>(`/v2/insurance/session/${sessionId}/bill`, data);

// ✅ V2 ATIVO: Receber convênio por sessionId (ledger + transaction garantidos)
export const receiveInsuranceSession = (sessionId: string, data: { receivedAmount: number; receivedDate?: string }) =>
    API.patch<{ success: boolean; data: any }>(`/v2/insurance/session/${sessionId}/receive`, data);

// Vincular sessões órfãs a guias ativas automaticamente
export const autoLinkOrphanSessions = (data: { month?: string }) =>
    API.post<{ success: boolean; linked: any[]; skipped: any[]; linkedCount: number; skippedCount: number }>('/v2/insurance/guides/auto-link-orphans', data);

// Pré-visualizar vínculos automáticos de sessões órfãs
export const previewAutoLinkOrphanSessions = (data: { month?: string }) =>
    API.post<{ success: boolean; linked: any[]; skipped: any[]; linkedCount: number; skippedCount: number }>('/v2/insurance/guides/auto-link-orphans/preview', data);

// Criar guia a partir de sessão órfã
export const createGuideFromOrphan = (data: { sessionId: string; number: string; totalSessions: number; expiresAt: string; sessionValue?: number }) =>
    API.post<{ success: boolean; data: { guideId: string; number: string; sessionId: string } }>('/v2/insurance/guides/create-from-orphan', data);

// Vincular sessões órfãs a guia existente
export const linkOrphanSessionsToGuide = (data: { guideId?: string; guideNumber?: string; sessionIds: string[] }) =>
    API.post<{ success: boolean; linked: string[]; guideId: string }>('/v2/insurance/guides/link-orphan-sessions', data);

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
    doctorId?: string;
} = {}) =>
    API.get('/v2/payments', { params: filters });

// Retorna evolução de N meses em UMA chamada (substitui N chamadas individuais)
export const getPaymentsChart = (doctorId: string, months = 6) =>
    API.get('/v2/payments/stats/chart', { params: { doctorId, months } });

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
/**
 * @deprecated Use mapToCreatePaymentDTO de '../dtos/payment.dto' diretamente.
 * Mantido para compatibilidade com imports existentes.
 */
export function buildPaymentPayloadV2(data: Partial<FinancialRecord>): ReturnType<typeof buildPaymentPayloadV2FromDTO> {
    return buildPaymentPayloadV2FromDTO(data);
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
        notes?: string;
        doctor?: string;
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
        if (data.notes !== undefined) v2Payload.notes = data.notes;
        if (data.doctor !== undefined) v2Payload.doctor = data.doctor;
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

// Registra um Payment 'pending' particular como débito (fiado): lança no PatientBalance
// sem recriar o Payment — evita o bug de duplicidade ao refazer o complete (caso Isis 2026-07-17).
export const registerPaymentAsDebit = async (paymentId: string) => {
    const res = await API.patch<{ success: boolean; data: any; balance?: number }>(
        `/v2/payments/${paymentId}/register-debit`
    );
    return res.data?.data || res.data;
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
