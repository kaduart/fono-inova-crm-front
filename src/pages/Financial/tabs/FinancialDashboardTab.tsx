import React, { useState, useEffect, useCallback, useRef, useMemo, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Skeleton } from '@mui/material';
import {
  LayoutDashboard,
  DollarSign,
  Briefcase,
  Receipt,
  Target,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Users,
  AlertCircle,
  CheckCircle2,
  Info,
  Calendar,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Send,
  Check,
  X,
  AlertTriangle,
  Star
} from 'lucide-react';
import api from '../../../services/api';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useFinancialDashboardV3 } from '../../../hooks/useFinancialDashboardV3';
import { useAppointmentsByType } from '../../../hooks/useAppointmentsByType';

// 🔧 Helper para lazy loading com retry em caso de falha de chunk
const lazyWithRetry = (importFn: () => Promise<any>, retries = 3, delay = 1500) => {
  return lazy(() => {
    let attempts = 0;

    const tryLoad = (): Promise<any> => {
      attempts++;
      return importFn().catch((error: any) => {
        const isChunkError = error?.name === 'TypeError' ||
                           error?.message?.includes('Failed to fetch dynamically imported module') ||
                           error?.message?.includes('load failed');

        if (isChunkError) {
          console.warn(`[FinancialDashboardTab] Chunk load failed (attempt ${attempts}/${retries})`);

          if (attempts < retries) {
            return new Promise((resolve) => {
              setTimeout(() => {
                resolve(tryLoad());
              }, delay * attempts);
            });
          }

          const reloadKey = 'chunk_reload_attempted_analise';
          const alreadyReloaded = sessionStorage.getItem(reloadKey);
          if (!alreadyReloaded) {
            sessionStorage.setItem(reloadKey, '1');
            window.location.reload();
          }
          console.error('[FinancialDashboardTab] Chunk failed after all retries + reload.', error);
          throw error;
        }

        throw error;
      });
    };

    return tryLoad();
  });
};

const ProjecaoCenarios = lazyWithRetry(() => import('./AnaliseProjecaoTab').then(m => ({ default: m.ProjecaoCenarios })));
import { DashboardEspecialidades } from '../components/DashboardEspecialidades';
import { RankingProfissionais } from '../components/RankingProfissionais';
import { ListaPacientesVIP } from '../components/ListaPacientesVIP';
import { PerformancePorProfissional } from '../components/PerformancePorProfissional';
import {
  getInsuranceReceivables,
  billInsuranceSession,
  receiveInsuranceSession,
  InsuranceReceivableGroup
} from '../../../services/paymentService';
import { toast } from 'react-toastify';
import { IAppointment } from '../../../utils/types/types';
import { FEATURE_FLAGS } from '../../../config/featureFlags';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const getMetaColor = (status: string) => {
  switch (status) {
    case 'verde': return 'success';
    case 'amarelo-verde': return 'warning';
    case 'amarelo': return 'warning';
    default: return 'error';
  }
};

const getMetaBg = (status: string) => {
  switch (status) {
    case 'verde': return 'bg-emerald-100';
    case 'amarelo-verde': return 'bg-amber-100';
    case 'amarelo': return 'bg-amber-100';
    default: return 'bg-rose-100';
  }
};

interface FinancialDashboardTabProps {
  month: number;
  year: number;
}

// Ícone ⓘ com popover explicando o que o indicador representa, fonte e o que não inclui.
// Evita colisão de nome com o Tooltip do recharts (já importado nesta tela para os gráficos).
const InfoTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="relative inline-flex group ml-1 align-middle">
    <span className="cursor-help text-gray-400 hover:text-gray-600 text-2xs leading-none select-none">ⓘ</span>
    <span className="pointer-events-none absolute z-20 hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-56 rounded-lg bg-gray-900 text-white text-3xs leading-snug p-2.5 shadow-lg text-left normal-case font-normal">
      {children}
    </span>
  </span>
);

const DASHBOARD_TAB_PARAM = 'dashboardTab';

const getDashboardTabs = () => [
  { id: 'decisao', label: 'Decisão Executiva', icon: <Zap size={18} /> },
  { id: 'visao-geral', label: 'Visão Geral', icon: <LayoutDashboard size={18} /> },
  { id: 'caixa', label: 'Caixa', icon: <DollarSign size={18} /> },
  { id: 'producao', label: 'Produção', icon: <Briefcase size={18} /> },
  { id: 'despesas', label: 'Despesas', icon: <Receipt size={18} /> },
  { id: 'metas', label: 'Metas', icon: <Target size={18} /> },
  ...(FEATURE_FLAGS.SHOW_PROJECTION_TAB ? [{ id: 'projecao', label: 'Projeção & Cenários', icon: <TrendingUp size={18} /> }] : []),
  { id: 'insights', label: 'Insights', icon: <Lightbulb size={18} /> },
  { id: 'ranking', label: 'Ranking', icon: <TrendingUp size={18} /> },
];

const FinancialDashboardTab = ({ month, year }: FinancialDashboardTabProps) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const resolveActiveTab = () => {
    const tabId = searchParams.get(DASHBOARD_TAB_PARAM);
    if (!tabId) return 0;
    const tabs = getDashboardTabs();
    const index = tabs.findIndex((t) => t.id === tabId);
    return index >= 0 ? index : 0;
  };

  const [activeTab, setActiveTab] = useState(resolveActiveTab());
  const [rankingSubTab, setRankingSubTab] = useState(0);
  const { data, resumo, loading, error, fetchDashboard } = useFinancialDashboardV3();
  // 🆕 B: Pendências de convênio
  const [pendingInsurance, setPendingInsurance] = useState<InsuranceReceivableGroup[]>([]);
  const [loadingInsurance, setLoadingInsurance] = useState(false);

  // 🆕 Recebíveis históricos de convênio (cards da seção Recebíveis)
  const [pendingInsuranceHistorical, setPendingInsuranceHistorical] = useState<InsuranceReceivableGroup[]>([]);
  const [billedInsuranceHistorical, setBilledInsuranceHistorical] = useState<InsuranceReceivableGroup[]>([]);
  const [loadingInsuranceHistorical, setLoadingInsuranceHistorical] = useState(false);

  // 🆕 D: Indicador administrativo de revisão manual (audit de payments de convênio)
  const [manualReviewCount, setManualReviewCount] = useState<number | null>(null);
  const [loadingManualReview, setLoadingManualReview] = useState(false);

  // 🆕 C: Novos agendamentos do mês (comparação com mês anterior)
  const { fetch: fetchAppointmentsByType } = useAppointmentsByType();
  const [agendamentosMes, setAgendamentosMes] = useState<{ total: number; leads: number; novos: number; retornos: number } | null>(null);
  const [agendamentosMesAnterior, setAgendamentosMesAnterior] = useState<{ total: number; leads: number; novos: number; retornos: number } | null>(null);
  const [novosPacientesLista, setNovosPacientesLista] = useState<IAppointment[]>([]);
  const [novosPacientesModalOpen, setNovosPacientesModalOpen] = useState(false);

  const fetchPendingInsurance = useCallback(async () => {
    setLoadingInsurance(true);
    try {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      const res = await getInsuranceReceivables({ status: 'pending_billing', month: monthStr });
      setPendingInsurance(res.data?.data || []);
    } catch (err) {
      console.error('Erro ao buscar convênios pendentes:', err);
    } finally {
      setLoadingInsurance(false);
    }
  }, [month, year]);

  const fetchInsuranceHistorical = useCallback(async () => {
    setLoadingInsuranceHistorical(true);
    try {
      const [pendingRes, billedRes] = await Promise.all([
        getInsuranceReceivables({ status: 'pending_billing' }),
        getInsuranceReceivables({ status: 'billed' })
      ]);
      setPendingInsuranceHistorical(pendingRes.data?.data || []);
      setBilledInsuranceHistorical(billedRes.data?.data || []);
    } catch (err) {
      console.error('Erro ao buscar recebíveis históricos de convênio:', err);
    } finally {
      setLoadingInsuranceHistorical(false);
    }
  }, []);

  const fetchManualReviewCount = useCallback(async () => {
    setLoadingManualReview(true);
    try {
      const res = await api.get('/api/v2/financial/dashboard/audits/convenio-payments-review-count');
      setManualReviewCount(res.data?.data?.revisaoManual ?? null);
    } catch (err) {
      console.error('Erro ao buscar contador de revisão manual:', err);
    } finally {
      setLoadingManualReview(false);
    }
  }, []);

  const handleBillInsurance = async (sessionId?: string) => {
    if (!sessionId) {
      toast.error('Sessão não encontrada para este pagamento');
      return;
    }
    try {
      await billInsuranceSession(sessionId);
      toast.success('Faturado com sucesso!');
      fetchPendingInsurance();
    } catch (err) {
      toast.error('Erro ao faturar convênio');
    }
  };

  const handleReceiveInsurance = async (sessionId?: string, grossAmount?: number) => {
    if (!sessionId) {
      toast.error('Sessão não encontrada para este pagamento');
      return;
    }
    try {
      await receiveInsuranceSession(sessionId, {
        receivedAmount: grossAmount || 0,
        receivedDate: new Date().toISOString().split('T')[0]
      });
      toast.success('Recebimento registrado!');
      fetchPendingInsurance();
    } catch (err) {
      toast.error('Erro ao registrar recebimento');
    }
  };

  // Débitos: modal + dados totais
  interface DebitoItem { _id: string; date: string; time?: string; paciente: string; paymentStatus: string; valor: number; tipo?: string; }
  const [debitosModalOpen, setDebitosModalOpen] = useState(false);
  const [debitosModalType, setDebitosModalType] = useState<'mes' | 'total'>('mes');
  const [debitosTotalData, setDebitosTotalData] = useState<DebitoItem[]>([]);
  const [debitosTotalValue, setDebitosTotalValue] = useState(0);
  const [loadingDebitosTotal, setLoadingDebitosTotal] = useState(false);
  const debitosTotalLoaded = useRef(false);

  const LEGACY_DEBITOS_URL = '/financial/dashboard/debitos';
  const V2_DEBITOS_URL = '/v2/financial/dashboard/debitos';

  const normalizeDebitos = (items: any[]): DebitoItem[] =>
    (items || []).map(item => ({
      _id: item._id,
      date: item.date,
      time: item.time,
      paciente: item.paciente,
      paymentStatus: item.paymentStatus,
      valor: item.valor,
      tipo: item.tipo
    }));

  const fetchDebitosTotal = useCallback(async () => {
    if (debitosTotalLoaded.current) return;
    debitosTotalLoaded.current = true; // guard imediato — evita race em StrictMode
    setLoadingDebitosTotal(true);

    const primaryUrl = FEATURE_FLAGS.USE_FINANCIAL_V2 ? V2_DEBITOS_URL : LEGACY_DEBITOS_URL;

    try {
      const res = await api.get(primaryUrl);
      setDebitosTotalData(normalizeDebitos(res.data?.data));
      setDebitosTotalValue(res.data?.total || 0);
    } catch (err) {
      debitosTotalLoaded.current = false; // permite retry em caso de erro
      console.error('Erro ao buscar débitos totais:', err);
    } finally {
      setLoadingDebitosTotal(false);
    }
  }, []);

  const [debitosMesData, setDebitosMesData] = useState<DebitoItem[]>([]);
  const [loadingDebitosMes, setLoadingDebitosMes] = useState(false);
  const [openPatientGroups, setOpenPatientGroups] = useState<Set<string>>(new Set());

  const fetchDebitosMes = useCallback(async () => {
    setLoadingDebitosMes(true);

    const primaryUrl = FEATURE_FLAGS.USE_FINANCIAL_V2
      ? `${V2_DEBITOS_URL}?month=${month}&year=${year}`
      : `${LEGACY_DEBITOS_URL}?month=${month}&year=${year}`;

    try {
      const res = await api.get(primaryUrl);
      setDebitosMesData(normalizeDebitos(res.data?.data));
    } catch (err) {
      console.error('Erro ao buscar débitos do mês:', err);
    } finally {
      setLoadingDebitosMes(false);
    }
  }, [month, year]);

  const openDebitosModal = (type: 'mes' | 'total') => {
    setDebitosModalType(type);
    if (type === 'total') {
      fetchDebitosTotal();
    } else {
      // Mostrar vencidos (data <= hoje): particular + convênio
      const allItems = [
        ...(resumo?.pendentes?.vencidos?.particular?.items || []).map((item: any) => ({ ...item, _tipo: item.paymentMethod || 'particular' })),
        ...(resumo?.pendentes?.vencidos?.convenio?.items || []).map((item: any) => ({ ...item, _tipo: item.convenio || 'convênio' })),
      ].map((item: any) => ({
        _id: String(item.sessionId),
        date: String(item.data),
        time: item.hora,
        paciente: item.paciente,
        paymentStatus: item.status,
        valor: item.valor,
        tipo: item._tipo,
      }));
      setDebitosMesData(allItems);
    }
    setDebitosModalOpen(true);
  };

  const insuranceLoaded = useRef<string>('');
  const byTypeFetched = useRef<string>('');

  // Carrega dados principais ao montar ou mudar mês/ano
  // 🎯 Débitos totais: carrega UMA VEZ na montagem (não depende de mês/ano)
  useEffect(() => {
    fetchDebitosTotal();
  }, [fetchDebitosTotal]);

  useEffect(() => {
    // Reseta flag de convênio para forçar re-fetch quando mês mudar
    insuranceLoaded.current = '';
    // Paraleliza as duas requisições independentes
    fetchDashboard(month, year);
  }, [month, year, fetchDashboard]);

  // 🆕 Busca novos agendamentos do mês e compara com mês anterior
  useEffect(() => {
    const key = `${month}-${year}`;
    if (byTypeFetched.current === key) return;
    byTypeFetched.current = key;

    const startCurrent = `${year}-${String(month).padStart(2, '0')}-01`;
    const endCurrent = new Date(year, month, 0).toISOString().split('T')[0];
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const startPrev = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
    const endPrev = new Date(prevYear, prevMonth, 0).toISOString().split('T')[0];

    fetchAppointmentsByType({ startDate: startCurrent, endDate: endCurrent, mode: 'createdAt' }).then(res => {
      const details = res?.details;
      const listaNovosRaw = [...(details?.leads || []), ...(details?.novos || [])];
      // 🎯 Deduplicar por paciente: um paciente novo com 5 agendamentos conta como 1
      const byPatient = new Map<string, IAppointment>();
      listaNovosRaw.forEach((apt: IAppointment) => {
        const pid = (apt as any).patient?._id || (apt as any).patient || apt.patientId;
        if (!pid) return;
        const key = pid.toString?.() || String(pid);
        if (!byPatient.has(key)) {
          byPatient.set(key, apt);
        } else if (new Date(apt.createdAt) < new Date(byPatient.get(key)!.createdAt)) {
          byPatient.set(key, apt);
        }
      });
      const listaNovosUnicos = Array.from(byPatient.values());
      setAgendamentosMes({
        total: details?.all?.length || 0,
        leads: listaNovosUnicos.filter((a: any) => a.isLead).length,
        novos: listaNovosUnicos.filter((a: any) => !a.isLead).length,
        retornos: details?.retornos45?.length || 0,
      });
      setNovosPacientesLista(listaNovosUnicos);
    }).catch(() => setAgendamentosMes(null));

    fetchAppointmentsByType({ startDate: startPrev, endDate: endPrev, mode: 'createdAt' }).then(res => {
      const details = res?.details;
      setAgendamentosMesAnterior({
        total: details?.all?.length || 0,
        leads: details?.leads?.length || 0,
        novos: details?.novos?.length || 0,
        retornos: details?.retornos45?.length || 0,
      });
    }).catch(() => setAgendamentosMesAnterior(null));
  }, [month, year, fetchAppointmentsByType]);

  // Lazy: só busca convênios quando o tab que os usa estiver ativo
  useEffect(() => {
    const key = `${month}-${year}`;
    // Tab 0 (Decisão Executiva) tem seção de recebíveis
    if (activeTab === 0 && insuranceLoaded.current !== key) {
      insuranceLoaded.current = key;
      fetchPendingInsurance();
      fetchInsuranceHistorical();
      fetchManualReviewCount();
    }
  }, [activeTab, month, year, fetchPendingInsurance, fetchInsuranceHistorical, fetchManualReviewCount]);

  // Sincroniza aba ativa caso o query param mude (reload / navegação)
  useEffect(() => {
    const nextTab = resolveActiveTab();
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // 🔄 Escuta evento global de refresh de caixa (disparado após completeSession)
  useEffect(() => {
    const handleCashRefresh = () => {
      console.log('[FinancialDashboardTab] cash:refresh recebido — refetching dashboard');
      fetchDashboard(month, year);
    };
    window.addEventListener('cash:refresh', handleCashRefresh);
    return () => window.removeEventListener('cash:refresh', handleCashRefresh);
  }, [month, year, fetchDashboard]);

  // 🎯 Variáveis derivadas — devem ficar ANTES do ritmoCardEl (evita TDZ)
  const totalCaixa = data?.cash?.total ?? 0;
  const totalProducao = data?.revenue?.total ?? 0;
  const liminarAReceber = data ? Math.max(0, (data.revenue?.byMethod?.liminar || 0) - (data.cash?.breakdown?.liminar || 0)) : 0;
  const totalRecebimentoProducao = data?.recebimentoProducao?.total ?? 0;
  const totalAntecipacoes = data?.antecipacoes ?? 0;
  const totalRetroativos = data?.retroativos ?? 0;
  const totalAReceberProducao = data?.aReceberProducao ?? 0;
  // 🚨 FIX (2026-09-02): Liminar não conta pra meta mensal (crédito judicial já
  // recebido antecipado — ver nota no card "Meta do Mês"). Essas três variáveis
  // ficam no escopo compartilhado do componente pra que TODAS as telas que
  // resumem produção/recebido/a-receber (Visão Geral, Metas, hero de ritmo)
  // usem a mesma régua sem Liminar — antes cada uma calculava/deixava de
  // calcular isso separado, e um card excluía Liminar enquanto outro não,
  // mostrando dois totais "A Receber" diferentes na mesma tela.
  const liminarProducaoMes = data?.revenue?.byMethod?.liminar ?? 0;
  const liminarRecebidoMes = Math.max(0, liminarProducaoMes - liminarAReceber);
  const totalProducaoSemLiminar = Math.max(0, totalProducao - liminarProducaoMes);
  const totalRecebimentoProducaoSemLiminar = Math.max(0, totalRecebimentoProducao - liminarRecebidoMes);
  const totalAReceberProducaoSemLiminar = Math.max(0, totalAReceberProducao - liminarAReceber);

  // 🎯 RITMO OPERACIONAL — deve ficar ANTES dos early returns (Rules of Hooks)
  const ritmoCardEl = useMemo(() => {
    const metas = data?.metas;
    if (!metas?.ritmo) return null;
    const pctEsperado = metas.ritmo.percentualEsperado ?? 0;
    // Meta = produção (regime de competência) — alinhado ao contrato FinancialSemantic.js
    const pctRealizado = metas.ritmo?.percentualRealizado ?? metas.camadas?.producao?.percentual ?? 0;
    const pctCaixa     = metas.camadas?.caixa?.percentual ?? 0;
    const diff = pctRealizado - pctEsperado;
    const isAtrasado = diff < 0;
    const bgClass = getMetaBg(metas.statusMeta || 'vermelho');
    const progressColor =
      metas.statusMeta === 'verde' ? 'bg-emerald-500' :
      metas.statusMeta === 'amarelo-verde' ? 'bg-amber-500' :
      metas.statusMeta === 'amarelo' ? 'bg-amber-500' : 'bg-rose-500';

    return (
      <div className={`p-4 md:p-6 rounded-2xl mb-6 border ${bgClass} border-gray-200 shadow-sm`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <div className="md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">RESULTADO ECONÔMICO — RITMO DO MÊS</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl md:text-5xl font-extrabold text-gray-900">{pctRealizado.toFixed(1)}%</span>
              <span className="text-xl text-gray-500">/ {pctEsperado.toFixed(1)}% esperado</span>
            </div>
            <p className="text-gray-600 mt-2">
              {isAtrasado
                ? `Você está ${Math.abs(diff).toFixed(1)} pontos percentuais abaixo do ritmo necessário para bater a meta.`
                : `Você está ${diff.toFixed(1)} pontos percentuais acima do ritmo esperado. Continue assim!`}
            </p>
            <div className="mt-4">
              <div className="h-[5px] w-full bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full ${progressColor} rounded-full transition-all`} style={{ width: `${Math.min(pctRealizado, 100)}%` }} />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Resultado econômico acumulado</span>
                <span>Meta mensal</span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-xs">
                <span className="text-gray-500">🏥 Produção: <span className="font-black text-blue-600">{pctRealizado.toFixed(1)}%</span></span>
                <span className="text-gray-500">💰 Caixa: <span className="font-black text-emerald-700">{pctCaixa.toFixed(1)}%</span></span>
                <span className="text-gray-400">📈 Dif.: <span className="font-semibold text-gray-500">{(pctCaixa - pctRealizado) >= 0 ? '+' : ''}{(pctCaixa - pctRealizado).toFixed(1)} p.p.</span></span>
                <span className="text-gray-500">⏳ A Receber: <span className="font-semibold text-amber-600">{formatCurrency(totalAReceberProducaoSemLiminar)}</span></span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <MetricRow label="Esperado até hoje (produção)" value={formatCurrency(metas.ritmo.esperadoAteAgora ?? 0)} />
            {/* 🚨 FIX (2026-09-02): usava metas.camadas.producao.atingido, que é a
                produção TOTAL (com Liminar) — inconsistente com o % mostrado acima
                (pctRealizado já vem sem Liminar de metas.ritmo.percentualRealizado).
                realizadoAteAgora é a mesma base sem Liminar usada no %, e diferenca
                já vem calculada certa do backend — evita recalcular com bases
                misturadas aqui. */}
            <MetricRow label="Produção realizada" value={formatCurrency(metas.ritmo?.realizadoAteAgora ?? totalProducaoSemLiminar)} />
            <MetricRow label="Caixa realizado" value={formatCurrency(totalCaixa)} />
            <MetricRow
              label="Diferença produção"
              value={formatCurrency(metas.ritmo?.diferenca ?? 0)}
              valueColor={(metas.ritmo?.diferenca ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}
            />
            <MetricRow label="Gap diário necessário" value={formatCurrency(metas.gap?.porDia ?? 0)} />
          </div>
        </div>
      </div>
    );
  }, [data?.metas?.ritmo?.percentualEsperado, data?.metas?.ritmo?.percentualRealizado, data?.metas?.ritmo?.esperadoAteAgora, data?.metas?.ritmo?.realizadoAteAgora, data?.metas?.ritmo?.diferenca, data?.metas?.gap?.porDia, data?.metas?.statusMeta, data?.metas?.camadas?.producao?.percentual, data?.metas?.camadas?.caixa?.percentual, data?.aReceberProducao]);

  if (loading) return (
    <div className="p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Skeleton variant="circular" width={48} height={48} sx={{ bgcolor: '#10B98120' }} />
          <div>
            <Skeleton variant="text" width={160} height={30} />
            <Skeleton variant="text" width={220} height={20} />
          </div>
        </div>
        <Skeleton variant="rounded" width={145} height={36} />
      </div>
      {/* Sub-tabs */}
      <div className="flex gap-2 pb-2 border-b border-gray-200 mb-5">
        {[{ w: 80 }, { w: 80 }, { w: 96 }, { w: 64 }].map((t, i) => (
          <Skeleton key={i} variant="rounded" width={t.w} height={36} />
        ))}
      </div>
      {/* RitmoCard hero — no padrão dos KPIs do ExpensesTab */}
      <div className="border rounded-xl p-4 mb-6" style={{ borderColor: '#10B98120', backgroundColor: '#10B98108' }}>
        <div className="flex items-center gap-4 mb-4">
          <Skeleton variant="circular" width={40} height={40} sx={{ bgcolor: '#10B98120' }} />
          <div className="flex-1">
            <Skeleton variant="text" width="55%" height={20} />
            <Skeleton variant="text" width="70%" height={32} sx={{ bgcolor: '#10B98115' }} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-4">
            <Skeleton variant="circular" width={36} height={36} sx={{ bgcolor: '#10B98120' }} />
            <div className="flex-1">
              <Skeleton variant="text" width="60%" height={16} />
              <Skeleton variant="text" width="80%" height={28} sx={{ bgcolor: '#10B98115' }} />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Skeleton variant="circular" width={36} height={36} sx={{ bgcolor: '#10B98120' }} />
            <div className="flex-1">
              <Skeleton variant="text" width="60%" height={16} />
              <Skeleton variant="text" width="80%" height={28} sx={{ bgcolor: '#10B98115' }} />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Skeleton variant="circular" width={36} height={36} sx={{ bgcolor: '#10B98120' }} />
            <div className="flex-1">
              <Skeleton variant="text" width="60%" height={16} />
              <Skeleton variant="text" width="80%" height={28} sx={{ bgcolor: '#10B98115' }} />
            </div>
          </div>
        </div>
      </div>
      {/* 3 MetricCards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[{ color: '#10B981' }, { color: '#3B82F6' }, { color: '#F59E0B' }].map((c, i) => (
          <div key={i} className="border rounded-xl p-4" style={{ borderColor: `${c.color}20`, backgroundColor: `${c.color}08` }}>
            <div className="flex items-center gap-4">
              <Skeleton variant="circular" width={40} height={40} sx={{ bgcolor: `${c.color}20` }} />
              <div className="flex-1">
                <Skeleton variant="text" width="55%" height={20} />
                <Skeleton variant="text" width="70%" height={32} sx={{ bgcolor: `${c.color}15` }} />
                <Skeleton variant="text" width="40%" height={16} />
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* 2-col content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-4">
            <Skeleton variant="circular" width={32} height={32} sx={{ bgcolor: '#3B82F620' }} />
            <Skeleton variant="text" width="60%" height={24} />
          </div>
          <Skeleton variant="rounded" width="100%" height={160} />
        </div>
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-4">
            <Skeleton variant="circular" width={32} height={32} sx={{ bgcolor: '#3B82F620' }} />
            <Skeleton variant="text" width="60%" height={24} />
          </div>
          <Skeleton variant="rounded" width="100%" height={160} />
        </div>
      </div>
    </div>
  );
  if (error) return <div className="p-4 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">{error}</div>;
  if (!data || !resumo) return <div className="p-4 rounded-lg bg-sky-50 text-sky-700 border border-sky-200">Nenhum dado disponível</div>;

  const { cash, revenue, expenses, metas, profissionais, insights, comparativos, riscoOperacional, acoesExecutivas, drillDown, indicadores, convenioAReceber, particularPendente, pacotePendente, recebimentoProducao, recebimentosAntecipados, aReceberProducao } = data;
  // ─── 🎯 APENAS RENDERIZAR — nenhum recálculo semântico aqui ───
  // Todos os valores abaixo vêm PRONTOS da API. Frontend não recalcula.
  // NOTA: totalCaixa/totalProducao já declarados acima (antes do ritmoCardEl) para evitar TDZ.

  const renderVisaoGeral = () => (
    <div>
      {ritmoCardEl}

      {/* ── VISÃO OPERACIONAL ── */}
      <p className="text-3xs font-black uppercase tracking-widest text-gray-400 mb-3">Visão Operacional</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* 1. Produção Clínica */}
        <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          <div style={{ height: 3, backgroundColor: '#3B82F6' }} />
          <div className="p-4 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase size={14} className="text-blue-600" />
              <span className="text-3xs font-black uppercase tracking-widest text-blue-600">Produção Clínica</span>
            </div>
            {/* 🚨 FIX (2026-09-02): mostrava a produção TOTAL (com Liminar) rotulada
                como "base da meta mensal" — mas a meta exclui Liminar desde a
                decisão de negócio confirmada (ver "Meta do Mês"). Cabeçalho agora
                reflete o valor que realmente conta pra meta; Liminar continua
                listado no detalhamento abaixo, só marcado como fora da meta. */}
            <div className="text-3xl font-black text-gray-900 mb-1">{formatCurrency(totalProducaoSemLiminar)}</div>
            <p className="text-3xs text-gray-500 mb-3">serviços realizados · <strong className="text-blue-600">base da meta mensal</strong></p>
            <div className="space-y-1.5 border-t border-gray-100 pt-2">
              {([
                { label: 'Pacote',     value: revenue.byMethod.pacote || 0,     color: '#8B5CF6' },
                { label: 'Particular', value: revenue.byMethod.particular || 0, color: '#3B82F6' },
                { label: 'Convênio',   value: revenue.byMethod.convenio || 0,   color: '#06B6D4' },
              ] as const).map(item => (
                <div key={item.label} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-gray-600">{item.label}</span>
                  </div>
                  <span className="font-semibold text-gray-800">{formatCurrency(item.value)}</span>
                </div>
              ))}
              {liminarProducaoMes > 0 && (
                <div className="flex items-center justify-between text-xs opacity-60">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: '#F97316' }} />
                    <span className="text-gray-500">Liminar <span className="italic">(fora da meta)</span></span>
                  </div>
                  <span className="font-semibold text-gray-500">{formatCurrency(liminarProducaoMes)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. Recebido da Produção */}
        <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          <div style={{ height: 3, backgroundColor: '#10B981' }} />
          <div className="p-4 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span className="text-3xs font-black uppercase tracking-widest text-emerald-600">Recebido da Produção</span>
            </div>
            <div className="text-3xl font-black text-gray-900 mb-1">{formatCurrency(totalRecebimentoProducaoSemLiminar)}</div>
            <p className="text-3xs text-gray-500 mb-3">da produção deste mês (sem Liminar) já convertida em caixa</p>
            <div className="border-t border-gray-100 pt-2">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-500">% da produção recebida</span>
                <strong className="text-emerald-700">{totalProducaoSemLiminar > 0 ? Math.round((totalRecebimentoProducaoSemLiminar / totalProducaoSemLiminar) * 100) : 0}%</strong>
              </div>
              <div className="h-[4px] w-full bg-gray-100 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${totalProducaoSemLiminar > 0 ? Math.min(100, Math.round((totalRecebimentoProducaoSemLiminar / totalProducaoSemLiminar) * 100)) : 0}%` }} />
              </div>
              {(totalProducaoSemLiminar > 0 ? Math.round((totalRecebimentoProducaoSemLiminar / totalProducaoSemLiminar) * 100) : 0) >= 75 && (
                <span className="inline-flex items-center gap-1 text-3xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  ✓ Alta conversão
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 3. A Receber */}
        <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          <div style={{ height: 3, backgroundColor: '#F59E0B' }} />
          <div className="p-4 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={14} className="text-amber-600" />
              <span className="text-3xs font-black uppercase tracking-widest text-amber-600">A Receber</span>
            </div>
            {/* 🚨 FIX (2026-09-02): total incluía liminarAReceber sem nenhuma
                distinção visual — quem olhasse rápido lia "R$1.030 a receber"
                achando que isso tudo contava pra meta, quando R$470 eram Liminar
                (fora da meta). Cabeçalho agora é só o que conta; Liminar continua
                listado, marcado como fora da meta. */}
            <div className="text-3xl font-black text-gray-900 mb-1">{formatCurrency(totalAReceberProducaoSemLiminar)}</div>
            <p className="text-3xs text-gray-500 mb-3">produção realizada ainda não paga</p>
            <div className="border-t border-gray-100 pt-2 space-y-1.5">
              {convenioAReceber > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                    <span className="text-gray-600">Convênio pendente</span>
                  </div>
                  <span className="font-semibold text-amber-700">{formatCurrency(convenioAReceber)}</span>
                </div>
              )}
              {(particularPendente + pacotePendente) > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <span className="text-gray-600">Particular/Pacote</span>
                  </div>
                  <span className="font-semibold text-amber-700">{formatCurrency(particularPendente + pacotePendente)}</span>
                </div>
              )}
              {liminarAReceber > 0 && (
                <div className="flex items-center justify-between text-xs opacity-60">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                    <span className="text-gray-500">Liminar <span className="italic">(fora da meta)</span></span>
                  </div>
                  <span className="font-semibold text-gray-500">{formatCurrency(liminarAReceber)}</span>
                </div>
              )}
            </div>
            {/* 🆕 (2026-09-02) reaproveita a função já usada em "Particular em aberto"
                (Decisão Executiva) — lista por paciente/data (convênio + particular
                vencidos do mês, sem Liminar). Achado real: usuário desconfiou do
                número até ver o detalhe por trás. */}
            {totalAReceberProducaoSemLiminar > 0 && (
              <button onClick={() => openDebitosModal('mes')}
                className="mt-2 w-full py-1.5 px-3 rounded-lg text-2xs font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors">
                Ver detalhes ↗
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── AGENDA & PACIENTES ── */}
      <p className="text-3xs font-black uppercase tracking-widest text-gray-400 mb-3">Agenda & Pacientes — Novos no Mês</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Card principal */}
        <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          <div style={{ height: 3, backgroundColor: '#EF4444' }} />
          <div className="p-4 bg-white">
            <div className="flex items-center gap-2 mb-1">
              <Calendar size={14} className="text-red-500" />
              <span className="text-3xs font-black uppercase tracking-widest text-red-500">Agendamentos Novos</span>
            </div>
            <div className="text-4xl font-black text-gray-900 my-1">{Math.max(0, (agendamentosMes?.leads ?? 0) + (agendamentosMes?.novos ?? 0))}</div>
            {agendamentosMesAnterior && (
              <p className="text-3xs text-gray-400 mb-2">
                vs mês anterior: {(agendamentosMesAnterior?.leads ?? 0) + (agendamentosMesAnterior?.novos ?? 0)} ·{' '}
                <span className={((agendamentosMes?.leads ?? 0) + (agendamentosMes?.novos ?? 0)) >= ((agendamentosMesAnterior?.leads ?? 0) + (agendamentosMesAnterior?.novos ?? 0)) ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                  {(((((agendamentosMes?.leads ?? 0) + (agendamentosMes?.novos ?? 0)) / Math.max(1, (agendamentosMesAnterior?.leads ?? 0) + (agendamentosMesAnterior?.novos ?? 0))) - 1) * 100).toFixed(1)}%
                </span>
              </p>
            )}
            <div className="space-y-1 border-t border-gray-100 pt-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Novos pacientes</span>
                <strong className="text-red-500">{Math.max(0, (agendamentosMes?.leads ?? 0) + (agendamentosMes?.novos ?? 0))}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Retornos 45+ dias</span>
                <strong className="text-gray-700">{agendamentosMes?.retornos ?? 0}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Recorrentes</span>
                <strong className="text-gray-700">{Math.max(0, (agendamentosMes?.total ?? 0) - (agendamentosMes?.leads ?? 0) - (agendamentosMes?.novos ?? 0) - (agendamentosMes?.retornos ?? 0))}</strong>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-1 mt-0.5">
                <span className="text-gray-400">Total geral</span>
                <strong className="text-gray-500">{agendamentosMes?.total ?? 0}</strong>
              </div>
              {novosPacientesLista.length > 0 && (
                <button onClick={() => setNovosPacientesModalOpen(true)}
                  className="mt-1.5 w-full py-1.5 text-2xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100">
                  Ver {novosPacientesLista.length} pacientes novos ↗
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Comparativo mês anterior */}
        <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          <div style={{ height: 3, backgroundColor: '#6B7280' }} />
          <div className="p-4 bg-white">
            <p className="text-3xs font-black uppercase tracking-widest text-gray-500 mb-1">Comparativo mês anterior</p>
            <div className="text-2xl font-black text-gray-900 mb-1">{Math.max(0, (agendamentosMesAnterior?.leads ?? 0) + (agendamentosMesAnterior?.novos ?? 0))}</div>
            <p className="text-3xs text-gray-500 mb-3">
              {agendamentosMes && agendamentosMesAnterior
                ? `${((((agendamentosMes?.leads ?? 0) + (agendamentosMes?.novos ?? 0)) / Math.max(1, (agendamentosMesAnterior?.leads ?? 0) + (agendamentosMesAnterior?.novos ?? 0)) - 1) * 100).toFixed(1)}% ${((agendamentosMes?.leads ?? 0) + (agendamentosMes?.novos ?? 0)) >= ((agendamentosMesAnterior?.leads ?? 0) + (agendamentosMesAnterior?.novos ?? 0)) ? 'a mais' : 'a menos'} que o mês anterior`
                : '—'}
            </p>
            <span className="inline-flex text-3xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">estável</span>
          </div>
        </div>

        {/* Taxa de novos */}
        {(() => {
          const pct = agendamentosMes && agendamentosMes.total > 0 ? Math.round((((agendamentosMes?.leads ?? 0) + (agendamentosMes?.novos ?? 0)) / agendamentosMes.total) * 100) : 0;
          return (
            <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100">
              <div style={{ height: 3, backgroundColor: '#0EA5E9' }} />
              <div className="p-4 bg-white">
                <p className="text-3xs font-black uppercase tracking-widest text-gray-500 mb-1">Taxa de novos</p>
                <div className="text-2xl font-black text-gray-900 mb-1">{pct}%</div>
                <p className="text-3xs text-gray-400 mb-2">% de agendamentos de novos pacientes</p>
                <div className="h-[4px] w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: '#0EA5E9' }} />
                </div>
              </div>
            </div>
          );
        })()}

        {/* Taxa de retorno */}
        {(() => {
          const pct = agendamentosMes && agendamentosMes.total > 0 ? Math.round((agendamentosMes.retornos / agendamentosMes.total) * 100) : 0;
          return (
            <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100">
              <div style={{ height: 3, backgroundColor: '#F59E0B' }} />
              <div className="p-4 bg-white">
                <p className="text-3xs font-black uppercase tracking-widest text-gray-500 mb-1">Taxa de retorno</p>
                <div className="text-2xl font-black text-gray-900 mb-1">{pct}%</div>
                <p className="text-3xs text-gray-400 mb-2">% de retornos após 45+ dias</p>
                <div className="h-[4px] w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: '#F59E0B' }} />
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── CAIXA FINANCEIRO ── */}
      <p className="text-3xs font-black uppercase tracking-widest text-gray-400 mb-3">Caixa Financeiro · Regime de Caixa</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          { label: 'Caixa total',   value: totalCaixa, color: '#10B981', sub: 'inclui vendas de pacotes e antecipações' },
          { label: 'Antecipações',  value: totalAntecipacoes, color: '#8B5CF6', sub: 'pacotes antecipados de meses anteriores' },
          { label: 'Despesas',      value: expenses.total, color: '#EF4444', sub: 'custos operacionais do mês' },
          { label: 'Lucro',         value: indicadores?.lucro ?? totalCaixa - expenses.total,
            color: (indicadores?.lucro ?? totalCaixa - expenses.total) >= 0 ? '#10B981' : '#EF4444',
            sub: `margem ${indicadores?.margemPercentual ?? 0}% · operação ${(indicadores?.lucro ?? 0) >= 0 ? 'saudável' : 'no limite'}` },
        ] as const).map(kpi => (
          <div key={kpi.label} className="rounded-xl overflow-hidden border border-gray-100 shadow-sm">
            <div style={{ height: 3, backgroundColor: kpi.color }} />
            <div className="p-3 bg-white">
              <p className="text-3xs text-gray-500 font-semibold mb-1">{kpi.label}</p>
              <p className="text-lg font-black leading-tight" style={{ color: kpi.color }}>{formatCurrency(kpi.value)}</p>
              <p className="text-3xs text-gray-400 mt-0.5 leading-tight">{kpi.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCaixa = () => {
    const pixPct = totalCaixa > 0 ? ((cash.byMethod.pix || 0) / totalCaixa * 100) : 0;
    const topMethod = (['pix','cartao','dinheiro','outros'] as const)
      .map(k => ({ key: k, label: k === 'cartao' ? 'Cartão' : k.charAt(0).toUpperCase() + k.slice(1), val: cash.byMethod[k] || 0 }))
      .sort((a,b) => b.val - a.val)[0];
    const topPct = totalCaixa > 0 ? (topMethod.val / totalCaixa * 100) : 0;

    return (
    <div className="space-y-4">
      {/* Banner */}
      <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-gray-100 shadow-sm">
        <span className="text-gray-400 text-sm">ⓘ</span>
        <p className="text-xs text-gray-600"><strong>Caixa = dinheiro que realmente entrou</strong> no banco. Convênio só aparece quando a operadora paga.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Por Tipo */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-3xs font-black uppercase tracking-widest text-gray-500">Caixa · Por Tipo</p>
          <p className="text-3xs text-gray-400 mb-3">dinheiro recebido no período</p>
          <BreakdownList items={[
            { label: 'Pacote',     value: cash.breakdown.pacote,     color: 'purple' },
            { label: 'Particular', value: cash.breakdown.particular, color: 'blue'   },
            { label: 'Convênio',   value: cash.breakdown.convenio,   color: 'sky'    },
            { label: 'Liminar',    value: cash.breakdown.liminar,    color: 'amber'  },
          ]} total={totalCaixa} />
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-500">Total caixa</span>
            <span className="text-sm font-black text-gray-900">{formatCurrency(totalCaixa)}</span>
          </div>
        </div>

        {/* Por Método */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-3xs font-black uppercase tracking-widest text-gray-500">Caixa · Por Método</p>
          <p className="text-3xs text-gray-400 mb-3">forma de pagamento recebida</p>
          <BreakdownList items={[
            { label: 'PIX',      value: cash.byMethod.pix,      color: 'sky'     },
            { label: 'Cartão',   value: cash.byMethod.cartao,   color: 'blue'    },
            { label: 'Dinheiro', value: cash.byMethod.dinheiro, color: 'emerald' },
            { label: 'Outros',   value: cash.byMethod.outros,   color: 'gray'    },
          ]} total={totalCaixa} />
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
              <strong>{topMethod.label}</strong> lidera · {topPct.toFixed(1)}% das entradas
            </span>
            <span className="text-3xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">✓ saudável</span>
          </div>
        </div>
      </div>

      {/* Detalhamento de Pacotes */}
      <div>
        <p className="text-3xs font-black uppercase tracking-widest text-gray-400 mb-2">Detalhamento de Pacotes no Caixa</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl bg-white border border-gray-100 p-4 shadow-sm">
            <p className="text-3xs text-gray-500 font-semibold mb-1">Vendas de pacotes (contratos)</p>
            <p className="text-xl font-black text-gray-900">{formatCurrency(cash.breakdown.packageSales || 0)}</p>
            <p className="text-3xs text-gray-400 mt-0.5">{cash.breakdown.packageSalesCount || 0} contratos fechados</p>
          </div>
          <div className="rounded-xl bg-white border border-gray-100 p-4 shadow-sm">
            <p className="text-3xs text-gray-500 font-semibold mb-1">Sessões de pacote pagas</p>
            <p className="text-xl font-black text-gray-900">{formatCurrency(Math.max(0, (cash.breakdown.pacote || 0) - (cash.breakdown.packageSales || 0)))}</p>
            <p className="text-3xs text-gray-400 mt-0.5">pagamento por sessão realizada</p>
          </div>
          <div className="rounded-xl overflow-hidden border border-gray-100 shadow-sm">
            <div style={{ height: 3, backgroundColor: '#8B5CF6' }} />
            <div className="p-4 bg-white">
              <p className="text-3xs text-gray-500 font-semibold mb-1">Total em pacotes</p>
              <p className="text-xl font-black" style={{ color: '#7C3AED' }}>{formatCurrency(cash.breakdown.pacote || 0)}</p>
              <p className="text-3xs text-gray-400 mt-0.5">vendas + sessões pagas</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    );
  };

  const renderProducao = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Por Tipo */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-3xs font-black uppercase tracking-widest text-gray-500">Produção · Por Tipo</p>
          <p className="text-3xs text-gray-400 mb-3">atendimentos realizados (não é caixa)</p>
          <BreakdownList items={[
            { label: 'Pacote',     value: revenue.byMethod.pacote,     color: 'purple' },
            { label: 'Particular', value: revenue.byMethod.particular, color: 'blue'   },
            { label: 'Convênio',   value: revenue.byMethod.convenio,   color: 'sky'    },
            { label: 'Liminar',    value: revenue.byMethod.liminar,    color: 'amber'  },
          ]} total={revenue.total} />
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-500">Total produção</span>
            <span className="text-sm font-black text-gray-900">{formatCurrency(revenue.total)}</span>
          </div>
        </div>

        {/* Status de Pagamento */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-3xs font-black uppercase tracking-widest text-gray-500">Status de Pagamento</p>
          <p className="text-3xs text-gray-400 mb-3">da produção clínica do mês</p>
          <div className="space-y-2">
            {[
              {
                label: 'Recebido da produção',
                desc: `pago de sessões deste mês · caixa total ${formatCurrency(cash.total)}${(totalRetroativos > 0 || totalAntecipacoes > 0) ? ` (inclui ${[totalRetroativos > 0 ? `${formatCurrency(totalRetroativos)} de retroativos` : null, totalAntecipacoes > 0 ? `${formatCurrency(totalAntecipacoes)} de antecipação de pacote` : null].filter(Boolean).join(' + ')})` : ''}`,
                value: totalRecebimentoProducao,
                bg: '#15803D', border: '#166534',
              },
              {
                // 🚨 FIX (2026-09-01): liminar entrava somado aqui embora o rótulo/desc
                // só fale de convênio. Liminar não segue o mesmo ciclo de faturamento
                // "sessão entregue aguardando repasse" — o processo judicial paga em
                // parcelas periódicas (Payment kind='package_receipt'), reconhecidas no
                // dia em que o valor entra, não por sessão individual (ver
                // classification-rules.md, categoria JUDICIAL_LIMINAR, e ADR-011 em
                // DOMAIN_INVARIANTS.md, que já trata liminar à parte por essa mesma
                // razão). Já existe card próprio de "Liminar" em A Receber (Visão
                // Geral) — não precisa duplicar aqui misturado com convênio.
                label: 'A faturar ao plano',
                desc: `sessões entregues aguardando repasse · Conv. ${formatCurrency(convenioAReceber)}`,
                value: convenioAReceber,
                bg: '#B45309', border: '#92400E',
              },
              {
                label: 'Não pago',
                desc: 'particular/pacote com sessão realizada sem pagamento',
                value: particularPendente + pacotePendente,
                bg: '#B91C1C', border: '#991B1B',
              },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                style={{ backgroundColor: item.bg }}>
                <div className="flex-1 min-w-0 pr-3">
                  <p className="text-3xs font-black text-white uppercase tracking-wide leading-tight">{item.label}</p>
                  <p className="text-3xs text-white/70 mt-0.5 leading-snug">{item.desc}</p>
                </div>
                <span className="text-xl font-black text-white shrink-0">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderDespesas = () => {
    const comissoes = expenses.breakdown?.comissoes || 0;
    const outrasDespesas = expenses.breakdown?.expenses || expenses.total;
    return (
      <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard title="Total (Despesas + Comissões)" value={formatCurrency(expenses.total)} icon={<Receipt size={20} />} color="rose" />
          <MetricCard title="Despesas Cadastradas" subtitle="Só as da lista" value={formatCurrency(outrasDespesas)} icon={<Info size={20} />} color="sky" />
          <MetricCard title="Comissões Terapeutas" subtitle="Calculadas das sessões" value={formatCurrency(comissoes)} icon={<Users size={20} />} color="amber" />
          <MetricCard title="Impacto no Caixa" value={`${((expenses.total / (totalCaixa || 1)) * 100).toFixed(1)}%`} icon={<TrendingDown size={20} />} color="amber" />
        </div>
        {expenses.breakdown && expenses.breakdown.detalheComissoes.length > 0 && (() => {
          const comRegra = expenses.breakdown.detalheComissoes.filter(c => !c.noRule).length;
          const semRegra = expenses.breakdown.semRegra ?? expenses.breakdown.detalheComissoes.filter(c => c.noRule).length;
          return (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-3xs font-black uppercase tracking-widest text-gray-400">Comissões por Profissional</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-500">{comRegra} com regra</span>
                  {semRegra > 0 && (
                    <span className="text-3xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">⚠ {semRegra} sem regra</span>
                  )}
                </div>
              </div>
              <span className="text-sm font-bold text-gray-900">{formatCurrency(expenses.breakdown.comissoes)}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="px-5 py-2.5 text-left text-3xs font-black uppercase tracking-widest text-gray-400">Profissional</th>
                    <th className="px-4 py-2.5 text-right text-3xs font-black uppercase tracking-widest text-gray-400">Sessões</th>
                    <th className="px-4 py-2.5 text-right text-3xs font-black uppercase tracking-widest text-gray-400">Produção</th>
                    <th className="px-4 py-2.5 text-right text-3xs font-black uppercase tracking-widest text-gray-400">%</th>
                    <th className="px-5 py-2.5 text-right text-3xs font-black uppercase tracking-widest text-gray-400">Comissão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {expenses.breakdown.detalheComissoes.map((c) => (
                    <tr key={c.doctorId} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3 font-semibold text-gray-800">{c.doctorName}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{c.sessions}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{c.productionBase > 0 ? formatCurrency(c.productionBase) : '—'}</td>
                      <td className="px-4 py-3 text-right">
                        {c.commissionRate > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-amber-100 text-amber-700">{c.commissionRate}%</span>
                        ) : '—'}
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-gray-900">{formatCurrency(c.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-100 bg-gray-50">
                    <td className="px-5 py-3 text-3xs font-black uppercase tracking-widest text-gray-400">Total</td>
                    <td className="px-4 py-3 text-right text-gray-500 text-xs font-semibold">
                      {expenses.breakdown.detalheComissoes.reduce((s, c) => s + c.sessions, 0)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 text-xs font-semibold">
                      {formatCurrency(expenses.breakdown.detalheComissoes.reduce((s, c) => s + (c.productionBase || 0), 0))}
                    </td>
                    <td className="px-4 py-3" />
                    <td className="px-5 py-3 text-right font-black text-gray-900">{formatCurrency(expenses.breakdown.comissoes)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
        })()}
      </div>
    );
  };

  const renderMetas = () => {
    if (!metas) return <div className="p-4 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">Dados de metas indisponíveis para este período.</div>;

    const metaValor        = metas.configuracao?.metaMensal ?? 0;
    // Meta = produção (regime de competência) — alinhado ao contrato FinancialSemantic.js (META.base = PRODUCTION)
    const pctRealizado     = metas.ritmo?.percentualRealizado ?? metas.camadas?.producao?.percentual ?? 0;
    const metaRealizado    = metas.realizado?.mes ?? metas.camadas?.producao?.atingido ?? totalProducao;
    const resultadoEcon    = metaRealizado;
    const caixaTotal       = cash?.total ?? 0;
    const producaoTotal    = revenue?.total ?? 0;
    const pctCaixaMeta     = metas.camadas?.caixa?.percentual ?? (metaValor > 0 ? (caixaTotal / metaValor) * 100 : 0);
    // convenioAReceber, totalAReceberProducaoSemLiminar e totalRecebimentoProducaoSemLiminar
    // usam o escopo compartilhado do componente (mesma régua sem Liminar em toda a tela).

    const isVerde   = metas.statusMeta === 'verde';
    const isAmVerde = metas.statusMeta === 'amarelo-verde';
    const isAm      = metas.statusMeta === 'amarelo';
    const heroColor = isVerde ? '#10B981' : (isAmVerde || isAm) ? '#F59E0B' : '#EF4444';
    const heroBg    = isVerde ? '#F0FDF4' : (isAmVerde || isAm) ? '#FFFBEB' : '#FFF1F2';
    const statusLabel = isVerde ? '✅ No ritmo' : isAmVerde ? '🟡 Levemente abaixo' : isAm ? '⚠️ Abaixo do ritmo' : '🔴 Crítico';

    const textoExecutivo = (() => {
      if (pctRealizado >= 100) return 'Meta atingida! Excelente desempenho no período.';
      const diff = pctRealizado - (metas.ritmo?.percentualEsperado ?? 0);
      if (diff >= 5)  return `Acima do esperado — ${pctRealizado.toFixed(0)}% concluído com ${(metas.ritmo?.percentualEsperado ?? 0).toFixed(0)}% do período decorrido.`;
      if (diff >= -5) return `No ritmo da meta — ${pctRealizado.toFixed(0)}% concluído com ${(metas.ritmo?.percentualEsperado ?? 0).toFixed(0)}% do período decorrido.`;
      if (convenioAReceber > 0) return `Atingimento depende do recebimento dos convênios pendentes (${formatCurrency(convenioAReceber)}).`;
      return `${Math.abs(diff).toFixed(0)}% abaixo do esperado — necessário ${formatCurrency(metas.gap?.porDia ?? 0)}/dia para recuperar.`;
    })();

    const tipoColors: Record<string, string> = {
      pacote: '#3B82F6', particular: '#10B981', convenio: '#8B5CF6', liminar: '#F97316'
    };
    const tipoLabels: Record<string, string> = {
      pacote:     'Pacote Pré-pago',
      particular: 'Particular',
      convenio:   'Convênio',
      liminar:    'Liminar Judicial'
    };
    const tipoIcons: Record<string, string> = {
      pacote: '📦', particular: '👤', convenio: '🏥', liminar: '⚖️'
    };

    const _monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const _monthLabel = `${_monthNames[(month || 1) - 1]} ${year}`;

    return (
      <div className="space-y-4">
        {/* Header strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-0.5">
          <div>
            <p className="text-base font-black text-gray-900">Metas · {_monthLabel}</p>
            {metas?.ritmo && (
              <p className="text-xs text-gray-500 mt-0.5">
                {metas.ritmo.diasDecorridos ?? 0} dias decorridos · {(metas.ritmo.percentualEsperado ?? 0).toFixed(0)}% do período
              </p>
            )}
          </div>
          {indicadores && (
            <div className="flex items-center gap-2 flex-wrap">
              {indicadores.pontoEquilibrio === 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                  ✓ Ponto de equilíbrio alcançado
                </span>
              )}
              <span className="text-sm font-black text-gray-700">
                Margem{' '}
                <span style={{ color: indicadores.statusMargem === 'bom' ? '#10B981' : indicadores.statusMargem === 'atencao' ? '#F59E0B' : '#EF4444' }}>
                  {indicadores.margemPercentual}%
                </span>
              </span>
            </div>
          )}
        </div>

        {/* ── HERO EXECUTIVO ── */}
        <div className="rounded-2xl overflow-hidden shadow-sm" style={{ border: `1px solid ${heroColor}50` }}>
          <div style={{ height: 3, backgroundColor: heroColor }} />
          <div className="p-5 flex items-start gap-4" style={{ backgroundColor: heroBg }}>
            {/* Coluna esquerda */}
            <div className="flex-1 min-w-0">
              <p className="text-3xs font-black uppercase tracking-widest text-gray-500 mb-1">Meta do Mês</p>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-black leading-none" style={{ color: heroColor }}>
                  {Math.min(pctRealizado, 100).toFixed(0)}%
                </span>
                <span className="text-xs font-bold" style={{ color: heroColor }}>{statusLabel}</span>
              </div>
              {metaValor > 0 && (
                <div className="relative h-[5px] rounded-full bg-gray-200 mb-3 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(pctRealizado, 100)}%`, backgroundColor: heroColor }} />
                </div>
              )}
              <div className="flex items-baseline gap-1.5 mb-0.5">
                <span className="text-xl font-black text-gray-900">{formatCurrency(resultadoEcon)}</span>
                <span className="text-xs text-gray-500">de {formatCurrency(metaValor)}</span>
              </div>
              {resultadoEcon < metaValor && (
                <span className="inline-block text-xs font-bold text-rose-600 mb-1">
                  faltam {formatCurrency(metaValor - resultadoEcon)}
                </span>
              )}
              <p className="text-xs text-gray-500 italic">{textoExecutivo}</p>
              {/* 🚨 (2026-09-01) Decisão de negócio: Liminar não conta pra bater a meta —
                  crédito judicial é recebido antecipado (valor total antes das sessões
                  começarem), não é produção a perseguir no mês. Deixado explícito aqui
                  pra não gerar dúvida de "por que a meta não bate com Produção total". */}
              <p className="text-3xs text-gray-400 mt-1">
                Meta = Particular + Pacote + Convênio. Liminar não entra (crédito judicial já recebido antecipado).
              </p>
            </div>
            {/* Coluna direita — breakdown */}
            <div className="w-44 shrink-0 bg-white/70 rounded-xl px-3 py-2.5 space-y-2 border border-gray-100">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Produção</span>
                <span className="font-black text-blue-600">{pctRealizado.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Caixa</span>
                <span className="font-black text-emerald-700">{pctCaixaMeta.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-gray-100 pt-1.5">
                <span className="text-gray-400">Diferença</span>
                <span className="font-semibold text-gray-500">{(pctCaixaMeta - pctRealizado) >= 0 ? '+' : ''}{(pctCaixaMeta - pctRealizado).toFixed(1)} p.p.</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">A receber</span>
                {/* 🚨 FIX (2026-09-02): mesmo lugar perdido antes — ainda usava o total
                    com Liminar (inconsistente com o resto da aba Metas, já corrigido). */}
                <span className="font-semibold text-amber-600">{formatCurrency(totalAReceberProducaoSemLiminar)}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-gray-100 pt-1.5">
                <span className="text-gray-500">Agendamentos</span>
                <span className="font-semibold text-purple-600">
                  {(data?.appointmentCounts?.ativos || 0).toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Realizados</span>
                <span className="font-semibold text-gray-600">
                  {(data?.appointmentCounts?.realizados || 0).toLocaleString('pt-BR')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── BREAKDOWN FINANCEIRO ── */}
        <div>
          <p className="text-3xs font-black uppercase tracking-widest text-gray-400 mb-2">Breakdown Financeiro</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {([
              {
                // 🚨 FIX (2026-09-02): antes o value era `caixaTotal` (R$2.730, caixa
                // real, inclui antecipação de pacote) — mas o card ao lado ("A receber")
                // já é sem Liminar/sem antecipação, então somar os dois na cabeça dava
                // 2.730+820=3.550, enquanto a Meta do Mês (produção pura) mostra 3.520.
                // Trocado para `totalRecebimentoProducaoSemLiminar` (R$2.700), que é o
                // mesmo número já usado na frase de reconciliação abaixo — assim os dois
                // cards desta linha sempre somam exatamente a Meta.
                label: 'Recebido da produção', value: totalRecebimentoProducaoSemLiminar, color: '#10B981',
                sub: `caixa total ${formatCurrency(caixaTotal)}${(totalRetroativos > 0 || totalAntecipacoes > 0) ? ` (inclui ${[totalRetroativos > 0 ? `${formatCurrency(totalRetroativos)} retroativo` : null, totalAntecipacoes > 0 ? `${formatCurrency(totalAntecipacoes)} antecipação` : null].filter(Boolean).join(' + ')})` : ''}`,
                info: <>Pagamentos já recebidos referentes à produção deste mês (sem Liminar).<br/><br/><strong>Fonte:</strong> pagamentos pagos (Payment) vinculados a sessões deste mês.<br/><br/><strong>Não inclui:</strong> antecipação de pacote ainda não consumida, retroativo de convênio, nem Liminar — esses valores estão no caixa total ({formatCurrency(caixaTotal)}) mas fora da meta.</>,
              },
              { label: 'Produção clínica', value: producaoTotal, color: '#2563EB', sub: 'serviços entregues',
                info: <>Sessões realizadas nesta competência, independente de já terem sido pagas.<br/><br/><strong>Fonte:</strong> sessões concluídas (Session completed) com data dentro do mês.<br/><br/><strong>Não inclui:</strong> sessões futuras ou de outros meses.</> },
              { label: 'A receber',        value: totalAReceberProducaoSemLiminar, color: '#D97706',
                // 🚨 FIX (2026-09-02): "part." estava escondendo o a-receber de Liminar
                // aqui dentro (totalAReceberProducao incluía liminarAReceber sem
                // rótulo) — Liminar já não conta pra meta (ver "Meta do Mês" acima),
                // então também não devia contar como "a receber" desse indicador.
                // Liminar a receber continua visível no card próprio de A Receber
                // (Visão Geral).
                sub: convenioAReceber > 0 ? `conv. ${formatCurrency(convenioAReceber)}${totalAReceberProducaoSemLiminar - convenioAReceber > 0 ? ` · part. ${formatCurrency(totalAReceberProducaoSemLiminar - convenioAReceber)}` : ''}` : 'pendente de recebimento',
                info: <>Produção deste mês (sem Liminar) que ainda não virou caixa (convênio aguardando repasse + particular/pacote pendente).<br/><br/><strong>Fonte:</strong> sessões concluídas do mês sem pagamento recebido.<br/><br/><strong>Não inclui:</strong> dívida de meses anteriores (card à parte) nem Liminar (crédito judicial, fora da meta).</>,
                // 🆕 (2026-09-02) mesmo drill-down por paciente/data já usado em
                // "Particular em aberto" — evita ter que confiar no número sem ver o
                // detalhe por trás (achado real: usuário desconfiou até ver a lista).
                onClick: totalAReceberProducaoSemLiminar > 0 ? () => openDebitosModal('mes') : undefined },
              { label: 'Falta para meta', value: Math.max(0, metaValor - resultadoEcon), color: '#DC2626',
                sub: `${metas?.gap?.diasRestantes ?? 0} dias restantes`,
                info: <>Quanto falta para atingir a meta do mês.<br/><br/><strong>Fonte:</strong> meta configurada menos resultado reconhecido (Recebido da produção + A receber).<br/><br/><strong>Não inclui:</strong> projeção de fechamento (ver aba Projeção &amp; Cenários).</> },
            ] as ({ label: string; value: number; color: string; sub: string; info: React.ReactNode; onClick?: () => void })[]).map((kpi) => (
              <div key={kpi.label}
                className={`rounded-xl bg-white border border-gray-100 shadow-sm ${kpi.onClick ? 'cursor-pointer hover:border-amber-300 hover:shadow-md transition-all' : ''}`}
                onClick={kpi.onClick}>
                {/* rounded-t-xl na própria barra (em vez de overflow-hidden no card) — overflow-hidden
                    cortava o popover do InfoTooltip, que precisa renderizar fora da caixa do card */}
                <div className="rounded-t-xl" style={{ height: 3, backgroundColor: kpi.color }} />
                <div className="p-3">
                  <p className="text-3xs text-gray-500 font-semibold mb-1">{kpi.label}<InfoTooltip>{kpi.info}</InfoTooltip></p>
                  <p className="text-lg font-black leading-tight" style={{ color: kpi.color }}>{formatCurrency(kpi.value)}</p>
                  <p className="text-3xs text-gray-400 mt-0.5 leading-tight">{kpi.sub}</p>
                  {kpi.onClick && <p className="text-3xs text-amber-600 font-bold mt-1">Ver detalhes ↗</p>}
                </div>
              </div>
            ))}
          </div>
          {totalRecebimentoProducaoSemLiminar > 0 && (
            <p className="text-3xs text-gray-400 italic mt-1.5 text-center">
              {/* 🚨 FIX (2026-09-02): a versão anterior somava Caixa (dinheiro real,
                  inclui antecipação/retroativo de outras competências) + A receber
                  (produção pendente) e chamava a soma de "reconhecido" — não batia
                  matematicamente (ex.: R$2.730 + R$1.030 ≠ R$3.100, a diferença era
                  a antecipação de pacote + o a-receber de Liminar, que não fazem
                  parte da meta). Trocado por "Recebido da produção" (já mostrado
                  como métrica própria em Qualidade da Receita) + A receber sem
                  Liminar — essa soma bate exatamente com o resultado reconhecido. */}
              Recebido da produção {formatCurrency(totalRecebimentoProducaoSemLiminar)} + A receber {formatCurrency(totalAReceberProducaoSemLiminar)} = {formatCurrency(resultadoEcon)} reconhecido
            </p>
          )}
        </div>

        {/* ── 3 CARDS INTELIGENTES ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

          {/* CARD 1: Composição da Receita */}
          <div className="rounded-2xl border border-gray-200 p-4 shadow-sm bg-white">
            <p className="text-3xs font-black uppercase tracking-widest text-gray-500 mb-3">Produção por Tipo<InfoTooltip><>Valor produzido (sessões realizadas) no mês, separado por tipo de cobrança.<br/><br/><strong>Fonte:</strong> sessões concluídas do mês, agrupadas por convênio/particular/pacote/liminar.<br/><br/><strong>Não inclui:</strong> se já foi pago ou não — isso é produção, não caixa.</></InfoTooltip></p>
            <p className="text-3xs text-gray-400 mb-3">Serviços executados por tipo (não é caixa recebido)</p>
            <div className="space-y-3">
              {Object.entries(metas.porTipo || {})
                .sort(([, a], [, b]) => (b as any).realizado - (a as any).realizado)
                .map(([tipo, dados]: [string, any]) => {
                  const color = tipoColors[tipo] || '#6B7280';
                  const pct   = dados.percentualDoTotal || 0;
                  const label = tipoLabels[tipo] || tipo;
                  const icon  = tipoIcons[tipo] || '';
                  return (
                    <div key={tipo}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-xs font-semibold text-gray-700">{icon} {label}</span>
                        </div>
                        <span className="text-xs font-black text-gray-800">{formatCurrency(dados.realizado)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 relative h-[4px] rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                        <span className="text-3xs font-black w-7 text-right shrink-0" style={{ color }}>{pct}%</span>
                      </div>
                    </div>
                  );
                })}
            </div>
            {(() => {
              const top = Object.entries(metas.porTipo || {}).sort(([, a], [, b]) => (b as any).realizado - (a as any).realizado)[0];
              return top ? (
                <p className="text-3xs text-gray-500 mt-3 pt-2 border-t border-gray-100">
                  <span className="font-bold">Maior motor:</span> {tipoIcons[top[0]]} {tipoLabels[top[0]] || top[0]} ({(top[1] as any).percentualDoTotal}% do caixa)
                </p>
              ) : null;
            })()}
          </div>

          {/* CARD 2: Qualidade da Receita */}
          <div className="rounded-2xl border border-gray-200 p-4 shadow-sm bg-white">
            <p className="text-3xs font-black uppercase tracking-widest text-gray-500 mb-3">Qualidade da Receita</p>
            <p className="text-3xs text-gray-400 mb-3">Quanto do produzido já virou dinheiro</p>
            <div className="space-y-3">
              {([
                { label: 'Recebido da produção',       value: totalRecebimentoProducao,            color: '#10B981', icon: '💵',
                  info: <>Percentual da produção do mês que já foi efetivamente recebido em caixa.<br/><br/><strong>Fonte:</strong> pagamentos pagos vinculados a sessões do mês.<br/><br/><strong>Não inclui:</strong> recebimentos de meses anteriores.</> },
                { label: 'Convênio (aguarda repasse)',  value: convenioAReceber,                    color: '#8B5CF6', icon: '🧾',
                  info: <>Sessões de convênio realizadas neste mês que ainda aguardam repasse da operadora.<br/><br/><strong>Fonte:</strong> sessões concluídas de convênio no mês.<br/><br/><strong>Não inclui:</strong> particular, liminar, sessões não realizadas.</> },
                { label: 'Particular/Pacote pendente', value: particularPendente + pacotePendente, color: '#F59E0B', icon: '⏳',
                  info: <>Sessões particulares/pacote realizadas neste mês que ainda não têm pagamento recebido.<br/><br/><strong>Fonte:</strong> sessões concluídas do mês sem pagamento pago.<br/><br/><strong>Não inclui:</strong> convênio, liminar, dívida de meses anteriores.</> },
              ] as const).map((item) => {
                const pct = producaoTotal > 0 ? Math.round((item.value / producaoTotal) * 100) : 0;
                return (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-xs text-gray-600">{item.label}</span>
                        <InfoTooltip>{item.info}</InfoTooltip>
                      </div>
                      <span className="text-xs font-black" style={{ color: item.color }}>{pct}%</span>
                    </div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className="flex-1 relative h-[4px] rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: item.color }} />
                      </div>
                    </div>
                    <p className="text-3xs text-gray-400">{formatCurrency(item.value)}</p>
                  </div>
                );
              })}
            </div>
            <div className={`mt-3 pt-2 border-t border-gray-100 p-2 rounded-lg text-3xs ${convenioAReceber > caixaTotal * 0.2 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {convenioAReceber > caixaTotal * 0.2
                ? `⚠️ ${producaoTotal > 0 ? Math.round((convenioAReceber / producaoTotal) * 100) : 0}% da produção depende de repasse de convênio`
                : '✅ Boa qualidade — maior parte já convertida em caixa'}
            </div>
          </div>

          {/* CARD 3: Projeção Conservadora */}
          <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
            <div style={{ height: 3, backgroundColor: metas?.projecao?.bateMeta ? '#10B981' : '#F59E0B' }} />
            <div className="p-4 bg-white">
              <p className="text-3xs font-black uppercase tracking-widest text-gray-500 mb-2">Projeção Conservadora</p>
              <p className="text-3xl font-black text-gray-900 leading-tight mb-2">{formatCurrency(metas?.projecao?.esperada ?? metas?.projecao?.final ?? 0)}</p>
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3 ${metas?.projecao?.bateMeta ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                {metas?.projecao?.bateMeta
                  ? `+${formatCurrency((metas?.projecao?.esperada ?? 0) - metaValor)} acima da meta`
                  : `${formatCurrency(metaValor - (metas?.projecao?.esperada ?? 0))} abaixo da meta`}
              </div>
              <div className="space-y-1.5 border-t border-gray-200 pt-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Ritmo atual</span>
                  <span className="font-black text-emerald-600">{formatCurrency(metas?.ritmo?.mediaDiariaAtual ?? 0)}/dia</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Necessário</span>
                  <span className="font-bold text-gray-700">{formatCurrency(metas?.configuracao?.metaDiariaNecessaria ?? 0)}/dia</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Dias restantes</span>
                  <span className="font-bold text-gray-700">{metas?.gap?.diasRestantes ?? 0} dias</span>
                </div>
                {(metas?.configuracao?.metaDiariaNecessaria ?? 0) > 0 && (metas?.ritmo?.mediaDiariaAtual ?? 0) > 0 && (
                  <div className={`mt-2 text-center py-1 rounded-full text-3xs font-black ${(metas?.ritmo?.mediaDiariaAtual ?? 0) >= (metas?.configuracao?.metaDiariaNecessaria ?? 0) ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                    {(metas?.ritmo?.mediaDiariaAtual ?? 0) >= (metas?.configuracao?.metaDiariaNecessaria ?? 0)
                      ? `+${((((metas?.ritmo?.mediaDiariaAtual ?? 0) / (metas?.configuracao?.metaDiariaNecessaria ?? 1)) - 1) * 100).toFixed(0)}% acima do necessário`
                      : `${((((metas?.ritmo?.mediaDiariaAtual ?? 0) / (metas?.configuracao?.metaDiariaNecessaria ?? 1)) - 1) * 100).toFixed(0)}% abaixo do necessário`}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── COMPARATIVO MÊS ANTERIOR ── */}
        {comparativos && (() => {
          const chartData = [
            { name: 'Caixa', atual: comparativos.mesAtual?.caixa ?? 0, anterior: comparativos.mesAnterior?.caixa ?? 0 },
            { name: 'Produção', atual: comparativos.mesAtual?.producao ?? 0, anterior: comparativos.mesAnterior?.producao ?? 0 },
            { name: 'Despesas', atual: comparativos.mesAtual?.despesas ?? 0, anterior: comparativos.mesAnterior?.despesas ?? 0 },
          ];
          return (
            <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-bold text-gray-800">Comparativo Mensal</p>
                  <p className="text-xs text-gray-400 mt-0.5">Este mês vs mês anterior</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
                    Mês anterior
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                    Este mês
                  </span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={148}>
                <BarChart data={chartData} margin={{ top: 12, right: 0, left: 0, bottom: 0 }} barCategoryGap="38%" barGap={3}>
                  <XAxis axisLine={false} tickLine={false} dataKey="name" tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 600 }} />
                  <Tooltip
                    cursor={{ fill: '#F8FAFC', rx: 6 }}
                    contentStyle={{ border: 'none', borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.10)', padding: '10px 16px', fontSize: 12 }}
                    formatter={(v: number) => [formatCurrency(v)]}
                    labelStyle={{ fontWeight: 700, color: '#1F2937', marginBottom: 4 }}
                  />
                  <Bar dataKey="anterior" fill="#E2E8F0" radius={[5,5,0,0]} maxBarSize={48} />
                  <Bar dataKey="atual" fill="#3B82F6" radius={[5,5,0,0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-50">
                {chartData.map(item => {
                  const diff = item.anterior > 0 ? ((item.atual - item.anterior) / item.anterior) * 100 : 0;
                  const isUp = diff >= 0;
                  const isGood = item.name === 'Despesas' ? !isUp : isUp;
                  return (
                    <div key={item.name} className="text-center">
                      <p className="text-xs font-semibold text-gray-500 mb-0.5">{item.name}</p>
                      <p className="text-sm font-black text-gray-900">{formatCurrency(item.atual)}</p>
                      <p className={`text-2xs font-bold mt-0.5 ${isGood ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {isUp ? '↑' : '↓'} {Math.abs(diff).toFixed(1)}%
                      </p>
                      {item.name === 'Caixa' && totalAntecipacoes > 0 && (
                        <p className="text-3xs text-sky-500 mt-0.5 leading-tight">
                          ↩ {formatCurrency(totalAntecipacoes)} retroativos
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Dívidas de meses anteriores: removido daqui (2026-07-23) — Metas é uma
            aba filtrada por mês, mostrar débito histórico ali conflitava com a
            leitura de progresso do mês selecionado. Vive em Decisão Executiva
            (bloco "Sessões sem Recebimento", que já cobre o mesmo dado + histórico). */}
      </div>
    );
  };

  const renderDecisaoExecutiva = () => {
    const varCaixa    = comparativos?.variacao?.caixa ?? 0;
    const varProducao = comparativos?.variacao?.producao ?? 0;
    const varDespesas = comparativos?.variacao?.despesas ?? 0;

    const metaMensal      = metas?.configuracao?.metaMensal ?? 0;
    // 🎯 APENAS RENDERIZAR — percentuais vêm PRONTOS da API
    const pctMetaProducao = Math.round(metas.camadas?.producao?.percentual ?? 0);
    const pctMetaCaixa    = Math.round(metas.camadas?.caixa?.percentual ?? 0);
    const diffProdCaixa   = totalProducao - totalCaixa;
    const convenioAmount  = convenioAReceber || 0;
    const particularPend  = (data as any)?.particularPendente || 0;
    const pacotePend      = (data as any)?.pacotePendente || 0;

    // 🆕 Recebíveis: fontes oficiais (nunca soma manual no frontend)
    const particularEmAberto = debitosTotalValue || 0;
    const convenioNaoFaturado = pendingInsuranceHistorical.reduce((sum, g) => sum + (g.totalPending || 0), 0);
    const convenioFaturado = billedInsuranceHistorical.reduce((sum, g) => sum + (g.totalPending || 0), 0);
    const totalRecebiveis = particularEmAberto + convenioNaoFaturado + convenioFaturado;

    const margemPct = indicadores?.margemPercentual ?? 0; // ← vem da API
    // status vem pronto da API (indicadores.statusMargem) — frontend só mapeia enum→texto/cor, não decide o corte.
    const margemStatus = indicadores?.statusMargem === 'bom'
      ? { text: '🟢 Operação saudável', cls: 'bg-emerald-100 text-emerald-700' }
      : indicadores?.statusMargem === 'atencao'
      ? { text: '🟡 Margem apertada',   cls: 'bg-amber-100 text-amber-800'   }
      : { text: '🔴 Margem crítica',    cls: 'bg-rose-100 text-rose-700'     };

    const getRiscoTheme = (nivel: string) => ({
      badge:     nivel === 'alto' ? 'rose'    : nivel === 'medio' ? 'amber'    : 'emerald',
      bgCls:     nivel === 'alto' ? 'bg-rose-50' : nivel === 'medio' ? 'bg-amber-50' : 'bg-emerald-50',
      borderHex: nivel === 'alto' ? '#EF444430' : nivel === 'medio' ? '#F59E0B30'    : '#10B98130',
    });
    const risco = getRiscoTheme(riscoOperacional.nivel);

    const sugestoesAuto = ([
      particularPend > 0 && `💬 Contatar pacientes com débito particular (${formatCurrency(particularPend)} em aberto)`,
      convenioAmount > 0 && `📋 Emitir guias para ${formatCurrency(convenioAmount)} de convênio pendente`,
      varCaixa < -10   && `📈 Caixa caiu ${Math.abs(varCaixa)}% — revisar agenda e conversão`,
      riscoOperacional.nivel === 'alto' && `⚡ Risco alto — priorizar ações corretivas esta semana`,
    ] as (string | false)[]).filter(Boolean) as string[];

    const getAcaoColor = (p: string) => p === 'alta' ? 'rose' : p === 'media' ? 'amber' : 'emerald';
    const getAcaoIcon  = (tipo: string) => {
      if (tipo.includes('particular'))   return <DollarSign size={18} />;
      if (tipo.includes('convenio'))     return <Briefcase size={18} />;
      if (tipo.includes('agenda'))       return <Calendar size={18} />;
      if (tipo.includes('profissional')) return <Users size={18} />;
      return <Zap size={18} />;
    };

    // Build profissional motivos from riscoOperacional
    const profAbaixoMotivos = riscoOperacional.motivos.filter(
      m => /abaixo|profissional|ritmo/i.test(m)
    );
    const otherMotivos = riscoOperacional.motivos.filter(
      m => !/abaixo|profissional|ritmo/i.test(m)
    );

    type RiscoItem = {
      icon: 'warning' | 'danger' | 'success';
      title: string;
      desc: string;
      nivel: 'Alto' | 'Médio' | 'OK';
      showAgendaBtn?: boolean;
    };

    const riscoItems: RiscoItem[] = [
      {
        icon: riscoOperacional.nivel === 'alto' ? 'danger' : 'warning',
        title: 'Risco operacional',
        desc: [riscoOperacional.impacto, ...otherMotivos].filter(Boolean).join(' — '),
        nivel: riscoOperacional.nivel === 'alto' ? 'Alto' : riscoOperacional.nivel === 'medio' ? 'Médio' : 'OK',
      },
      ...(profAbaixoMotivos.length > 0 ? [{
        icon: 'danger' as const,
        title: 'Profissionais abaixo do ritmo',
        desc: profAbaixoMotivos.join(' · '),
        nivel: 'Alto' as const,
        showAgendaBtn: true,
      }] : []),
      ...(convenioAmount > 0 ? [{
        icon: 'warning' as const,
        title: 'Convênio aguardando repasse',
        desc: `${formatCurrency(convenioAmount)} em sessões entregues ainda não faturadas ao plano — acompanhar prazo de repasse`,
        nivel: 'Médio' as const,
      }] : []),
      {
        icon: (indicadores?.pontoEquilibrio ?? 1) === 0 ? 'success' : 'warning',
        title: 'Ponto de equilíbrio',
        desc: (indicadores?.pontoEquilibrio ?? 1) === 0
          ? `Alcançado — margem de ${margemPct}% com despesas controladas em ${formatCurrency(expenses.total)}`
          : `Falta ${formatCurrency(indicadores?.pontoEquilibrio ?? 0)} para cobrir despesas`,
        nivel: (indicadores?.pontoEquilibrio ?? 1) === 0 ? 'OK' : 'Médio',
      },
      {
        icon: metas?.projecao?.bateMeta ? 'success' : 'warning',
        title: 'Projeção de fechamento',
        desc: `${formatCurrency(metas?.projecao?.esperada ?? metas?.projecao?.final ?? 0)} esperado — ritmo atual ${pctMetaProducao}% da meta`,
        nivel: metas?.projecao?.bateMeta ? 'OK' : 'Médio',
      },
    ];

    const nivelBadge = (n: string) => {
      if (n === 'Alto')  return 'bg-rose-100 text-rose-700';
      if (n === 'Médio') return 'bg-amber-100 text-amber-800';
      return 'bg-emerald-100 text-emerald-700';
    };

    return (
      <div className="space-y-6">

        {/* ── 1. COMPARATIVO MENSAL ── */}
        <div>
          <p className="text-3xs font-black uppercase tracking-widest text-gray-400 mb-3">Comparativo Mensal</p>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

            {/* Caixa — col-span-3, border-left verde */}
            <div className="lg:col-span-3 rounded-2xl border border-gray-100 shadow-sm bg-white overflow-hidden"
              style={{ borderLeft: '4px solid #10B981' }}>
              <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xs font-black uppercase tracking-widest text-emerald-700">Caixa Real</span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${varCaixa >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {varCaixa >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {varCaixa >= 0 ? '+' : ''}{varCaixa}% vs anterior
                  </span>
                </div>
                <div className="text-5xl font-black text-gray-900 tracking-tight my-2">{formatCurrency(totalCaixa)}</div>
                <p className="text-xs text-gray-500 mb-1">
                  mês anterior: <span className="font-semibold text-gray-700">{formatCurrency(comparativos?.mesAnterior?.caixa ?? 0)}</span>
                  {totalAntecipacoes > 0 && (
                    <span className="ml-2 text-sky-600">· inclui {formatCurrency(totalAntecipacoes)} de retroativos</span>
                  )}
                </p>
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>meta atingida em produção</span>
                    <span className="font-black text-emerald-700">{pctMetaProducao}%</span>
                  </div>
                  <div className="h-[4px] w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(pctMetaProducao, 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-3xs text-gray-400">
                    <span>Caixa {pctMetaCaixa}%</span>
                    <span>Meta: {formatCurrency(metaMensal)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Produção + Despesas — col-span-2, accent top-bar */}
            <div className="lg:col-span-2 flex flex-col gap-3">
              <div className="flex-1 rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                <div style={{ height: 3, backgroundColor: '#3B82F6' }} />
                <div className="p-4 bg-white">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-3xs font-black uppercase tracking-widest text-blue-600">Produção</span>
                    <span className={`text-3xs font-bold px-2 py-0.5 rounded-full ${varProducao >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {varProducao >= 0 ? '+' : ''}{varProducao}% vs anterior
                    </span>
                  </div>
                  <div className="text-3xl font-black text-gray-900 mb-2">{formatCurrency(totalProducao)}</div>
                  <div className="space-y-1 border-t border-gray-100 pt-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Já recebido</span>
                      <span className="font-semibold text-emerald-700">{formatCurrency(totalRecebimentoProducao)}</span>
                    </div>
                    {totalAReceberProducao > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">A receber</span>
                        <span className="font-semibold text-amber-700">{formatCurrency(totalAReceberProducao)}</span>
                      </div>
                    )}
                    {convenioAmount > 0 && (
                      <div className="flex justify-between text-xs pl-3">
                        <span className="text-gray-400">↳ Convênio</span>
                        <span className="font-medium text-purple-600">{formatCurrency(convenioAmount)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                <div style={{ height: 3, backgroundColor: '#EF4444' }} />
                <div className="p-4 bg-white">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-3xs font-black uppercase tracking-widest text-red-600">Despesas</span>
                    <span className={`text-3xs font-bold px-2 py-0.5 rounded-full ${varDespesas <= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {varDespesas >= 0 ? '+' : ''}{varDespesas}% vs anterior
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between mb-2">
                    <div className="text-3xl font-black text-gray-900">{formatCurrency(expenses.total)}</div>
                    <div className="text-right">
                      <div className="text-xl font-black" style={{ color: margemPct >= 35 ? '#10B981' : margemPct >= 20 ? '#F59E0B' : '#EF4444' }}>
                        {margemPct.toFixed(1)}%
                      </div>
                      <p className="text-3xs text-gray-400">Margem</p>
                    </div>
                  </div>
                  {expenses.breakdown && (
                    <p className="text-3xs text-gray-500 mb-2">
                      {formatCurrency(expenses.breakdown.expenses ?? 0)} despesas · {formatCurrency(expenses.breakdown.comissoes ?? 0)} comissões
                    </p>
                  )}
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-bold ${margemStatus.cls}`}>
                    {margemStatus.text}
                    {varDespesas !== 0 && (
                      <span className={`ml-1.5 ${varDespesas < 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        · {varDespesas > 0 ? '+' : ''}{varDespesas}% vs anterior
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. RECEBÍVEIS ── */}
        <div>
          <p className="text-3xs font-black uppercase tracking-widest text-gray-400 mb-3">Recebíveis</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Particular em aberto */}
            <div className="rounded-2xl border border-blue-200 bg-blue-50/60 px-4 py-3 flex flex-col justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <DollarSign size={14} className="text-blue-600" />
                  <p className="text-3xs font-black uppercase tracking-widest text-blue-700">Particular em aberto</p>
                </div>
                <span className="text-xl font-black text-gray-800">{loadingDebitosTotal ? '…' : formatCurrency(particularEmAberto)}</span>
                <p className="text-3xs text-blue-600/70 mt-1">Débitos pendentes de pacientes</p>
              </div>
              <button onClick={() => openDebitosModal('total')}
                className="shrink-0 py-1.5 px-3 rounded-lg text-2xs font-bold bg-white text-blue-700 border border-blue-200 hover:bg-blue-50 transition-colors w-fit">
                Ver débitos ↗
              </button>
            </div>

            {/* 2. Convênio não faturado */}
            <div className="rounded-2xl border border-purple-200 bg-purple-50/60 px-4 py-3 flex flex-col justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Briefcase size={14} className="text-purple-600" />
                  <p className="text-3xs font-black uppercase tracking-widest text-purple-700">Convênio não faturado</p>
                </div>
                <span className="text-xl font-black text-gray-800">{loadingInsuranceHistorical ? '…' : formatCurrency(convenioNaoFaturado)}</span>
                <p className="text-3xs text-purple-600/70 mt-1">Sessões concluídas aguardando faturamento</p>
              </div>
              <button onClick={() => setSearchParams(p => { const n = new URLSearchParams(p); n.set('financialTab', 'convenios'); return n; })}
                className="shrink-0 py-1.5 px-3 rounded-lg text-2xs font-bold bg-white text-purple-700 border border-purple-200 hover:bg-purple-50 transition-colors w-fit">
                Ver convênios ↗
              </button>
            </div>

            {/* 3. Convênio faturado */}
            <div className="rounded-2xl border border-cyan-200 bg-cyan-50/60 px-4 py-3 flex flex-col justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Send size={14} className="text-cyan-600" />
                  <p className="text-3xs font-black uppercase tracking-widest text-cyan-700">Convênio faturado</p>
                </div>
                <span className="text-xl font-black text-gray-800">{loadingInsuranceHistorical ? '…' : formatCurrency(convenioFaturado)}</span>
                <p className="text-3xs text-cyan-600/70 mt-1">Lotes enviados aguardando pagamento</p>
              </div>
              <button onClick={() => setSearchParams(p => { const n = new URLSearchParams(p); n.set('financialTab', 'convenios'); return n; })}
                className="shrink-0 py-1.5 px-3 rounded-lg text-2xs font-bold bg-white text-cyan-700 border border-cyan-200 hover:bg-cyan-50 transition-colors w-fit">
                Ver convênios ↗
              </button>
            </div>

            {/* 4. Total de recebíveis */}
            <div className="rounded-2xl border border-gray-300 bg-gray-100 px-4 py-3 flex flex-col justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp size={14} className="text-gray-600" />
                  <p className="text-3xs font-black uppercase tracking-widest text-gray-600">Total de recebíveis</p>
                </div>
                <span className="text-xl font-black text-gray-800">
                  {loadingDebitosTotal || loadingInsuranceHistorical ? '…' : formatCurrency(totalRecebiveis)}
                </span>
                <p className="text-3xs text-gray-500 mt-1">Soma das fontes oficiais</p>
              </div>
            </div>
          </div>

          {/* Indicador administrativo: casos em revisão manual */}
          {manualReviewCount !== null && manualReviewCount > 0 && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-600" />
                <span className="text-xs text-amber-800">
                  <strong>{manualReviewCount}</strong> Payment(s) de convênio em revisão manual
                </span>
              </div>
              <span className="text-3xs text-amber-600">Visível apenas para administradores</span>
            </div>
          )}
        </div>

        {/* ── 3. CENTRAL DE ATENÇÃO — lista de riscos ── */}
        <div>
          <p className="text-3xs font-black uppercase tracking-widest text-gray-400 mb-3">Central de Atenção · Riscos Operacionais</p>
          <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-white divide-y divide-gray-100">
            {riscoItems.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 p-4">
                {/* Ícone semântico */}
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${
                  item.icon === 'danger'  ? 'bg-rose-100'    :
                  item.icon === 'warning' ? 'bg-amber-100'   : 'bg-emerald-100'
                }`}>
                  {item.icon === 'danger'  && <AlertCircle size={15} className="text-rose-600" />}
                  {item.icon === 'warning' && <AlertTriangle size={15} className="text-amber-600" />}
                  {item.icon === 'success' && <CheckCircle2 size={15} className="text-emerald-600" />}
                </div>
                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-gray-800 leading-tight">{item.title}</p>
                    <span className={`shrink-0 text-3xs font-black px-2 py-0.5 rounded-full ${nivelBadge(item.nivel)}`}>
                      {item.nivel}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
                  {item.showAgendaBtn && (
                    <button
                      onClick={() => setSearchParams(p => { const n = new URLSearchParams(p); n.set(DASHBOARD_TAB_PARAM, 'ranking'); return n; })}
                      className="mt-2 inline-flex items-center gap-1 text-2xs font-bold text-blue-600 hover:text-blue-800 transition-colors">
                      Ver agendas ↗
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 4. AÇÕES EXECUTIVAS ── */}
        {acoesExecutivas.length > 0 && (
          <div>
            <p className="text-3xs font-black uppercase tracking-widest text-gray-400 mb-3">Ações Executivas</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {acoesExecutivas.map((acao, idx) => {
                const priorColor = getAcaoColor(acao.prioridade);
                const accentHex  = priorColor === 'rose' ? '#EF4444' : priorColor === 'amber' ? '#F59E0B' : '#10B981';
                return (
                  <div key={idx} className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-white">
                    <div style={{ height: 3, backgroundColor: accentHex }} />
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div style={{ color: accentHex }}>{getAcaoIcon(acao.tipo)}</div>
                        <span className={`text-3xs font-black uppercase px-2 py-0.5 rounded-full bg-${priorColor}-100 text-${priorColor}-700`}>
                          {acao.prioridade}
                        </span>
                      </div>
                      <h4 className="font-bold text-gray-800 text-sm mb-1">{acao.descricao}</h4>
                      <p className="text-xs text-gray-500 mb-2">{acao.motivo}</p>
                      {acao.impactoEstimado !== undefined && (
                        <p className="text-xs font-semibold text-gray-700">Impacto: {formatCurrency(acao.impactoEstimado)}</p>
                      )}
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <p className="text-3xs text-gray-400">Próximo passo</p>
                        <p className="text-xs font-semibold text-gray-800">{acao.acaoSugerida}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 5. PENDÊNCIAS DE CONVÊNIO ── */}
        <div>
          <p className="text-3xs font-black uppercase tracking-widest text-gray-400 mb-3">🏥 Pendências de Convênio</p>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {loadingInsurance ? (
              <div className="p-6 text-center text-gray-500">Carregando...</div>
            ) : pendingInsurance.length === 0 ? (
              <div className="p-6 text-center text-emerald-600 font-medium">✅ Nenhum convênio pendente de faturamento</div>
            ) : (
              <div className="divide-y">
                {pendingInsurance.flatMap(g =>
                  (g.patients || []).flatMap(p =>
                    (p.payments || []).map(pay => ({
                      provider: g._id,
                      patientName: p.patientName,
                      paymentId: pay.paymentId,
                      grossAmount: pay.grossAmount,
                      status: pay.status,
                      paymentDate: pay.paymentDate,
                      sessionId: (pay as any).sessionId
                    }))
                  )
                ).slice(0, 5).map((item, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-gray-50">
                    <div>
                      <p className="font-semibold text-gray-800">{item.patientName}</p>
                      <p className="text-sm text-gray-500">
                        {item.provider} · {new Date(item.paymentDate).toLocaleDateString('pt-BR')} · <span className="font-medium text-gray-700">{formatCurrency(item.grossAmount)}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.status === 'pending_billing' && (
                        <button onClick={() => handleBillInsurance(item.sessionId)} className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 text-sm font-medium border border-amber-200">
                          <Send size={14} /> Faturar
                        </button>
                      )}
                      {item.status === 'billed' && (
                        <button onClick={() => handleReceiveInsurance(item.sessionId, item.grossAmount)} className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-sm font-medium border border-emerald-200">
                          <Check size={14} /> Receber
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {pendingInsurance.reduce((sum, g) => sum + (g.patients || []).reduce((pSum, p) => pSum + (p.payments || []).length, 0), 0) > 5 && (
                  <div className="p-3 text-center text-sm text-gray-500">
                    Vá para a aba <strong>Convênios</strong> para ver todos
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    );
  };

  const renderInsights = () => {
    const _positionColors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#6B7280'];

    const profListEnriched = (profissionais?.ranking || []).map(prof => {
      const abaixoPct = Math.round(100 - (prof.eficiencia ?? 100));
      const isDestaque = (prof.produtividade ?? 0) >= 100;
      const contribPct = totalCaixa > 0 ? Math.round((prof.realizado / totalCaixa) * 100) : 0;
      return { ...prof, abaixoPct, isDestaque, contribPct };
    }).sort((a, b) => {
      if (a.isDestaque && !b.isDestaque) return 1;
      if (!a.isDestaque && b.isDestaque) return -1;
      return b.abaixoPct - a.abaixoPct;
    });

    const criticos  = profListEnriched.filter(p => !p.isDestaque && p.abaixoPct >= 75 && p.abaixoPct < 100);
    const semProd   = profListEnriched.filter(p => !p.isDestaque && p.abaixoPct === 100);
    const atencao   = profListEnriched.filter(p => !p.isDestaque && p.abaixoPct >= 37 && p.abaixoPct < 75);
    const destaques = profListEnriched.filter(p => p.isDestaque);

    return (
      <div className="space-y-6">

        {/* ── 1. Lista de performance + blocos semânticos ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Esquerda: lista rankeada */}
          <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-white divide-y divide-gray-50">
            {profListEnriched.map(prof => (
              <div key={prof.id} className="flex items-center gap-3 px-4 py-3">
                <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                  prof.isDestaque      ? 'bg-emerald-100' :
                  prof.abaixoPct >= 75 ? 'bg-rose-100'    : 'bg-amber-100'
                }`}>
                  {prof.isDestaque      ? <Star size={12} className="text-emerald-600" /> :
                   prof.abaixoPct >= 75 ? <AlertCircle size={12} className="text-rose-600" /> :
                   <AlertTriangle size={12} className="text-amber-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-sm font-semibold text-gray-800 truncate">{prof.nome}</p>
                    <span className={`text-sm font-black shrink-0 ${
                      prof.isDestaque      ? 'text-emerald-600' :
                      prof.abaixoPct >= 75 ? 'text-rose-500'    : 'text-amber-500'
                    }`}>
                      {prof.isDestaque ? `${prof.contribPct}%` : `${prof.abaixoPct}%↓`}
                    </span>
                  </div>
                  <p className="text-3xs text-gray-400 truncate">
                    {prof.especialidade}
                    {prof.isDestaque ? ` · puxando ${prof.contribPct}% do caixa total` :
                     prof.abaixoPct === 100 ? ' · sem produção registrada' : ' · abaixo da média de produção'}
                  </p>
                  <div className="mt-1 h-[3px] w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${Math.min(100, prof.isDestaque ? Math.min(prof.contribPct * 5, 100) : prof.abaixoPct)}%`,
                      backgroundColor: prof.isDestaque ? '#10B981' : prof.abaixoPct >= 75 ? '#EF4444' : '#F59E0B',
                    }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Direita: blocos semânticos */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-700">
                {profListEnriched.filter(p => !p.isDestaque).length} profissionais
              </span>
              <span className="text-xs text-gray-500">abaixo da média de produção</span>
            </div>

            {criticos.length > 0 && (
              <div className="rounded-xl overflow-hidden border border-rose-900/20" style={{ backgroundColor: '#2d0a0a' }}>
                <div className="px-4 pt-3 pb-2">
                  <p className="text-3xs font-black uppercase tracking-widest text-rose-400 mb-1">
                    Crítico · {criticos.length} profissionais &gt;75% abaixo
                  </p>
                  <p className="text-xs text-rose-300">
                    {criticos.map(p => `${p.nome.split(' ')[0]} (${p.abaixoPct}%)`).join(' · ')}
                  </p>
                </div>
                <div className="px-4 pb-3 border-t border-rose-900/30 pt-2">
                  <button onClick={() => setSearchParams(p => { const n = new URLSearchParams(p); n.set(DASHBOARD_TAB_PARAM, 'ranking'); return n; })}
                    className="inline-flex items-center gap-1 text-2xs font-bold text-rose-300 hover:text-rose-100 transition-colors">
                    Ver agendas ↗
                  </button>
                </div>
              </div>
            )}

            {atencao.length > 0 && (
              <div className="rounded-xl overflow-hidden border border-amber-900/20" style={{ backgroundColor: '#2d1800' }}>
                <div className="px-4 pt-3 pb-2">
                  <p className="text-3xs font-black uppercase tracking-widest text-amber-400 mb-1">
                    Atenção · {atencao.length} profissionais entre 37–74% abaixo
                  </p>
                  <p className="text-xs text-amber-300">
                    {atencao.map(p => p.nome.split(' ')[0]).join(' · ')}
                  </p>
                </div>
                <div className="px-4 pb-3 border-t border-amber-900/30 pt-2">
                  <button onClick={() => setSearchParams(p => { const n = new URLSearchParams(p); n.set(DASHBOARD_TAB_PARAM, 'ranking'); return n; })}
                    className="inline-flex items-center gap-1 text-2xs font-bold text-amber-300 hover:text-amber-100 transition-colors">
                    Ver agendas ↗
                  </button>
                </div>
              </div>
            )}

            {semProd.map(prof => (
              <div key={prof.id} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs font-semibold text-gray-700">{prof.nome} · 100% abaixo</p>
                <p className="text-xs text-gray-400">Sem produção clínica registrada no período</p>
              </div>
            ))}

            {destaques.map(prof => (
              <div key={prof.id} className="rounded-xl overflow-hidden border border-emerald-900/20" style={{ backgroundColor: '#0a2d18' }}>
                <div className="px-4 py-3">
                  <p className="text-3xs font-black uppercase tracking-widest text-emerald-400 mb-0.5">
                    Destaque · {prof.nome.split(' ')[0]} {prof.nome.split(' ').slice(-1)[0]}
                  </p>
                  <p className="text-xs text-emerald-300">
                    Responsável por {prof.contribPct}% do caixa total do mês
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 2. Ranking de Profissionais — Produtividade ── */}
        <div>
          <p className="text-3xs font-black uppercase tracking-widest text-gray-400 mb-3">Ranking de Profissionais · Produtividade</p>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(profissionais?.ranking || []).slice(0, 3).map((prof, idx) => (
                <div key={prof.id} className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                  <div style={{ height: 3, backgroundColor: _positionColors[idx] }} />
                  <div className="p-4 bg-white">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0"
                        style={{ backgroundColor: _positionColors[idx] }}>
                        #{idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-800 truncate">{prof.nome}</p>
                        <p className="text-3xs text-gray-400 truncate">{prof.especialidade}</p>
                      </div>
                    </div>
                    <div className="space-y-1 text-xs border-t border-gray-100 pt-2">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Realizado</span>
                        <span className="font-semibold text-emerald-700">{formatCurrency(prof.realizado)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Produção</span>
                        <span className="font-semibold text-gray-800">{formatCurrency(prof.producao)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Eficiência</span>
                        <span className="font-semibold text-gray-700">{prof.eficiencia}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Produtividade</span>
                        <span className="font-black" style={{ color: _positionColors[idx] }}>{prof.produtividade}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {(profissionais?.ranking || []).length > 3 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(profissionais?.ranking || []).slice(3, 5).map((prof, idx) => (
                  <div key={prof.id} className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                    <div style={{ height: 3, backgroundColor: _positionColors[idx + 3] }} />
                    <div className="p-4 bg-white">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
                          style={{ backgroundColor: _positionColors[idx + 3] }}>
                          #{idx + 4}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-800 truncate">{prof.nome}</p>
                          <p className="text-3xs text-gray-400">{prof.especialidade}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs border-t border-gray-100 pt-2">
                        <div className="flex justify-between col-span-1">
                          <span className="text-gray-500">Realizado</span>
                          <span className="font-semibold text-emerald-700">{formatCurrency(prof.realizado)}</span>
                        </div>
                        <div className="flex justify-between col-span-1">
                          <span className="text-gray-500">Produção</span>
                          <span className="font-semibold text-gray-800">{formatCurrency(prof.producao)}</span>
                        </div>
                        <div className="flex justify-between col-span-1">
                          <span className="text-gray-500">Eficiência</span>
                          <span className="font-semibold text-gray-700">{prof.eficiencia}%</span>
                        </div>
                        <div className="flex justify-between col-span-1">
                          <span className="text-gray-500">Produtividade</span>
                          <span className="font-black" style={{ color: _positionColors[idx + 3] }}>{prof.produtividade}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── 3. Ranking por Lucro ── */}
        {(profissionais?.rankingPorLucro || []).length > 0 && (
          <div>
            <p className="text-3xs font-black uppercase tracking-widest text-gray-400 mb-3">Ranking · Lucro por Profissional</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(profissionais?.rankingPorLucro || []).slice(0, 5).map((prof, idx) => {
                const _color = prof.lucro >= 0 ? _positionColors[Math.min(idx, 4)] : '#EF4444';
                return (
                  <div key={prof.id} className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                    <div style={{ height: 3, backgroundColor: _color }} />
                    <div className="p-4 bg-white">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
                          style={{ backgroundColor: _color }}>
                          #{idx + 1}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-800">{prof.nome}</p>
                          <p className="text-3xs text-gray-400">{prof.especialidade}</p>
                        </div>
                      </div>
                      <div className="space-y-1 text-xs border-t border-gray-100 pt-2">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Lucro</span>
                          <span className="font-black" style={{ color: _color }}>{formatCurrency(prof.lucro)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Margem</span>
                          <span className="font-semibold text-gray-700">{prof.margem}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Produção</span>
                          <span className="font-semibold text-gray-800">{formatCurrency(prof.producao)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Comissão</span>
                          <span className="font-semibold text-gray-700">{formatCurrency(prof.comissao?.total || 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 4. Insights gerais ── */}
        {((insights?.insights || []).length > 0 || (insights?.alertas || []).length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(insights?.insights || []).length > 0 && (
              <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                <div style={{ height: 3, backgroundColor: '#3B82F6' }} />
                <div className="p-4 bg-white">
                  <p className="text-3xs font-black uppercase tracking-widest text-gray-400 mb-3">Insights</p>
                  <ul className="space-y-2">
                    {(insights?.insights || []).map((text, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-gray-700">
                        <Info size={13} className="text-blue-500 shrink-0 mt-0.5" />
                        <span>{text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            {(insights?.alertas || []).length > 0 && (
              <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                <div style={{ height: 3, backgroundColor: '#F59E0B' }} />
                <div className="p-4 bg-white">
                  <p className="text-3xs font-black uppercase tracking-widest text-gray-400 mb-3">Alertas</p>
                  <div className="space-y-2">
                    {(insights?.alertas || []).map((alerta, idx) => (
                      <div key={idx} className={`p-2.5 rounded-xl text-xs ${
                        alerta.nivel === 'alto' ? 'bg-rose-50 text-rose-800' :
                        alerta.nivel === 'medio' ? 'bg-amber-50 text-amber-800' : 'bg-sky-50 text-sky-800'
                      }`}>
                        <p className="font-semibold">{alerta.mensagem}</p>
                        <p className="text-3xs mt-0.5 opacity-80">Ação: {alerta.acao}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {(insights?.recomendacoes || []).length > 0 && (
          <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
            <div style={{ height: 3, backgroundColor: '#10B981' }} />
            <div className="p-4 bg-white">
              <p className="text-3xs font-black uppercase tracking-widest text-gray-400 mb-3">Recomendações</p>
              <ul className="space-y-2">
                {(insights?.recomendacoes || []).map((text, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-gray-700">
                    <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderRankingTab = () => {
    const subTabs = [
      { label: 'Por Especialidade', icon: <Users size={16} /> },
      { label: 'Ranking', icon: <ArrowUpRight size={16} /> },
      { label: 'Pacientes VIP', icon: <Check size={16} /> },
      { label: 'Performance', icon: <TrendingUp size={16} /> },
    ];

    return (
      <div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-5 overflow-x-auto">
          <div className="flex gap-1 p-1.5 border-b border-gray-100">
            {subTabs.map((t, i) => (
              <button
                key={i}
                onClick={() => setRankingSubTab(i)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                  rankingSubTab === i
                    ? 'bg-[#00B57A] text-white shadow-md'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>
        {rankingSubTab === 0 && <DashboardEspecialidades />}
        {rankingSubTab === 1 && <RankingProfissionais />}
        {rankingSubTab === 2 && <ListaPacientesVIP />}
        {rankingSubTab === 3 && (
          <PerformancePorProfissional
            professionals={drillDown?.profissionais || []}
            loading={loading}
          />
        )}
      </div>
    );
  };

  const tabs = getDashboardTabs();

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-5 overflow-x-auto">
        <div className="flex gap-1 p-1.5 border-b border-gray-100">
          {tabs.map((t, i) => (
            <button
              key={i}
              onClick={() => {
                const newTabId = tabs[i]?.id;
                if (newTabId) {
                  setSearchParams(
                    (prev) => {
                      const next = new URLSearchParams(prev);
                      next.set(DASHBOARD_TAB_PARAM, newTabId);
                      return next;
                    },
                    { replace: true }
                  );
                }
                setActiveTab(i);
              }}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                activeTab === i
                  ? 'bg-[#00B57A] text-white shadow-md'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {(() => {
        const tabRenderers: Record<string, React.ReactNode> = {
          'Decisão Executiva': renderDecisaoExecutiva(),
          'Visão Geral': renderVisaoGeral(),
          'Caixa': renderCaixa(),
          'Produção': renderProducao(),
          'Despesas': renderDespesas(),
          'Metas': renderMetas(),
          'Projeção & Cenários': (
            <React.Suspense fallback={<div className="p-8 text-center text-gray-500">Carregando projeções...</div>}>
              <ProjecaoCenarios month={month} year={year} data={data} />
            </React.Suspense>
          ),
          'Insights': renderInsights(),
          'Ranking': renderRankingTab()
        };
        const activeLabel = tabs[activeTab]?.label;
        return (
          <div className="mt-4">
            {activeLabel && tabRenderers[activeLabel]}
          </div>
        );
      })()}

      {/* ── Modal de Débitos ── */}
      {debitosModalOpen && (() => {
      const isMes = debitosModalType === 'mes';
      const isLoading = isMes ? loadingDebitosMes : loadingDebitosTotal;
      const rows = isMes ? debitosMesData : debitosTotalData;
      const title = isMes ? `Débito do Mês — ${String(month).padStart(2,'0')}/${year}` : 'Débito Total (histórico)';

      // 🆕 V2 FINANCIAL ENGINE: quando disponível, o CORPO do modal renderiza este
      // agrupamento por paciente em vez de `rows` (ver abaixo). Total/contagem do
      // rodapé precisam vir da MESMA fonte que está sendo exibida — antes vinham de
      // `resumo.pendentes.vencidos` (particular+convênio "vencido"), uma fonte
      // diferente de `byPatient` (só particular), o que fazia o rodapé não bater
      // com as linhas realmente visíveis na tela (achado 2026-07-23).
      const v2PatientGroups = isMes ? resumo?.pendentes?.v2_financial?.byPatient : null;
      const hasV2Groups = !!(v2PatientGroups && Object.keys(v2PatientGroups).length > 0);
      const v2GroupsList: any[] = hasV2Groups
        ? Object.values(v2PatientGroups as Record<string, any>).map((g: any) => ({ ...g, tipo: 'particular' as const }))
        : [];

      // Convênio é dívida real também (o usuário apontou: banner soma Particular+Convênio,
      // mas o modal só mostrava Particular — confuso). Junta na MESMA lista, agrupado por
      // paciente também, com uma tag pra deixar claro qual é qual sem precisar de 2 ações.
      const convenioItemsList: any[] = isMes ? (resumo?.pendentes?.convenio?.items || []) : [];
      const convenioGroupsMap: Record<string, any> = {};
      for (const it of convenioItemsList) {
        const key = it.paciente || 'Desconhecido';
        if (!convenioGroupsMap[key]) {
          convenioGroupsMap[key] = { patient: { fullName: key }, patientId: `convenio-${key}`, total: 0, count: 0, items: [], tipo: 'convenio' as const };
        }
        convenioGroupsMap[key].total += it.valor || 0;
        convenioGroupsMap[key].count += 1;
        convenioGroupsMap[key].items.push({ _id: it.sessionId, amount: it.valor, provider: it.convenio, status: it.status, data: it.data, time: it.hora });
      }
      const convenioGroupsList: any[] = Object.values(convenioGroupsMap);

      const mergedGroupsList = [...v2GroupsList, ...convenioGroupsList];
      const usingV2Groups = mergedGroupsList.length > 0;
      const totalVal = usingV2Groups
        ? mergedGroupsList.reduce((s, g) => s + (g.total || 0), 0)
        : (isMes ? (resumo?.pendentes?.vencidos?.total || 0) : debitosTotalValue);
      const displayedCount = usingV2Groups
        ? mergedGroupsList.reduce((s, g) => s + (g.items?.length ?? g.count ?? 0), 0)
        : rows.length;

      const statusLabel: Record<string, string> = {
        pending: 'Pendente', pending_balance: 'Saldo pendente',
        unpaid: 'Não pago', partial: 'Parcial',
        pending_receipt: 'Aguard. recebimento',
        // 🚨 FIX (2026-09-02): faltava 'billed' (convênio faturado ao plano,
        // aguardando reembolso) — sem isso o backend nem incluía essas sessões
        // na lista (ver fetchPendingPaymentsByDateRange), então nunca precisou
        // de label; agora que estão incluídas, aparecia o texto cru "billed".
        billed: 'Faturado ao plano',
      };

      const convenioSubtotal = mergedGroupsList.filter((g: any) => g.tipo === 'convenio').reduce((s: number, g: any) => s + (g.total || 0), 0);
      const particularSubtotal = mergedGroupsList.filter((g: any) => g.tipo === 'particular').reduce((s: number, g: any) => s + (g.total || 0), 0);

      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setDebitosModalOpen(false)}>
          <div className="bg-white rounded-3xl shadow-2xl ring-1 ring-black/5 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className={`relative px-6 pt-5 pb-6 text-white ${isMes ? 'bg-gradient-to-br from-rose-600 via-rose-500 to-orange-500' : 'bg-gradient-to-br from-amber-600 via-amber-500 to-orange-500'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                    <AlertTriangle size={20} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black tracking-tight">{title}</h2>
                    <p className="text-2xs text-white/75 font-medium">{displayedCount} sessão(ões) em aberto</p>
                  </div>
                </div>
                <button onClick={() => setDebitosModalOpen(false)} className="p-1.5 rounded-full bg-white/10 hover:bg-white/25 transition-colors">
                  <X size={18} className="text-white" />
                </button>
              </div>
              <div className="mt-5 flex items-end justify-between">
                <div>
                  <p className="text-2xs text-white/70 font-semibold uppercase tracking-widest">Total em aberto</p>
                  <p className="text-3xl font-black tracking-tight">{formatCurrency(totalVal)}</p>
                </div>
                {usingV2Groups && (
                  <div className="flex gap-2">
                    {convenioSubtotal > 0 && (
                      <div className="bg-white/15 backdrop-blur rounded-xl px-3 py-1.5 text-right">
                        <p className="text-3xs text-white/70 font-semibold">Convênio</p>
                        <p className="text-sm font-bold">{formatCurrency(convenioSubtotal)}</p>
                      </div>
                    )}
                    {particularSubtotal > 0 && (
                      <div className="bg-white/15 backdrop-blur rounded-xl px-3 py-1.5 text-right">
                        <p className="text-3xs text-white/70 font-semibold">Particular</p>
                        <p className="text-sm font-bold">{formatCurrency(particularSubtotal)}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="overflow-auto flex-1 bg-gray-50/70">
              {isLoading ? (
                <div className="p-10 text-center text-gray-400 text-sm">Carregando...</div>
              ) : !usingV2Groups && rows.length === 0 ? (
                <div className="p-10 text-center text-emerald-600 font-semibold text-sm">✅ Nenhum débito encontrado</div>
              ) : (() => {
                if (usingV2Groups) {
                  const sortedGroups = mergedGroupsList.slice().sort((a: any, b: any) => b.total - a.total);
                  return (
                    <div className="p-3 space-y-2">
                      {sortedGroups.map((group: any) => {
                        const paciente = group.patient?.fullName || 'Desconhecido';
                        const groupKey = `${group.tipo}-${group.patientId || paciente}`;
                        const isOpen = openPatientGroups.has(groupKey);
                        const toggle = () => setOpenPatientGroups(prev => {
                          const next = new Set(prev);
                          isOpen ? next.delete(groupKey) : next.add(groupKey);
                          return next;
                        });
                        const isConvenio = group.tipo === 'convenio';
                        return (
                          <div key={groupKey} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <button
                              onClick={toggle}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50/80 text-left transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${isConvenio ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
                                  {paciente.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-800 text-sm">{paciente}</span>
                                    <span className={`text-3xs font-bold px-2 py-0.5 rounded-full ${isConvenio ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
                                      {isConvenio ? 'Convênio' : 'Particular'}
                                    </span>
                                  </div>
                                  <p className="text-3xs text-gray-400 font-medium mt-0.5">{group.count} sessão(ões) em aberto</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="font-black text-rose-600">{formatCurrency(group.total)}</span>
                                <span className={`text-gray-300 transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
                              </div>
                            </button>
                            {isOpen && (
                              <div className="border-t border-gray-100 bg-gray-50/60 divide-y divide-gray-100">
                                {group.items.map((item: any, i: number) => {
                                  const specColor: Record<string, string> = {
                                    'Fonoaudiologia': 'bg-emerald-100 text-emerald-700',
                                    'Psicologia': 'bg-violet-100 text-violet-700',
                                    'Terapia Ocupacional': 'bg-orange-100 text-orange-700',
                                  };
                                  const label = isConvenio ? (item.provider || '—') : (item.specialty || '—');
                                  const sc = isConvenio ? 'bg-violet-100 text-violet-700' : (specColor[item.specialty] || 'bg-gray-100 text-gray-600');
                                  const statusDot: Record<string, string> = { pending: 'bg-amber-500', billed: 'bg-sky-500' };
                                  return (
                                    <div key={item._id || i} className="flex items-center justify-between gap-3 px-4 py-2.5 pl-8">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-2xs text-gray-400 font-medium w-24 shrink-0 tabular-nums">
                                          {item.data ? `${new Date(item.data).toLocaleDateString('pt-BR')} ${item.time || ''}` : '—'}
                                        </span>
                                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-3xs font-bold ${sc}`}>{label}</span>
                                        <span className="flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-full text-3xs font-bold bg-gray-100 text-gray-500">
                                          <span className={`w-1.5 h-1.5 rounded-full ${statusDot[item.status] || 'bg-rose-400'}`} />
                                          {statusLabel[item.status] || item.status}
                                        </span>
                                      </div>
                                      <span className="font-bold text-gray-800 text-sm shrink-0">{formatCurrency(item.amount)}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                }

                // Fallback legacy (Appointment-based)
                const groups = rows.reduce<Record<string, { items: typeof rows; total: number }>>((acc, item) => {
                  const key = item.paciente || 'N/A';
                  if (!acc[key]) acc[key] = { items: [], total: 0 };
                  acc[key].items.push(item);
                  acc[key].total += item.valor || 0;
                  return acc;
                }, {});
                const sortedGroups = Object.entries(groups).sort((a, b) => b[1].total - a[1].total);

                return (
                  <div className="p-3 space-y-2">
                    {sortedGroups.map(([paciente, group]) => {
                      const isOpen = openPatientGroups.has(paciente);
                      const toggle = () => setOpenPatientGroups(prev => {
                        const next = new Set(prev);
                        isOpen ? next.delete(paciente) : next.add(paciente);
                        return next;
                      });
                      return (
                        <div key={paciente} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                          <button
                            onClick={toggle}
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50/80 text-left transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-black shrink-0">
                                {paciente.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-bold text-gray-800 text-sm">{paciente}</span>
                                <p className="text-3xs text-gray-400 font-medium mt-0.5">{group.items.length} sessão(ões) em aberto</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="font-black text-rose-600">{formatCurrency(group.total)}</span>
                              <span className={`text-gray-300 transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
                            </div>
                          </button>
                          {isOpen && (
                            <div className="border-t border-gray-100 bg-gray-50/60 divide-y divide-gray-100">
                              {group.items.map((item, i) => {
                                const tipoLabel: Record<string, string> = { particular: 'Particular', convenio: 'Convênio', pacote: 'Pacote', pix: 'PIX', dinheiro: 'Dinheiro', cartão: 'Cartão' };
                                const tipoColor: Record<string, string> = { particular: 'bg-blue-100 text-blue-700', convenio: 'bg-sky-100 text-sky-700', pacote: 'bg-purple-100 text-purple-700' };
                                const tc = tipoColor[item.tipo || ''] || 'bg-gray-100 text-gray-600';
                                return (
                                  <div key={item._id || i} className="flex items-center justify-between gap-3 px-4 py-2.5 pl-8">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-2xs text-gray-400 font-medium w-24 shrink-0 tabular-nums">{item.date ? `${new Date(item.date).toLocaleDateString('pt-BR')} ${item.time || ''}` : '—'}</span>
                                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-3xs font-bold ${tc}`}>
                                        {tipoLabel[item.tipo || ''] || item.tipo || '—'}
                                      </span>
                                      <span className="shrink-0 px-2 py-0.5 rounded-full text-3xs font-bold bg-gray-100 text-gray-500">
                                        {statusLabel[item.paymentStatus] || item.paymentStatus}
                                      </span>
                                    </div>
                                    <span className="font-bold text-gray-800 text-sm shrink-0">{formatCurrency(item.valor)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Footer — sempre reflete a MESMA fonte de dados exibida no corpo acima */}
            <div className="px-5 py-3.5 border-t border-gray-100 bg-white flex justify-between items-center shrink-0">
              <span className="text-2xs text-gray-400 font-semibold">{displayedCount} sessão(ões) no total</span>
              <span className="font-black text-gray-900">{formatCurrency(totalVal)}</span>
            </div>
          </div>
        </div>
      );
    })()}
      {/* ── Modal de Novos Pacientes ── */}
      {novosPacientesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setNovosPacientesModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Users size={20} className="text-pink-600" />
                <h2 className="text-lg font-bold text-gray-900">Novos Pacientes — {String(month).padStart(2, '0')}/{year}</h2>
              </div>
              <button onClick={() => setNovosPacientesModalOpen(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="overflow-y-auto p-4">
              {novosPacientesLista.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">Nenhum novo paciente neste período.</p>
              ) : (
                <div className="space-y-2">
                  {novosPacientesLista.map((apt: any, i: number) => (
                    <div key={apt._id || i} className="flex items-center justify-between p-3 rounded-xl border border-pink-100 bg-pink-50/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-xs font-bold">
                          {(apt.patient?.fullName || '—').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{apt.patient?.fullName || 'Sem nome'}</p>
                          <p className="text-2xs text-gray-500">
                            {apt.date ? new Date(apt.date).toLocaleDateString('pt-BR') : '—'} · {apt.time || '—'} · {apt.specialty || '—'}
                          </p>
                          <p className="text-3xs text-gray-400">
                            Prof: {apt.doctor?.fullName || '—'} · Tel: {apt.patient?.phone || '—'} · Criado em: {apt.createdAt ? new Date(apt.createdAt).toLocaleDateString('pt-BR') : '—'} · Valor: {formatCurrency(apt.sessionValue || 0)}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-3xs font-bold uppercase ${
                        apt.operationalStatus === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        apt.operationalStatus === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                        apt.operationalStatus === 'pre_agendado' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {apt.operationalStatus === 'pre_agendado' ? 'Pré-agendado' :
                         apt.operationalStatus === 'scheduled' ? 'Agendado' :
                         apt.operationalStatus === 'completed' ? 'Atendido' :
                         apt.operationalStatus || '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t flex justify-between items-center">
              <span className="text-sm text-gray-500">{novosPacientesLista.length} paciente(s) novo(s)</span>
              <button
                onClick={() => setNovosPacientesModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// Componentes auxiliares (apenas visuais, sem lógica alterada)
const MetricCard = ({ title, subtitle, value, icon, color, onClick, tooltip }: { title: string; subtitle?: string; value: string; icon: React.ReactNode; color: string; onClick?: () => void; tooltip?: string }) => {
  const bgMap: Record<string, string> = {
    emerald: 'from-emerald-50 to-white border-emerald-100',
    blue:    'from-blue-50 to-white border-blue-100',
    rose:    'from-rose-50 to-white border-rose-100',
    sky:     'from-sky-50 to-white border-sky-100',
    amber:   'from-amber-50 to-white border-amber-100',
    purple:  'from-purple-50 to-white border-purple-100',
    indigo:  'from-indigo-50 to-white border-indigo-100',
    violet:  'from-violet-50 to-white border-violet-100',
    gray:    'from-gray-50 to-white border-gray-200',
  };
  const iconMap: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-600',
    blue:    'bg-blue-100 text-blue-600',
    rose:    'bg-rose-100 text-rose-600',
    sky:     'bg-sky-100 text-sky-600',
    amber:   'bg-amber-100 text-amber-600',
    purple:  'bg-purple-100 text-purple-600',
    indigo:  'bg-indigo-100 text-indigo-600',
    violet:  'bg-violet-100 text-violet-600',
    gray:    'bg-gray-100 text-gray-600',
  };
  const bg = bgMap[color] ?? bgMap.gray;
  const ic = iconMap[color] ?? iconMap.gray;
  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${bg} rounded-2xl border p-4 shadow-sm hover:shadow-lg transition-all duration-200 h-full ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${ic} flex items-center justify-center shrink-0`}>
          {icon}
        </div>
        <div className="flex items-center gap-1">
          {tooltip && (
            <div className="relative group">
              <Info size={14} className="text-gray-300 hover:text-gray-500 cursor-help" />
              <div className="absolute right-0 top-5 z-50 hidden group-hover:block w-56 bg-gray-800 text-white text-xs rounded-lg p-2.5 leading-relaxed shadow-xl">
                {tooltip}
                <div className="absolute -top-1 right-1 w-2 h-2 bg-gray-800 rotate-45" />
              </div>
            </div>
          )}
          {onClick && <ArrowUpRight size={14} className="text-gray-400 mt-1" />}
        </div>
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">{title}</p>
      <span className="text-2xl font-bold text-gray-900 tracking-tight">{value}</span>
      {subtitle && <p className="text-xs text-gray-400 mt-1.5 leading-snug">{subtitle}</p>}
    </div>
  );
};

const MetricRow = ({ label, value, valueColor = 'text-gray-900' }: { label: string; value: string; valueColor?: string }) => (
  <div className="flex justify-between text-sm">
    <span className="text-gray-500">{label}</span>
    <span className={`font-semibold ${valueColor}`}>{value}</span>
  </div>
);

const BreakdownList = ({ items, total }: { items: Array<{ label: string; value: number; color: string }>; total: number }) => {
  const colorBar: Record<string, string> = {
    blue:    'bg-blue-500',
    purple:  'bg-purple-500',
    sky:     'bg-sky-400',
    amber:   'bg-amber-500',
    emerald: 'bg-emerald-500',
    gray:    'bg-gray-400',
  };
  const colorDot: Record<string, string> = {
    blue:    'bg-blue-500',
    purple:  'bg-purple-500',
    sky:     'bg-sky-400',
    amber:   'bg-amber-500',
    emerald: 'bg-emerald-500',
    gray:    'bg-gray-400',
  };
  return (
    <div className="space-y-3">
      {items.map((item, idx) => {
        const pct = total > 0 ? (item.value / total) * 100 : 0;
        return (
          <div key={idx}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2 h-2 rounded-full shrink-0 ${colorDot[item.color] ?? 'bg-gray-400'}`} />
              <span className="text-xs font-semibold text-gray-700 flex-1">{item.label}</span>
              <span className="text-xs font-black text-gray-500 w-11 text-right">{pct.toFixed(1)}%</span>
              <span className="text-xs font-black text-gray-900 w-20 text-right">{formatCurrency(item.value)}</span>
            </div>
            <div className="ml-4 h-[4px] w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${colorBar[item.color] ?? 'bg-gray-400'} rounded-full transition-all duration-700`}
                style={{ width: `${Math.max(pct, 0)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FinancialDashboardTab;