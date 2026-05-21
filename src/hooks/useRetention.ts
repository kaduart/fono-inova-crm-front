import { useEffect, useState } from 'react';
import API from '../services/api';

export type RetentionLifecycle = 'engajado' | 'oscilando' | 'em_risco' | 'perdido' | 'novo';

export interface RetentionPatient {
  patientId: string;
  patientName: string;
  sessionsMonth: number;
  absencesMonth: number;
  totalSessions: number;
  attendanceRate: number;
  daysSinceLastSession: number | null;
  lastSessionAt: string | null;
  nextSessionAt: string | null;
  packageRemaining: number;
  lifecycle: RetentionLifecycle;
  needsAttention: boolean;
  phone: string;
}

export interface RetentionSummary {
  patients: number;
  engajado: number;
  oscilando: number;
  em_risco: number;
  perdido: number;
  novo: number;
  retentionRate: number;
}

export interface RetentionData {
  doctor: { id: string; name: string } | null;
  period: { month: string; start: string; end: string };
  summary: RetentionSummary;
  patients: RetentionPatient[];
}

export function useRetention(doctorId: string, month: string) {
  const [data, setData] = useState<RetentionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!month) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ month });
    if (doctorId) params.set('doctorId', doctorId);

    API.get<RetentionData>(`/v2/retention/patients?${params}`)
      .then(res => { if (!cancelled) setData(res.data); })
      .catch(err => { if (!cancelled) setError(err?.response?.data?.error || err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [doctorId, month]);

  return { data, loading, error };
}
