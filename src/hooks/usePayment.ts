// src/hooks/usePayment.ts
import { useCallback, useState } from 'react';
import {
  createPayment,
  DailyAbsence,
  DailyClosingReport,
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
  Summary,
  updatePayment
} from '../services/paymentService';

type PaymentFilters = Record<string, any>;

const usePayment = () => {
  const [payments, setPayments] = useState<FinancialRecord[]>([]);
  const [payment, setPayment] = useState<FinancialRecord | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [dailyClosing, setDailyClosing] = useState<DailyClosingReport | null>(null);
  const [dailySessions, setDailySessions] = useState<DailySession[]>([]);
  const [dailyPayments, setDailyPayments] = useState<DailyPayment[]>([]);
  const [dailyAbsences, setDailyAbsences] = useState<DailyAbsence[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar lista de pagamentos
  const fetchPayments = useCallback(async (filters: PaymentFilters = {}) => {
    setLoading(true);
    try {
      const data = await getPayments(filters);
      setPayments(data);
      setError(null);
    } catch (err) {
      setError('Erro ao buscar pagamentos');
      console.error(err);
    } finally {
      setLoading(false);
    }
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
      setPayments(prev => [...prev, newPayment]);
      setError(null);
      return newPayment;
    } catch (err) {
      setError('Erro ao criar pagamento');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Atualizar pagamento
  const modifyPayment = useCallback(async (id: string, paymentData: any) => {
    setLoading(true);
    try {
      const updatedPayment = await updatePayment(id, paymentData);
      setPayments(prev =>
        prev.map(p => p._id === id ? updatedPayment : p)
      );
      if (payment && payment._id === id) {
        setPayment(updatedPayment);
      }
      setError(null);
      return updatedPayment;
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
      if (payment && payment._id === id) {
        setPayment(null);
      }
      setError(null);
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
      const data = await getDailyClosing(date);
      setDailyClosing(data.data);
      setError(null);
    } catch (err) {
      setError('Erro ao buscar fechamento diário');
      console.error(err);
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

  return {
    payments,
    payment,
    summary,
    dailyClosing,
    dailySessions,
    dailyPayments,
    dailyAbsences,
    loading,
    error,
    fetchPayments,
    fetchPayment,
    addPayment,
    modifyPayment,
    removePayment,
    fetchSummary,
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