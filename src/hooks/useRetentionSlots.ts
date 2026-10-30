import { useCallback, useEffect, useState } from 'react';
import API from '../services/api';

export type SlotType = 'fixo' | 'semi_fixo' | 'novo' | 'buraco';
export type Stability = 'estavel' | 'atencao' | 'risco' | 'novo' | 'livre';
export type VacantType = 'temporario' | 'critico' | 'livre' | null;

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

  recurrenceCount:   number;
  slotTotalSessions: number;
  recentCompleted:   number;
  recentMissed:      number;
  attendanceRate:   number;
  packageRemaining: number;
  nextSessionAt:    string | null;
  daysSinceLastSession: number | null;
  avgSessionValue:  number;
  needsAttention:   boolean;

  // V2 — Estabilidade
  stabilityScore: number;
  stability: Stability;
  vacantType: VacantType;
  continuityMonths: number;
  stabilityReason: string;
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
    stableSlots:   number;
    attentionSlots: number;
    atRiskSlots:   number;
    newSlots:      number;
    criticalSlots: number;
    potentialLossMonthly: number;
    /** O servidor não manda quando o profissional não tem horários (virava "undefined% estável") */
    stabilityRate?: number | null;
  };
  occupancyByDay: Record<string, OccupancyDay>;
  weekdays: Record<string, RetentionSlot[]>;
}

// Resposta incompleta não pode derrubar a aba: completa o que falta e recusa se não houver grade
function normalize(raw: any): SlotsData {
  const body = raw && typeof raw === 'object' && raw.data && typeof raw.data.weekdays === 'object' ? raw.data : raw;
  if (!body || typeof body.weekdays !== 'object' || body.weekdays === null) throw new Error('Resposta sem a grade de horários');
  const weekdays: Record<string, RetentionSlot[]> = {};
  Object.entries(body.weekdays).forEach(([k, v]) => { weekdays[k] = Array.isArray(v) ? (v as RetentionSlot[]) : []; });
  const s = body.summary || {};
  const n = (v: any) => Number(v) || 0;
  return {
    doctor: body.doctor ?? null,
    windowDays: n(body.windowDays),
    occupancyByDay: body.occupancyByDay && typeof body.occupancyByDay === 'object' ? body.occupancyByDay : {},
    weekdays,
    summary: {
      totalSlots: n(s.totalSlots), activeSlots: n(s.activeSlots), vacantSlots: n(s.vacantSlots),
      occupancyRate: n(s.occupancyRate), stableSlots: n(s.stableSlots), attentionSlots: n(s.attentionSlots),
      atRiskSlots: n(s.atRiskSlots), newSlots: n(s.newSlots), criticalSlots: n(s.criticalSlots),
      potentialLossMonthly: n(s.potentialLossMonthly),
      stabilityRate: typeof s.stabilityRate === 'number' && Number.isFinite(s.stabilityRate) ? s.stabilityRate : null,
    },
  };
}

export function useRetentionSlots(doctorId: string, days: number = 30) {
  const [data, setData] = useState<SlotsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ days: String(days) });
    if (doctorId) params.set('doctorId', doctorId);

    API.get<SlotsData>(`/v2/retention/slots?${params}`)
      .then(res => { const parsed = normalize(res.data); if (!cancelled) setData(parsed); })
      .catch(err => { if (!cancelled) { setData(null); setError(err?.response?.data?.error || err.message || 'Erro desconhecido'); } })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [doctorId, days, nonce]);

  const reload = useCallback(() => setNonce(v => v + 1), []);

  return { data, loading, error, reload };
}
