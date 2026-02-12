// frontend/src/hooks/useFinancialAnalytics.ts
import { useState, useCallback } from 'react';
import API from '../services/api';

interface DateRange {
    from: string;
    to: string;
}

interface SpecialtyData {
    specialty: string;
    totalRevenue: number;
    totalSessions: number;
    averageTicket: number;
    uniquePatientCount: number;
}

interface DoctorData {
    doctorId: string;
    doctorName: string;
    specialty: string;
    totalRevenue: number;
    sessionsCount: number;
    uniquePatients: number;
    averageTicket: number;
}

interface Patient360 {
    patient: {
        id: string;
        name: string;
        phone: string;
        email: string;
    };
    financial: {
        totalSpent: number;
        totalPayments: number;
        averageTicket: number;
        lifetimeValue: number;
        customerSince?: string;
        lastPayment?: string;
    };
    activity: {
        lastVisitDate?: string;
        daysSinceLastVisit: number | null;
        lastVisitDoctor?: string;
        lastVisitSpecialty?: string;
    };
    packages: Array<{
        id: string;
        sessionType: string;
        totalSessions: number;
        sessionsDone: number;
        remainingSessions: number;
        isExpiringSoon: boolean;
    }>;
    alerts: {
        riskLevel: 'low' | 'medium' | 'high';
        riskFlags: string[];
        suggestedActions: string[];
    };
}

export const useFinancialAnalytics = () => {
    const [specialties, setSpecialties] = useState<SpecialtyData[]>([]);
    const [doctors, setDoctors] = useState<DoctorData[]>([]);
    const [patient360, setPatient360] = useState<Patient360 | null>(null);
    const [patientsList, setPatientsList] = useState({ data: [], total: 0, totalPages: 0 });

    const [loadingSpecialties, setLoadingSpecialties] = useState(false);
    const [loadingDoctors, setLoadingDoctors] = useState(false);
    const [loadingPatient360, setLoadingPatient360] = useState(false);
    const [loadingPatientsList, setLoadingPatientsList] = useState(false);

    const [error, setError] = useState<string | null>(null);

    const fetchSpecialties = useCallback(async (range: DateRange, doctorId?: string) => {
        setLoadingSpecialties(true);
        setError(null);
        try {
            const params = new URLSearchParams({ ...range, ...(doctorId && { doctorId }) });
            const response = await API.get(`/analytics/financial/specialties?${params}`);
            setSpecialties(response.data.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao carregar especialidades');
        } finally {
            setLoadingSpecialties(false);
        }
    }, []);

    const fetchDoctors = useCallback(async (range: DateRange, sessionType?: string) => {
        setLoadingDoctors(true);
        setError(null);
        try {
            const params = new URLSearchParams({ ...range, ...(sessionType && { sessionType }) });
            const response = await API.get(`/analytics/financial/doctors?${params}`);
            setDoctors(response.data.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao carregar profissionais');
        } finally {
            setLoadingDoctors(false);
        }
    }, []);

    const fetchPatient360 = useCallback(async (patientId: string) => {
        setLoadingPatient360(true);
        setError(null);
        try {
            const response = await API.get(`/analytics/financial/patients/${patientId}/360`);
            setPatient360(response.data.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao carregar dados do paciente');
        } finally {
            setLoadingPatient360(false);
        }
    }, []);

    const fetchPatientsList = useCallback(async (params: { page?: number; limit?: number; sortBy?: string; order?: 'asc' | 'desc' } = { page: 1, limit: 20 }) => {
        setLoadingPatientsList(true);
        setError(null);
        try {
            const response = await API.get('/analytics/financial/patients/list', { params });
            setPatientsList({
                data: response.data.data,
                total: response.data.total,
                totalPages: response.data.totalPages
            });
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao carregar lista de pacientes');
        } finally {
            setLoadingPatientsList(false);
        }
    }, []);

    const clearPatient360 = useCallback(() => {
        setPatient360(null);
    }, []);

    return {
        specialties,
        doctors,
        patient360,
        patientsList,
        loadingSpecialties,
        loadingDoctors,
        loadingPatient360,
        loadingPatients: loadingPatientsList,
        error,
        fetchSpecialties,
        fetchDoctors,
        fetchPatient360,
        fetchPatientsList,
        clearPatient360
    };
};
