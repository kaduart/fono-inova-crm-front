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
    patientId: string,
    doctorId: string;
    serviceType: string;
    paymentMethod: string;
    notes: string;
    packageId: string;
    sessionId: string;
    advancedSessions: string[]
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

// CRUD básicos
export const getPayments = (filters: Record<string, any> = {}) =>
    API.get<FinancialRecord[]>('/payments', { params: filters });

export const getPaymentCountFinancialRecord = (filters: Record<string, any> = {}) =>
    API.get<FinancialRecord[]>('/payments/totals', { params: filters });

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

export const deletePayment = (id: string) =>
    API.delete<void>(`/payments/${id}`);

// Fechamento diário completo
export const getDailyClosing = (date?: string) => {
    return API.get<DailyClosingReport>('/payments/daily-closing', {
        params: { date }
    });
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