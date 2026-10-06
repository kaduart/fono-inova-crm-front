/**
 * Aviso padrão de erro da API para o usuário.
 *
 * Mostra a mensagem em linguagem clara que o backend já monta (quem/qual sessão/o que fazer),
 * preservando quebras de linha e dando mais tempo de leitura quando há ação a tomar.
 * Use no lugar de `toast.error(extractErrorMessage(...))` em fluxos onde o usuário precisa agir.
 */
import { toast } from 'react-toastify';
import { extractApiError, type ApiErrorInfo } from './errorUtils';

export function notifyApiError(error: unknown, fallback: string = 'Não foi possível concluir a operação'): ApiErrorInfo {
  const info = extractApiError(error, fallback);
  const needsReading = Boolean(info.action) || info.items.length > 0 || info.message.length > 140;

  toast.error(info.message, {
    toastId: info.message, // evita empilhar o mesmo aviso em tentativas repetidas
    autoClose: needsReading ? 15000 : 6000,
    style: { whiteSpace: 'pre-line' },
  });

  // Rastro para suporte: o texto técnico e o id de correlação ficam no console, não na tela.
  if (info.technicalMessage || info.correlationId) {
    console.warn('[API_ERROR]', { code: info.code, technicalMessage: info.technicalMessage, correlationId: info.correlationId });
  }
  return info;
}
