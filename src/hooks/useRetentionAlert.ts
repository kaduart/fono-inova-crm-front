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
    const month = new Date().toISOString().slice(0, 7);

    // Usa cache se for o mesmo mês
    if (cachedResult && cacheMonth === month) {
      setCounts({ ...cachedResult, loading: false });
      return;
    }

    API.get(`/v2/retention/patients?month=${month}`)
      .then(res => {
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
        // Badge é não-crítico — falha silenciosa
        setCounts({ atRisk: 0, orphans: 0, total: 0, loading: false });
      });
  }, []);

  return counts;
}
