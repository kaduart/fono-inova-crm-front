// hooks/useAppointmentsV2.ts
// 🚀 Hook moderno com React Query para Appointments V2

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import appointmentService from '../services/appointmentService';
import { useAppointmentPolling } from './useAppointmentPolling';
import { extractErrorMessage } from '../utils/errorUtils';

const QUERY_KEY = 'appointments';

interface Filters {
  startDate?: string;
  endDate?: string;
  status?: string;
}

export function useAppointmentsV2() {
  const queryClient = useQueryClient();
  const { pollingState, pollAppointment, cancelPolling, isPolling } = useAppointmentPolling();

  // 🚀 Query: Listar appointments (React Query)
  const {
    data: appointments,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const response = await appointmentService.listV2({ limit: 100 });
      return response.data.data?.appointments || [];
    },
    staleTime: 30 * 1000, // 30 segundos
  });

  // 🚀 Mutation: Completar appointment
  const completeMutation = useMutation({
    mutationFn: async ({ 
      id, 
      data 
    }: { 
      id: string; 
      data?: { addToBalance?: boolean; balanceAmount?: number; balanceDescription?: string } 
    }) => {
      const response = await appointmentService.complete(id, data);
      
      // Se for 202, aguarda polling
      if (response.status === 202) {
        const completed = await pollAppointment(id, {
          maxAttempts: 10,
          onComplete: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
          }
        });
        
        if (!completed) {
          throw new Error('Processamento não completado no tempo esperado');
        }
      }
      
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    }
  });

  // 🚀 Mutation: Cancelar appointment
  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return appointmentService.cancel(id, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    }
  });

  // Helpers
  const completeAppointment = useCallback(async (
    id: string, 
    data?: { addToBalance?: boolean; balanceAmount?: number; balanceDescription?: string },
    options?: { onSuccess?: () => void; onError?: (err: any) => void }
  ) => {
    try {
      await completeMutation.mutateAsync({ id, data });
      options?.onSuccess?.();
    } catch (err) {
      options?.onError?.(err);
      throw err;
    }
  }, [completeMutation]);

  const cancelAppointment = useCallback(async (
    id: string,
    data: { reason: string },
    options?: { onSuccess?: () => void; onError?: (err: any) => void }
  ) => {
    try {
      await cancelMutation.mutateAsync({ id, reason: data.reason });
      options?.onSuccess?.();
    } catch (err) {
      options?.onError?.(err);
      throw err;
    }
  }, [cancelMutation]);

  return {
    // Data
    appointments: appointments || [],
    isLoading,
    error,
    
    // Polling
    pollingState,
    isPolling,
    cancelPolling,
    
    // Actions
    refetch,
    completeAppointment,
    cancelAppointment,
    
    // Mutation states
    isCompleting: completeMutation.isPending,
    isCanceling: cancelMutation.isPending
  };
}

export default useAppointmentsV2;
