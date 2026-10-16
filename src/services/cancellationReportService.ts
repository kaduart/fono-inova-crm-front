import API from './api';

/**
 * Relatório de cancelamentos por solicitante. TODOS os números (contagem, %, taxas,
 * <24h) vêm calculados do backend — esta camada só tipa e repassa.
 */
export type RequesterKey = 'patient' | 'professional' | 'clinic' | 'unspecified';

export interface CancellationFilters {
    startDate: string; // YYYY-MM-DD — pela data do atendimento
    endDate: string;
    doctorId?: string;
    patientId?: string;
    specialty?: string;
}

export interface CancellationSummary {
    totalAppointments: number;
    totalCanceled: number;
    cancelRate: number;
    lessThan24h: number;
    absences: number;
    automaticCancellations: number;
    unspecified: number;
    /** "Não informado" por origem: agenda_service | amanda | legacy_client | historico */
    unspecifiedByChannel?: Record<string, number>;
}

export interface CancellationByRequester {
    requester: RequesterKey;
    label: string;
    count: number;
    percent: number;
    lessThan24h: number;
}

export interface CancellationProfessionalRow {
    doctorId: string;
    name: string;
    specialty: string | null;
    totalAppointments: number;
    canceledTotal: number;
    requestedByProfessional: number;
    requestedByPatients: number;
    requestedByClinic: number;
    unspecified: number;
    lessThan24hByProfessional: number;
    lastRequestedByProfessional?: string | null;
    professionalRate: number;
    agendaCancelRate: number;
}

export interface CancellationPatientRow {
    patientId: string;
    name: string;
    totalAppointments: number;
    canceledTotal: number;
    requestedByPatient: number;
    requestedByProfessional: number;
    requestedByClinic: number;
    unspecified: number;
    lessThan24hByPatient: number;
    lastRequestedByPatient?: string | null;
    patientRate: number;
}

export interface CancellationComparison {
    previousPeriod: { startDate: string; endDate: string };
    total: { current: number; previous: number; diff: number };
    byRequester: { requester: RequesterKey; current: number; previous: number; diff: number }[];
    coverage: { current: { total: number; identified: number; percent: number | null }; previous: { total: number; identified: number; percent: number | null } };
    /** false quando a identificação mudou demais entre os períodos para comparar por solicitante */
    byRequesterReliable: boolean;
}

export interface CancellationReport {
    coverage?: { total: number; identified: number; percent: number | null };
    comparison?: CancellationComparison;
    period: { startDate: string; endDate: string };
    summary: CancellationSummary;
    byRequester: CancellationByRequester[];
    professionals: CancellationProfessionalRow[];
    patients: CancellationPatientRow[];
}

export interface CancellationDetailItem {
    appointmentId: string;
    date: string;
    time: string | null;
    specialty: string | null;
    patientId: string | null;
    patientName: string | null;
    doctorId: string | null;
    doctorName: string | null;
    requester: RequesterKey;
    requesterLabel: string;
    reason: string | null;
    requestedAt: string | null;
    requestedAtApproximate?: boolean;
    registeredAt: string | null;
    registeredBy: string | null;
    hoursInAdvance: number | null;
    lessThan24h: boolean;
}

const BASE = '/v2/analytics/operational/cancellations';

const clean = (f: Record<string, string | undefined>) =>
    Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined && v !== ''));

export const cancellationReportService = {
    getReport: async (filters: CancellationFilters): Promise<CancellationReport> => {
        const res = await API.get(BASE, { params: clean({ ...filters }) });
        return res.data?.data as CancellationReport;
    },

    getDetails: async (
        filters: CancellationFilters & { requester?: RequesterKey }
    ): Promise<CancellationDetailItem[]> => {
        const res = await API.get(`${BASE}/details`, { params: clean({ ...filters }) });
        return (res.data?.data?.items ?? []) as CancellationDetailItem[];
    },
};

export default cancellationReportService;
