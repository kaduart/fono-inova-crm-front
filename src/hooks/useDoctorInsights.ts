/**
 * useDoctorInsights — fonte única de dados para a camada de analytics clínico.
 *
 * Fase 1: consome endpoints legados (/attendance-summary, /appointments/stats).
 * Fase 2: substituir pelas chamadas /v2/analytics/doctors/:id/* sem alterar a UI.
 *
 * A UI NUNCA deve conhecer a origem dos dados.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import API from '../services/api';
import { AttendanceSummary, deriveAllRisks, PatientRisk } from '../utils/derivePatientRisk';

export type TimeRange = 'month' | 'last_month' | '7d' | '30d' | '90d' | '6m';
const RANGES: TimeRange[] = ['month', 'last_month', '7d', '30d', '90d', '6m'];

/** Totais do período, calculados no back (mesma conta do Dashboard). */
export interface PeriodTotals {
    total: number;
    attended: number;
    missed: number;
    canceled: number;
    pending: number;
    expected: number;
    attendanceRate: number | null;
    canceledBy: { patient: number; professional: number; clinic: number; unknown: number };
    patients?: number;
}

interface DoctorStats {
    activePatients: number;
    monthlyAppointments: number;
    attendanceRate: number | null;
}

interface SessionTotals {
    total: number;
    attended: number;
    missed: number;
    canceled: number;
    pending: number;
}

interface FrequencyBucket {
    label: string;
    count: number;
    color: string;
}

export interface DoctorInsights {
    // KPIs
    activePatients: number;
    avgFrequency: number;
    riskCount: number;
    totalSessions: number;
    attendanceRate: number | null;

    // Período (do back): totais, período anterior e datas
    period: PeriodTotals | null;
    previous: PeriodTotals | null;
    range: { start: string; end: string; prevStart: string; prevEnd: string } | null;

    // Dados por paciente
    attendanceData: AttendanceSummary[];
    riskPatients: PatientRisk[];

    // Agregados para gráficos
    sessionTotals: SessionTotals;
    frequencyDistribution: FrequencyBucket[];
}

interface UseDoctorInsightsReturn {
    insights: DoctorInsights | null;
    loading: boolean;
    error: string | null;
    timeRange: TimeRange;
    setTimeRange: (range: TimeRange) => void;
    refresh: () => void;
}

const EMPTY_INSIGHTS: DoctorInsights = {
    activePatients: 0,
    avgFrequency: 0,
    riskCount: 0,
    totalSessions: 0,
    attendanceRate: null,
    period: null,
    previous: null,
    range: null,
    attendanceData: [],
    riskPatients: [],
    sessionTotals: { total: 0, attended: 0, missed: 0, canceled: 0, pending: 0 },
    frequencyDistribution: [],
};

export default function useDoctorInsights(doctorId: string | null): UseDoctorInsightsReturn {
    const [attendanceData, setAttendanceData] = useState<AttendanceSummary[]>([]);
    const [stats, setStats] = useState<DoctorStats | null>(null);
    const [meta, setMeta] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const fromUrl = searchParams.get('timeRange') as TimeRange | null;
    const timeRange: TimeRange = fromUrl && RANGES.includes(fromUrl) ? fromUrl : 'month';
    const setTimeRange = useCallback((range: TimeRange) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('timeRange', range);
            return next;
        }, { replace: true });
    }, [setSearchParams]);
    const [fetchedFor, setFetchedFor] = useState<string | null>(null);

    const fetchInsights = useCallback(async () => {
        if (!doctorId) return;
        setLoading(true);
        setError(null);
        try {
            // Fase 1: endpoints legados
            // Fase 2: trocar por /v2/analytics/doctors/:id/overview + attendance
            const [attendanceRes, statsRes] = await Promise.allSettled([
                API.get(`/doctors/${doctorId}/attendance-summary`, { params: { range: timeRange } }),
                API.get('/doctors/appointments/stats'),
            ]);

            if (attendanceRes.status === 'fulfilled' && attendanceRes.value.data.success) {
                setAttendanceData(attendanceRes.value.data.data ?? []);
                setMeta(attendanceRes.value.data.meta ?? null);
            } else {
                setError('Não foi possível carregar a frequência do período.');
            }
            if (statsRes.status === 'fulfilled') {
                setStats(statsRes.value.data ?? null);
            }
            setFetchedFor(`${doctorId}:${timeRange}`);
        } catch (err: any) {
            setError('Erro ao carregar insights');
        } finally {
            setLoading(false);
        }
    }, [doctorId, timeRange]);

    const refresh = useCallback(() => {
        fetchInsights();
    }, [fetchInsights]);

    // Auto-fetch quando doctorId muda (primeira vez ou troca de médico)
    useEffect(() => {
        if (doctorId && `${doctorId}:${timeRange}` !== fetchedFor) {
            fetchInsights();
        }
    // fetchedFor não entra nas deps para não causar loop — só reagimos ao doctorId
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [doctorId, timeRange, fetchInsights]);

    const insights = useMemo<DoctorInsights>(() => {
        if (!attendanceData.length && !stats && !meta) return EMPTY_INSIGHTS;

        const sessionTotals: SessionTotals = attendanceData.reduce(
            (acc, p) => ({
                total: acc.total + p.total,
                attended: acc.attended + p.attended,
                missed: acc.missed + p.missed,
                canceled: acc.canceled + p.canceled,
                pending: acc.pending + p.pending,
            }),
            { total: 0, attended: 0, missed: 0, canceled: 0, pending: 0 }
        );

        // Frequência null = paciente sem sessão prevista até agora no período (só futuras/canceladas)
        const withFreq = attendanceData.filter(p => typeof p.frequency === 'number');
        const avgFrequency = withFreq.length
            ? Math.round(withFreq.reduce((acc, p) => acc + (p.frequency as number), 0) / withFreq.length)
            : 0;

        const riskPatients = deriveAllRisks(attendanceData);

        const frequencyDistribution: FrequencyBucket[] = [
            {
                label: '≥ 90%',
                count: withFreq.filter(p => (p.frequency as number) >= 90).length,
                color: '#10b981',
            },
            {
                label: '75–89%',
                count: withFreq.filter(p => (p.frequency as number) >= 75 && (p.frequency as number) < 90).length,
                color: '#f59e0b',
            },
            {
                label: '< 75%',
                count: withFreq.filter(p => (p.frequency as number) < 75).length,
                color: '#ef4444',
            },
        ];

        return {
            activePatients: stats?.activePatients ?? attendanceData.length,
            avgFrequency,
            riskCount: riskPatients.length,
            totalSessions: sessionTotals.total,
            attendanceRate: meta?.summary ? meta.summary.attendanceRate : (stats?.attendanceRate ?? avgFrequency),
            period: meta?.summary ?? null,
            previous: meta?.previous ?? null,
            range: meta ? { start: meta.start, end: meta.end, prevStart: meta.prevStart, prevEnd: meta.prevEnd } : null,
            attendanceData,
            riskPatients,
            sessionTotals,
            frequencyDistribution,
        };
    }, [attendanceData, stats, meta]);

    return { insights, loading, error, timeRange, setTimeRange, refresh };
}
