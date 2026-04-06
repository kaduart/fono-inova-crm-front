/**
 * Utilitários para tratamento padronizado de erros
 * Extrai mensagens de erro de forma consistente do backend
 */

/**
 * Extrai a mensagem de erro de uma resposta de erro do Axios/API
 * 🛡️ BLINDADA: nunca quebra, sempre retorna string
 */
export function extractErrorMessage(
  error: unknown,
  defaultMessage: string = 'Erro na operação'
): string {
  try {
    if (!error) return defaultMessage;

    // Se for string, retorna direto
    if (typeof error === 'string') return error;

    const err = error as any;

    // 🚨 PRIMEIRO: Verifica resposta do Axios/API (antes de Error nativo)
    // Porque Axios Error tem message genérica "Request failed with status code X"
    const responseData = err.response?.data;
    if (responseData) {
      // Verifica campos comuns onde o erro pode estar
      if (responseData.error) {
        // Pode ser string ou objeto
        return typeof responseData.error === 'string'
          ? responseData.error
          : responseData.error.message || defaultMessage;
      }

      if (responseData.message) {
        return responseData.message;
      }

      // Verifica se há errors (plural) - array de erros de validação
      if (responseData.errors && Array.isArray(responseData.errors)) {
        return responseData.errors.map((e: any) => e.message || e).join(', ');
      }
    }

    // Se for Error nativo (sem response data)
    if (error instanceof Error && error.message) {
      return error.message;
    }

    // Erro direto no objeto
    if (err.message) return err.message;
    if (err.error) return err.error;

    return defaultMessage;
  } catch {
    // 🛡️ Última barreira: se tudo falhar, retorna mensagem padrão
    return defaultMessage;
  }
}

/**
 * Extrai o código de erro da resposta
 */
export function extractErrorCode(error: any): string | null {
  return error?.response?.data?.code || error?.code || null;
}

/**
 * Verifica se o erro é de conflito de estado (ex: sessão já completada)
 */
export function isConflictError(error: any): boolean {
  const code = extractErrorCode(error);
  return code === 'CONFLICT_STATE' || code === 'ALREADY_EXISTS';
}

/**
 * Verifica se o erro é de validação
 */
export function isValidationError(error: any): boolean {
  const code = extractErrorCode(error);
  return code === 'VALIDATION_ERROR' || code === 'INVALID_OBJECT_ID' || code === 'MISSING_REQUIRED_FIELD';
}

/**
 * Verifica se o erro é de não encontrado
 */
export function isNotFoundError(error: any): boolean {
  const code = extractErrorCode(error);
  return code === 'NOT_FOUND' || code === 'RESOURCE_NOT_FOUND';
}

// 🆕 CÓDIGOS DE ERRO CRÍTICOS (que merecem atenção no chat)
const CRITICAL_ERROR_CODES = [
  'CONFLICT_STATE',
  'ALREADY_EXISTS',
  'INSUFFICIENT_CREDIT',
  'BUSINESS_RULE_VIOLATION',
  'INTERNAL_ERROR',
  'WORKER_ERROR'
];

// 🆕 Mensagens que indicam problemas operacionais
const CRITICAL_ERROR_PATTERNS = [
  'já foi completada',
  'já foi cancelada',
  'sessão já',
  'agendamento já',
  'créditos esgotados',
  'pacote esgotado',
  'guia esgotada',
  'erro interno',
  'falha ao processar',
  'timeout',
  'não disponível'
];

/**
 * 🆕 Verifica se o erro é crítico e merece aparecer no chat
 * Erros de validação simples não precisam ir pro chat
 */
export function isCriticalError(error: unknown): boolean {
  try {
    const code = extractErrorCode(error);
    if (code && CRITICAL_ERROR_CODES.includes(code)) {
      return true;
    }

    const message = extractErrorMessage(error, '').toLowerCase();
    return CRITICAL_ERROR_PATTERNS.some(pattern => message.includes(pattern));
  } catch {
    return false;
  }
}

/**
 * 🆕 Verifica se é erro de rede/conexão
 */
export function isNetworkError(error: unknown): boolean {
  try {
    const err = error as any;
    if (!err) return false;
    
    // Axios network errors
    if (err.code === 'ECONNABORTED' || err.code === 'NETWORK_ERROR') return true;
    if (!err.response && err.request) return true; // Request made but no response
    
    const message = extractErrorMessage(error, '').toLowerCase();
    return message.includes('network') || 
           message.includes('conexão') || 
           message.includes('timeout') ||
           message.includes('offline');
  } catch {
    return false;
  }
}
