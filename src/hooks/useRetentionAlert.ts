import { useEffect, useState } from 'react';
import API from '../services/api';

export interface RetentionAlertCounts {
  atRisk: number;    // em_risco + perdido
  orphans: number;   // sem próxima sessão e com histórico
  total: number;     // atRisk + orphans (pode ter overlap, mas é indicador de ação)
  loading: boolean;
}

const EMPTY: RetentionAlertCounts = { atRisk: 0, orphans: 0, total: 0, loading: true };

// Cache simples em memória para não re-bater a API a cada render do header
let cachedResult: Omit<RetentionAlertCounts, 'loading'> | null = null;
let cacheMonth = '';

export function useRetentionAlert(): RetentionAlertCounts {
  const [counts, setCounts] = useState<RetentionAlertCounts>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    const month = new Date().toISOString().slice(0, 7);

    // Cache hit: serve imediatamente sem delay
    if (cachedResult && cacheMonth === month) {
      setCounts({ ...cachedResult, loading: false });
      return;
    }

    // Badge não-crítico: dispara quando o navegador está ocioso (sem competir com overview)
    const doFetch = () => {
      if (cancelled) return;
      API.get(`/v2/retention/patients?month=${month}`)
        .then(res => {
          if (cancelled) return;
          const summary = res.data?.summary ?? {};
          const patients: any[] = res.data?.patients ?? [];

          const atRisk  = (summary.em_risco ?? 0) + (summary.perdido ?? 0);
          const orphans = patients.filter(
            (p: any) => !p.nextSessionAt && p.lifecycle !== 'novo' && p.totalSessions > 0
          ).length;
          const total = atRisk + orphans;

          const result = { atRisk, orphans, total };
          cachedResult = result;
          cacheMonth   = month;
          setCounts({ ...result, loading: false });
        })
        .catch(() => {
          if (cancelled) return;
          setCounts({ atRisk: 0, orphans: 0, total: 0, loading: false });
        });
    };

    let handle: number;
    if (typeof requestIdleCallback !== 'undefined') {
      handle = requestIdleCallback(doFetch, { timeout: 5000 });
    } else {
      handle = setTimeout(doFetch, 4000) as unknown as number;
    }

    return () => {
      cancelled = true;
      if (typeof cancelIdleCallback !== 'undefined') {
        cancelIdleCallback(handle);
      } else {
        clearTimeout(handle);
      }
    };
  }, []);

  return counts;
}
