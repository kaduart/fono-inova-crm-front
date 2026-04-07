/**
 * 🔄 Hook para Server-Sent Events (SSE) do Dashboard
 * 
 * Recebe atualizações em tempo real do backend quando:
 * - Pipeline de convênios muda
 * - Novo pagamento recebido
 * - Outras mudanças financeiras
 */

import { useEffect, useRef, useCallback } from 'react';
import api from '../services/api';

interface SSEMessage {
  type: 'connected' | 'INSURANCE_PIPELINE_CHANGED' | 'PAYMENT_RECEIVED' | 'CACHE_INVALIDATED';
  timestamp: string;
  data?: any;
  clientId?: string;
}

interface UseDashboardSSEOptions {
  onInsurancePipelineChanged?: (data: any) => void;
  onPaymentReceived?: (data: any) => void;
  onConnected?: (clientId: string) => void;
  onError?: (error: Event) => void;
}

export function useDashboardSSE(options: UseDashboardSSEOptions = {}) {
  const { 
    onInsurancePipelineChanged, 
    onPaymentReceived, 
    onConnected,
    onError 
  } = options;
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isManualCloseRef = useRef(false);
  
  // 🛡️ Limites para reconexão
  const MAX_RECONNECT_ATTEMPTS = 5;
  const BASE_RECONNECT_DELAY = 5000; // 5 segundos
  const MAX_RECONNECT_DELAY = 30000; // 30 segundos

  const connect = useCallback(() => {
    // Fecha conexão anterior se existir
    if (eventSourceRef.current) {
      isManualCloseRef.current = true;
      eventSourceRef.current.close();
      isManualCloseRef.current = false;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('[SSE] Token não encontrado');
      return;
    }
    
    // 🛡️ Verifica se atingiu o limite de tentativas
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      console.warn(`[SSE] Limite de ${MAX_RECONNECT_ATTEMPTS} tentativas atingido. Desistindo.`);
      return;
    }

    // Cria conexão SSE com token no header (via query string)
    const baseURL = api.defaults.baseURL || '';
    const sseUrl = `${baseURL}/financial/sse/dashboard?token=${encodeURIComponent(token)}`;
    
    console.log(`[SSE] Conectando... (tentativa ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.onopen = () => {
      console.log('[SSE] Conexão aberta');
      reconnectAttemptsRef.current = 0; // Reseta tentativas em caso de sucesso
    };

    es.onmessage = (event) => {
      try {
        // Ignora pings
        if (event.data === ':ping' || event.data.startsWith(':')) {
          return;
        }

        const message: SSEMessage = JSON.parse(event.data);
        console.log('[SSE] Mensagem recebida:', message.type);

        switch (message.type) {
          case 'connected':
            onConnected?.(message.clientId || '');
            break;
          
          case 'INSURANCE_PIPELINE_CHANGED':
            console.log('[SSE] Pipeline de convênios atualizado:', message.data);
            onInsurancePipelineChanged?.(message.data);
            break;
          
          case 'PAYMENT_RECEIVED':
            console.log('[SSE] Pagamento recebido:', message.data);
            onPaymentReceived?.(message.data);
            break;
          
          default:
            console.log('[SSE] Mensagem desconhecida:', message);
        }
      } catch (err) {
        console.error('[SSE] Erro ao processar mensagem:', err);
      }
    };

    es.onerror = (error) => {
      console.error('[SSE] Erro na conexão:', error);
      onError?.(error);
      
      // Se foi fechado manualmente, não reconecta
      if (isManualCloseRef.current) {
        return;
      }
      
      // Verifica se o erro é 401 (não autorizado) - nesse caso não reconecta
      // @ts-ignore - readyState é público no EventSource
      if (es.readyState === EventSource.CLOSED) {
        reconnectAttemptsRef.current++;
        
        if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          console.warn('[SSE] Máximo de tentativas atingido. Parando reconexões.');
          return;
        }
        
        // 🚀 Backoff exponencial: 5s, 10s, 20s, 30s, 30s...
        const delay = Math.min(
          BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current - 1),
          MAX_RECONNECT_DELAY
        );
        
        console.log(`[SSE] Reconectando em ${delay}ms...`);
        
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[SSE] Tentando reconectar...');
          connect();
        }, delay);
      }
    };
  }, [onInsurancePipelineChanged, onPaymentReceived, onConnected, onError]);

  const disconnect = useCallback(() => {
    isManualCloseRef.current = true;
    reconnectAttemptsRef.current = MAX_RECONNECT_ATTEMPTS; // Impede reconexão automática
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      console.log('[SSE] Desconectado manualmente');
    }
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return { connect, disconnect };
}

export default useDashboardSSE;
