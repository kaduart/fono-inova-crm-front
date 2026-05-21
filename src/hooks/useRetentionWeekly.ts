import { useEffect, useState } from 'react';
import API from '../services/api';

export type WeeklyLifecycle = 'fixo' | 'oscilando' | 'sumiu' | 'novo';

export interface WeeklyPatient {
  patientId: string;
  patientName: string;
  phone: string;
  weekday: number;          // 2=Seg, 3=Ter, 4=Qua, 5=Qui, 6=Sex
  preferredTime: string;    // "HH:MM"
  recurrenceCount: number;
  absenceCount: number;
  totalInWindow: number;
  attendanceRate: number;
  daysSinceLastSession: number | null;
  lastSessionAt: string | null;
  nextSessionAt: string | null;
  packageRemaining: number;
  lifecycle: WeeklyLifecycle;
  needsAttention: boolean;
}

export interface WeeklyData {
  doctor: { id: string; name: string } | null;
  windowWeeks: number;
  weekdays: Record<string, WeeklyPatient[]>; // "2" | "3" | "4" | "5" | "6"
}

export function useRetentionWeekly(doctorId: string, days: number = 30) {
  const [data, setData] = useState<WeeklyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ days: String(days) });
    if (doctorId) params.set('doctorId', doctorId);

    API.get<WeeklyData>(`/v2/retention/weekly?${params}`)
      .then(res => { if (!cancelled) setData(res.data); })
      .catch(err => { if (!cancelled) setError(err?.response?.data?.error || err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [doctorId, days]);

  return { data, loading, error };
}
