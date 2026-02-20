// src/hooks/useConvenioMetrics.ts
// Hook para buscar métricas de convênio - SEPARA receita realizada de caixa

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';

// Tipos baseados no retorno do backend
export interface ReceitaRealizada {
  total: number;
  quantidadeSessoes: number;
  porConvenio: Record<string, { valor: number; quantidade: number }>;
  porEspecialidade: Record<string, { valor: number; quantidade: number }>;
}

export interface AReceber {
  total: number;
  quantidadeSessoes: number;
  porStatus: {
    pending_billing: { valor: number; quantidade: number; descricao: string };
    billed: { valor: number; quantidade: number; descricao: string };
    partial: { valor: number; quantidade: number; descricao: string };
  };
  previsaoRecebimento: {
    total: number;
    quantidadeSessoes: number;
    porMes: Array<{ mes: string; valor: number; quantidade: number }>;
  };
}

export interface PipelineFuturo {
  total: number;
  quantidadeSessoes: number;
  porMes: Array<{ mes: string; valor: number; quantidade: number }>;
}

export interface Ativos {
  pacotesConvenio: number;
  guiasAtivas: number;
  totalSessoesDisponiveis: number;
  valorTotalDisponivel: number;
}

export interface Resumo {
  producaoMes: number;
  entradaEsperada: number;
  coberturaConvenio: string;
}

export interface ConvenioMetricsData {
  period: {
    month: number;
    year: number;
    startDate: string;
    endDate: string;
  };
  receitaRealizada: ReceitaRealizada;
  aReceber: AReceber;
  pipelineFuturo: PipelineFuturo;
  ativos: Ativos;
  resumo: Resumo;
}

export interface DashboardSummary {
  cards: {
    producaoMes: {
      label: string;
      value: number;
      sublabel: string;
      color: string;
      icon: string;
    };
    aReceber: {
      label: string;
      value: number;
      sublabel: string;
      color: string;
      icon: string;
    };
    pipeline: {
      label: string;
      value: number;
      sublabel: string;
      color: string;
      icon: string;
    };
  };
  alertas: Array<{
    tipo: string;
    titulo: string;
    mensagem: string;
    acao: string;
  }>;
}

export const useConvenioMetrics = () => {
  const [data, setData] = useState<ConvenioMetricsData | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  /**
   * Busca métricas completas de convênio para um período
   */
  const fetchMetrics = useCallback(async (month: number, year: number) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_URL}/api/financial/convenio/metrics?month=${month}&year=${year}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao buscar métricas de convênio');
      }

      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.error || 'Erro desconhecido');
      }
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  /**
   * Busca resumo para o dashboard
   */
  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_URL}/api/financial/convenio/dashboard-summary`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao buscar resumo de convênios');
      }

      const result = await response.json();
      
      if (result.success) {
        setSummary(result.data);
      } else {
        throw new Error(result.error || 'Erro desconhecido');
      }
    } catch (err: any) {
      setError(err.message);
      // Não mostra toast aqui para não poluir na carga inicial
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  /**
   * Formata valor como moeda brasileira
   */
  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  }, []);

  /**
   * Formata número de sessões
   */
  const formatSessoes = useCallback((quantidade: number) => {
    return `${quantidade} ${quantidade === 1 ? 'sessão' : 'sessões'}`;
  }, []);

  return {
    data,
    summary,
    loading,
    error,
    fetchMetrics,
    fetchSummary,
    formatCurrency,
    formatSessoes
  };
};

export default useConvenioMetrics;
