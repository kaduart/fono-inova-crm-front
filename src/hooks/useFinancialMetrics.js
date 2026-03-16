/**
 * 💰 Hook Único para Métricas Financeiras
 * 
 * Substitui múltiplas chamadas redundantes por uma única fonte de verdade.
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import moment from 'moment-timezone';

const TIMEZONE = 'America/Sao_Paulo';

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
  const startDate = moment().tz(TIMEZONE).startOf('month').toISOString();
  const endDate = moment().tz(TIMEZONE).endOf('month').toISOString();
  
  return useFinancialMetrics(startDate, endDate, includeKPIs);
};

/**
 * Hook com período padrão (últimos 30 dias)
 */
export const useLast30DaysMetrics = (includeKPIs = false) => {
  const startDate = moment().tz(TIMEZONE).subtract(29, 'days').startOf('day').toISOString();
  const endDate = moment().tz(TIMEZONE).endOf('day').toISOString();
  
  return useFinancialMetrics(startDate, endDate, includeKPIs);
};
