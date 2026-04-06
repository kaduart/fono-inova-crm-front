/**
 * PaymentsContextV2 - Gerenciamento Global de Pagamentos (Event-Driven)
 * 
 * Versão V2 do contexto de pagamentos:
 * - Usa /v2/payments em vez de /appointments
 * - Integração com projeções otimizadas
 * - Cache inteligente com invalidação
 * - Suporte a polling assíncrono
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import {
  PaymentV2,
  PaymentsSummary,
  usePaymentsV2
} from '../hooks/usePaymentsV2';
import { totalsService } from '../services/totalsService';
import { 
  subscribeToCacheInvalidation, 
  invalidateCache,
  isCacheValid,
  getCache,
  setCache
} from '../utils/cacheManager';
import { socketManager } from '../utils/socketManager';

// ============================================
// TYPES
// ============================================

interface PaymentsStatsV2 {
  produced: number;
  received: number;
  pending: number;
  countPaid: number;
  countPartial: number;
  countPending: number;
  byMethod: {
    pix: number;
    card: number;
    cash: number;
    transfer: number;
    insurance: number;
    other: number;
  };
  byType: {
    particular: number;
    package: number;
    insurance: number;
    manual: number;
  };
}

interface PaymentsContextV2Data {
  // Estado
  payments: PaymentV2[];
  stats: PaymentsStatsV2 | null;
  summary: PaymentsSummary | null;
  isLoading: boolean;
  currentMonth: string | null;
  
  // Actions
  setPayments: (payments: PaymentV2[]) => void;
  setStats: (stats: PaymentsStatsV2) => void;
  loadPayments: (month: string, forceRefresh?: boolean) => Promise<void>;
  addPayment: (payment: PaymentV2) => void;
  updatePayment: (updated: PaymentV2) => void;
  removePayment: (id: string) => void;
  clearPayments: () => void;
  invalidatePaymentsCache: () => void;
  refreshStats: () => Promise<void>;
}

// ============================================
// CONTEXT
// ============================================

const PaymentsContextV2 = createContext<PaymentsContextV2Data>({} as PaymentsContextV2Data);

const CACHE_KEY = 'paymentsV2';
const CACHE_TTL = 2 * 60 * 1000; // 2 minutos

export const PaymentsProviderV2: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 🎯 Usa o hook V2 para dados
  const {
    payments: paymentsData,
    summary,
    loading: hookLoading,
    fetchPayments,
    invalidateCache: invalidateHookCache
  } = usePaymentsV2();

  // Estados locais
  const [payments, setPaymentsState] = useState<PaymentV2[]>(
    getCache<PaymentV2[]>(CACHE_KEY) || []
  );
  const [stats, setStatsState] = useState<PaymentsStatsV2 | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<string | null>(null);

  // Refs
  const paymentsRef = useRef<Map<string, PaymentV2>>(new Map());
  const requestIdRef = useRef(0);
  const isMounted = useRef(true);

  // ==========================================
  // HELPERS
  // ==========================================

  const calculateStats = useCallback((data: PaymentV2[]): PaymentsStatsV2 => {
    const produced = data.filter(p => p.status !== 'canceled').reduce((sum, p) => sum + (p.amount || 0), 0);
    const received = data.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.amount || 0), 0);
    const pending = data.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.amount || 0), 0);

    return {
      produced,
      received,
      pending,
      countPaid: data.filter(p => p.status === 'paid').length,
      countPartial: data.filter(p => p.status === 'partial').length,
      countPending: data.filter(p => p.status === 'pending').length,
      byMethod: data.reduce((acc, p) => {
        const method = p.paymentMethod?.toLowerCase() || 'other';
        if (method.includes('pix')) acc.pix += p.amount || 0;
        else if (method.includes('card') || method.includes('cartão')) acc.card += p.amount || 0;
        else if (method.includes('cash') || method.includes('dinheiro')) acc.cash += p.amount || 0;
        else if (method.includes('transfer') || method.includes('transferência')) acc.transfer += p.amount || 0;
        else if (method.includes('insurance') || method.includes('convênio')) acc.insurance += p.amount || 0;
        else acc.other += p.amount || 0;
        return acc;
      }, { pix: 0, card: 0, cash: 0, transfer: 0, insurance: 0, other: 0 }),
      byType: data.reduce((acc, p) => {
        const category = p.category?.toLowerCase() || 'manual';
        if (category === 'particular') acc.particular += p.amount || 0;
        else if (category === 'package') acc.package += p.amount || 0;
        else if (category === 'insurance') acc.insurance += p.amount || 0;
        else acc.manual += p.amount || 0;
        return acc;
      }, { particular: 0, package: 0, insurance: 0, manual: 0 }),
    };
  }, []);

  // ==========================================
  // ACTIONS
  // ==========================================

  const setPayments = useCallback((newPayments: PaymentV2[]) => {
    const unique = new Map<string, PaymentV2>();
    newPayments.forEach(p => unique.set(p._id, p));
    
    paymentsRef.current = unique;
    const uniqueArray = Array.from(unique.values());
    setPaymentsState(uniqueArray);
    setStatsState(calculateStats(uniqueArray));
    setCache(CACHE_KEY, uniqueArray);
  }, [calculateStats]);

  const setStats = useCallback((newStats: PaymentsStatsV2) => {
    setStatsState(newStats);
  }, []);

  /**
   * 🚀 LOAD COM CACHE + PROTEÇÃO DE CONCORRÊNCIA
   */
  const loadPayments = useCallback(async (month: string, forceRefresh = false) => {
    // ✅ Cache: se já carregou esse mês, não busca de novo
    if (!forceRefresh && currentMonth === month && payments.length > 0 && isCacheValid(CACHE_KEY)) {
      return;
    }

    // 🛡️ Incrementa request ID para esta chamada
    const currentRequest = ++requestIdRef.current;

    setIsLoading(true);
    try {
      console.log('[PaymentsContextV2] Buscando pagamentos para:', month);

      // 🚀 V2: Usa endpoint otimizado /v2/payments
      const result = await fetchPayments({
        month,
        status: 'all',
        page: 1,
        limit: 200
      });

      // 🛡️ IGNORA resposta se já teve nova requisição
      if (currentRequest !== requestIdRef.current) {
        console.log('[PaymentsContextV2] Resposta ignorada (request antigo)');
        return;
      }

      if (isMounted.current) {
        const data = result.data || [];
        setPayments(data);
        setCurrentMonth(month);
        console.log(`[PaymentsContextV2] ${data.length} pagamentos carregados`);
      }
    } catch (error) {
      console.error('[PaymentsContextV2] Erro ao carregar:', error);
      throw error;
    } finally {
      if (currentRequest === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [currentMonth, payments.length, fetchPayments, setPayments]);

  /**
   * 🔄 Atualiza estatísticas via totalsService
   */
  const refreshStats = useCallback(async () => {
    try {
      const result = await totalsService.getTotals({
        period: 'month',
        date: new Date().toISOString().split('T')[0]
      });

      if (isMounted.current && result.data?.totals) {
        const totals = result.data.totals;
        setStatsState(prev => ({
          ...prev,
          received: totals.totalReceived,
          pending: totals.totalPending,
          countPaid: totals.countReceived,
          countPending: totals.countPending,
        }));
      }
    } catch (error) {
      console.error('[PaymentsContextV2] Erro ao atualizar stats:', error);
    }
  }, []);

  const addPayment = useCallback((payment: PaymentV2) => {
    if (paymentsRef.current.has(payment._id)) {
      return;
    }
    
    paymentsRef.current.set(payment._id, payment);
    setPaymentsState(prev => [payment, ...prev]);
    invalidateCache(CACHE_KEY);
  }, []);

  const updatePayment = useCallback((updated: PaymentV2) => {
    paymentsRef.current.set(updated._id, updated);
    
    setPaymentsState(prev => 
      prev.map(p => p._id === updated._id ? updated : p)
    );
    invalidateCache(CACHE_KEY);
  }, []);

  const removePayment = useCallback((id: string) => {
    paymentsRef.current.delete(id);
    setPaymentsState(prev => prev.filter(p => p._id !== id));
    invalidateCache(CACHE_KEY);
  }, []);

  const clearPayments = useCallback(() => {
    paymentsRef.current.clear();
    setPaymentsState([]);
    setStatsState(null);
    setCurrentMonth(null);
    invalidateCache(CACHE_KEY);
  }, []);

  const invalidatePaymentsCache = useCallback(() => {
    invalidateCache(CACHE_KEY);
    invalidateHookCache();
  }, [invalidateHookCache]);

  // ==========================================
  // EFFECTS
  // ==========================================

  // Sincroniza com hook (apenas na primeira carga ou quando muda o mês)
  useEffect(() => {
    if (paymentsData.length > 0 && paymentsRef.current.size === 0) {
      setPayments(paymentsData);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentsData]);

  // Subscribe para invalidação de cache externa
  useEffect(() => {
    const unsubscribe = subscribeToCacheInvalidation(CACHE_KEY, () => {
      console.log('[PaymentsContextV2] Cache invalidado externamente');
      if (currentMonth) {
        loadPayments(currentMonth, true);
      }
    });

    return () => unsubscribe();
  }, [currentMonth, loadPayments]);

  // Socket listeners
  useEffect(() => {
    const handlePaymentChange = () => {
      console.log('[PaymentsContextV2] Payment change via socket');
      if (currentMonth) {
        loadPayments(currentMonth, true);
      }
      refreshStats();
    };

    const unsubCreated = socketManager.on('paymentCreated', handlePaymentChange);
    const unsubUpdated = socketManager.on('paymentUpdated', handlePaymentChange);
    const unsubDeleted = socketManager.on('paymentDeleted', handlePaymentChange);

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
    };
  }, [currentMonth, loadPayments, refreshStats]);

  // Cleanup
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <PaymentsContextV2.Provider
      value={{
        payments,
        stats,
        summary,
        isLoading: isLoading || hookLoading,
        currentMonth,
        setPayments,
        setStats,
        loadPayments,
        addPayment,
        updatePayment,
        removePayment,
        clearPayments,
        invalidatePaymentsCache,
        refreshStats
      }}
    >
      {children}
    </PaymentsContextV2.Provider>
  );
};

export const usePaymentsContextV2 = () => {
  const context = useContext(PaymentsContextV2);
  if (!context) {
    throw new Error('usePaymentsContextV2 deve ser usado dentro de PaymentsProviderV2');
  }
  return context;
};

/**
 * 🔄 Export compatível para migração gradual
 * Mantém retrocompatibilidade com código legado
 */
export const usePaymentsContext = usePaymentsContextV2;
export const PaymentsProvider = PaymentsProviderV2;

export default PaymentsContextV2;
