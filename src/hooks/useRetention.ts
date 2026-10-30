import { useCallback, useEffect, useState } from 'react';
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

// Cache curto por profissional+mês: a Agenda busca o resumo para o contador da aba
// Acompanhamento, e a aba reaproveita sem segunda chamada.
const CACHE_TTL_MS = 60_000;
const _cache = new Map<string, { data: RetentionData; ts: number }>();

// A aba quebrava a Agenda inteira quando o servidor respondia sem `patients`
// ("data?.patients.filter is not a function"). Resposta incompleta vira erro da aba.
function normalize(raw: any): RetentionData {
  const body = raw && typeof raw === 'object' && !Array.isArray(raw) && raw.data && Array.isArray(raw.data.patients) ? raw.data : raw;
  if (!body || !Array.isArray(body.patients)) throw new Error('Resposta sem a lista de pacientes');
  const s = body.summary || {};
  return {
    doctor: body.doctor ?? null,
    period: body.period ?? { month: '', start: '', end: '' },
    patients: body.patients,
    summary: {
      patients: Number(s.patients ?? body.patients.length) || 0,
      engajado: Number(s.engajado) || 0,
      oscilando: Number(s.oscilando) || 0,
      em_risco: Number(s.em_risco) || 0,
      perdido: Number(s.perdido) || 0,
      novo: Number(s.novo) || 0,
      retentionRate: Number(s.retentionRate) || 0,
    },
  };
}

export function useRetention(doctorId: string, month: string) {
  const [data, setData] = useState<RetentionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!month) return;

    const key = `${doctorId}|${month}`;
    const cached = _cache.get(key);
    if (nonce === 0 && cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      setData(cached.data);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ month });
    if (doctorId) params.set('doctorId', doctorId);

    API.get<RetentionData>(`/v2/retention/patients?${params}`)
      .then(res => {
        const parsed = normalize(res.data);
        _cache.set(key, { data: parsed, ts: Date.now() });
        if (!cancelled) setData(parsed);
      })
      .catch(err => { if (!cancelled) { setData(null); setError(err?.response?.data?.error || err.message || 'Erro desconhecido'); } })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [doctorId, month, nonce]);

  const reload = useCallback(() => setNonce(n => n + 1), []);

  return { data, loading, error, reload };
}
