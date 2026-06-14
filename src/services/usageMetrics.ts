/**
 * 🎯 Serviço de métricas de uso do frontend
 *
 * Envia eventos de uso para o backend persistir via logMetric.
 * Usado para observabilidade de funcionalidades críticas (ex: aba Projeção & Cenários).
 */

import api from './api';

interface UsageMetricData {
  [key: string]: any;
}

/**
 * Registra um evento de uso no backend.
 * Falhas são silenciadas para não quebrar a experiência do usuário.
 */
export async function trackUsage(
  service: string,
  operation: string,
  data?: UsageMetricData
): Promise<void> {
  try {
    await api.post('/metrics/usage', {
      service,
      operation,
      data: data || {}
    });
  } catch (err) {
    // Silencioso: métricas não devem quebrar funcionalidade.
    if (import.meta.env.DEV) {
      console.warn('[trackUsage] Falha ao registrar métrica:', err);
    }
  }
}
