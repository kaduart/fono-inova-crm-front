/**
 * @hook useDoctorList
 * @description Hook especializado para gerenciamento da lista de profissionais
 * @version 1.0.0
 * 
 * Responsabilidades:
 * - Buscar lista de médicos (ativos, inativos ou todos)
 * - Gerenciar estados de loading e erro
 * - Fornecer funções de refresh otimizadas
 * - Cache de dados com stale-while-revalidate pattern
 * 
 * NÃO inclui:
 * - Estatísticas do dashboard
 * - Dados do calendário
 * - Dados do médico logado
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import doctorService, { Doctor } from '../services/doctorService';
import {
  subscribeToCacheInvalidation,
  invalidateCache as invalidateGlobalCache,
  isCacheValid,
  getCache,
  setCache
} from '../utils/cacheManager';

interface UseDoctorListOptions {
  /** Tipo de filtro para a lista */
  filter?: 'all' | 'active' | 'inactive';
  /** Se deve buscar automaticamente no mount */
  autoFetch?: boolean;
  /** Callback quando ocorrer erro */
  onError?: (error: Error) => void;
}

interface UseDoctorListReturn {
  /** Lista de médicos */
  doctors: Doctor[];
  /** Se está carregando dados */
  loading: boolean;
  /** Mensagem de erro, se houver */
  error: string | null;
  /** Se há erro */
  hasError: boolean;
  /** Atualizar lista manualmente */
  refresh: () => Promise<void>;
  /** Invalidar cache e buscar novamente */
  refetch: () => Promise<void>;
  /** Última vez que foi atualizado */
  lastUpdated: Date | null;
  /** Quantidade de médicos */
  count: number;
  /** Quantidade de médicos ativos */
  activeCount: number;
  /** Quantidade de médicos inativos */
  inactiveCount: number;
}

/**
 * Hook para gerenciamento da lista de profissionais
 * 
 * @example
 * ```tsx
 * // Lista todos os médicos
 * const { doctors, loading, refresh } = useDoctorList();
 * 
 * // Apenas médicos ativos
 * const { doctors, loading } = useDoctorList({ filter: 'active' });
 * 
 * // Com callback de erro
 * const { doctors } = useDoctorList({ 
 *   onError: (err) => toast.error(err.message)
 * });
 * ```
 */
export const useDoctorList = (options: UseDoctorListOptions = {}): UseDoctorListReturn => {
  const { filter = 'all', autoFetch = true, onError } = options;
  
  const cachedData = getCache<Doctor[]>('doctors');
  const [doctors, setDoctors] = useState<Doctor[]>(cachedData || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(
    cachedData ? new Date() : null
  );
  
  // Ref para controlar se o componente está montado
  const isMountedRef = useRef(true);
  // Ref para evitar fetchs duplicados
  const isFetchingRef = useRef(false);
  // Ref para identificar qual requisição é a mais recente
  const requestIdRef = useRef(0);

  /**
   * Busca lista de médicos com cache
   */
  const fetchDoctors = useCallback(async (skipCache = false): Promise<void> => {
    // Evita requisições concorrentes
    if (isFetchingRef.current) {
      console.log('[useDoctorList] Fetch já em andamento, ignorando...');
      return;
    }
    
    // Usa cache se válido e não forçar refresh
    if (!skipCache && isCacheValid('doctors')) {
      console.log('[useDoctorList] Usando cache global');
      const cached = getCache<Doctor[]>('doctors');
      if (cached && isMountedRef.current) {
        // Filtra se necessário
        let filteredData = cached;
        if (filter === 'active') {
          filteredData = cached.filter(d => d.active !== false);
        } else if (filter === 'inactive') {
          filteredData = cached.filter(d => d.active === false);
        }
        setDoctors(filteredData);
        setLastUpdated(new Date());
        setError(null);
      }
      return;
    }

    isFetchingRef.current = true;
    const currentRequestId = ++requestIdRef.current;
    
    if (isMountedRef.current) {
      setLoading(true);
      setError(null);
    }

    try {
      console.log(`[useDoctorList] Buscando médicos (filter: ${filter})`);
      
      let response;
      switch (filter) {
        case 'active':
          response = await doctorService.getActiveDoctors();
          break;
        case 'inactive':
          response = await doctorService.getInactiveDoctors();
          break;
        default:
          response = await doctorService.getAllDoctors();
      }

      // Só atualiza se for a requisição mais recente
      if (currentRequestId !== requestIdRef.current) {
        console.log('[useDoctorList] Requisição obsoleta, ignorando resposta');
        return;
      }

      const data = response.data;
      
      // Atualiza cache global (sempre salva todos)
      if (filter === 'all') {
        setCache('doctors', data);
      }

      if (isMountedRef.current) {
        setDoctors(data);
        setLastUpdated(new Date());
        setError(null);
      }
    } catch (err: any) {
      console.error('[useDoctorList] Erro ao buscar médicos:', err);
      
      if (currentRequestId !== requestIdRef.current) return;

      const errorMessage = err?.response?.data?.message || 
                          err?.message || 
                          'Erro ao carregar lista de profissionais';
      
      if (isMountedRef.current) {
        setError(errorMessage);
        setDoctors([]);
      }

      onError?.(err);
    } finally {
      if (currentRequestId === requestIdRef.current) {
        isFetchingRef.current = false;
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    }
  }, [filter, onError]);

  /**
   * Atualiza lista (usa cache se disponível)
   */
  const refresh = useCallback(async (): Promise<void> => {
    await fetchDoctors(false);
  }, [fetchDoctors]);

  /**
   * Força requisição nova (ignora cache)
   */
  const refetch = useCallback(async (): Promise<void> => {
    console.log('[useDoctorList] Refetch forçado, invalidando cache');
    invalidateGlobalCache('doctors');
    await fetchDoctors(true);
  }, [fetchDoctors]);

  // 🔔 Subscribe para invalidação de cache externa
  useEffect(() => {
    const unsubscribe = subscribeToCacheInvalidation('doctors', () => {
      console.log('🔄 useDoctorList: Cache invalidado externamente, recarregando...');
      fetchDoctors(true);
    });

    return () => unsubscribe();
  }, [fetchDoctors]);

  // Busca inicial
  useEffect(() => {
    if (autoFetch) {
      fetchDoctors();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [autoFetch, fetchDoctors]);

  // Calcula contagens
  const count = doctors.length;
  const activeCount = doctors.filter(d => d.active !== false).length;
  const inactiveCount = doctors.filter(d => d.active === false).length;

  return {
    doctors,
    loading,
    error,
    hasError: error !== null,
    refresh,
    refetch,
    lastUpdated,
    count,
    activeCount,
    inactiveCount
  };
};

/**
 * Invalida todo o cache do useDoctorList
 * Útil após mutações (create, update, delete)
 */
export const invalidateDoctorListCache = (): void => {
  console.log('[useDoctorList] Invalidando cache via cacheManager');
  invalidateGlobalCache('doctors');
};

/**
 * Hook simplificado para casos básicos
 * Retorna apenas doctors e loading
 */
export const useDoctorsSimple = () => {
  const { doctors, loading, refresh } = useDoctorList();
  return { doctors, loading, refresh };
};

export default useDoctorList;
