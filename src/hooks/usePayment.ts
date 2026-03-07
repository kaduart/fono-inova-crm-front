// src/hooks/usePayment.ts
import { useCallback, useRef, useState } from 'react';
import {
  createPayment,
  DailyAbsence,
  DailyPayment,
  DailySession,
  deletePayment,
  exportCSV,
  exportPDF,
  FinancialRecord,
  getDailyAbsences,
  getDailyClosing,
  getDailyCompletedSessions,
  getDailyPayments,
  getDailyScheduledDetails,
  getPayment,
  getPayments,
  getPaymentSummary,
  getPaymentTotals,
  markPaymentAsPaid,
  Summary
} from '../services/paymentService';
import { DailyClosingData } from '../utils/types/daily-closing-model';
import { PaymentTotals } from '../utils/types/types';
import { invalidateCache } from '../utils/cacheManager';

type PaymentFilters = Record<string, any>;

const CACHE_DURATION = 3 * 60 * 1000; // 3 minutos

// Cache local para controle de estado de carregamento e dados de pagamento
const cache: {
  payments: FinancialRecord[] | null;
  timestamp: number | null;
  isLoading: boolean;
  promise: Promise<any> | null;
  paymentTotals: any;
  totalsTimestamp: number | null;
} = {
  payments: null,
  timestamp: null,
  isLoading: false,
  promise: null,
  paymentTotals: null,
  totalsTimestamp: null
};

const usePayment = () => {
  const [payments, setPayments] = useState<FinancialRecord[]>(cache.payments || []);
  const [payment, setPayment] = useState<FinancialRecord | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [dailyClosing, setDailyClosing] = useState<DailyClosingData | null>(null);
  const [dailySessions, setDailySessions] = useState<DailySession[]>([]);
  const [dailyPayments, setDailyPayments] = useState<DailyPayment[]>([]);
  const [dailyAbsences, setDailyAbsences] = useState<DailyAbsence[]>([]);
  const [loading, setLoading] = useState(cache.isLoading);
  const [error, setError] = useState<string | null>(null);
  const [paymentTotals, setPaymentTotals] = useState<PaymentTotals | null>(cache.paymentTotals);
  const [totalsFilters, setTotalsFilters] = useState<Record<string, any>>({});
  
  const isMounted = useRef(true);

  // 🔹 Buscar lista de pagamentos via service (com cache)
  const fetchPayments = useCallback(async (filters: PaymentFilters = {}, forceRefresh = false) => {
    const now = Date.now();
    
    // Usa cache se válido e não for refresh forçado
    if (!forceRefresh && cache.payments && cache.timestamp && (now - cache.timestamp < CACHE_DURATION)) {
      if (isMounted.current) {
        setPayments(cache.payments!);
      }
      return cache.payments;
    }

    // Se já está carregando, espera
    if (cache.isLoading && cache.promise) {
      const data = await cache.promise;
      if (isMounted.current) {
        setPayments(data);
      }
      return data;
    }

    cache.isLoading = true;
    if (isMounted.current) setLoading(true);

    const loadPromise = (async () => {
      try {
        const res = await getPayments(filters); 
        const data = res.data?.data || res.data;
        if (isMounted.current) {
          setPayments(data);
          setError(null);
        }
        cache.payments = data;
        cache.timestamp = Date.now();
        return data;
      } catch (err) {
        console.error('❌ Erro ao buscar pagamentos:', err);
        if (isMounted.current) {
          setError('Erro ao buscar pagamentos');
        }
        throw err;
      } finally {
        cache.isLoading = false;
        if (isMounted.current) setLoading(false);
      }
    })();

    cache.promise = loadPromise;
    const result = await loadPromise;
    cache.promise = null;
    return result;
  }, []);


  // Buscar um pagamento específico
  const fetchPayment = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const data = await getPayment(id);
      setPayment(data);
      setError(null);
    } catch (err) {
      setError('Erro ao buscar pagamento');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Criar novo pagamento
  const addPayment = useCallback(async (paymentData: Partial<FinancialRecord>) => {
    setLoading(true);
    try {
      const newPayment = await createPayment(paymentData);
      // 🚀 Invalida cache local e global
      cache.promise = null;
      setPayments(prev => [...prev, newPayment]);
      setError(null);
      
      // Invalida caches relacionados
      invalidateCache('dashboard');
      invalidateCache('patients');
      
      return newPayment;
    } catch (err) {
      setError('Erro ao criar pagamento');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // 📊 Buscar totais financeiros detalhados com filtros dinâmicos (com cache)
  const fetchPaymentTotals = useCallback(
    async (filters: {
      period?: 'day' | 'week' | 'month' | 'year' | 'custom' | 'all';
      startDate?: string;
      endDate?: string;
      doctorId?: string;
      paymentMethod?: string;
      serviceType?: string;
      status?: 'paid' | 'pending' | 'partial';
    } = {}, forceRefresh = false) => {
      const now = Date.now();
      const cacheKey = JSON.stringify(filters);
      
      // Só usa cache se for o mesmo período padrão (month)
      if (!forceRefresh && 
          (!filters.period || filters.period === 'month') && 
          cache.paymentTotals && 
          cache.totalsTimestamp && 
          (now - cache.totalsTimestamp < CACHE_DURATION)) {
        if (isMounted.current) {
          setPaymentTotals(cache.paymentTotals);
        }
        return;
      }

      if (isMounted.current) setLoading(true);
      try {
        const res = await getPaymentTotals(filters);
        console.log("📊 Resposta do /totals:", res.data);
        const data = res.data.data?.totals || res.data.totals || res.data;
        console.log("📊 Dados extraídos:", data);
        if (isMounted.current) {
          setPaymentTotals(data);
          setTotalsFilters(res.filters || {});
          setError(null);
        }
        // Só guarda no cache se for período padrão
        if (!filters.period || filters.period === 'month') {
          cache.paymentTotals = data;
          cache.totalsTimestamp = Date.now();
        }
      } catch (err) {
        console.error("❌ Erro ao buscar totais financeiros:", err);
        if (isMounted.current) {
          setError("Erro ao buscar totais financeiros");
        }
      } finally {
        if (isMounted.current) setLoading(false);
      }
    },
    []
  );

  // Atualizar pagamento 
  const markAsPaid = useCallback(async (id: string): Promise<FinancialRecord> => {
    setLoading(true);
    try {
      const res = await markPaymentAsPaid(id);
      const updated = (res as any)?.data?.data ?? (res as any)?.data ?? res;
      // 🚀 Invalida cache local e global
      cache.promise = null;
      setPayments(prev => prev.map(p => (p._id === id ? updated : p)));
      if (payment && payment._id === id) setPayment(updated);
      setError(null);
      
      // Invalida caches relacionados
      invalidateCache('dashboard');
      invalidateCache('patients');
      
      return updated;
    } catch (err) {
      setError('Erro ao atualizar pagamento');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [payment]);


  // Deletar pagamento
  const removePayment = useCallback(async (id: string) => {
    setLoading(true);
    try {
      await deletePayment(id);
      setPayments(prev => prev.filter(p => p._id !== id));
      if (payment && payment._id === id) setPayment(null);
      setError(null);
      
      // 🚀 Invalida caches relacionados
      invalidateCache('dashboard');
      invalidateCache('patients');
    } catch (err) {
      setError('Erro ao deletar pagamento');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [payment]);

  // Buscar resumo de pagamentos
  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPaymentSummary();
      setSummary(data);
      setError(null);
    } catch (err) {
      setError('Erro ao buscar resumo');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fechamento diário
  const fetchDailyClosing = useCallback(async (date?: string) => {
    setLoading(true);
    try {
      const res = await getDailyClosing(date);
      setDailyClosing(res?.data?.data || null);
      setError(null);
    } catch (e: any) {
      console.error("❌ Erro no fetchDailyClosing:", e);
      setError(e?.message || "Erro ao buscar fechamento diário");
      setDailyClosing(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Detalhes de pagamentos diários
  const fetchDailyPayments = useCallback(async (date?: string) => {
    setLoading(true);
    try {
      const data = await getDailyPayments(date);
      setDailyPayments(data);
      setError(null);
    } catch (err) {
      setError('Erro ao buscar pagamentos diários');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Sessões agendadas diárias
  const fetchDailyScheduledSessions = useCallback(async (date?: string) => {
    setLoading(true);
    try {
      const data = await getDailyScheduledDetails(date);
      setDailySessions(data);
      setError(null);
    } catch (err) {
      setError('Erro ao buscar sessões agendadas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Sessões realizadas diárias
  const fetchDailyCompletedSessions = useCallback(async (date?: string) => {
    setLoading(true);
    try {
      const data = await getDailyCompletedSessions(date);
      setDailySessions(data);
      setError(null);
    } catch (err) {
      setError('Erro ao buscar sessões realizadas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Faltas diárias
  const fetchDailyAbsences = useCallback(async (date?: string) => {
    setLoading(true);
    try {
      const data = await getDailyAbsences(date);
      setDailyAbsences(data);
      setError(null);
    } catch (err) {
      setError('Erro ao buscar faltas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Exportar CSV
  const exportCsvReport = useCallback(async (filters: PaymentFilters = {}) => {
    setLoading(true);
    try {
      const blob = await exportCSV(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pagamentos.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setError(null);
    } catch (err) {
      setError('Erro ao exportar CSV');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Exportar PDF
  const exportPdfReport = useCallback(async (filters: PaymentFilters = {}) => {
    setLoading(true);
    try {
      const blob = await exportPDF(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pagamentos.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setError(null);
    } catch (err) {
      setError('Erro ao exportar PDF');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Limpar estados
  const resetPaymentState = useCallback(() => {
    setPayments([]);
    setPayment(null);
    setSummary(null);
    setDailyClosing(null);
    setDailySessions([]);
    setDailyPayments([]);
    setDailyAbsences([]);
    setError(null);
  }, []);

  // ✅ Retorno final unificado
  return {
    payments,
    payment,
    summary,
    dailyClosing,
    dailySessions,
    dailyPayments,
    dailyAbsences,
    paymentTotals,
    totalsFilters,
    loading,
    error,
    fetchPayments,
    fetchPayment,
    addPayment,
    markAsPaid,
    removePayment,
    fetchSummary,
    fetchPaymentTotals,
    fetchDailyClosing,
    fetchDailyPayments,
    fetchDailyScheduledSessions,
    fetchDailyCompletedSessions,
    fetchDailyAbsences,
    exportCsvReport,
    exportPdfReport,
    resetPaymentState
  };
};

export default usePayment;
