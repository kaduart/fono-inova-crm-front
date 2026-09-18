// src/hooks/useConvenios.ts
import { useState, useEffect, useCallback } from 'react';
import { getConvenios, Convenio } from '../services/insuranceService';

interface UseConveniosOptions {
  includeInactive?: boolean;
  autoFetch?: boolean;
}

interface UseConveniosReturn {
  convenios: Convenio[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// 🐛 FIX (2026-09-18): 8 componentes diferentes chamam useConvenios() (calendário,
// modais de agendamento, várias abas de Financeiro) — sem cache compartilhado, cada
// instância montada ao mesmo tempo disparava sua PRÓPRIA GET /convenios independente.
// Achado real em produção: 6 chamadas idênticas (mesmo includeInactive) na mesma
// janela de F5, cada uma mais lenta que a anterior (939ms→1,7s→2,47s) — mesma classe
// de bug já corrigida em useDashboard/useDoctorsOverview nesta sessão. Cache em
// módulo (singleton), com dedup de requisição em voo por chave `includeInactive`.
const CACHE_TTL_MS = 60_000;
const _cache = new Map<string, { data: Convenio[]; ts: number }>();
const _inFlight = new Map<string, Promise<Convenio[]>>();

function _cacheKey(includeInactive: boolean) {
  return String(includeInactive);
}

async function _fetchConveniosShared(includeInactive: boolean, forceRefresh: boolean): Promise<Convenio[]> {
  const key = _cacheKey(includeInactive);

  if (!forceRefresh) {
    const cached = _cache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return cached.data;
    }
    const inFlight = _inFlight.get(key);
    if (inFlight) return inFlight;
  }

  const promise = getConvenios(includeInactive)
    .then(data => {
      _cache.set(key, { data, ts: Date.now() });
      return data;
    })
    .finally(() => {
      if (_inFlight.get(key) === promise) _inFlight.delete(key);
    });

  _inFlight.set(key, promise);
  return promise;
}

export const useConvenios = ({
  includeInactive = false,
  autoFetch = true
}: UseConveniosOptions = {}): UseConveniosReturn => {
  const cached = _cache.get(_cacheKey(includeInactive));
  const [convenios, setConvenios] = useState<Convenio[]>(cached?.data || []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConvenios = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await _fetchConveniosShared(includeInactive, forceRefresh);
      setConvenios(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar convênios');
      console.error('Erro ao carregar convênios:', err);
    } finally {
      setIsLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    if (autoFetch) {
      fetchConvenios();
    }
  }, [autoFetch, fetchConvenios]);

  return {
    convenios,
    isLoading,
    error,
    refetch: () => fetchConvenios(true)
  };
};

export default useConvenios;
