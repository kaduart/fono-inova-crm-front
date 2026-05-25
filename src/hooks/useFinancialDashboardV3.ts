/**
 * 📊 Hook Dashboard Financeiro V3 — Real-Time Meta Engine
 *
 * Consome /v2/financial/dashboard com contrato V3 (caixa, producao, metas, insights)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import moment from 'moment-timezone';

const TIMEZONE = 'America/Sao_Paulo';

// Cache de módulo: compartilhado entre todas as instâncias do hook (evita fetch duplicado)
const MODULE_CACHE_TTL = 45 * 1000; // 45s — mês aberto precisa ser near real-time
const _cache = new Map<string, { data: unknown; ts: number }>();
const _inflight = new Map<string, Promise<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = _cache.get(key);
  if (entry && Date.now() - entry.ts < MODULE_CACHE_TTL) return entry.data as T;
  return null;
}
function setCached(key: string, data: unknown) {
  _cache.set(key, { data, ts: Date.now() });
}

export interface MetasV3 {
  configuracao: {
    metaMensal: number;
    diasUteis: number;
    metaDiariaNecessaria: number;
  };
  realizado: { mes: number; hoje: number };
  ritmo: {
    esperadoAteAgora: number;
    realizadoAteAgora: number;
    diferenca: number;
    mediaDiariaAtual: number;
    percentualEsperado: number;
    percentualRealizado: number;
  };
  projecao: { final: number; bateMeta: boolean };
  gap: { valor: number; porDia: number; diasRestantes: number };
  statusMeta: 'verde' | 'amarelo-verde' | 'amarelo' | 'vermelho';
  alertas: {
    atrasado: boolean;
    critico: boolean;
    ok: boolean;
    mensagem: string[];
  };
  porTipo: {
    particular: { meta: number; realizado: number; percentualDoTotal: number };
    pacote: { meta: number; realizado: number; percentualDoTotal: number };
    convenio: { meta: number; realizado: number; percentualDoTotal: number };
    liminar: { meta: number; realizado: number; percentualDoTotal: number };
  };
}

export interface ProfissionalV3 {
  id: string;
  nome: string;
  especialidade: string;
  producao: number;
  realizado: number;
  quantidade: number;
  particular: number;
  convenio: number;
  pacote: number;
  liminar: number;
  lucro: number;
  margem: number;
  ticketMedio: number;
  eficiencia: number;
  produtividade: number;
}

export interface InsightV3 {
  insights: string[];
  recomendacoes: string[];
  alertas: Array<{
    tipo: string;
    nivel: 'alto' | 'medio' | 'baixo';
    profissional?: string;
    mensagem: string;
    acao: string;
  }>;
}

export interface AcaoExecutivaV3 {
  tipo: string;
  prioridade: 'alta' | 'media' | 'baixa';
  impactoEstimado?: number;
  impactoRisco?: string;
  descricao: string;
  motivo: string;
  acaoSugerida: string;
  profissional?: string;
}

export interface RiscoOperacionalV3 {
  nivel: 'baixo' | 'medio' | 'alto';
  motivos: string[];
  impacto: string;
}

export interface ComparativosV3 {
  mesAnterior: { caixa: number; producao: number; despesas: number };
  mesAtual: { caixa: number; producao: number; despesas: number };
  variacao: { caixa: number; producao: number; despesas: number };
}

export interface ComissaoV3 {
  total: number;
  sessoes: number;
  breakdown: any;
}

export interface DrillDownProfissionalV3 {
  id: string;
  nome: string;
  especialidade: string;
  resumo: {
    receita: number;
    producao: number;
    atendimentos: number;
    ticketMedio: number;
    eficiencia: number;
    produtividade: number;
  };
  mix: {
    particular: number;
    convenio: number;
    pacote: number;
    liminar: number;
  };
  contribuicao: {
    caixaPct: number;
    producaoPct: number;
  };
  comissao: ComissaoV3;
  diagnostico: {
    status: 'top' | 'regular' | 'atencao';
    acaoSugerida: string;
  };
}

export interface IndicadoresV3 {
  lucro: number;
  margemPercentual: number;
  pontoEquilibrio: number;
  pontoEquilibrioVsMeta: number;
  statusLucro: 'positivo' | 'negativo';
  statusMargem: 'bom' | 'atencao' | 'ruim';
}

export interface PendenteItemV3 {
  sessionId: string;
  paymentId?: string;
  data: string;
  hora?: string;
  paciente: string;
  valor: number;
  status: string;
  convenio?: string;
  paymentMethod?: string;
}

export interface V2FinancialPatientGroup {
  patient: { _id: string; fullName: string; phone?: string; email?: string };
  patientId: string;
  total: number;
  count: number;
  items: Array<{
    _id: string;
    amount: number;
    status: string;
    paymentMethod: string;
    billingType: string;
    data: string;
    hora?: string;
    specialty: string;
    doctor: { _id: string; fullName: string; specialty?: string } | null;
    appointment: { _id: string; date: string; time?: string; operationalStatus?: string; sessionType?: string } | null;
    notes?: string;
  }>;
}

export interface PendentesV3 {
  total: number;
  allPendingTotal?: number;
  allParticularTotal?: number;
  convenio: {
    total: number;
    count: number;
    items: PendenteItemV3[];
  };
  particular: {
    total: number;
    count: number;
    items: PendenteItemV3[];
  };
  vencidos?: {
    total: number;
    convenio: {
      total: number;
      count: number;
      items: PendenteItemV3[];
    };
    particular: {
      total: number;
      count: number;
      items: PendenteItemV3[];
    };
  };
  v2_financial?: {
    total: number;
    count: number;
    byPatient: Record<string, V2FinancialPatientGroup>;
    byDoctor: Record<string, any>;
    bySpecialty: Record<string, any>;
    byBillingType: { particular: any; convenio: any };
  };
}

export interface DrillDownV3 {
  profissionais: DrillDownProfissionalV3[];
  resumoGeral: {
    totalProfissionais: number;
    mediaProducao: number;
    emAtencao: number;
    topPerformers: number;
  };
}

export interface DashboardV3Data {
  period: { month: number; year: number };
  cash: {
    total: number;
    breakdown: {
      particular: number;
      pacote: number;
      convenio: number;
      liminar: number;
      packageSales?: number;
      packageSalesCount?: number;
      particularNet?: number;
    };
    byMethod: {
      pix: number;
      dinheiro: number;
      cartao: number;
      outros: number;
    };
  };
  revenue: {
    total: number;
    byMethod: {
      particular: number;
      pacote: number;
      convenio: number;
      liminar: number;
      recebido: number;
      pendente: number;
      particularPendente: number;
      pacotePendente: number;
    };
  };
  pendentes?: PendentesV3;
  expenses: {
    total: number;
    count: number;
    breakdown?: {
      expenses: number;
      comissoes: number;
      detalheComissoes: Array<{ doctorId: string; doctorName: string; total: number; sessions: number }>;
    };
  };
  balance: number;
  resultadoCaixa: number;
  convenioAReceber: number;
  particularPendente: number;
  pacotePendente: number;
  metas: MetasV3;
  profissionais: {
    lista: ProfissionalV3[];
    ranking: ProfissionalV3[];
    rankingPorProducao: ProfissionalV3[];
    rankingPorLucro: ProfissionalV3[];
    mediaProducao: number;
    totalProfissionais: number;
  };
  insights: InsightV3;
  comparativos: ComparativosV3;
  riscoOperacional: RiscoOperacionalV3;
  acoesExecutivas: AcaoExecutivaV3[];
  drillDown: DrillDownV3;
  indicadores: IndicadoresV3;
}

export interface DashboardV3Response {
  success: boolean;
  source: string;
  resumo: {
    caixa: number;
    caixaDetalhe: DashboardV3Data['cash']['breakdown'];
    producao: number;
    producaoDetalhe: DashboardV3Data['revenue']['byMethod'];
    resultadoCaixa: number;
    convenioAReceber: number;
    particularPendente: number;
    pacotePendente: number;
    aReceber: { total: number; mesAtual: number; historico: number };
    pendentes?: PendentesV3;
    saldo: number;
    despesas: { total: number; count: number };
    metas: MetasV3;
    profissionais: ProfissionalV3[];
    indicadores: IndicadoresV3;
  };
  data: DashboardV3Data;
}

export const useFinancialDashboardV3 = () => {
  const [response, setResponse] = useState<DashboardV3Response | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async (month?: number, year?: number) => {
    const mes = month || moment().tz(TIMEZONE).month() + 1;
    const ano = year || moment().tz(TIMEZONE).year();
    const cacheKey = `${mes}-${ano}`;

    // Cache hit: sem request
    const cached = getCached<DashboardV3Response>(cacheKey);
    if (cached) {
      setResponse(cached);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Deduplica requests concorrentes para o mesmo mês/ano
      let req = _inflight.get(cacheKey) as Promise<DashboardV3Response> | undefined;
      if (!req) {
        req = api.get('/v2/financial/dashboard', { params: { month: mes, year: ano } })
          .then(r => r.data as DashboardV3Response)
          .finally(() => _inflight.delete(cacheKey));
        _inflight.set(cacheKey, req);
      }
      const data = await req;
      setCached(cacheKey, data);
      setResponse(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Erro ao carregar dashboard V3');
      console.error('useFinancialDashboardV3 error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    response,
    data: response?.data || null,
    resumo: response?.resumo || null,
    loading,
    error,
    fetchDashboard,
    refetch: fetchDashboard
  };
};

export const useCurrentMonthDashboardV3 = () => {
  const month = moment().tz(TIMEZONE).month() + 1;
  const year = moment().tz(TIMEZONE).year();
  const hook = useFinancialDashboardV3();
  const fetched = useRef(false);

  useEffect(() => {
    if (!fetched.current) {
      fetched.current = true;
      hook.fetchDashboard(month, year);
    }

    // Auto-refresh a cada 60s: cache de 45s garante re-fetch sempre
    const interval = setInterval(() => {
      hook.fetchDashboard(month, year);
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [month, year, hook.fetchDashboard]);

  return hook;
};

export default useFinancialDashboardV3;
