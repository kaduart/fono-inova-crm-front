import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  AlertTriangle
} from 'lucide-react';
import api from '../../../services/api';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useFinancialDashboardV3 } from '../../../hooks/useFinancialDashboardV3';
const ProjecaoCenarios = React.lazy(() => import('./AnaliseProjecaoTab').then(m => ({ default: m.ProjecaoCenarios })));
import { DashboardEspecialidades } from '../components/DashboardEspecialidades';
import { RankingProfissionais } from '../components/RankingProfissionais';
import { ListaPacientesVIP } from '../components/ListaPacientesVIP';
import {
  getInsuranceReceivables,
  billInsuranceSession,
  receiveInsuranceSession,
  InsuranceReceivableGroup
} from '../../../services/paymentService';
import { toast } from 'react-toastify';

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

interface DashboardV3TabProps {
  month: number;
  year: number;
}

const DashboardV3Tab = ({ month, year }: DashboardV3TabProps) => {
  const [activeTab, setActiveTab] = useState(0);
  const [rankingSubTab, setRankingSubTab] = useState(0);
  const { data, resumo, loading, error, fetchDashboard } = useFinancialDashboardV3();
  // 🆕 B: Pendências de convênio
  const [pendingInsurance, setPendingInsurance] = useState<InsuranceReceivableGroup[]>([]);
  const [loadingInsurance, setLoadingInsurance] = useState(false);

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

  const fetchDebitosTotal = useCallback(async () => {
    if (debitosTotalLoaded.current) return;
    setLoadingDebitosTotal(true);
    try {
      const res = await api.get('/financial/dashboard/debitos');
      setDebitosTotalData(res.data?.data || []);
      setDebitosTotalValue(res.data?.total || 0);
      debitosTotalLoaded.current = true;
    } catch (err) {
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
    try {
      const res = await api.get(`/financial/dashboard/debitos?month=${month}&year=${year}`);
      setDebitosMesData(res.data?.data || []);
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

  // Lazy: só busca convênios quando o tab que os usa estiver ativo
  useEffect(() => {
    const key = `${month}-${year}`;
    // Tab 0 (Decisão Executiva) tem seção de convênios pendentes
    if (activeTab === 0 && insuranceLoaded.current !== key) {
      insuranceLoaded.current = key;
      fetchPendingInsurance();
    }
  }, [activeTab, month, year, fetchPendingInsurance]);

  // 🔄 Escuta evento global de refresh de caixa (disparado após completeSession)
  useEffect(() => {
    const handleCashRefresh = () => {
      console.log('[DashboardV3Tab] cash:refresh recebido — refetching dashboard');
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
  const totalRetroativos = data?.retroativos ?? 0;
  const totalAReceberProducao = data?.aReceberProducao ?? 0;

  // 🎯 RITMO OPERACIONAL — deve ficar ANTES dos early returns (Rules of Hooks)
  const ritmoCardEl = useMemo(() => {
    const metas = data?.metas;
    if (!metas?.ritmo) return null;
    const pctEsperado = metas.ritmo.percentualEsperado ?? 0;
    // 🎯 META PRINCIPAL = PRODUÇÃO
    const pctRealizado = metas.camadas?.producao?.percentual ?? metas.ritmo.percentualRealizado ?? 0;
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
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">PRODUÇÃO CLÍNICA — RITMO DO MÊS</span>
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
              <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full ${progressColor} rounded-full transition-all`} style={{ width: `${Math.min(pctRealizado, 100)}%` }}></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Resultado econômico acumulado</span>
                <span>Meta mensal</span>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">Baseado em produção realizada (sessões completadas). Meta = Produção, não Caixa. Retroativos são contabilizados.</p>
            </div>
          </div>
          <div className="space-y-2">
            <MetricRow label="Esperado até hoje (produção)" value={formatCurrency(metas.ritmo.esperadoAteAgora ?? 0)} />
            {/* 🎯 Produção vem da API — não recalcula */}
            <MetricRow label="Produção realizada" value={formatCurrency(metas.camadas?.producao?.atingido ?? totalProducao)} />
            <MetricRow label="Caixa realizado" value={formatCurrency(totalCaixa)} />
            <MetricRow
              label="Diferença produção"
              value={formatCurrency((metas.camadas?.producao?.atingido ?? 0) - (metas.ritmo.esperadoAteAgora ?? 0))}
              valueColor={((metas.camadas?.producao?.atingido ?? 0) - (metas.ritmo.esperadoAteAgora ?? 0)) >= 0 ? 'text-emerald-600' : 'text-rose-600'}
            />
            <MetricRow label="Gap diário necessário" value={formatCurrency(metas.gap?.porDia ?? 0)} />
          </div>
        </div>
      </div>
    );
  }, [data?.metas?.ritmo?.percentualEsperado, data?.metas?.ritmo?.percentualRealizado, data?.metas?.ritmo?.esperadoAteAgora, data?.metas?.ritmo?.realizadoAteAgora, data?.metas?.ritmo?.diferenca, data?.metas?.gap?.porDia, data?.metas?.statusMeta]);

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

  const { cash, revenue, expenses, metas, profissionais, insights, comparativos, riscoOperacional, acoesExecutivas, drillDown, indicadores, convenioAReceber, particularPendente, pacotePendente, recebimentoProducao, retroativos, aReceberProducao } = data;
  // ─── 🎯 APENAS RENDERIZAR — nenhum recálculo semântico aqui ───
  // Todos os valores abaixo vêm PRONTOS da API. Frontend não recalcula.
  // NOTA: totalCaixa/totalProducao já declarados acima (antes do ritmoCardEl) para evitar TDZ.

  const renderVisaoGeral = () => (
    <div>
      {ritmoCardEl}

      {/* ── VISÃO OPERACIONAL — o que importa pro gestor clínico ── */}
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Visão Operacional</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* 1. Produção Clínica */}
        <div className="rounded-2xl border-2 p-5 shadow-sm" style={{ borderColor: '#3B82F640', backgroundColor: '#EFF6FF' }}>
          <div className="flex items-center gap-2 mb-1">
            <Briefcase size={16} className="text-blue-600" />
            <span className="text-xs font-black uppercase tracking-widest text-blue-600">Produção Clínica</span>
            <Info size={12} className="text-blue-400 cursor-help" title="Sessões atendidas (status=completed) + convênios completados. NÃO é caixa recebido." />
          </div>
          <div className="text-4xl font-black text-gray-900 my-2">{formatCurrency(totalProducao)}</div>
          <p className="text-xs text-gray-500">Tudo que foi atendido neste mês</p>
          <div className="mt-3 pt-2 border-t border-blue-100 grid grid-cols-2 gap-1 text-[11px] text-gray-500">
            <span>Pacote: <strong>{formatCurrency(revenue.byMethod.pacote || 0)}</strong></span>
            <span>Particular: <strong>{formatCurrency(revenue.byMethod.particular || 0)}</strong></span>
            <span>Convênio: <strong>{formatCurrency(revenue.byMethod.convenio || 0)}</strong></span>
            <span>Liminar: <strong>{formatCurrency(revenue.byMethod.liminar || 0)}</strong></span>
          </div>
        </div>

        {/* 2. Recebido da Produção */}
        <div className="rounded-2xl border-2 p-5 shadow-sm" style={{ borderColor: '#10B98140', backgroundColor: '#F0FDF4' }}>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span className="text-xs font-black uppercase tracking-widest text-emerald-600">Recebido da Produção</span>
            <Info size={12} className="text-emerald-400 cursor-help" title="Parcela da produção deste mês que já virou caixa (pagamentos recebidos)." />
          </div>
          <div className="text-4xl font-black text-gray-900 my-2">{formatCurrency(totalRecebimentoProducao)}</div>
          <p className="text-xs text-gray-500">Da produção deste mês já convertida em caixa</p>
          <div className="mt-3 pt-2 border-t border-emerald-100">
            <div className="flex justify-between text-[11px] text-gray-500 mb-1">
              <span>% da produção recebida</span>
              <strong className="text-emerald-700">{totalProducao > 0 ? Math.round((totalRecebimentoProducao / totalProducao) * 100) : 0}%</strong>
            </div>
            <div className="h-2 w-full bg-emerald-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${totalProducao > 0 ? Math.min(100, Math.round((totalRecebimentoProducao / totalProducao) * 100)) : 0}%` }} />
            </div>
          </div>
        </div>

        {/* 3. A Receber */}
        <div className="rounded-2xl border-2 p-5 shadow-sm" style={{ borderColor: '#F59E0B40', backgroundColor: '#FFFBEB' }}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className="text-amber-600" />
            <span className="text-xs font-black uppercase tracking-widest text-amber-600">A Receber</span>
            <Info size={12} className="text-amber-400 cursor-help" title="Produção realizada mas ainda não paga. Pipeline legítimo de recebimento futuro." />
          </div>
          <div className="text-4xl font-black text-gray-900 my-2">{formatCurrency(totalAReceberProducao)}</div>
          <p className="text-xs text-gray-500">Produção realizada ainda não paga</p>
          <div className="mt-3 pt-2 border-t border-amber-100 space-y-1 text-[11px]">
            {convenioAReceber > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">🧾 Convênio pendente</span>
                <strong className="text-amber-700">{formatCurrency(convenioAReceber)}</strong>
              </div>
            )}
            {(particularPendente + pacotePendente) > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">👤 Particular/Pacote</span>
                <strong className="text-amber-700">{formatCurrency(particularPendente + pacotePendente)}</strong>
              </div>
            )}
            {liminarAReceber > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">⚖️ Liminar</span>
                <strong className="text-amber-700">{formatCurrency(liminarAReceber)}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── CAIXA FINANCEIRO — secundário, inclui retroativos ── */}
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Caixa Financeiro (regime de caixa)</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="rounded-2xl border p-4 shadow-sm bg-white col-span-1 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={14} className="text-gray-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Caixa Total</span>
            <Info size={12} className="text-gray-400 cursor-help" title="Todo dinheiro que entrou neste mês (regime de caixa). Inclui retroativos de meses anteriores." />
          </div>
          <div className="text-2xl font-black text-gray-900">{formatCurrency(totalCaixa)}</div>
          <p className="text-[11px] text-gray-400 mt-1">
            Tudo que entrou em maio · inclui {formatCurrency(totalRetroativos)} de retroativos
          </p>
        </div>
        <MetricCard title="Retroativos" subtitle="Recebimentos de meses anteriores" value={formatCurrency(totalRetroativos)} icon={<TrendingUp size={20} />} color="sky" />
        <MetricCard title="Despesas" subtitle="Despesas cadastradas + comissões" value={formatCurrency(expenses.total)} icon={<Receipt size={20} />} color="rose" />
        <MetricCard title="Lucro" subtitle="Caixa menos despesas" value={formatCurrency(indicadores?.lucro ?? totalCaixa - expenses.total)} icon={<TrendingUp size={20} />} color={(indicadores?.lucro ?? totalCaixa - expenses.total) >= 0 ? 'emerald' : 'rose'} />
      </div>

      {/* 🆕 CARDS DETALHADOS — SEPARAÇÃO CAIXA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Vendas de Pacotes"
          subtitle={`${cash.breakdown.packageSalesCount || 0} contratos`}
          value={formatCurrency(cash.breakdown.packageSales || 0)}
          icon={<Briefcase size={20} />}
          color="purple"
        />
        <MetricCard
          title="Particular Líquido"
          subtitle="Exclui vendas de pacotes"
          value={formatCurrency(cash.breakdown.particularNet || cash.breakdown.particular || 0)}
          icon={<DollarSign size={20} />}
          color="sky"
        />
        <MetricCard
          title="Sessões de Pacote (Caixa)"
          subtitle="Pagamento por sessão realizada"
          value={formatCurrency(Math.max(0, (cash.breakdown.pacote || 0) - (cash.breakdown.packageSales || 0)))}
          icon={<CheckCircle2 size={20} />}
          color="indigo"
        />
        <MetricCard
          title="Total em Pacotes"
          subtitle="Vendas + Sessões pagas"
          value={formatCurrency(cash.breakdown.pacote || 0)}
          icon={<Briefcase size={20} />}
          color="violet"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-lg font-bold text-gray-800 mb-1">Projeção Esperada</h3>
          <p className="text-xs text-gray-400 mb-3">Cenário conservador (não extrapolação linear)</p>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${metas?.projecao?.bateMeta ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
              {metas?.projecao?.bateMeta ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
            </div>
            <div>
              <span className="text-2xl font-bold text-gray-900">{formatCurrency(metas?.projecao?.esperada ?? metas?.projecao?.final ?? 0)}</span>
              <p className="text-sm text-gray-500">vs meta de {formatCurrency(metas?.configuracao?.metaMensal ?? 0)}</p>
            </div>
          </div>
          <div className={`p-3 rounded-lg ${metas?.projecao?.bateMeta ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'} text-sm`}>
            {metas?.projecao?.bateMeta
              ? '✅ Projeção esperada indica que a meta será atingida.'
              : `⚠️ Faltam ${formatCurrency(metas?.gap?.valor ?? 0)} para bater a meta com ${metas?.gap?.diasRestantes ?? 0} dias restantes.`}
            {metas?.projecao?.bateMetaOtimista && !metas?.projecao?.bateMeta && (
              <p className="mt-1 text-xs opacity-75">Cenário otimista (extrapolação): {formatCurrency(metas?.projecao?.final ?? 0)}</p>
            )}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-lg font-bold text-gray-800 mb-3">Resumo do Dia</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Caixa hoje</p>
              <span className="text-2xl font-bold text-gray-900">{formatCurrency(cash.today ?? metas?.realizado?.hoje ?? 0)}</span>
              <p className="text-xs text-gray-400 mt-0.5">Dinheiro recebido hoje</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Meta diária</p>
              <span className="text-2xl font-bold text-gray-900">{formatCurrency(metas?.configuracao?.metaDiariaNecessaria ?? 0)}</span>
              <p className="text-xs text-gray-400 mt-0.5">Caixa necessário/dia</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Gap hoje</p>
              <span className={`text-2xl font-bold ${(cash.today ?? metas?.realizado?.hoje ?? 0) >= (metas?.configuracao?.metaDiariaNecessaria ?? 0) ? 'text-emerald-600' : 'text-amber-600'}`}>
                {formatCurrency((cash.today ?? metas?.realizado?.hoje ?? 0) - (metas?.configuracao?.metaDiariaNecessaria ?? 0))}
              </span>
              <p className="text-xs text-gray-400 mt-0.5">{(cash.today ?? metas?.realizado?.hoje ?? 0) >= (metas?.configuracao?.metaDiariaNecessaria ?? 0) ? 'Acima da meta' : 'Abaixo da meta'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCaixa = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <p className="text-sm text-gray-500 mb-4">
          💡 <strong>Caixa = dinheiro que REALMENTE entrou</strong> no banco. Convênio só aparece quando a operadora paga.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-lg font-bold text-gray-800 mb-1">Por Tipo</h3>
          <p className="text-xs text-gray-400 mb-4">Dinheiro recebido no período</p>
          <BreakdownList items={[
            { label: 'Particular', value: cash.breakdown.particular, color: 'blue' },
            { label: 'Pacote', value: cash.breakdown.pacote, color: 'purple' },
            { label: 'Convênio', value: cash.breakdown.convenio, color: 'sky' },
            { label: 'Liminar', value: cash.breakdown.liminar, color: 'amber' },
          ]} total={totalCaixa} />
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-lg font-bold text-gray-800 mb-1">Por Método</h3>
          <p className="text-xs text-gray-400 mb-4">Forma de pagamento do dinheiro recebido</p>
          <BreakdownList items={[
            { label: 'Dinheiro', value: cash.byMethod.dinheiro, color: 'emerald' },
            { label: 'Cartão', value: cash.byMethod.cartao, color: 'blue' },
            { label: 'PIX', value: cash.byMethod.pix, color: 'sky' },
            { label: 'Outros', value: cash.byMethod.outros, color: 'gray' },
          ]} total={totalCaixa} />
        </div>
      </div>

      {/* 🆕 DETALHAMENTO DE PACOTES NO CAIXA */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Detalhamento de Pacotes no Caixa</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-purple-50 border border-purple-100">
            <p className="text-sm text-purple-600 font-medium">Vendas de Pacotes (Contratos)</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(cash.breakdown.packageSales || 0)}</p>
            <p className="text-xs text-gray-500 mt-1">{cash.breakdown.packageSalesCount || 0} contratos fechados</p>
          </div>
          <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-100">
            <p className="text-sm text-indigo-600 font-medium">Sessões de Pacote Pagas</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(Math.max(0, (cash.breakdown.pacote || 0) - (cash.breakdown.packageSales || 0)))}</p>
            <p className="text-xs text-gray-500 mt-1">Pagamento por sessão realizada</p>
          </div>
          <div className="p-4 rounded-lg bg-violet-50 border border-violet-100">
            <p className="text-sm text-violet-600 font-medium">Total em Pacotes</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(cash.breakdown.pacote || 0)}</p>
            <p className="text-xs text-gray-500 mt-1">Vendas + Sessões pagas</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderProducao = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
        <h3 className="text-lg font-bold text-gray-800 mb-1">Por Tipo</h3>
        <p className="text-xs text-gray-400 mb-4">Atendimentos realizados no período (produção)</p>
        <BreakdownList items={[
          { label: 'Particular', value: revenue.byMethod.particular, color: 'blue' },
          { label: 'Pacote', value: revenue.byMethod.pacote, color: 'purple' },
          { label: 'Convênio', value: revenue.byMethod.convenio, color: 'sky' },
          { label: 'Liminar', value: revenue.byMethod.liminar, color: 'amber' },
        ]} total={revenue.total} />
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
        <h3 className="text-lg font-bold text-gray-800 mb-1">Status de Pagamento</h3>
        <p className="text-xs text-gray-400 mb-4">Da produção clínica do mês</p>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-100">
            <div>
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Recebido da produção</p>
              <p className="text-xs text-emerald-600 mt-0.5">
                Pago de sessões deste mês · caixa total {formatCurrency(cash.total)}
                {totalRetroativos > 0 && ` (inclui ${formatCurrency(totalRetroativos)} de meses anteriores)`}
              </p>
            </div>
            <span className="text-2xl font-bold text-emerald-700">
              {formatCurrency(totalRecebimentoProducao)}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-100">
            <div>
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">A faturar ao plano</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Sessões entregues aguardando repasse
                {convenioAReceber > 0 && ` · Conv. ${formatCurrency(convenioAReceber)}`}
                {liminarAReceber > 0 && ` · Lim. ${formatCurrency(liminarAReceber)}`}
              </p>
            </div>
            <span className="text-2xl font-bold text-amber-700">
              {formatCurrency(convenioAReceber + liminarAReceber)}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50 border border-rose-100">
            <div>
              <p className="text-xs font-semibold text-rose-700 uppercase tracking-wide">Não pago</p>
              <p className="text-xs text-rose-600 mt-0.5">Particular/Pacote com sessão realizada sem pagamento</p>
            </div>
            <span className="text-2xl font-bold text-rose-700">{formatCurrency(particularPendente + pacotePendente)}</span>
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
        {expenses.breakdown && expenses.breakdown.detalheComissoes.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Comissões por Profissional</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {expenses.breakdown.detalheComissoes.map((c) => (
                <div key={c.doctorId} className="border border-gray-100 rounded-2xl p-4 bg-gray-50">
                  <p className="font-semibold text-gray-800">{c.doctorName}</p>
                  <p className="text-sm text-gray-500">{c.sessions} sessões</p>
                  <p className="text-xl font-bold text-gray-900 mt-2">{formatCurrency(c.total)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMetas = () => {
    if (!metas) return <div className="p-4 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">Dados de metas indisponíveis para este período.</div>;

    const metaValor        = metas.configuracao?.metaMensal ?? 0;
    // 🎯 META PRINCIPAL = PRODUÇÃO — usa APENAS o que vem da API
    const pctRealizado     = metas.camadas?.producao?.percentual ?? 0;
    const metaRealizado    = metas.camadas?.producao?.atingido ?? totalProducao;
    const resultadoEcon    = metaRealizado;
    const caixaTotal       = cash?.total ?? 0;
    const producaoTotal    = revenue?.total ?? 0;
    // convenioAReceber usa o do outer scope (data.convenioAReceber = production.convenio - cash.convenio)
    const pendentesTotal   = resumo?.pendentes?.allParticularTotal ?? ((data?.particularPendente || 0) + (data?.pacotePendente || 0));

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

    return (
      <div className="space-y-4">
        {/* Indicadores topo */}
        {indicadores && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <MetricCard title="Lucro" value={formatCurrency(indicadores.lucro)} icon={<TrendingUp size={20} />} color={indicadores.statusLucro === 'positivo' ? 'emerald' : 'rose'} />
            <MetricCard title="Margem" value={`${indicadores.margemPercentual}%`} icon={<TrendingUp size={20} />} color={indicadores.statusMargem === 'bom' ? 'emerald' : indicadores.statusMargem === 'atencao' ? 'amber' : 'rose'} />
            <MetricCard title="Ponto de Equilíbrio" value={indicadores.pontoEquilibrio === 0 ? 'Alcançado' : formatCurrency(indicadores.pontoEquilibrio)} icon={<Target size={20} />} color={indicadores.pontoEquilibrio === 0 ? 'emerald' : 'amber'} />
          </div>
        )}

        {/* ── HERO EXECUTIVO ── */}
        <div className="rounded-2xl border-2 p-5 shadow-sm" style={{ borderColor: heroColor, backgroundColor: heroBg }}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Meta do Mês</p>
              <p className="text-xs text-gray-400">{String(month).padStart(2,'0')}/{year}</p>
            </div>
            <div className="text-right">
              <span className="text-4xl font-black leading-none" style={{ color: heroColor }}>
                {Math.min(pctRealizado, 100).toFixed(0)}%
              </span>
              <p className="text-xs font-bold mt-0.5" style={{ color: heroColor }}>{statusLabel}</p>
            </div>
          </div>

          {/* Barra grossa */}
          {metaValor > 0 && (
            <div className="relative h-8 rounded-full bg-gray-200 mb-4 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 flex items-center justify-end pr-3"
                style={{ width: `${Math.min(pctRealizado, 100)}%`, backgroundColor: heroColor, minWidth: pctRealizado > 5 ? '3rem' : 0 }}
              >
                {pctRealizado >= 12 && <span className="text-xs font-black text-white">{pctRealizado.toFixed(0)}%</span>}
              </div>
            </div>
          )}

          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-black text-gray-900">{formatCurrency(resultadoEcon)}</span>
            <span className="text-sm text-gray-500">de {formatCurrency(metaValor)}</span>
            {resultadoEcon < metaValor && (
              <span className="text-sm font-bold text-rose-600">· faltam {formatCurrency(metaValor - resultadoEcon)}</span>
            )}
          </div>
          <p className="text-xs text-gray-500 italic mb-4">{textoExecutivo}</p>

          {/* Mini KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 border-t border-gray-200 pt-3">
            {([
              { icon: '💵', label: 'Caixa recebido',     value: caixaTotal,       color: '#059669' },
              { icon: '🧾', label: 'Convênio a receber', value: convenioAReceber, color: '#7C3AED' },
              { icon: '🏥', label: 'Produção clínica',   value: producaoTotal,    color: '#2563EB' },
              { icon: '⏳', label: 'A receber',             value: totalAReceberProducao, color: '#D97706' },
              { icon: '🎯', label: 'Falta para meta',    value: Math.max(0, metaValor - resultadoEcon), color: '#DC2626' },
            ] as const).map((kpi) => (
              <div key={kpi.label} className="text-center">
                <div className="text-lg leading-none mb-0.5">{kpi.icon}</div>
                <p className="text-sm font-black" style={{ color: kpi.color }}>{formatCurrency(kpi.value)}</p>
                <p className="text-[11px] text-gray-600 font-medium leading-tight">{kpi.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 3 CARDS INTELIGENTES ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

          {/* CARD 1: Composição da Receita */}
          <div className="rounded-2xl border border-gray-200 p-4 shadow-sm bg-white">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Produção por Tipo</p>
            <p className="text-[10px] text-gray-400 mb-3">Serviços executados por tipo (não é caixa recebido)</p>
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
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold text-gray-700">{icon} {label}</span>
                        <span className="text-xs font-black" style={{ color }}>{pct}%</span>
                      </div>
                      <div className="relative h-6 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: color, minWidth: pct > 3 ? '2rem' : 0 }}
                        >
                          {pct >= 10 && <span className="text-[10px] font-black text-white">{pct}%</span>}
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">{formatCurrency(dados.realizado)}</p>
                    </div>
                  );
                })}
            </div>
            {(() => {
              const top = Object.entries(metas.porTipo || {}).sort(([, a], [, b]) => (b as any).realizado - (a as any).realizado)[0];
              return top ? (
                <p className="text-[10px] text-gray-500 mt-3 pt-2 border-t border-gray-100">
                  <span className="font-bold">Maior motor:</span> {tipoIcons[top[0]]} {tipoLabels[top[0]] || top[0]} ({(top[1] as any).percentualDoTotal}% do caixa)
                </p>
              ) : null;
            })()}
          </div>

          {/* CARD 2: Qualidade da Receita */}
          <div className="rounded-2xl border border-gray-200 p-4 shadow-sm bg-white">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Qualidade da Receita</p>
            <p className="text-[10px] text-gray-400 mb-3">Quanto do produzido já virou dinheiro</p>
            <div className="space-y-3">
              {([
                { label: 'Recebido da produção',       value: totalRecebimentoProducao,            color: '#10B981', icon: '💵' },
                { label: 'Convênio (aguarda repasse)',  value: convenioAReceber,                    color: '#8B5CF6', icon: '🧾' },
                { label: 'Particular/Pacote pendente', value: particularPendente + pacotePendente, color: '#F59E0B', icon: '⏳' },
              ] as const).map((item) => {
                const pct = producaoTotal > 0 ? Math.round((item.value / producaoTotal) * 100) : 0;
                return (
                  <div key={item.label}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-600">{item.icon} {item.label}</span>
                      <span className="text-xs font-black" style={{ color: item.color }}>{pct}%</span>
                    </div>
                    <div className="relative h-5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full flex items-center justify-end pr-2"
                        style={{ width: `${pct}%`, backgroundColor: item.color, minWidth: pct > 5 ? '1.8rem' : 0 }}
                      >
                        {pct >= 10 && <span className="text-[10px] font-black text-white">{pct}%</span>}
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">{formatCurrency(item.value)}</p>
                  </div>
                );
              })}
            </div>
            <div className={`mt-3 pt-2 border-t border-gray-100 p-2 rounded-lg text-[10px] ${convenioAReceber > caixaTotal * 0.2 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {convenioAReceber > caixaTotal * 0.2
                ? `⚠️ ${producaoTotal > 0 ? Math.round((convenioAReceber / producaoTotal) * 100) : 0}% da produção depende de repasse de convênio`
                : '✅ Boa qualidade — maior parte já convertida em caixa'}
            </div>
          </div>

          {/* CARD 3: Projeção Inteligente */}
          <div className="rounded-2xl border-2 p-4 shadow-sm" style={{ borderColor: metas?.projecao?.bateMeta ? '#10B981' : '#F59E0B', backgroundColor: metas?.projecao?.bateMeta ? '#F0FDF4' : '#FFFBEB' }}>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Projeção Esperada (Conservadora)</p>
            <p className="text-3xl font-black text-gray-900 leading-tight mb-2">{formatCurrency(metas?.projecao?.esperada ?? metas?.projecao?.final ?? 0)}</p>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3 ${metas?.projecao?.bateMeta ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
              {metas?.projecao?.bateMeta
                ? `✅ +${formatCurrency((metas?.projecao?.esperada ?? 0) - metaValor)} acima da meta`
                : `⚠️ ${formatCurrency(metaValor - (metas?.projecao?.esperada ?? 0))} abaixo da meta`}
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
                <div className={`mt-2 text-center py-1 rounded-full text-[10px] font-black ${(metas?.ritmo?.mediaDiariaAtual ?? 0) >= (metas?.configuracao?.metaDiariaNecessaria ?? 0) ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                  {(metas?.ritmo?.mediaDiariaAtual ?? 0) >= (metas?.configuracao?.metaDiariaNecessaria ?? 0)
                    ? `+${((((metas?.ritmo?.mediaDiariaAtual ?? 0) / (metas?.configuracao?.metaDiariaNecessaria ?? 1)) - 1) * 100).toFixed(0)}% acima do necessário`
                    : `${((((metas?.ritmo?.mediaDiariaAtual ?? 0) / (metas?.configuracao?.metaDiariaNecessaria ?? 1)) - 1) * 100).toFixed(0)}% abaixo do necessário`}
                </div>
              )}
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
                      <p className={`text-[11px] font-bold mt-0.5 ${isGood ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {isUp ? '↑' : '↓'} {Math.abs(diff).toFixed(1)}%
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ── DÍVIDAS DE MESES ANTERIORES ── */}
        {(() => {
          const mesMesAtual = (data?.particularPendente || 0) + (data?.pacotePendente || 0);
          const debitosMesAnterior = Math.max(0, pendentesTotal - mesMesAtual);
          if (debitosMesAnterior <= 0) return null;
          return (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <div className="flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div className="flex-1">
                  <p className="text-xs font-black text-rose-800 uppercase tracking-wide mb-1">Dívidas de Meses Anteriores</p>
                  <p className="text-xs text-rose-700">
                    Além dos <strong>{formatCurrency(mesMesAtual)}</strong> pendentes deste mês, há
                    {' '}<strong>{formatCurrency(debitosMesAnterior)}</strong> em débitos de sessões de meses anteriores ainda não quitados.
                  </p>
                  <p className="text-[11px] text-rose-600 mt-1 font-semibold">Total acumulado em aberto: {formatCurrency(pendentesTotal)}</p>
                </div>
              </div>
            </div>
          );
        })()}
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
    const totalNaoReceb   = particularPend + pacotePend + convenioAmount;
    const pctNaoReceb     = totalProducao > 0 ? Math.round((totalNaoReceb / totalProducao) * 100) : 0;

    const margemPct = indicadores?.margemPercentual ?? 0; // ← vem da API
    const margemStatus = margemPct >= 35
      ? { text: '🟢 Operação saudável', cls: 'bg-emerald-100 text-emerald-700' }
      : margemPct >= 20
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

    return (
      <div className="space-y-6">

        {/* ── 1. HERO GRID: hierarquia financeira clara ── */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Comparativo Mensal</p>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

            {/* Caixa — card principal 3/5 */}
            <div className="lg:col-span-3 rounded-2xl border-2 p-6 shadow-sm" style={{ borderColor: '#10B981', backgroundColor: '#F0FDF4' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black uppercase tracking-widest text-emerald-700">💵 Caixa Real</span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${varCaixa >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {varCaixa >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {varCaixa >= 0 ? '+' : ''}{varCaixa}% vs anterior
                </span>
              </div>
              <div className="text-5xl font-black text-gray-900 tracking-tight my-3">{formatCurrency(totalCaixa)}</div>
              <p className="text-sm text-gray-500 mb-4">
                Mês anterior: <span className="font-semibold text-gray-700">{formatCurrency(comparativos?.mesAnterior?.caixa ?? 0)}</span>
                {varCaixa < 0 && (
                  <span className="ml-2 text-rose-600 font-semibold">
                    · {formatCurrency(Math.abs(totalCaixa - (comparativos?.mesAnterior?.caixa ?? 0)))} a menos
                  </span>
                )}
              </p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Meta do mês atingida em <strong>produção</strong></span>
                  <span className="font-black text-emerald-700">{pctMetaProducao}%</span>
                </div>
                <div className="h-4 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-700 flex items-center justify-end pr-2"
                    style={{ width: `${pctMetaProducao}%` }}
                  >
                    {pctMetaProducao > 12 && <span className="text-[10px] font-black text-white">{pctMetaProducao}%</span>}
                  </div>
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>Caixa: {pctMetaCaixa}%</span>
                  <span>Meta: {formatCurrency(metaMensal)}</span>
                </div>
              </div>
            </div>

            {/* Produção + Despesas — stack 2/5 */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="flex-1 rounded-2xl border p-4 shadow-sm" style={{ borderColor: '#3B82F630', backgroundColor: '#EFF6FF' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black uppercase tracking-widest text-blue-600">🏥 Produção</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${varProducao >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {varProducao >= 0 ? '+' : ''}{varProducao}%
                  </span>
                </div>
                <div className="text-3xl font-black text-gray-900 mb-2">{formatCurrency(totalProducao)}</div>
                <div className="space-y-1 pt-2 border-t border-blue-100">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">✅ Já recebido</span>
                    <span className="font-semibold text-emerald-700">{formatCurrency(totalRecebimentoProducao)}</span>
                  </div>
                  {totalAReceberProducao > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">🕐 A receber</span>
                      <span className="font-semibold text-amber-700">{formatCurrency(totalAReceberProducao)}</span>
                    </div>
                  )}
                  {convenioAmount > 0 && (
                    <div className="flex justify-between text-xs pl-3">
                      <span className="text-gray-400">↳ 🧾 Convênio</span>
                      <span className="font-medium text-purple-600">{formatCurrency(convenioAmount)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 rounded-2xl border p-4 shadow-sm" style={{ borderColor: '#F59E0B30', backgroundColor: '#FFFBEB' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black uppercase tracking-widest text-amber-600">📊 Despesas</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${varDespesas <= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {varDespesas >= 0 ? '+' : ''}{varDespesas}%
                  </span>
                </div>
                <div className="flex items-baseline justify-between mb-2">
                  <div className="text-3xl font-black text-gray-900">{formatCurrency(expenses.total)}</div>
                  <div className="text-right">
                    <div className="text-xl font-black" style={{ color: margemPct >= 35 ? '#10B981' : margemPct >= 20 ? '#F59E0B' : '#EF4444' }}>
                      {margemPct.toFixed(1)}%
                    </div>
                    <p className="text-[10px] text-gray-400">margem</p>
                  </div>
                </div>
                {expenses.breakdown && (
                  <div className="text-[10px] text-amber-700 mb-2 space-y-0.5">
                    <p>{formatCurrency(expenses.breakdown.expenses ?? 0)} despesas · {formatCurrency(expenses.breakdown.comissoes ?? 0)} comissões</p>
                  </div>
                )}
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${margemStatus.cls}`}>
                  {margemStatus.text}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. PAINEL DE DÉBITOS — Alerta forte ── */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">🚨 Sessões sem Recebimento</p>
          <div className="rounded-2xl border-2 p-5 shadow-sm" style={{ borderColor: '#EF444440', backgroundColor: '#FFF1F2' }}>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-rose-500 mb-1">Total não recebido este mês</p>
                <div className="text-4xl font-black text-gray-900">{formatCurrency(totalNaoReceb)}</div>
              </div>
              <div className={`shrink-0 px-5 py-3 rounded-xl text-center ${pctNaoReceb >= 30 ? 'bg-rose-100' : pctNaoReceb >= 15 ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                <div className={`text-2xl font-black ${pctNaoReceb >= 30 ? 'text-rose-700' : pctNaoReceb >= 15 ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {pctNaoReceb}%
                </div>
                <p className="text-[10px] text-gray-500">da produção</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {([
                { label: 'Particular', value: particularPend, color: '#3B82F6', bg: '#EFF6FF', icon: '👤' },
                { label: 'Pacote',     value: pacotePend,     color: '#8B5CF6', bg: '#F5F3FF', icon: '📦' },
                { label: 'Convênio',   value: convenioAmount, color: '#7C3AED', bg: '#FAF5FF', icon: '🧾' },
              ] as const).map((item) => (
                <div key={item.label} className="rounded-xl p-3" style={{ backgroundColor: item.bg, borderLeft: `3px solid ${item.color}` }}>
                  <p className="text-xs text-gray-500 mb-0.5">{item.icon} {item.label}</p>
                  <p className="text-lg font-black" style={{ color: item.color }}>{formatCurrency(item.value)}</p>
                </div>
              ))}
            </div>

            <div className={`p-3 rounded-xl text-sm font-semibold mb-3 ${pctNaoReceb >= 20 ? 'bg-rose-100 text-rose-800' : 'bg-amber-50 text-amber-800'}`}>
              {pctNaoReceb >= 20
                ? `⚠️ ${pctNaoReceb}% da produção ainda não virou caixa — atenção imediata necessária.`
                : pctNaoReceb > 0
                ? `📊 ${pctNaoReceb}% da produção em aberto — acompanhe o recebimento.`
                : '✅ Toda a produção foi convertida em caixa.'}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => openDebitosModal('mes')}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors"
              >
                Ver débitos do mês
              </button>
              <button
                onClick={() => openDebitosModal('total')}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Histórico: {loadingDebitosTotal ? '…' : formatCurrency(debitosTotalValue)}
              </button>
            </div>
          </div>
        </div>

        {/* ── 3. CENTRAL DE ATENÇÃO (Risco Operacional) ── */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">⚠️ Central de Atenção</p>
          <div className={`rounded-2xl border-2 p-5 shadow-sm ${risco.bgCls}`} style={{ borderColor: risco.borderHex }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-black text-gray-800">Risco Operacional</h3>
                <p className="text-xs text-gray-500 mt-0.5">{riscoOperacional.impacto}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase bg-${risco.badge}-100 text-${risco.badge}-700`}>
                {riscoOperacional.nivel}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              {riscoOperacional.motivos.map((m, i) => (
                <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/60">
                  <AlertCircle size={15} className={`shrink-0 mt-0.5 text-${risco.badge}-500`} />
                  <span className="text-sm text-gray-700">{m}</span>
                </div>
              ))}
            </div>

            {sugestoesAuto.length > 0 && (
              <div className="border-t border-gray-200/60 pt-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Sugestões automáticas</p>
                <div className="space-y-1.5">
                  {sugestoesAuto.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-emerald-500" />
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── 4. AÇÕES EXECUTIVAS ── */}
        {acoesExecutivas.length > 0 && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">⚡ Ações Executivas</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {acoesExecutivas.map((acao, idx) => {
                const priorColor = getAcaoColor(acao.prioridade);
                return (
                  <div key={idx} className={`border-l-4 border-${priorColor}-500 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow`}>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className={`text-${priorColor}-600`}>{getAcaoIcon(acao.tipo)}</div>
                        <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full bg-${priorColor}-100 text-${priorColor}-700`}>
                          {acao.prioridade}
                        </span>
                      </div>
                      <h4 className="font-bold text-gray-800 mb-1">{acao.descricao}</h4>
                      <p className="text-sm text-gray-600 mb-2">{acao.motivo}</p>
                      {acao.impactoEstimado !== undefined && (
                        <p className="text-sm font-semibold text-gray-800">Impacto: {formatCurrency(acao.impactoEstimado)}</p>
                      )}
                      {acao.impactoRisco && (
                        <p className="text-sm font-semibold text-rose-600">Risco: {acao.impactoRisco}</p>
                      )}
                      <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Próximo passo</p>
                        <p className="text-sm font-semibold text-gray-800">{acao.acaoSugerida}</p>
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
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">🏥 Pendências de Convênio</p>
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

  const renderInsights = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-3">
            <Lightbulb size={22} /> Insights
          </h3>
          <ul className="space-y-2">
            {(insights?.insights || []).map((text, idx) => (
              <li key={idx} className="flex items-start gap-2 text-gray-700">
                <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-3">
            <AlertCircle size={22} /> Alertas
          </h3>
          {(insights?.alertas || []).length === 0 ? (
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 text-sm">
              ✅ Tudo certo — Nenhum alerta crítico no momento.
            </div>
          ) : (
            (insights?.alertas || []).map((alerta, idx) => (
              <div key={idx} className={`p-3 rounded-lg mb-2 text-sm ${
                alerta.nivel === 'alto' ? 'bg-rose-50 text-rose-800' :
                alerta.nivel === 'medio' ? 'bg-amber-50 text-amber-800' : 'bg-sky-50 text-sky-800'
              }`}>
                <p className="font-semibold">{alerta.mensagem}</p>
                <p className="text-xs mt-1">Ação: {alerta.acao}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
          <Users size={22} /> Ranking de Profissionais
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(profissionais?.ranking || []).slice(0, 5).map((prof, idx) => (
            <div key={prof.id} className="border border-gray-100 rounded-2xl p-4 bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">#{idx+1}</div>
                <h4 className="font-bold text-gray-800">{prof.nome}</h4>
              </div>
              <p className="text-sm text-gray-500">{prof.especialidade}</p>
              <hr className="my-3" />
              <div className="space-y-1 text-sm">
                <p>Realizado: <strong>{formatCurrency(prof.realizado)}</strong></p>
                <p>Produção: <strong>{formatCurrency(prof.producao)}</strong></p>
                <p>Eficiência: <strong>{prof.eficiencia}%</strong></p>
                <p>Produtividade: <strong>{prof.produtividade}%</strong></p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
          <TrendingUp size={22} /> Ranking por Lucro
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(profissionais?.rankingPorLucro || []).slice(0, 5).map((prof, idx) => (
            <div key={prof.id} className="border border-gray-100 rounded-2xl p-4 bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${prof.lucro >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>#{idx+1}</div>
                <h4 className="font-bold text-gray-800">{prof.nome}</h4>
              </div>
              <p className="text-sm text-gray-500">{prof.especialidade}</p>
              <hr className="my-3" />
              <div className="space-y-1 text-sm">
                <p>Lucro: <strong className={prof.lucro >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{formatCurrency(prof.lucro)}</strong></p>
                <p>Margem: <strong>{prof.margem}%</strong></p>
                <p>Produção: <strong>{formatCurrency(prof.producao)}</strong></p>
                <p>Comissão: <strong>{formatCurrency(prof.comissao?.total || 0)}</strong></p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {(insights?.recomendacoes || []).length > 0 && (
        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-3">Recomendações</h3>
          <ul className="space-y-2">
            {(insights?.recomendacoes || []).map((text, idx) => (
              <li key={idx} className="flex items-start gap-2 text-gray-700">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

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
          <div>
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-4">
              <Users size={22} /> Performance por Profissional
            </h3>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <div className="min-w-[800px] grid grid-cols-7 gap-3 p-4 bg-gray-50 text-sm font-bold text-gray-600 border-b">
                  <span>Profissional</span>
                  <span>Receita</span>
                  <span>Atend.</span>
                  <span>Ticket Médio</span>
                  <span>Mix Particular</span>
                  <span>Comissão</span>
                  <span>Status</span>
                </div>
                {(drillDown?.profissionais || []).map((prof) => (
                  <div key={prof.id} className="min-w-[800px] grid grid-cols-7 gap-3 p-4 border-b last:border-b-0 items-center">
                    <div>
                      <p className="font-semibold text-gray-800">{prof.nome}</p>
                      <p className="text-xs text-gray-500">{prof.especialidade}</p>
                    </div>
                    <span className="text-gray-700">{formatCurrency(prof.resumo.receita)}</span>
                    <span className="text-gray-700">{prof.resumo.atendimentos}</span>
                    <span className="text-gray-700">{formatCurrency(prof.resumo.ticketMedio)}</span>
                    <span className="text-gray-700">{prof.mix.particular.toFixed(0)}%</span>
                    <span className="text-gray-700">{formatCurrency(prof.comissao?.total || 0)}</span>
                    <span className={`inline-block w-fit px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                      prof.diagnostico.status === 'top' ? 'bg-emerald-100 text-emerald-700' :
                      prof.diagnostico.status === 'regular' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {prof.diagnostico.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const tabs = [
    { label: 'Decisão Executiva', icon: <Zap size={18} /> },
    { label: 'Visão Geral', icon: <LayoutDashboard size={18} /> },
    { label: 'Caixa', icon: <DollarSign size={18} /> },
    { label: 'Produção', icon: <Briefcase size={18} /> },
    { label: 'Despesas', icon: <Receipt size={18} /> },
    { label: 'Metas', icon: <Target size={18} /> },
    { label: 'Projeção & Cenários', icon: <TrendingUp size={18} /> },
    { label: 'Insights', icon: <Lightbulb size={18} /> },
    { label: 'Ranking', icon: <TrendingUp size={18} /> },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-5 overflow-x-auto">
        <div className="flex gap-1 p-1.5 border-b border-gray-100">
          {tabs.map((t, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
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

      <div className="mt-4">
        {activeTab === 0 && renderDecisaoExecutiva()}
        {activeTab === 1 && renderVisaoGeral()}
        {activeTab === 2 && renderCaixa()}
        {activeTab === 3 && renderProducao()}
        {activeTab === 4 && renderDespesas()}
        {activeTab === 5 && renderMetas()}
        {activeTab === 6 && (
          <React.Suspense fallback={<div className="p-8 text-center text-gray-500">Carregando projeções...</div>}>
            <ProjecaoCenarios month={month} year={year} data={data} />
          </React.Suspense>
        )}
        {activeTab === 7 && renderInsights()}
        {activeTab === 8 && renderRankingTab()}
      </div>

      {/* ── Modal de Débitos ── */}
      {debitosModalOpen && (() => {
      const isMes = debitosModalType === 'mes';
      const isLoading = isMes ? loadingDebitosMes : loadingDebitosTotal;
      const rows = isMes ? debitosMesData : debitosTotalData;
      const totalVal = isMes ? (resumo?.pendentes?.vencidos?.total || 0) : debitosTotalValue;
      const title = isMes ? `Débito do Mês — ${String(month).padStart(2,'0')}/${year}` : 'Débito Total (histórico)';

      const statusLabel: Record<string, string> = {
        pending: 'Pendente', pending_balance: 'Saldo pendente',
        unpaid: 'Não pago', partial: 'Parcial',
        pending_receipt: 'Aguard. recebimento',
      };

      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDebitosModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col mx-4" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b">
              <div className="flex items-center gap-2">
                <AlertTriangle size={20} className={isMes ? 'text-rose-500' : 'text-amber-500'} />
                <h2 className="text-lg font-bold text-gray-900">{title}</h2>
              </div>
              <button onClick={() => setDebitosModalOpen(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-auto flex-1">
              {isLoading ? (
                <div className="p-8 text-center text-gray-500">Carregando...</div>
              ) : rows.length === 0 ? (
                <div className="p-8 text-center text-emerald-600 font-medium">✅ Nenhum débito encontrado</div>
              ) : (() => {
                // 🆕 V2 FINANCIAL ENGINE: quando disponível, usa agrupamento por paciente do backend
                const v2PatientGroups = isMes ? resumo?.pendentes?.v2_financial?.byPatient : null;
                
                if (v2PatientGroups && Object.keys(v2PatientGroups).length > 0) {
                  const sortedV2Groups = Object.values(v2PatientGroups).sort((a: any, b: any) => b.total - a.total);
                  return (
                    <div className="divide-y divide-gray-100">
                      {sortedV2Groups.map((group: any) => {
                        const paciente = group.patient?.fullName || 'Desconhecido';
                        const isOpen = openPatientGroups.has(paciente);
                        const toggle = () => setOpenPatientGroups(prev => {
                          const next = new Set(prev);
                          isOpen ? next.delete(paciente) : next.add(paciente);
                          return next;
                        });
                        return (
                          <div key={group.patientId || paciente}>
                            <button
                              onClick={toggle}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left"
                            >
                              <div className="flex items-center gap-2">
                                <span className={`text-xs transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
                                <span className="font-semibold text-gray-800">{paciente}</span>
                                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{group.count} sessão(ões)</span>
                              </div>
                              <span className="font-bold text-rose-600">{formatCurrency(group.total)}</span>
                            </button>
                            {isOpen && (
                              <table className="w-full text-sm bg-gray-50">
                                <thead className="text-xs text-gray-400 uppercase">
                                  <tr>
                                    <th className="px-8 py-1 text-left font-medium">Data</th>
                                    <th className="px-4 py-1 text-left font-medium">Especialidade</th>
                                    <th className="px-4 py-1 text-left font-medium">Status</th>
                                    <th className="px-4 py-1 text-right font-medium">Valor</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {group.items.map((item: any, i: number) => {
                                    const specColor: Record<string, string> = {
                                      'Fonoaudiologia': 'bg-emerald-100 text-emerald-700',
                                      'Psicologia': 'bg-violet-100 text-violet-700',
                                      'Terapia Ocupacional': 'bg-orange-100 text-orange-700',
                                    };
                                    const sc = specColor[item.specialty] || 'bg-gray-100 text-gray-600';
                                    return (
                                      <tr key={item._id || i}>
                                        <td className="px-8 py-2 text-gray-500 w-28">
                                          {item.data ? `${new Date(item.data).toLocaleDateString('pt-BR')} ${item.time || '-'}` : '—'}
                                        </td>
                                        <td className="px-4 py-2">
                                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${sc}`}>
                                            {item.specialty || '—'}
                                          </span>
                                        </td>
                                        <td className="px-4 py-2">
                                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">
                                            {statusLabel[item.status] || item.status}
                                          </span>
                                        </td>
                                        <td className="px-4 py-2 text-right font-semibold text-gray-900">{formatCurrency(item.amount)}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
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
                  <div className="divide-y divide-gray-100">
                    {sortedGroups.map(([paciente, group]) => {
                      const isOpen = openPatientGroups.has(paciente);
                      const toggle = () => setOpenPatientGroups(prev => {
                        const next = new Set(prev);
                        isOpen ? next.delete(paciente) : next.add(paciente);
                        return next;
                      });
                      return (
                        <div key={paciente}>
                          <button
                            onClick={toggle}
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left"
                          >
                            <div className="flex items-center gap-2">
                              <span className={`text-xs transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
                              <span className="font-semibold text-gray-800">{paciente}</span>
                              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{group.items.length} sessão(ões)</span>
                            </div>
                            <span className="font-bold text-rose-600">{formatCurrency(group.total)}</span>
                          </button>
                          {isOpen && (
                            <table className="w-full text-sm bg-gray-50">
                              <tbody className="divide-y divide-gray-100">
                                {group.items.map((item, i) => {
                                  const tipoLabel: Record<string, string> = { particular: 'Particular', convenio: 'Convênio', pacote: 'Pacote', pix: 'PIX', dinheiro: 'Dinheiro', cartão: 'Cartão' };
                                  const tipoColor: Record<string, string> = { particular: 'bg-blue-100 text-blue-700', convenio: 'bg-sky-100 text-sky-700', pacote: 'bg-purple-100 text-purple-700' };
                                  const tc = tipoColor[item.tipo || ''] || 'bg-gray-100 text-gray-600';
                                  return (
                                    <tr key={item._id || i}>
                                      <td className="px-8 py-2 text-gray-500 w-28">{item.date ? `${new Date(item.date).toLocaleDateString('pt-BR')} ${item.time || '-'}` : '—'}</td>
                                      <td className="px-4 py-2">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${tc}`}>
                                          {tipoLabel[item.tipo || ''] || item.tipo || '—'}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2">
                                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">
                                          {statusLabel[item.paymentStatus] || item.paymentStatus}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2 text-right font-semibold text-gray-900">{formatCurrency(item.valor)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="p-4 border-t flex justify-between items-center">
              <span className="text-sm text-gray-500">{rows.length} sessão(ões)</span>
              <span className="font-bold text-gray-900">Total: {formatCurrency(totalVal)}</span>
            </div>
          </div>
        </div>
      );
    })()}
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
    <div className="space-y-5">
      {items.map((item, idx) => {
        const pct = total > 0 ? (item.value / total) * 100 : 0;
        return (
          <div key={idx}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${colorDot[item.color] ?? 'bg-gray-400'} shrink-0`} />
                <span className="text-sm font-medium text-gray-700">{item.label}</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{formatCurrency(item.value)}</span>
            </div>
            <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${colorBar[item.color] ?? 'bg-gray-400'} rounded-full transition-all duration-700 flex items-center justify-end`}
                style={{ width: `${Math.max(pct, 0)}%`, minWidth: pct > 0 ? '2.5rem' : 0 }}
              >
                {pct >= 8 && (
                  <span className="text-[10px] font-black text-white pr-2 leading-none">{pct.toFixed(1)}%</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardV3Tab;