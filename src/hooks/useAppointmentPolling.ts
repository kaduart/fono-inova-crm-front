// hooks/useAppointmentPolling.ts
// 🚀 Hook centralizado para polling de appointments V2
// Evita múltiplos polling do mesmo appointment + controle de estado

import { useCallback, useRef, useState } from 'react';
import appointmentService from '../services/appointmentService';

interface PollingState {
  isPolling: boolean;
  progress: { current: number; total: number } | null;
  error: string | null;
}

interface UseAppointmentPollingReturn {
  pollingState: Record<string, PollingState>;
  pollAppointment: (
    id: string,
    options?: {
      onComplete?: () => void;
      onError?: (error: string) => void;
      maxAttempts?: number;
    }
  ) => Promise<boolean>;
  cancelPolling: (id: string) => void;
  isPolling: (id: string) => boolean;
}

export function useAppointmentPolling(): UseAppointmentPollingReturn {
  // Ref para controlar abort controllers (permite cancelar polling)
  const abortControllers = useRef<Record<string, AbortController>>({});
  
  // Estado de polling por appointment ID
  const [pollingState, setPollingState] = useState<Record<string, PollingState>>({});

  const updatePollingState = useCallback((id: string, updates: Partial<PollingState>) => {
    setPollingState(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || { isPolling: false, progress: null, error: null }),
        ...updates
      }
    }));
  }, []);

  const pollAppointment = useCallback(async (
    id: string,
    options?: {
      onComplete?: () => void;
      onError?: (error: string) => void;
      maxAttempts?: number;
    }
  ): Promise<boolean> => {
    // Se já está fazendo polling deste appointment, não inicia outro
    if (abortControllers.current[id]) {
      console.log(`[useAppointmentPolling] Já existe polling para ${id}, ignorando...`);
      return false;
    }

    // Cria abort controller para permitir cancelamento
    const abortController = new AbortController();
    abortControllers.current[id] = abortController;

    // Inicia estado de polling
    updatePollingState(id, { isPolling: true, progress: { current: 0, total: options?.maxAttempts || 10 }, error: null });

    try {
      const result = await appointmentService.pollStatus(id, {
        abortSignal: abortController.signal,
        maxAttempts: options?.maxAttempts || 10,
        interval: 1000,
        onProgress: (attempt, maxAttempts) => {
          updatePollingState(id, { 
            progress: { current: attempt, total: maxAttempts } 
          });
        },
        onComplete: (status) => {
          updatePollingState(id, { 
            isPolling: false, 
            progress: null,
            error: null 
          });
          delete abortControllers.current[id];
          options?.onComplete?.();
        },
        onError: (error) => {
          updatePollingState(id, { 
            isPolling: false, 
            progress: null,
            error 
          });
          delete abortControllers.current[id];
          options?.onError?.(error);
        },
        onMaxAttempts: () => {
          updatePollingState(id, { 
            isPolling: false, 
            progress: null,
            error: 'Tempo de espera excedido' 
          });
          delete abortControllers.current[id];
          options?.onError?.('Tempo de espera excedido');
        }
      });

      return result.success;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      updatePollingState(id, { 
        isPolling: false, 
        progress: null,
        error: errorMsg 
      });
      delete abortControllers.current[id];
      options?.onError?.(errorMsg);
      return false;
    }
  }, [updatePollingState]);

  const cancelPolling = useCallback((id: string) => {
    if (abortControllers.current[id]) {
      abortControllers.current[id].abort();
      delete abortControllers.current[id];
      updatePollingState(id, { 
        isPolling: false, 
        progress: null,
        error: 'Cancelado pelo usuário' 
      });
    }
  }, [updatePollingState]);

  const isPolling = useCallback((id: string): boolean => {
    return !!abortControllers.current[id] || pollingState[id]?.isPolling || false;
  }, [pollingState]);

  return {
    pollingState,
    pollAppointment,
    cancelPolling,
    isPolling
  };
}

export default useAppointmentPolling;
