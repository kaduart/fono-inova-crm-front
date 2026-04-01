// hooks/usePaymentPolling.ts
// 🚀 Hook centralizado para polling de pagamentos V2
// Evita múltiplos polling do mesmo pagamento + controle de estado

import { useCallback, useRef, useState } from 'react';
import { pollPaymentStatus, cancelPaymentPolling } from '../services/paymentService';

interface PollingState {
  isPolling: boolean;
  progress: { current: number; total: number } | null;
  error: string | null;
}

interface UsePaymentPollingReturn {
  pollingState: Record<string, PollingState>;
  pollPayment: (
    eventId: string,
    options?: {
      onComplete?: (data: any) => void;
      onError?: (error: string) => void;
      maxAttempts?: number;
    }
  ) => Promise<boolean>;
  cancelPolling: (eventId: string) => void;
  isPolling: (eventId: string) => boolean;
}

export function usePaymentPolling(): UsePaymentPollingReturn {
  // Ref para controlar abort/cancelamento
  const cancelledRef = useRef<Record<string, boolean>>({});
  
  // Estado de polling por eventId
  const [pollingState, setPollingState] = useState<Record<string, PollingState>>({});

  const updatePollingState = useCallback((eventId: string, updates: Partial<PollingState>) => {
    setPollingState(prev => ({
      ...prev,
      [eventId]: {
        ...(prev[eventId] || { isPolling: false, progress: null, error: null }),
        ...updates
      }
    }));
  }, []);

  const pollPayment = useCallback(async (
    eventId: string,
    options?: {
      onComplete?: (data: any) => void;
      onError?: (error: string) => void;
      maxAttempts?: number;
    }
  ): Promise<boolean> => {
    // Se já está fazendo polling deste evento, não inicia outro
    if (pollingState[eventId]?.isPolling) {
      console.log(`[usePaymentPolling] Já existe polling para ${eventId}, ignorando...`);
      return false;
    }

    // Reset cancelamento
    cancelledRef.current[eventId] = false;

    // Inicia estado de polling
    const maxAttempts = options?.maxAttempts || 20;
    updatePollingState(eventId, { 
      isPolling: true, 
      progress: { current: 0, total: maxAttempts }, 
      error: null 
    });

    let currentAttempt = 0;

    try {
      // Loop de polling manual (igual appointmentService.pollStatus)
      while (currentAttempt < maxAttempts) {
        // Verifica se foi cancelado
        if (cancelledRef.current[eventId]) {
          console.log(`[usePaymentPolling] Polling cancelado para ${eventId}`);
          updatePollingState(eventId, { 
            isPolling: false, 
            progress: null,
            error: 'Cancelado pelo usuário'
          });
          return false;
        }

        try {
          // Consulta status
          const response = await pollPaymentStatus(eventId, 1, 1500);
          
          // Sucesso
          if (response.status === 'processed') {
            updatePollingState(eventId, { 
              isPolling: false, 
              progress: null,
              error: null 
            });
            options?.onComplete?.(response);
            return true;
          }
          
          // Falha
          if (response.status === 'failed') {
            throw new Error(response.error || 'Pagamento falhou');
          }
          
        } catch (error: any) {
          // Se foi cancelado, ignora erro
          if (cancelledRef.current[eventId]) {
            return false;
          }
          
          // Se não é "ainda processando", propaga erro
          if (error.message !== 'POLLING_TIMEOUT' && !error.message?.includes('timeout')) {
            throw error;
          }
        }

        // Ainda processando, atualiza progresso
        currentAttempt++;
        updatePollingState(eventId, { 
          progress: { current: currentAttempt, total: maxAttempts }
        });

        // Aguarda antes da próxima tentativa
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      // Max attempts atingido
      throw new Error('Tempo de espera excedido');

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      
      updatePollingState(eventId, { 
        isPolling: false, 
        progress: null,
        error: errorMsg 
      });
      
      options?.onError?.(errorMsg);
      return false;
    }
  }, [updatePollingState]);

  const cancelPolling = useCallback((eventId: string) => {
    cancelledRef.current[eventId] = true;
    cancelPaymentPolling(); // Cancela o global também
    
    updatePollingState(eventId, { 
      isPolling: false, 
      progress: null,
      error: 'Cancelado pelo usuário'
    });
  }, [updatePollingState]);

  const isPolling = useCallback((eventId: string): boolean => {
    return pollingState[eventId]?.isPolling || false;
  }, [pollingState]);

  return {
    pollingState,
    pollPayment,
    cancelPolling,
    isPolling
  };
}

export default usePaymentPolling;
