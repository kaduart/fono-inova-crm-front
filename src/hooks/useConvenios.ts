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

export const useConvenios = ({
  includeInactive = false,
  autoFetch = true
}: UseConveniosOptions = {}): UseConveniosReturn => {
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConvenios = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getConvenios(includeInactive);
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
    refetch: fetchConvenios
  };
};

export default useConvenios;
