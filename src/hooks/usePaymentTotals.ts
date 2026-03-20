import { useState, useCallback } from 'react';
import api from '../services/api';

export interface PaymentTotals {
  totalReceived: number;
  totalPending: number;
  totalPartial: number;
  totalInsuranceProduction: number;
  totalInsuranceReceived: number;
  totalInsurancePending: number;
  particularReceived: number;
  particularPending: number;
  countInsuranceTotal: number;
  countInsuranceReceived: number;
  countInsurancePending: number;
}

export interface PatientTypes {
  novos: number;
  retornos: number;
  recorrentes: number;
}

export interface ConvenioFaturamentos {
  total: number;
  quantidade: number;
}

interface UsePaymentTotalsReturn {
  paymentTotals: PaymentTotals | null;
  patientTypes: PatientTypes | null;
  convenioFaturamentos: ConvenioFaturamentos | null;
  isLoading: boolean;
  error: string | null;
  fetchPaymentTotals: (month: number, year: number) => Promise<void>;
}

export function usePaymentTotals(): UsePaymentTotalsReturn {
  const [paymentTotals, setPaymentTotals] = useState<PaymentTotals | null>(null);
  const [patientTypes, setPatientTypes] = useState<PatientTypes | null>(null);
  const [convenioFaturamentos, setConvenioFaturamentos] = useState<ConvenioFaturamentos | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentTotals = useCallback(async (month: number, year: number) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Calcular datas do mês
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];
      
      // Buscar totais de pagamentos e métricas de convênio em paralelo
      const [response, metricsResponse] = await Promise.all([
        api.get('/payments/totals', {
          params: { period: 'custom', startDate, endDate }
        }),
        api.get('/financial/convenio/metrics', {
          params: { month, year }
        }).catch(() => null) // não bloqueia se o endpoint falhar
      ]);

      if (response.data?.success) {
        const totals = response.data.data?.totals || {};
        // Produção de convênio vem do ConvenioMetricsService (lê Session/Package — cobre pacotes)
        // Fallback para totalInsuranceProduction do Payment caso metrics não retorne
        const convenioProducao = metricsResponse?.data?.data?.receitaRealizada?.total
          ?? metricsResponse?.data?.receitaRealizada?.total
          ?? totals.totalInsuranceProduction
          ?? 0;
        const convenioPendente = metricsResponse?.data?.data?.aReceber?.total
          ?? metricsResponse?.data?.aReceber?.total
          ?? totals.totalInsurancePending
          ?? 0;

        setPaymentTotals({
          totalReceived: totals.totalReceived || 0,
          totalPending: totals.totalPending || 0,
          totalPartial: totals.totalPartial || 0,
          totalInsuranceProduction: convenioProducao,
          totalInsuranceReceived: totals.totalInsuranceReceived || 0,
          totalInsurancePending: convenioPendente,
          particularReceived: totals.particularReceived || 0,
          particularPending: totals.particularPending || 0,
          countInsuranceTotal: totals.countInsuranceTotal || 0,
          countInsuranceReceived: totals.countInsuranceReceived || 0,
          countInsurancePending: totals.countInsurancePending || 0,
        });

        const pt = response.data.data?.patientTypes;
        if (pt) setPatientTypes({ novos: pt.novos || 0, retornos: pt.retornos || 0, recorrentes: pt.recorrentes || 0 });
        
        // Buscar faturamentos de convênio
        try {
          const faturamentoResponse = await api.get('/financial/convenio/faturamentos', {
            params: { month, year }
          });
          if (faturamentoResponse.data?.success) {
            setConvenioFaturamentos({
              total: faturamentoResponse.data.data?.total || 0,
              quantidade: faturamentoResponse.data.data?.quantidade || 0
            });
          }
        } catch (e) {
          console.log('Erro ao buscar faturamentos:', e);
          setConvenioFaturamentos(null);
        }
      } else {
        setError(response.data?.message || 'Erro ao carregar dados');
      }
    } catch (err: any) {
      console.error('Erro no usePaymentTotals:', err);
      setError(err.response?.data?.message || 'Erro ao carregar totais de pagamentos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    paymentTotals,
    patientTypes,
    convenioFaturamentos,
    isLoading,
    error,
    fetchPaymentTotals
  };
}

export default usePaymentTotals;
