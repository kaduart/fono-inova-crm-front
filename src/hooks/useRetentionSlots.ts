import { useEffect, useState } from 'react';
import API from '../services/api';

export type SlotType = 'fixo' | 'semi_fixo' | 'novo' | 'buraco';

export interface RetentionSlot {
  weekday: number;
  time: string;
  type: SlotType;
  isVacant: boolean;

  // Active slot
  currentPatientId:    string | null;
  currentPatientName:  string | null;
  currentPatientPhone: string;

  // Vacant slot (buraco)
  lastPatientId:   string | null;
  lastPatientName: string | null;
  daysSinceVacant: number | null;

  recurrenceCount:  number;
  recentCompleted:  number;
  attendanceRate:   number;
  packageRemaining: number;
  nextSessionAt:    string | null;
  daysSinceLastSession: number | null;
  avgSessionValue:  number;
  needsAttention:   boolean;
}

export interface OccupancyDay {
  active: number;
  vacant: number;
  total:  number;
  rate:   number;
}

export interface SlotsData {
  doctor: { id: string; name: string; specialty?: string } | null;
  windowDays: number;
  summary: {
    totalSlots:    number;
    activeSlots:   number;
    vacantSlots:   number;
    occupancyRate: number;
  };
  occupancyByDay: Record<string, OccupancyDay>;
  weekdays: Record<string, RetentionSlot[]>;
}

export function useRetentionSlots(doctorId: string, days: number = 30) {
  const [data, setData] = useState<SlotsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ days: String(days) });
    if (doctorId) params.set('doctorId', doctorId);

    API.get<SlotsData>(`/v2/retention/slots?${params}`)
      .then(res => { if (!cancelled) setData(res.data); })
      .catch(err => { if (!cancelled) setError(err?.response?.data?.error || err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [doctorId, days]);

  return { data, loading, error };
}
