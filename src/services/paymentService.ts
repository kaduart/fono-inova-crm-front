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

// Listar contas a receber de convênios
export const getInsuranceReceivables = (filters?: { provider?: string; status?: string; month?: string }) =>
    API.get<{ success: boolean; data: InsuranceReceivableGroup[]; summary: { totalProviders: number; grandTotal: number } }>(
        '/payments/insurance/receivables',
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

// Faturar em lote
export const faturarConvenioLote = (data: { paymentIds: string[]; dataFaturamento: string; notaFiscal?: string }) =>
    API.post<{ success: boolean; data: any }>('/financial/convenio/faturar-lote', data);

// Receber em lote
export const receberConvenioLote = (data: { paymentIds: string[]; dataRecebimento: string }) =>
    API.post<{ success: boolean; data: any }>('/financial/convenio/receber-lote', data);

// CRUD básicos
export const getPayments = (filters: Record<string, any> = {}) =>
    API.get<FinancialRecord[]>('/payments', { params: filters });

// 🚀 Feature Flag: USE_V2_TOTALS
// Quando true: usa /v2/totals (event-driven + snapshot)
// Quando false: usa /payments/totals (legado síncrono)
const USE_V2_TOTALS = false;

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
