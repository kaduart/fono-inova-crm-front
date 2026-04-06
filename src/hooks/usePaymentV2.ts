/**
 * 🚀 Hook usePaymentV2
 * 
 * Gerencia criação de pagamentos com V2 (event-driven) + fallback V1
 * Usa usePaymentPolling para separar responsabilidades
 * 
 * Uso:
 * const { createPayment, isProcessing, status, error, cancel } = usePaymentV2();
 * 
 * const result = await createPayment({ patientId, amount: 150 });
 * // result.source = 'v2' | 'v1'
 * // result.data = dados do pagamento
 */

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    createPaymentWithFallback,
    addBalancePaymentMultiWithFallback,
    V2PaymentRequest
} from '../services/paymentService';
import { usePaymentPolling } from './usePaymentPolling';
import { extractErrorMessage } from '../utils/errorUtils';

export type PaymentStatus = 
    | 'idle' 
    | 'submitting' 
    | 'polling' 
    | 'completed' 
    | 'failed' 
    | 'cancelled';

export type PaymentSource = 'v2' | 'v1';

interface UsePaymentV2Result {
    // Estados
    isProcessing: boolean;
    status: PaymentStatus;
    statusMessage: string;
    error: string | null;
    progress: number;
    
    // Polling state (para acesso granular)
    pollingState: ReturnType<typeof usePaymentPolling>['pollingState'];
    isPolling: (eventId: string) => boolean;
    
    // Ações
    createPayment: (data: V2PaymentRequest) => Promise<any>;
    createPaymentMulti: (patientId: string, data: any) => Promise<any>;
    cancel: (eventId?: string) => void;
    reset: () => void;
}

const QUERY_KEY = 'payments';

export const usePaymentV2 = (): UsePaymentV2Result => {
    const queryClient = useQueryClient();
    const [status, setStatus] = useState<PaymentStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [currentEventId, setCurrentEventId] = useState<string | null>(null);
    
    // Usa polling separado (padrão useAppointmentsV2)
    const { 
        pollingState, 
        pollPayment, 
        cancelPolling, 
        isPolling 
    } = usePaymentPolling();

    const getStatusMessage = (status: PaymentStatus): string => {
        switch (status) {
            case 'idle': return 'Aguardando...';
            case 'submitting': return 'Enviando pagamento...';
            case 'polling': return 'Processando na fila...';
            case 'completed': return 'Pagamento confirmado!';
            case 'failed': return 'Falha no pagamento';
            case 'cancelled': return 'Cancelado pelo usuário';
            default: return 'Processando...';
        }
    };

    // Mutação: Criar pagamento
    const createMutation = useMutation({
        mutationFn: async (data: V2PaymentRequest) => {
            setStatus('submitting');
            setProgress(10);
            
            const result = await createPaymentWithFallback(data);
            
            // Se veio da V2, precisa de polling
            if (result.source === 'v2' && result.eventId) {
                setCurrentEventId(result.eventId);
                setStatus('polling');
                setProgress(30);
                
                // Inicia polling
                const completed = await pollPayment(result.eventId, {
                    maxAttempts: 20,
                    onComplete: (data) => {
                        setProgress(100);
                        setStatus('completed');
                    },
                    onError: (error) => {
                        throw new Error(error);
                    }
                });
                
                if (!completed) {
                    throw new Error('Processamento não completado');
                }
            } else {
                // V1 - já está completo
                setProgress(100);
                setStatus('completed');
            }
            
            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
        },
        onError: (err: any) => {
            if (err.message === 'POLLING_CANCELLED' || err.message?.includes('Cancelado')) {
                setStatus('cancelled');
                setError('Cancelado pelo usuário');
            } else {
                setStatus('failed');
                setError(extractErrorMessage(err, 'Erro ao processar pagamento'));
            }
            setProgress(0);
        }
    });

    // Mutação: Payment-multi
    const multiMutation = useMutation({
        mutationFn: async ({ patientId, data }: { patientId: string; data: any }) => {
            setStatus('submitting');
            setProgress(10);
            
            const result = await addBalancePaymentMultiWithFallback(patientId, data);
            
            // Se veio da V2, precisa de polling
            if (result.source === 'v2' && result.eventId) {
                setCurrentEventId(result.eventId);
                setStatus('polling');
                setProgress(30);
                
                const completed = await pollPayment(result.eventId, {
                    maxAttempts: 20,
                    onComplete: () => {
                        setProgress(100);
                        setStatus('completed');
                    },
                    onError: (error) => {
                        throw new Error(error);
                    }
                });
                
                if (!completed) {
                    throw new Error('Processamento não completado');
                }
            } else {
                setProgress(100);
                setStatus('completed');
            }
            
            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: ['balance'] });
        },
        onError: (err: any) => {
            if (err.message === 'POLLING_CANCELLED' || err.message?.includes('Cancelado')) {
                setStatus('cancelled');
            } else {
                setStatus('failed');
                setError(extractErrorMessage(err, 'Erro ao processar pagamento'));
            }
            setProgress(0);
        }
    });

    /**
     * Cria pagamento com V2 + fallback
     */
    const createPayment = useCallback(async (data: V2PaymentRequest) => {
        return createMutation.mutateAsync(data);
    }, [createMutation]);

    /**
     * Cria payment-multi com V2 + fallback
     */
    const createPaymentMulti = useCallback(async (patientId: string, data: any) => {
        return multiMutation.mutateAsync({ patientId, data });
    }, [multiMutation]);

    /**
     * Cancela operação em andamento
     */
    const cancel = useCallback((eventId?: string) => {
        const targetEventId = eventId || currentEventId;
        if (targetEventId) {
            cancelPolling(targetEventId);
        }
        setStatus('cancelled');
        setProgress(0);
    }, [cancelPolling, currentEventId]);

    /**
     * Reseta estado
     */
    const reset = useCallback(() => {
        setStatus('idle');
        setError(null);
        setProgress(0);
        setCurrentEventId(null);
    }, []);

    // Calcula isProcessing baseado em vários estados
    const isProcessing = 
        createMutation.isPending || 
        multiMutation.isPending ||
        status === 'polling';

    return {
        isProcessing,
        status,
        statusMessage: getStatusMessage(status),
        error,
        progress,
        
        // Polling
        pollingState,
        isPolling,
        
        // Ações
        createPayment,
        createPaymentMulti,
        cancel,
        reset
    };
};

export default usePaymentV2;
