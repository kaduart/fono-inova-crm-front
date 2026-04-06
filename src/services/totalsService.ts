// services/totalsService.ts
/**
 * Serviço de Totais V2 - Event-driven
 * 
 * Estratégia:
 * - GET /v2/totals: Retorna snapshot ou fallback síncrono
 * - POST /v2/totals/recalculate: Solicita recálculo assíncrono
 * - Polling: GET /v2/totals/status/:date para verificar status
 */

import API from './api';

export interface TotalsData {
  totalReceived: number;
  totalPending: number;
  countReceived: number;
  countPending: number;
  particularReceived: number;
}

export interface TotalsResponse {
  success: boolean;
  data: {
    totals: TotalsData;
    period: string;
    date: string;
    calculatedAt: string;
    source: 'snapshot' | 'sync_fallback';
    backgroundUpdate?: boolean;
  };
  correlationId: string;
}

export interface TotalsStatusResponse {
  success: boolean;
  data: {
    status: 'ready' | 'stale' | 'not_calculated';
    date: string;
    period: string;
    calculatedAt: string | null;
    totals?: TotalsData;
  };
  correlationId: string;
}

export interface RecalculateResponse {
  success: boolean;
  message: string;
  data: {
    eventId: string;
    status: string;
    checkStatusUrl: string;
  };
  correlationId: string;
}

export const totalsService = {
  /**
   * Busca totais (snapshot ou fallback síncrono)
   */
  async getTotals(params?: {
    clinicId?: string;
    date?: string;
    period?: 'day' | 'week' | 'month' | 'year';
    forceRecalculate?: boolean;
  }): Promise<TotalsResponse> {
    const { data } = await api.get('/v2/totals', { params });
    return data;
  },

  /**
   * Solicita recálculo assíncrono dos totais
   */
  async recalculate(params: {
    clinicId?: string;
    date?: string;
    period?: 'day' | 'week' | 'month' | 'year';
  }): Promise<RecalculateResponse> {
    const { data } = await api.post('/v2/totals/recalculate', params);
    return data;
  },

  /**
   * Verifica status do cálculo
   */
  async getStatus(date: string, params?: {
    clinicId?: string;
    period?: string;
  }): Promise<TotalsStatusResponse> {
    const { data } = await api.get(`/v2/totals/status/${date}`, { params });
    return data;
  },

  /**
   * Polling para aguardar snapshot ficar pronto
   */
  async pollForReady(
    date: string,
    options: {
      clinicId?: string;
      period?: string;
      maxAttempts?: number;
      intervalMs?: number;
      onStatus?: (status: TotalsStatusResponse) => void;
    } = {}
  ): Promise<TotalsStatusResponse> {
    const {
      clinicId,
      period = 'month',
      maxAttempts = 30,
      intervalMs = 1000,
      onStatus
    } = options;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const status = await this.getStatus(date, { clinicId, period });
      
      if (onStatus) {
        onStatus(status);
      }

      if (status.data.status === 'ready') {
        return status;
      }

      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }

    throw new Error('Timeout aguardando cálculo de totais');
  },

  /**
   * Formata valor monetário
   */
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  },

  /**
   * Calcula taxa de conversão
   */
  calculateConversionRate(totals: TotalsData): number {
    const total = totals.countReceived + totals.countPending;
    return total > 0 ? (totals.countReceived / total) * 100 : 0;
  }
};

export default totalsService;
