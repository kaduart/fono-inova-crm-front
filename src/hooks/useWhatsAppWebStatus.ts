import { useEffect, useState, useCallback } from 'react';
import API from '../services/api';

export type WhatsAppStatus =
  | 'starting'
  | 'qr'
  | 'authenticated'
  | 'ready'
  | 'disconnected'
  | 'error'
  | 'connecting'
  | 'initializing'
  | 'reconnecting'
  | 'unknown';

export interface WhatsAppWebState {
  status: WhatsAppStatus;
  ready: boolean;
  authenticated: boolean;
  qrCode: string | null;
  lastDisconnectReason: string | null;
  lastAuthenticatedAt: string | null;
  qrCount: number;
  initAttempts: number;
  pid: number | null;
  uptime: number | null;
  updatedAt: string | null;
  error: string | null;
}

const POLL_INTERVAL = 3000;

export function useWhatsAppWebStatus() {
  const [state, setState] = useState<WhatsAppWebState>({
    status: 'unknown',
    ready: false,
    authenticated: false,
    qrCode: null,
    lastDisconnectReason: null,
    lastAuthenticatedAt: null,
    qrCount: 0,
    initAttempts: 0,
    pid: null,
    uptime: null,
    updatedAt: null,
    error: null,
  });
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await API.get('/whatsapp-web/status', {
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });
      setState((prev) => ({ ...prev, ...res.data, error: null }));
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: err?.response?.data?.error || err?.message || 'Erro ao consultar status',
      }));
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // 🔕 WhatsApp Web status polling — DESABILITADO (API wpp fora de uso no momento)
  //
  // Para reativar: descomentar o bloco abaixo.
  // Endpoint: GET /whatsapp-web/status  |  Intervalo: 3s (POLL_INTERVAL)
  // Usado em: WhatsAppDiagnostic, WhatsAppConnectionCard
  // ---------------------------------------------------------------------------
  // useEffect(() => {
  //   fetchStatus();
  //   const id = setInterval(fetchStatus, POLL_INTERVAL);
  //   return () => clearInterval(id);
  // }, [fetchStatus]);

  const reconnect = useCallback(async () => {
    try {
      await API.post('/whatsapp-web/reconnect');
      await fetchStatus();
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        error: err?.response?.data?.error || err?.message || 'Erro ao reconectar',
      }));
    }
  }, [fetchStatus]);

  return { state, loading, reconnect, refresh: fetchStatus };
}
