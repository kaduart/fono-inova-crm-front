/**
 * useDashboardMinimal - Hook Otimizado para Dashboard Inicial
 * 
 * Só carrega o ESSENCIAL para a secretária operar:
 * - Aniversariantes do mês (para dar parabéns)
 * - Agendamentos de hoje (para organizar)
 * - Métricas rápidas (faturamento, pacientes)
 * - Lista básica de médicos
 * 
 * NÃO carrega:
 * - Gráficos pesados
 * - Analytics completo
 * - Dados financeiros detalhados
 * - Histórico completo
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import API from '../services/api';
import toast from 'react-hot-toast';

interface DashboardStats {
    totalPatients: number;
    totalDoctors: number;
    todayAppointments: number;
    weekAppointments: number;
    pendingPayments: number;
    monthRevenue: number;
}

interface UpcomingAppointment {
    _id: string;
    date: string;
    time: string;
    patient: string;
    doctor: string;
    specialty: string;
    status: string;
}

interface DoctorOverview {
    _id: string;
    name: string;
    specialty: string;
    patients: number;
    appointments: number;
}

interface Aniversariante {
    _id: string;
    fullName: string;
    dateOfBirth: string;
    phone: string;
    daysUntil: number;
}

interface DashboardMinimalData {
    stats: DashboardStats | null;
    upcomingAppointments: UpcomingAppointment[];
    doctors: DoctorOverview[];
    aniversariantes: Aniversariante[];
    todayRevenue: number;
}

interface UseDashboardMinimalReturn extends DashboardMinimalData {
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

// Cache local
let cache: DashboardMinimalData | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 3 * 60 * 1000; // 3 minutos

export const useDashboardMinimal = (): UseDashboardMinimalReturn => {
    const [data, setData] = useState<DashboardMinimalData>({
        stats: cache?.stats || null,
        upcomingAppointments: cache?.upcomingAppointments || [],
        doctors: cache?.doctors || [],
        aniversariantes: cache?.aniversariantes || [],
        todayRevenue: cache?.todayRevenue || 0
    });
    const [loading, setLoading] = useState(!cache);
    const [error, setError] = useState<string | null>(null);
    
    const isMounted = useRef(true);

    const fetchData = useCallback(async (force = false) => {
        // Usa cache se válido
        if (!force && cache && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
            setData(cache);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // 🎯 Busca TUDO em paralelo (só o essencial!)
            const [
                statsRes,
                upcomingRes,
                doctorsRes,
                aniversariantesRes,
                revenueRes
            ] = await Promise.all([
                // Stats básicos
                API.get('/dashboard/stats').catch(() => ({ data: { data: null } })),
                
                // Próximos agendamentos
                API.get('/dashboard/upcoming?limit=10').catch(() => ({ data: { data: [] } })),
                
                // Lista básica de médicos
                API.get('/dashboard/doctors-overview').catch(() => ({ data: { data: [] } })),
                
                // Aniversariantes do mês
                API.get('/patients/aniversariantes').catch(() => ({ data: { data: [] } })),
                
                // Faturamento de hoje
                API.get('/cashflow/summary?period=day').catch(() => ({ data: { data: { financeiro: { receitas: { total: 0 } } } } }))
            ]);

            if (!isMounted.current) return;

            const newData: DashboardMinimalData = {
                stats: statsRes.data?.data || null,
                upcomingAppointments: upcomingRes.data?.data || [],
                doctors: doctorsRes.data?.data || [],
                aniversariantes: aniversariantesRes.data?.data || [],
                todayRevenue: revenueRes.data?.data?.financeiro?.receitas?.total || 0
            };

            // Salva no cache
            cache = newData;
            cacheTimestamp = Date.now();

            setData(newData);
        } catch (err: any) {
            if (!isMounted.current) return;
            setError('Erro ao carregar dashboard');
            toast.error('Erro ao carregar dashboard');
        } finally {
            if (isMounted.current) {
                setLoading(false);
            }
        }
    }, []);

    // Carrega na montagem
    useEffect(() => {
        isMounted.current = true;
        fetchData();
        
        return () => {
            isMounted.current = false;
        };
    }, [fetchData]);

    // Refresh forçado
    const refresh = useCallback(async () => {
        cache = null;
        cacheTimestamp = 0;
        await fetchData(true);
    }, [fetchData]);

    return {
        ...data,
        loading,
        error,
        refresh
    };
};

export default useDashboardMinimal;
