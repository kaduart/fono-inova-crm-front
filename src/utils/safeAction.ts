/**
 * safeAction.ts
 * 🚀 Wrapper global para ações async com tratamento padronizado de erro
 * 
 * Uso:
 * const result = await safeAction(() => api.post('/endpoint'));
 * 
 * ou com hook:
 * const { execute, isLoading } = useSafeAction();
 * execute(() => api.post('/endpoint'));
 */

import { toast } from 'react-hot-toast';
import { extractErrorMessage, isCriticalError, isNetworkError } from './errorUtils';

interface SafeActionOptions {
  /** Mensagem de sucesso (opcional) */
  successMessage?: string;
  /** Mensagem de erro personalizada */
  errorMessage?: string;
  /** Se deve mostrar toast de erro */
  showToast?: boolean;
  /** Se deve enviar pro chat (só erros críticos) */
  notifyChat?: boolean;
  /** Callback de sucesso */
  onSuccess?: (data: any) => void;
  /** Callback de erro */
  onError?: (error: Error) => void;
  /** Se deve propagar o erro após tratar */
  throwOnError?: boolean;
}

interface SafeActionResult<T> {
  data: T | null;
  error: Error | null;
  success: boolean;
}

/**
 * 🚀 Wrapper seguro para ações async
 * 
 * Exemplo:
 * ```ts
 * const { data, error, success } = await safeAction(
 *   () => completeAppointment(id),
 *   { successMessage: 'Agendamento concluído!' }
 * );
 * ```
 */
export async function safeAction<T>(
  fn: () => Promise<T>,
  options: SafeActionOptions = {}
): Promise<SafeActionResult<T>> {
  const {
    successMessage,
    errorMessage,
    showToast = true,
    notifyChat = true,
    onSuccess,
    onError,
    throwOnError = false
  } = options;

  try {
    const data = await fn();
    
    if (successMessage && showToast) {
      toast.success(successMessage);
    }
    
    onSuccess?.(data);
    
    return { data, error: null, success: true };
  } catch (err) {
    const message = extractErrorMessage(err, errorMessage || 'Erro na operação');
    const isCritical = isCriticalError(err);
    const isNetwork = isNetworkError(err);
    
    // 🆕 Toast com ID para evitar spam
    if (showToast) {
      toast.error(message, { 
        id: message, // Evita duplicados
        duration: isNetwork ? 5000 : 4000 // Rede demora mais
      });
    }
    
    // 🆕 Só notifica chat se for erro crítico e solicitado
    if (notifyChat && isCritical) {
      // Importação dinâmica para evitar circular dependency
      const { useChatOptional } = await import('../contexts/ChatContext');
      const chat = useChatOptional();
      chat?.addSystemMessage?.(`❌ ${message}`, 'error');
    }
    
    const error = err instanceof Error ? err : new Error(message);
    onError?.(error);
    
    if (throwOnError) {
      throw error;
    }
    
    return { data: null, error, success: false };
  }
}

/**
 * 🆕 Hook React para ações seguras com loading state
 * 
 * Exemplo:
 * ```ts
 * const { execute, isLoading, error } = useSafeAction();
 * 
 * const handleClick = () => {
 *   execute(() => api.post('/endpoint'), {
 *     successMessage: 'Salvo!'
 *   });
 * };
 * ```
 */
import { useState, useCallback } from 'react';

export function useSafeAction() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);

  const execute = useCallback(async <T,>(
    fn: () => Promise<T>,
    options: SafeActionOptions = {}
  ): Promise<SafeActionResult<T>> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await safeAction(fn, options);
      
      if (result.success) {
        setLastResult(result.data);
      } else {
        setError(result.error);
      }
      
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setLastResult(null);
  }, []);

  return {
    execute,
    isLoading,
    error,
    lastResult,
    reset,
    hasError: error !== null
  };
}

/**
 * 🆕 Decorator para métodos de classe
 * 
 * Exemplo:
 * ```ts
 * class AppointmentService {
 *   @SafeAction({ successMessage: 'Concluído!' })
 *   async complete(id: string) {
 *     return api.post(`/appointments/${id}/complete`);
 *   }
 * }
 * ```
 * 
 * NOTA: Requer suporte a decorators no projeto
 */
export function SafeAction(options: SafeActionOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return safeAction(() => originalMethod.apply(this, args), options);
    };

    return descriptor;
  };
}

export default safeAction;
