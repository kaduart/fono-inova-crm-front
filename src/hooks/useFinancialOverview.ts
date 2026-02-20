import { useState, useCallback } from 'react';
import api from '../services/api';

export interface ConvenioMetrics {
  receitaRealizada: number;
  aReceber: number;
  provisaoTotal: number;
  provisaoAgendadas: number;
  pipeline: number;
  ativos: {
    pacotesConvenio: number;
    guiasAtivas: number;
    totalSessoesDisponiveis: number;
    valorTotalDisponivel: number;
  };
}

export interface CreditoPacoteItem {
  pacoteId: string;
  paciente: string;
  sessoesRemanescentes: number;
  valorPorSessao: number;
  valorTotal: number;
}

export interface CreditoPacotes {
  total: number;
  pacientes: CreditoPacoteItem[];
}

export interface MetricsData {
  receita: number;
  despesas: number;
  lucro: number;
  margem: number;
  ticketMedio: number;
  totalTransacoes: number;
  meta: number;
  metaPercent: number;
  projecao: number;
  valorDiarioNecessario: number;
  caixa: number;
  aReceber: number;
  // NOVO: Separar receitas por tipo
  particularRecebido?: number;
  convenioRecebido?: number;
  // NOVO: Métricas de convênio
  convenio?: ConvenioMetrics;
  // NOVO: Crédito em pacotes
  creditoPacotes?: CreditoPacotes;
}

export interface FinancialOverviewData {
  metrics: MetricsData;
  variacao: {
    receita: number;
    despesas: number;
    lucro: number;
    margem: number;
  };
  insights: Array<{
    type: 'positive' | 'warning' | 'risk';
    message: string;
    detail: string;
    severity: string;
  }>;
}

interface UseFinancialOverviewReturn {
  data: FinancialOverviewData | null;
  loading: boolean;
  error: string | null;
  fetchOverview: (month: number, year: number, compare?: 'previous' | 'lastYear') => Promise<void>;
  formatCurrency: (value: number) => string;
  formatPercent: (value: number) => string;
  getVariationColor: (value: number) => string;
  getVariationIcon: (value: number) => string;
}

export function useFinancialOverview(): UseFinancialOverviewReturn {
  const [data, setData] = useState<FinancialOverviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = useCallback((value: number): string => {
    return `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, []);

  const formatPercent = useCallback((value: number): string => {
    return `${(value || 0).toFixed(1)}%`;
  }, []);

  const getVariationColor = useCallback((value: number): string => {
    if (value > 0) return '#10B981';
    if (value < 0) return '#EF4444';
    return '#6B7280';
  }, []);

  const getVariationIcon = useCallback((value: number): string => {
    if (value > 0) return '▲';
    if (value < 0) return '▼';
    return '−';
  }, []);

  const fetchOverview = useCallback(async (
    month: number, 
    year: number, 
    compare: 'previous' | 'lastYear' = 'previous'
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/financial/overview', {
        params: { month, year, compare }
      });

      if (response.data.success) {
        const { metrics, variation, insights } = response.data.data;
        
        // Mapear dados do backend para o formato do hook
        setData({
          metrics: {
            receita: metrics.receita,
            despesas: metrics.despesas,
            lucro: metrics.lucro,
            margem: metrics.margem,
            ticketMedio: metrics.receita / (metrics.metaPercent > 0 ? metrics.metaPercent * 10 : 1), // Estimativa
            totalTransacoes: Math.round(metrics.caixa / 150), // Estimativa baseada em ticket médio
            meta: metrics.meta,
            metaPercent: metrics.metaPercent,
            projecao: metrics.projecao,
            valorDiarioNecessario: metrics.valorDiarioNecessario,
            caixa: metrics.caixa,
            aReceber: metrics.aReceber,
            // NOVO: Separar receitas por tipo
            particularRecebido: metrics.particularRecebido,
            convenioRecebido: metrics.convenioRecebido,
            // NOVO: Métricas de convênio
            convenio: metrics.convenio,
            // NOVO: Crédito em pacotes
            creditoPacotes: metrics.creditoPacotes,
          },
          variacao: {
            receita: variation.receita,
            despesas: variation.despesas,
            lucro: variation.lucro,
            margem: variation.margem
          },
          insights: insights || []
        });
      } else {
        setError(response.data.message || 'Erro ao carregar dados');
      }
    } catch (err: any) {
      console.error('Erro no useFinancialOverview:', err);
      setError(err.response?.data?.message || 'Erro ao carregar visão financeira');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    data,
    loading,
    error,
    fetchOverview,
    formatCurrency,
    formatPercent,
    getVariationColor,
    getVariationIcon
  };
}

export default useFinancialOverview;
