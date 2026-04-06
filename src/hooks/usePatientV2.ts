// src/hooks/usePatientV2.ts
/**
 * Hook usePatientV2 - CQRS + Event-Driven
 * 
 * Features:
 * - UI Otimista (aparece na tela antes de confirmar)
 * - Polling inteligente
 * - Estados de loading granulares
 * - Integração com cache global
 */

import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import patientService from '../services/patientService';
import { IPatient } from '../utils/types/types';
import { toast } from 'react-toastify';

// ============================================
// CONFIG
// ============================================

const QUERY_KEYS = {
  patients: 'patients',
  patient: (id: string) => ['patient', id],
  patientStatus: (eventId: string) => ['patient-status', eventId]
};

// ============================================
// HOOK: LISTAGEM (READ)
// ============================================

export function usePatientList(options: {
  search?: string;
  limit?: number;
  enabled?: boolean;
} = {}) {
  const { search, limit = 50, enabled = true } = options;
  
  const query = useQuery({
    queryKey: [QUERY_KEYS.patients, { search, limit }],
    queryFn: () => patientService.list({ search, limit }),
    enabled,
    staleTime: 30 * 1000, // 30s
    refetchInterval: search ? false : 60 * 1000, // refetch a cada 1min se não estiver buscando
  });
  
  return {
    patients: query.data?.patients || [],
    pagination: query.data?.pagination,
    meta: query.data?.meta,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch
  };
}

// ============================================
// HOOK: DETALHE (READ)
// ============================================

export function usePatient(id: string | null) {
  const query = useQuery({
    queryKey: QUERY_KEYS.patient(id || ''),
    queryFn: () => id ? patientService.getById(id) : null,
    enabled: !!id,
    staleTime: 60 * 1000, // 1min
  });
  
  return {
    patient: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch
  };
}

// ============================================
// HOOK: CREATE (WRITE COM UI OTIMISTA)
// ============================================

export function useCreatePatient(options: {
  onSuccess?: (patient: IPatient) => void;
  onError?: (error: Error) => void;
  optimistic?: boolean;
} = {}) {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<{ status: string; attempt: number } | null>(null);
  const [creatingPatient, setCreatingPatient] = useState<IPatient | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const mutation = useMutation({
    mutationFn: async (data: IPatient) => {
      abortControllerRef.current = new AbortController();
      
      const result = await patientService.create(data, {
        skipPolling: options.optimistic !== false, // default: true (UI otimista)
        onProgress: (status, attempt) => {
          setProgress({ status, attempt });
        }
      });
      
      // Se foi async (skipPolling=true), continua polling em background
      if (result.isAsync && result.eventId && options.optimistic !== false) {
        // Não espera - retorna imediatamente para UI otimista
        // O polling continua em background
        pollInBackground(result.eventId, result.patient._id);
      }
      
      return result;
    },
    onMutate: async (newPatient) => {
      // Cancela queries pendentes
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.patients] });
      
      // Snapshot do estado anterior
      const previousPatients = queryClient.getQueryData([QUERY_KEYS.patients]);
      
      // Cria paciente otimista
      const optimisticPatient = {
        ...newPatient,
        _id: `temp-${Date.now()}`,
        id: `temp-${Date.now()}`,
        status: 'creating',
        createdAt: new Date().toISOString()
      } as IPatient;
      
      setCreatingPatient(optimisticPatient);
      
      // Atualiza cache imediatamente
      queryClient.setQueryData([QUERY_KEYS.patients], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          patients: [optimisticPatient, ...old.patients],
          pagination: {
            ...old.pagination,
            total: old.pagination.total + 1
          }
        };
      });
      
      return { previousPatients, optimisticPatient };
    },
    onSuccess: (result, variables, context) => {
      // Atualiza o paciente temporário com o real
      queryClient.setQueryData([QUERY_KEYS.patients], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          patients: old.patients.map((p: IPatient) => 
            p._id === context?.optimisticPatient._id ? result.patient : p
          )
        };
      });
      
      setCreatingPatient(null);
      setProgress(null);
      
      toast.success('Paciente criado com sucesso!');
      options.onSuccess?.(result.patient);
    },
    onError: (error, variables, context) => {
      // Reverte para estado anterior
      if (context?.previousPatients) {
        queryClient.setQueryData([QUERY_KEYS.patients], context.previousPatients);
      }
      
      setCreatingPatient(null);
      setProgress(null);
      
      toast.error(`Erro ao criar paciente: ${error.message}`);
      options.onError?.(error as Error);
    },
    onSettled: () => {
      // Invalida cache para garantir consistência
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.patients] });
    }
  });
  
  // Polling em background (não bloqueia UI)
  const pollInBackground = async (eventId: string, patientId: string) => {
    try {
      const finalStatus = await patientService.getEventStatus(eventId);
      
      if (finalStatus.status === 'completed' && finalStatus.patientView) {
        // Atualiza cache com dados reais
        queryClient.setQueryData([QUERY_KEYS.patients], (old: any) => {
          if (!old) return old;
          return {
            ...old,
            patients: old.patients.map((p: IPatient) => 
              p._id === patientId || p._id?.startsWith('temp-') 
                ? finalStatus.patientView 
                : p
            )
          };
        });
        
        toast.success('Dados do paciente sincronizados!');
      }
    } catch (error) {
      console.error('Background polling error:', error);
    }
  };
  
  return {
    createPatient: mutation.mutate,
    createPatientAsync: mutation.mutateAsync,
    isCreating: mutation.isPending,
    progress,
    creatingPatient,
    error: mutation.error
  };
}

// ============================================
// HOOK: UPDATE (WRITE)
// ============================================

export function useUpdatePatient(options: {
  onSuccess?: (patient: IPatient) => void;
  onError?: (error: Error) => void;
} = {}) {
  const queryClient = useQueryClient();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  
  const mutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<IPatient> }) => {
      setUpdatingId(id);
      const result = await patientService.update(id, data, { skipPolling: true });
      return result;
    },
    onSuccess: (result, variables) => {
      // Atualiza cache imediatamente
      queryClient.setQueryData(QUERY_KEYS.patient(variables.id), result.patient);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.patients] });
      
      setUpdatingId(null);
      toast.success('Paciente atualizado!');
      options.onSuccess?.(result.patient);
    },
    onError: (error) => {
      setUpdatingId(null);
      toast.error(`Erro ao atualizar: ${error.message}`);
      options.onError?.(error as Error);
    }
  });
  
  return {
    updatePatient: mutation.mutate,
    updatePatientAsync: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    updatingId,
    error: mutation.error
  };
}

// ============================================
// HOOK: DELETE (WRITE)
// ============================================

export function useDeletePatient(options: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
} = {}) {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const mutation = useMutation({
    mutationFn: async (id: string) => {
      setDeletingId(id);
      await patientService.delete(id, { skipPolling: true });
      return id;
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.patients] });
      
      const previousPatients = queryClient.getQueryData([QUERY_KEYS.patients]);
      
      // Remove otimistamente
      queryClient.setQueryData([QUERY_KEYS.patients], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          patients: old.patients.filter((p: IPatient) => p._id !== deletedId),
          pagination: {
            ...old.pagination,
            total: old.pagination.total - 1
          }
        };
      });
      
      return { previousPatients };
    },
    onSuccess: () => {
      setDeletingId(null);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.patients] });
      toast.success('Paciente removido!');
      options.onSuccess?.();
    },
    onError: (error, variables, context) => {
      if (context?.previousPatients) {
        queryClient.setQueryData([QUERY_KEYS.patients], context.previousPatients);
      }
      setDeletingId(null);
      toast.error(`Erro ao remover: ${error.message}`);
      options.onError?.(error as Error);
    }
  });
  
  return {
    deletePatient: mutation.mutate,
    isDeleting: mutation.isPending,
    deletingId,
    error: mutation.error
  };
}

// ============================================
// HOOK: SEARCH (COM DEBOUNCE)
// ============================================

export function usePatientSearch(debounceMs = 300) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const setSearch = useCallback((term: string) => {
    setSearchTerm(term);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setDebouncedTerm(term);
    }, debounceMs);
  }, [debounceMs]);
  
  const query = useQuery({
    queryKey: [QUERY_KEYS.patients, 'search', debouncedTerm],
    queryFn: () => patientService.list({ 
      search: debouncedTerm, 
      limit: 50 
    }),
    enabled: debouncedTerm.length >= 2,
    staleTime: 60 * 1000,
  });
  
  return {
    searchTerm,
    setSearch,
    results: query.data?.patients || [],
    isSearching: query.isLoading,
    error: query.error
  };
}

// ============================================
// HOOK COMPOSTO (compatibilidade com usePatients antigo)
// ============================================

export function usePatientsV2() {
  const listQuery = usePatientList();
  const createMutation = useCreatePatient();
  const updateMutation = useUpdatePatient();
  const deleteMutation = useDeletePatient();
  const search = usePatientSearch();
  
  return {
    // Listagem
    patients: listQuery.patients,
    loading: listQuery.isLoading,
    error: listQuery.error,
    refresh: listQuery.refetch,
    
    // Paginação
    pagination: listQuery.pagination,
    
    // Search
    searchTerm: search.searchTerm,
    setSearch: search.setSearch,
    searchResults: search.results,
    isSearching: search.isSearching,
    
    // Create
    createPatient: createMutation.createPatientAsync,
    isCreating: createMutation.isCreating,
    creatingPatient: createMutation.creatingPatient,
    createProgress: createMutation.progress,
    
    // Update
    updatePatient: updateMutation.updatePatientAsync,
    isUpdating: updateMutation.isUpdating,
    updatingId: updateMutation.updatingId,
    
    // Delete
    deletePatient: deleteMutation.deletePatient,
    isDeleting: deleteMutation.isDeleting,
    deletingId: deleteMutation.deletingId,
  };
}

export default usePatientsV2;
