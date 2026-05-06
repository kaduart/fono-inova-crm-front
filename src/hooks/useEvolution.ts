/**
 * 🧬 useEvolution — Hook completo para gerenciamento de evoluções terapêuticas
 *
 * Responsabilidades:
 * - Fetch automático quando patientId muda
 * - Cache local com invalidação centralizada
 * - Estados de loading / error / vazio
 * - Ações CRUD com toast e invalidação de cache
 * - Re-fetch otimista após mutações
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchEvolutionsByPatient,
  fetchEvolutionChart,
  fetchEvolutionProgress,
  fetchLastEvolution,
  evolutionSafeActions,
} from '../services/evolutionService';
import {
  getCache,
  setCache,
  isCacheValid,
  invalidateCache,
} from '../utils/cacheManager';
import type {
  Evolution,
  EvolutionChartData,
  EvolutionProgressData,
  CreateEvolutionPayload,
  UpdateEvolutionPayload,
} from '../utils/types/evolution';

interface EvolutionCache {
  evaluations: Evolution[];
  chart: EvolutionChartData | null;
  progress: EvolutionProgressData | null;
  timestamp: number;
}

const CACHE_KEY = 'evolutions';
const CACHE_TTL = 2 * 60 * 1000; // 2 minutos

function getEvolutionCache(patientId: string): EvolutionCache | null {
  const global = getCache<Record<string, EvolutionCache>>(CACHE_KEY);
  if (!global) return null;
  const entry = global[patientId];
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) return null;
  return entry;
}

function setEvolutionCache(patientId: string, data: Omit<EvolutionCache, 'timestamp'>): void {
  const global = getCache<Record<string, EvolutionCache>>(CACHE_KEY) || {};
  global[patientId] = { ...data, timestamp: Date.now() };
  setCache(CACHE_KEY, global);
}

export function useEvolution(patientId?: string | null) {
  const [evaluations, setEvaluations] = useState<Evolution[]>([]);
  const [chartData, setChartData] = useState<EvolutionChartData | null>(null);
  const [progressData, setProgressData] = useState<EvolutionProgressData | null>(null);
  const [lastEvolution, setLastEvolution] = useState<Evolution | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMounted = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  const loadAll = useCallback(async (forceRefresh = false) => {
    if (!patientId) {
      setEvaluations([]);
      setChartData(null);
      setProgressData(null);
      return;
    }

    // Cancela requisição anterior
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Tenta cache
    if (!forceRefresh) {
      const cached = getEvolutionCache(patientId);
      if (cached) {
        setEvaluations(cached.evaluations);
        setChartData(cached.chart);
        setProgressData(cached.progress);
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const [evals, chart, progress, last] = await Promise.all([
        fetchEvolutionsByPatient(patientId),
        fetchEvolutionChart(patientId),
        fetchEvolutionProgress(patientId),
        fetchLastEvolution(patientId),
      ]);

      if (controller.signal.aborted || !isMounted.current) return;

      setEvaluations(evals);
      setChartData(chart);
      setProgressData(progress);
      setLastEvolution(last);

      setEvolutionCache(patientId, {
        evaluations: evals,
        chart,
        progress,
      });
    } catch (err: any) {
      if (controller.signal.aborted || !isMounted.current) return;
      setError(err.message || 'Erro ao carregar evoluções');
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    isMounted.current = true;
    loadAll();
    return () => {
      isMounted.current = false;
      abortRef.current?.abort();
    };
  }, [loadAll]);

  // ─── AÇÕES ───────────────────────────────────────────────────────────

  const create = useCallback(
    async (payload: CreateEvolutionPayload) => {
      const result = await evolutionSafeActions.create(payload);
      if (result.success) {
        invalidateCache('evolutions');
        await loadAll(true);
      }
      return result;
    },
    [loadAll]
  );

  const update = useCallback(
    async (id: string, payload: UpdateEvolutionPayload) => {
      const result = await evolutionSafeActions.update(id, payload);
      if (result.success) {
        invalidateCache('evolutions');
        await loadAll(true);
      }
      return result;
    },
    [loadAll]
  );

  const remove = useCallback(
    async (id: string) => {
      const result = await evolutionSafeActions.delete(id);
      if (result.success) {
        invalidateCache('evolutions');
        setEvaluations((prev) => prev.filter((e) => e._id !== id));
        // Não recarrega tudo para manter UX fluida; dados serão atualizados no próximo mount
      }
      return result;
    },
    []
  );

  const refresh = useCallback(() => loadAll(true), [loadAll]);

  return {
    evaluations,
    chartData,
    progressData,
    lastEvolution,
    isLoading,
    error,
    create,
    update,
    remove,
    refresh,
  };
}
