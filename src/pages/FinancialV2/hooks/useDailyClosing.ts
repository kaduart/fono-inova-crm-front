import { useQuery } from '@tanstack/react-query';
import API from '../../../services/api';

export interface DailyClosingSummary {
    appointments: {
        total: number;
        attended: number;
        canceled: number;
        noShow: number;
        novos: number;
        recorrentes: number;
    };
    financial: {
        totalReceived: number;
        totalExpected: number;
        totalPending: number;
    };
    insurance?: {
        production: number;
        received: number;
        pending: number;
        sessionsCount: number;
    };
}

export interface DailyClosingAppointment {
    id: string;
    patient: string;
    patientType: 'novo' | 'recorrente' | null;
    doctor: string;
    service: string;
    sessionValue: number;
    operationalStatus: string;
    time: string;
    isConvenio: boolean;
}

export interface DailyClosingData {
    date: string;
    summary: DailyClosingSummary;
    timelines: {
        appointments: DailyClosingAppointment[];
    };
}

interface UseDailyClosingOptions {
    date?: string;
    enabled?: boolean;
}

const fetchDailyClosing = async (date?: string): Promise<DailyClosingData> => {
    const params: Record<string, string> = {};
    if (date) params.date = date;
    
    const response = await API.get('/v2/daily-closing', { params });
    return response.data.data;
};

export const useDailyClosing = (options: UseDailyClosingOptions = {}) => {
    const { date, enabled = true } = options;
    
    return useQuery({
        queryKey: ['dailyClosing', date],
        queryFn: () => fetchDailyClosing(date),
        enabled: enabled && !!date,
        refetchInterval: 60000, // 1 minuto
        staleTime: 30000,
    });
};

// 📊 Métricas calculadas do dia
export const useDailyMetrics = (data?: DailyClosingData) => {
    if (!data) return null;
    
    const { summary } = data;
    const attendanceRate = summary.appointments.total > 0
        ? (summary.appointments.attended / summary.appointments.total) * 100
        : 0;
    
    const received = summary.financial.totalReceived;
    const expected = summary.financial.totalExpected;
    const collectionRate = expected > 0 ? (received / expected) * 100 : 0;
    
    return {
        attendanceRate,
        collectionRate,
        totalAppointments: summary.appointments.total,
        confirmedAppointments: summary.appointments.attended,
        newPatients: summary.appointments.novos,
        returningPatients: summary.appointments.recorrentes,
        received,
        expected,
        pending: summary.financial.totalPending,
        hasInsurance: !!summary.insurance && summary.insurance.production > 0,
        insuranceProduction: summary.insurance?.production || 0,
        insuranceReceived: summary.insurance?.received || 0,
        insurancePending: summary.insurance?.pending || 0,
    };
};
