/**
 * 🚀 Hook V2 para analytics de especialidades
 * Com React Query + Cache Otimizado — evita duplicação de chamadas no StrictMode
 */

import { useQuery } from '@tanstack/react-query';
import API from '../services/api';

interface DateRange {
    from: string;
    to: string;
}

export interface SpecialtyData {
    specialty: string;
    totalRevenue: number;
    totalSessions: number;
    averageTicket: number;
    uniquePatientCount: number;
}

export interface SpecialtyDetailItem {
    _id: string;
    date: string;
    patient: { _id: string; fullName?: string };
    doctor: { _id: string; fullName?: string; specialty?: string };
    specialty: string;
    rawSpecialty?: string;
    amount: number;
    source: 'payment' | 'session';
    paymentMethod?: string;
    serviceType?: string;
    kind?: string;
    billingType?: string;
}

export interface SpecialtyDetails {
    specialty: string;
    totalRevenue: number;
    totalSessions: number;
    items: SpecialtyDetailItem[];
    byPaymentMethod: Record<string, number>;
    byDoctor: Array<{ doctorId: string; doctorName: string; value: number; sessions: number }>;
    bySessionType: Record<string, number>;
}

export const useSpecialtiesAnalytics = (range: DateRange, doctorId?: string) => {
    return useQuery({
        queryKey: ['financial-analytics', 'specialties', range, doctorId],
        queryFn: async () => {
            const params = new URLSearchParams({ ...range, ...(doctorId && { doctorId }) });
            const response = await API.get<{ success: boolean; data: SpecialtyData[] }>(`/analytics/financial/specialties?${params}`);
            return response.data.data;
        },
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 10,
        refetchOnWindowFocus: false,
    });
};

export const useSpecialtyDetails = (range: DateRange, specialty: string, doctorId?: string) => {
    return useQuery({
        queryKey: ['financial-analytics', 'specialty-details', range, specialty, doctorId],
        queryFn: async () => {
            const params = new URLSearchParams({ ...range, ...(doctorId && { doctorId }) });
            const response = await API.get<{ success: boolean; data: SpecialtyDetails }>(
                `/analytics/financial/specialties/${encodeURIComponent(specialty)}/details?${params}`
            );
            return response.data.data;
        },
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 10,
        refetchOnWindowFocus: false,
        enabled: !!specialty,
    });
};

export interface DoctorData {
    doctorId: string;
    doctorName: string;
    specialty: string;
    totalRevenue: number;
    sessionsCount: number;
    uniquePatients: number;
    averageTicket: number;
}

export const useDoctorsAnalytics = (range: DateRange, sessionType?: string, enabled = true) => {
    return useQuery({
        queryKey: ['financial-analytics', 'doctors', range, sessionType],
        queryFn: async () => {
            const params = new URLSearchParams({ ...range, ...(sessionType && { sessionType }) });
            const response = await API.get<{ success: boolean; data: DoctorData[] }>(`/analytics/financial/doctors?${params}`);
            return response.data.data;
        },
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 10,
        refetchOnWindowFocus: false,
        enabled,
    });
};
