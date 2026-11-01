/**
 * 💰 Hook Único para Métricas Financeiras
 * 
 * Substitui múltiplas chamadas redundantes por uma única fonte de verdade.
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { format, subDays } from 'date-fns';
import { monthEndYmd, monthStartYmd, nowSP, spDayEndISO, spDayStartISO } from '../utils/dateSP';


/**
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @param {boolean} includeKPIs - Incluir métricas adicionais
 */
export const useFinancialMetrics = (startDate, endDate, includeKPIs = false) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMetrics = useCallback(async () => {
    if (!startDate || !endDate) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data: response } = await api.get('/financial/v2/overview', {
        params: { 
          startDate, 
          endDate,
          includeKPIs 
        }
      });
      setData(response.data);
    } catch (err) {
      setError(err.message || 'Erro ao carregar dados financeiros');
      console.error('useFinancialMetrics error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, includeKPIs]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchMetrics
  };
};

/**
 * Hook com período padrão (mês atual)
 */
export const useCurrentMonthMetrics = (includeKPIs = false) => {
  const startDate = spDayStartISO(monthStartYmd());
  const endDate = spDayEndISO(monthEndYmd());
  
  return useFinancialMetrics(startDate, endDate, includeKPIs);
};

/**
 * Hook com período padrão (últimos 30 dias)
 */
export const useLast30DaysMetrics = (includeKPIs = false) => {
  const startDate = spDayStartISO(format(subDays(nowSP(), 29), 'yyyy-MM-dd'));
  const endDate = spDayEndISO(format(nowSP(), 'yyyy-MM-dd'));
  
  return useFinancialMetrics(startDate, endDate, includeKPIs);
};
