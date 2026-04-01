// hooks/useTotalsV2.ts
/**
 * Hook React Query para Totals V2
 * 
 * Features:
 * - Cache automático com staleTime de 5 minutos
 * - Background refetch quando stale
 * - Mutação para forçar recálculo
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { totalsService, TotalsData } from '../services/totalsService';
import { useState, useCallback } from 'react';

interface UseTotalsV2Options {
  clinicId?: string;
  date?: string;
  period?: 'day' | 'week' | 'month' | 'year';
  enabled?: boolean;
}

export function useTotalsV2(options: UseTotalsV2Options = {}) {
  const { clinicId, date, period = 'month', enabled = true } = options;
  const queryClient = useQueryClient();
  const [isRecalculating, setIsRecalculating] = useState(false);

  const queryKey = ['totals', 'v2', { clinicId, date, period }];

  // Query principal - busca totais
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch
  } = useQuery({
    queryKey,
    queryFn: () => totalsService.getTotals({ clinicId, date, period }),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 10 * 60 * 1000, // 10 minutos
    select: (response) => response.data
  });

  // Mutação para forçar recálculo
  const recalculateMutation = useMutation({
    mutationFn: () => totalsService.recalculate({ clinicId, date, period }),
    onSuccess: async () => {
      setIsRecalculating(true);
      
      // Aguarda um pouco e faz refetch
      setTimeout(async () => {
        await refetch();
        setIsRecalculating(false);
      }, 1000);
    }
  });

  // Handler para forçar recálculo
  const forceRecalculate = useCallback(async () => {
    await recalculateMutation.mutateAsync();
  }, [recalculateMutation]);

  // Verifica se os dados estão stale
  const isStale = data?.source === 'sync_fallback' || data?.backgroundUpdate;

  return {
    // Dados
    totals: data?.totals,
    period: data?.period,
    date: data?.date,
    calculatedAt: data?.calculatedAt,
    source: data?.source,
    
    // Estados
    isLoading,
    isFetching,
    isRecalculating: isRecalculating || recalculateMutation.isPending,
    error,
    isStale,
    
    // Ações
    refetch,
    forceRecalculate
  };
}

/**
 * Hook para status de cálculo (polling)
 */
export function useTotalsStatus(date: string, options: {
  clinicId?: string;
  period?: string;
  pollingInterval?: number;
  enabled?: boolean;
} = {}) {
  const { clinicId, period = 'month', pollingInterval = 2000, enabled = true } = options;

  return useQuery({
    queryKey: ['totals', 'status', { date, clinicId, period }],
    queryFn: () => totalsService.getStatus(date, { clinicId, period }),
    enabled: enabled && !!date,
    refetchInterval: pollingInterval,
    select: (response) => response.data
  });
}

export default useTotalsV2;
