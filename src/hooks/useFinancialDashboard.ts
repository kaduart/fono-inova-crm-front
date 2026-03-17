/**
 * 📊 Hook Dashboard Financeiro Unificado
 * 
 * Substitui useProvisionamento + useFinancialMetrics
 * API única para todas as abas financeiras
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import moment from 'moment-timezone';

const TIMEZONE = 'America/Sao_Paulo';

interface Period {
  month: number;
  year: number;
  type: 'month' | 'week' | 'day';
  start: string;
  end: string;
  status: 'PASSADO' | 'ATUAL' | 'FUTURO';
}

interface Resumo {
  producao: number;
  producaoDetalhe: {
    particular: number;
    pacotes: number;
    convenio: number;
  };
  caixa: number;
  creditoPacotes: number;
  convenioAgendado: number;
  agendadoConfirmado: number;
  pendenteConfirmacao: number;
  provisionamento: number;
}

interface Cenario {
  valor: number;
  probabilidade: string;
}

interface Meta {
  valor: number;
  percentualAtual: number;
  gap: number;
}

interface Especialidade {
  especialidade: string;
  producao: number;
  sessoes: number;
  ticketMedio: number;
}

interface Profissional {
  id: string;
  nome: string;
  producao: number;
  sessoes: number;
}

interface Insight {
  tipo: 'error' | 'warning' | 'info';
  titulo: string;
  mensagem: string;
  acao?: string;
}

interface DashboardData {
  periodo: Period;
  resumo: Resumo;
  cenarios: {
    pessimista: Cenario;
    realista: Cenario;
    otimista: Cenario;
  };
  meta: Meta;
  analitico: {
    porEspecialidade: Especialidade[];
    porProfissional: Profissional[];
  };
  detalhes: {
    realizados: any[];
    creditoPacotes: any[];
    convenioAgendado: any[];
    agendados: any[];
    pendentes: any[];
  };
  insights: Insight[];
}

export const useFinancialDashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async (month?: number, year?: number, view: 'month' | 'week' | 'day' = 'month') => {
    const mes = month || moment().tz(TIMEZONE).month() + 1;
    const ano = year || moment().tz(TIMEZONE).year();
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/financial/dashboard', {
        params: { month: mes, year: ano, view }
      });
      setData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar dashboard');
      console.error('useFinancialDashboard error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    data,
    loading,
    error,
    fetchDashboard,
    refetch: fetchDashboard
  };
};

/**
 * Hook com período atual (mês)
 */
export const useCurrentMonthDashboard = () => {
  const month = moment().tz(TIMEZONE).month() + 1;
  const year = moment().tz(TIMEZONE).year();
  
  return useFinancialDashboard();
};

export default useFinancialDashboard;
