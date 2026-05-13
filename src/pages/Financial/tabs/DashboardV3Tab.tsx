import { useState, useEffect, useCallback, useRef } from 'react';
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
import { useFinancialDashboardV3 } from '../../../hooks/useFinancialDashboardV3';
import { ProjecaoCenarios } from './AnaliseProjecaoTab';
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
      // 🆕 Mostrar apenas vencidos (data <= hoje) no modal de débitos do mês
      const allItems = [
        ...(resumo?.pendentes?.vencidos?.particular?.items || []).map(item => ({ ...item, _tipo: item.paymentMethod || 'particular' })),
        ...(resumo?.pendentes?.vencidos?.convenio?.items || []).map(item => ({ ...item, _tipo: 'convenio' })),
      ].map(item => ({
        _id: String(item.sessionId),
        date: String(item.data),
        time: item.hora,
        paciente: item.paciente,
        paymentStatus: item.status,
        valor: item.valor,
        tipo: (item as any)._tipo,
      }));
      setDebitosMesData(allItems);
    }
    setDebitosModalOpen(true);
  };

  const insuranceLoaded = useRef<string>('');

  // Carrega dados principais ao montar ou mudar mês/ano
  useEffect(() => {
    fetchDashboard(month, year);
    // Reseta flag de convênio para forçar re-fetch quando mês mudar
    insuranceLoaded.current = '';
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

  if (loading) return (
    <div className="p-4 space-y-5">
      {/* Sub-tabs */}
      <div className="flex gap-2 pb-2 border-b border-gray-200">
        {[{ w: 'w-20', active: true }, { w: 'w-20' }, { w: 'w-24' }, { w: 'w-16' }].map((t, i) => (
          <div key={i} className={`h-9 px-4 rounded-lg flex items-center animate-pulse ${t.active ? 'bg-emerald-100' : 'bg-gray-100'}`}>
            <div className={`h-3 rounded ${t.w} ${t.active ? 'bg-emerald-300' : 'bg-gray-300'}`} />
          </div>
        ))}
      </div>
      {/* RitmoCard hero */}
      <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="h-4 w-32 bg-emerald-200 rounded" />
            <div className="h-10 w-28 bg-emerald-300 rounded" />
            <div className="h-3 w-40 bg-emerald-200 rounded" />
          </div>
          <div className="space-y-3">
            <div className="h-3 w-28 bg-emerald-200 rounded" />
            <div className="h-3 w-full bg-emerald-200 rounded-full" />
            <div className="h-3 w-24 bg-emerald-200 rounded" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-24 bg-emerald-200 rounded" />
            <div className="h-8 w-20 bg-emerald-300 rounded" />
          </div>
        </div>
      </div>
      {/* 3 MetricCards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { bg: 'bg-emerald-50', border: 'border-emerald-200', circle: 'bg-emerald-100', txt: 'bg-emerald-200', val: 'bg-emerald-300' },
          { bg: 'bg-emerald-50', border: 'border-emerald-200', circle: 'bg-emerald-100', txt: 'bg-emerald-200', val: 'bg-emerald-300' },
          { bg: 'bg-amber-50',   border: 'border-amber-200',   circle: 'bg-amber-100',   txt: 'bg-amber-200',   val: 'bg-amber-300'   },
        ].map((c, i) => (
          <div key={i} className={`p-4 rounded-xl border ${c.border} ${c.bg} animate-pulse`}>
            <div className="flex items-center gap-3 mb-2">
              <div className={`h-10 w-10 rounded-full ${c.circle}`} />
              <div className={`h-4 w-28 rounded ${c.txt}`} />
            </div>
            <div className={`h-8 w-32 rounded mb-1 ${c.val}`} />
            <div className={`h-3 w-20 rounded ${c.txt}`} />
          </div>
        ))}
      </div>
      {/* 2-col content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-52 rounded-xl bg-gray-50 border border-gray-200 animate-pulse" />
        <div className="h-52 rounded-xl bg-gray-50 border border-gray-200 animate-pulse" />
      </div>
    </div>
  );
  if (error) return <div className="p-4 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">{error}</div>;
  if (!data || !resumo) return <div className="p-4 rounded-lg bg-sky-50 text-sky-700 border border-sky-200">Nenhum dado disponível</div>;

  const { cash, revenue, expenses, metas, profissionais, insights, comparativos, riscoOperacional, acoesExecutivas, drillDown, indicadores } = data;
  const totalCaixa = cash.total;
  const totalProducao = revenue.total;

  // 🎯 RITMO OPERACIONAL — card herói
  const RitmoCard = () => {
    const pctEsperado = metas.ritmo.percentualEsperado;
    const pctRealizado = metas.ritmo.percentualRealizado;
    const diff = pctRealizado - pctEsperado;
    const isAtrasado = diff < 0;
    const bgClass = getMetaBg(metas.statusMeta);
    const progressColor = 
      metas.statusMeta === 'verde' ? 'bg-emerald-500' :
      metas.statusMeta === 'amarelo-verde' ? 'bg-amber-500' :
      metas.statusMeta === 'amarelo' ? 'bg-amber-500' : 'bg-rose-500';

    return (
      <div className={`p-4 md:p-6 rounded-2xl mb-6 border ${bgClass} border-gray-200 shadow-sm`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <div className="md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">RITMO OPERACIONAL REAL</span>
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
                <span>Realizado</span>
                <span>Meta mensal</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <MetricRow label="Esperado até hoje" value={formatCurrency(metas.ritmo.esperadoAteAgora)} />
            <MetricRow label="Realizado" value={formatCurrency(metas.ritmo.realizadoAteAgora)} />
            <MetricRow
              label="Diferença"
              value={formatCurrency(metas.ritmo.diferenca)}
              valueColor={metas.ritmo.diferenca >= 0 ? 'text-emerald-600' : 'text-rose-600'}
            />
            <MetricRow label="Gap diário necessário" value={formatCurrency(metas.gap.porDia)} />
          </div>
        </div>
      </div>
    );
  };

  const renderVisaoGeral = () => (
    <div>
      <RitmoCard />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <MetricCard title="Caixa" value={formatCurrency(totalCaixa)} icon={<DollarSign size={20} />} color="emerald" />
        <MetricCard title="Produção" value={formatCurrency(totalProducao)} icon={<Briefcase size={20} />} color="blue" />
        <MetricCard title="Despesas Totais" subtitle="Inclui comissões" value={formatCurrency(expenses.total)} icon={<Receipt size={20} />} color="rose" />
        <MetricCard title="Lucro" value={formatCurrency(indicadores?.lucro ?? totalCaixa - expenses.total)} icon={<TrendingUp size={20} />} color={(indicadores?.lucro ?? totalCaixa - expenses.total) >= 0 ? 'emerald' : 'rose'} />
        <MetricCard
          title="Débitos do Mês"
          subtitle="Sessões vencidas não pagas — clique para ver"
          value={formatCurrency(resumo?.pendentes?.vencidos?.total || 0)}
          icon={<AlertTriangle size={20} />}
          color="amber"
          onClick={() => openDebitosModal('mes')}
        />
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
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-3">Projeção de Fechamento</h3>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${metas.projecao.bateMeta ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
              {metas.projecao.bateMeta ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
            </div>
            <div>
              <span className="text-2xl font-bold text-gray-900">{formatCurrency(metas.projecao.final)}</span>
              <p className="text-sm text-gray-500">vs meta de {formatCurrency(metas.configuracao.metaMensal)}</p>
            </div>
          </div>
          <div className={`p-3 rounded-lg ${metas.projecao.bateMeta ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'} text-sm`}>
            {metas.projecao.bateMeta
              ? '✅ Projeção indica que a meta será atingida.'
              : `⚠️ Faltam ${formatCurrency(metas.gap.valor)} para bater a meta com ${metas.gap.diasRestantes} dias restantes.`}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-3">Resumo do Dia</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Caixa hoje</p>
              <span className="text-2xl font-bold text-gray-900">{formatCurrency(metas.realizado.hoje)}</span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Meta diária</p>
              <span className="text-2xl font-bold text-gray-900">{formatCurrency(metas.configuracao.metaDiariaNecessaria)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCaixa = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Por Tipo</h3>
          <BreakdownList items={[
            { label: 'Particular', value: cash.breakdown.particular, color: 'blue' },
            { label: 'Pacote', value: cash.breakdown.pacote, color: 'purple' },
            { label: 'Convênio', value: cash.breakdown.convenio, color: 'sky' },
            { label: 'Liminar', value: cash.breakdown.liminar, color: 'amber' },
          ]} total={totalCaixa} />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Por Método</h3>
          <BreakdownList items={[
            { label: 'Dinheiro', value: cash.byMethod.dinheiro, color: 'emerald' },
            { label: 'Cartão', value: cash.byMethod.cartao, color: 'blue' },
            { label: 'PIX', value: cash.byMethod.pix, color: 'sky' },
            { label: 'Outros', value: cash.byMethod.outros, color: 'gray' },
          ]} total={totalCaixa} />
        </div>
      </div>

      {/* 🆕 DETALHAMENTO DE PACOTES NO CAIXA */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
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
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Por Tipo</h3>
        <BreakdownList items={[
          { label: 'Particular', value: revenue.byMethod.particular, color: 'blue' },
          { label: 'Pacote', value: revenue.byMethod.pacote, color: 'purple' },
          { label: 'Convênio', value: revenue.byMethod.convenio, color: 'sky' },
          { label: 'Liminar', value: revenue.byMethod.liminar, color: 'amber' },
        ]} total={totalProducao} />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Recebido vs Pendente</h3>
        <div className="mb-5">
          <p className="text-sm text-gray-500">Recebido</p>
          <span className="text-3xl font-bold text-emerald-600">{formatCurrency(revenue.byMethod.recebido)}</span>
        </div>
        <div>
          <p className="text-sm text-gray-500">Pendente</p>
          <span className="text-3xl font-bold text-rose-600">{formatCurrency(revenue.byMethod.pendente)}</span>
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
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Comissões por Profissional</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {expenses.breakdown.detalheComissoes.map((c) => (
                <div key={c.doctorId} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
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

  const renderMetas = () => (
    <div>
      {indicadores && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <MetricCard
            title="Lucro"
            value={formatCurrency(indicadores.lucro)}
            icon={<TrendingUp size={20} />}
            color={indicadores.statusLucro === 'positivo' ? 'emerald' : 'rose'}
          />
          <MetricCard
            title="Margem"
            value={`${indicadores.margemPercentual}%`}
            icon={<TrendingUp size={20} />}
            color={indicadores.statusMargem === 'bom' ? 'emerald' : indicadores.statusMargem === 'atencao' ? 'amber' : 'rose'}
          />
          <MetricCard
            title="Ponto de Equilíbrio"
            value={indicadores.pontoEquilibrio === 0 ? 'Alcançado' : formatCurrency(indicadores.pontoEquilibrio)}
            icon={<Target size={20} />}
            color={indicadores.pontoEquilibrio === 0 ? 'emerald' : 'amber'}
          />
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-3">Status da Meta</h3>
          <div className="flex items-center gap-3 mb-4">
            <span className={`px-3 py-1 rounded-full text-sm font-bold uppercase ${
              metas.statusMeta === 'verde' ? 'bg-emerald-100 text-emerald-700' :
              metas.statusMeta === 'amarelo-verde' ? 'bg-amber-100 text-amber-700' :
              metas.statusMeta === 'amarelo' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {metas.statusMeta.replace('-', ' ')}
            </span>
            <span className="text-gray-600">{metas.ritmo.percentualRealizado.toFixed(1)}% realizado · {metas.ritmo.percentualEsperado.toFixed(1)}% esperado</span>
          </div>
          <hr className="my-4" />
          <div className="space-y-3">
            <MetricRow label="Meta mensal" value={formatCurrency(metas.configuracao.metaMensal)} />
            <MetricRow label="Realizado" value={formatCurrency(metas.realizado.mes)} />
            <MetricRow label="Projeção final" value={formatCurrency(metas.projecao.final)} />
            <MetricRow label="Falta para meta" value={formatCurrency(metas.gap.valor)} valueColor="text-rose-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-lg font-bold text-gray-800">Metas por Tipo de Receita</h3>
          </div>
          <p className="text-xs text-gray-500 mb-4">Formato: <span className="font-medium text-gray-700">Realizado / Meta</span></p>
          {Object.entries(metas.porTipo).map(([tipo, dados]) => {
            const pctMeta = dados.meta > 0 ? Math.min((dados.realizado / dados.meta) * 100, 100) : 0;
            const progressColor = pctMeta >= 80 ? 'bg-emerald-500' : pctMeta >= 50 ? 'bg-amber-500' : 'bg-rose-500';
            const temMeta = dados.meta > 0;
            return (
              <div key={tipo} className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-semibold capitalize text-gray-700">{tipo}</span>
                  <span className="text-gray-500">
                    {temMeta
                      ? `${formatCurrency(dados.realizado)} / ${formatCurrency(dados.meta)}`
                      : `${formatCurrency(dados.realizado)} · sem meta definida`}
                  </span>
                </div>
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full ${progressColor} rounded-full`} style={{ width: `${pctMeta}%` }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {temMeta ? `${pctMeta.toFixed(1)}% da meta · ` : ''}
                  {dados.percentualDoTotal}% do caixa total
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderDecisaoExecutiva = () => {
    const getRiscoColor = (nivel: string) => {
      switch (nivel) {
        case 'alto': return { badge: 'rose', bg: 'bg-rose-50' };
        case 'medio': return { badge: 'amber', bg: 'bg-amber-50' };
        default: return { badge: 'emerald', bg: 'bg-emerald-50' };
      }
    };
    const risco = getRiscoColor(riscoOperacional.nivel);

    const getAcaoIcon = (tipo: string) => {
      if (tipo.includes('particular')) return <DollarSign size={18} />;
      if (tipo.includes('convenio')) return <Briefcase size={18} />;
      if (tipo.includes('agenda')) return <Calendar size={18} />;
      if (tipo.includes('profissional')) return <Users size={18} />;
      return <Zap size={18} />;
    };

    const getAcaoColor = (prioridade: string) => {
      switch (prioridade) {
        case 'alta': return 'rose';
        case 'media': return 'amber';
        default: return 'emerald';
      }
    };

    const getProfStatusColor = (status: string) => {
      switch (status) {
        case 'top': return 'emerald';
        case 'regular': return 'amber';
        default: return 'rose';
      }
    };

    return (
      <div className="space-y-8">
        {/* Risco Operacional */}
        <div className={`p-5 rounded-xl border ${risco.bg} border-gray-200 shadow-sm`}>
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle size={28} className={`text-${risco.badge}-600`} />
            <div>
              <h3 className="text-lg font-bold text-gray-800">Risco Operacional</h3>
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold uppercase bg-${risco.badge}-100 text-${risco.badge}-700`}>
                {riscoOperacional.nivel}
              </span>
            </div>
          </div>
          <ul className="space-y-1 mb-3">
            {riscoOperacional.motivos.map((m, i) => (
              <li key={i} className="flex items-start gap-2 text-gray-700">
                <ArrowUpRight size={16} className="mt-0.5 text-gray-400" />
                <span>{m}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-gray-600"><strong>Impacto esperado:</strong> {riscoOperacional.impacto}</p>
        </div>

        {/* Ações Executivas */}
        <div>
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-4">
            <Zap size={22} /> Ações Executivas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {acoesExecutivas.map((acao, idx) => {
              const priorColor = getAcaoColor(acao.prioridade);
              return (
                <div key={idx} className={`border-l-4 border-${priorColor}-500 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden`}>
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
                      <p className="text-sm font-semibold text-gray-800 mt-2">Impacto estimado: {formatCurrency(acao.impactoEstimado)}</p>
                    )}
                    {acao.impactoRisco && (
                      <p className="text-sm font-semibold text-rose-600 mt-1">Risco: {acao.impactoRisco}</p>
                    )}
                    <div className="mt-3 p-2 bg-gray-50 rounded-md">
                      <p className="text-xs text-gray-500">Ação sugerida</p>
                      <p className="text-sm font-semibold text-gray-800">{acao.acaoSugerida}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 🔴 Débitos de sessões */}
        <div>
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-4">
            <AlertTriangle size={22} className="text-rose-500" /> Débitos de Sessões
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => openDebitosModal('mes')}
              className="text-left p-5 bg-white rounded-xl border border-rose-200 shadow-sm hover:shadow-md hover:border-rose-400 transition-all"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-500 mb-1">Débito do Mês</p>
              <p className="text-3xl font-extrabold text-gray-900">{formatCurrency(resumo?.pendentes?.vencidos?.total || 0)}</p>
              <p className="text-sm text-gray-500 mt-1">Sessões realizadas sem pagamento este mês → clique para ver</p>
            </button>
            <button
              onClick={() => openDebitosModal('total')}
              className="text-left p-5 bg-white rounded-xl border border-amber-200 shadow-sm hover:shadow-md hover:border-amber-400 transition-all"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-1">Débito Total (histórico)</p>
              <p className="text-3xl font-extrabold text-gray-900">
                {loadingDebitosTotal ? '...' : formatCurrency(debitosTotalValue)}
              </p>
              <p className="text-sm text-gray-500 mt-1">Todas as sessões realizadas em aberto → clique para ver</p>
            </button>
          </div>
        </div>

        {/* 🆕 B: Pendências de Convênio */}
        <div>
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-4">
            <Briefcase size={22} /> Pendências de Convênio
          </h3>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {loadingInsurance ? (
              <div className="p-6 text-center text-gray-500">Carregando...</div>
            ) : pendingInsurance.length === 0 ? (
              <div className="p-6 text-center text-emerald-600 font-medium">
                ✅ Nenhum convênio pendente de faturamento
              </div>
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
                      paymentDate: pay.paymentDate
                    }))
                  )
                ).slice(0, 5).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-gray-50"
                  >
                    <div>
                      <p className="font-semibold text-gray-800">{item.patientName}</p>
                      <p className="text-sm text-gray-500">
                        {item.provider} • {new Date(item.paymentDate).toLocaleDateString('pt-BR')} • {' '}
                        <span className="font-medium text-gray-700">{formatCurrency(item.grossAmount)}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.status === 'pending_billing' && (
                        <button
                          onClick={() => handleBillInsurance(item.sessionId)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 text-sm font-medium border border-amber-200"
                        >
                          <Send size={14} /> Faturar
                        </button>
                      )}
                      {item.status === 'billed' && (
                        <button
                          onClick={() => handleReceiveInsurance(item.sessionId, item.grossAmount)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-sm font-medium border border-emerald-200"
                        >
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

        {/* Comparativos Mensais */}
        <div>
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-4">
            <TrendingUp size={22} /> Comparativos Mensais
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { label: 'Caixa', atual: comparativos.mesAtual.caixa, anterior: comparativos.mesAnterior.caixa, var: comparativos.variacao.caixa },
              { label: 'Produção', atual: comparativos.mesAtual.producao, anterior: comparativos.mesAnterior.producao, var: comparativos.variacao.producao },
              { label: 'Despesas', atual: comparativos.mesAtual.despesas, anterior: comparativos.mesAnterior.despesas, var: comparativos.variacao.despesas },
            ].map((item, i) => {
              const isPositivo = item.var > 0;
              const isDespesa = item.label === 'Despesas';
              const corVar = isDespesa ? (isPositivo ? 'text-rose-600' : 'text-emerald-600') : (isPositivo ? 'text-emerald-600' : 'text-rose-600');
              return (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <p className="text-sm text-gray-500">{item.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(item.atual)}</p>
                  <div className="flex items-center gap-1 mt-2">
                    {isPositivo ? <TrendingUp size={16} className={corVar} /> : <TrendingDown size={16} className={corVar} />}
                    <span className={`text-sm font-semibold ${corVar}`}>{isPositivo ? '+' : ''}{item.var}% vs mês anterior</span>
                  </div>
                  <p className="text-xs text-gray-400">Anterior: {formatCurrency(item.anterior)}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Drill-down Profissionais */}
        <div>
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-4">
            <Users size={22} /> Performance por Profissional
          </h3>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
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
              {drillDown.profissionais.map((prof) => (
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
      </div>
    );
  };

  const renderInsights = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-3">
            <Lightbulb size={22} /> Insights
          </h3>
          <ul className="space-y-2">
            {insights.insights.map((text, idx) => (
              <li key={idx} className="flex items-start gap-2 text-gray-700">
                <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-3">
            <AlertCircle size={22} /> Alertas
          </h3>
          {insights.alertas.length === 0 ? (
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 text-sm">
              ✅ Tudo certo — Nenhum alerta crítico no momento.
            </div>
          ) : (
            insights.alertas.map((alerta, idx) => (
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

      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
          <Users size={22} /> Ranking de Profissionais
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {profissionais.ranking.slice(0, 5).map((prof, idx) => (
            <div key={prof.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
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

      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
          <TrendingUp size={22} /> Ranking por Lucro
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {profissionais.rankingPorLucro?.slice(0, 5).map((prof, idx) => (
            <div key={prof.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
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

      {insights.recomendacoes.length > 0 && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-3">Recomendações</h3>
          <ul className="space-y-2">
            {insights.recomendacoes.map((text, idx) => (
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
    ];

    return (
      <div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-5 overflow-x-auto">
          <div className="flex gap-1 p-1 border-b">
            {subTabs.map((t, i) => (
              <button
                key={i}
                onClick={() => setRankingSubTab(i)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  rankingSubTab === i
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
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
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-5 overflow-x-auto">
        <div className="flex gap-1 p-1 border-b">
          {tabs.map((t, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === i
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
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
        {activeTab === 6 && <ProjecaoCenarios month={month} year={year} />}
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
const MetricCard = ({ title, subtitle, value, icon, color, onClick }: { title: string; subtitle?: string; value: string; icon: React.ReactNode; color: string; onClick?: () => void }) => {
  const colorMap: Record<string, string> = {
    emerald: 'border-emerald-500 text-emerald-600',
    blue: 'border-blue-500 text-blue-600',
    rose: 'border-rose-500 text-rose-600',
    sky: 'border-sky-500 text-sky-600',
    amber: 'border-amber-500 text-amber-600',
    purple: 'border-purple-500 text-purple-600',
    gray: 'border-gray-500 text-gray-600',
  };
  return (
    <div
      className={`bg-white rounded-xl border-l-4 ${colorMap[color]} border border-gray-200 p-4 shadow-sm h-full ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className={`flex items-center gap-2 mb-1 ${colorMap[color]}`}>
        {icon}
        <span className="text-sm text-gray-500">{title}</span>
        {onClick && <span className="ml-auto text-xs opacity-50">↗</span>}
      </div>
      <span className="text-2xl font-bold text-gray-900">{value}</span>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
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
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    sky: 'bg-sky-500',
    amber: 'bg-amber-500',
    emerald: 'bg-emerald-500',
    gray: 'bg-gray-500',
  };
  return (
    <div className="space-y-4">
      {items.map((item, idx) => {
        const pct = total > 0 ? (item.value / total) * 100 : 0;
        return (
          <div key={idx}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700">{item.label}</span>
              <span className="font-semibold text-gray-900">{formatCurrency(item.value)}</span>
            </div>
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full ${colorBar[item.color]} rounded-full`} style={{ width: `${pct}%` }}></div>
            </div>
            <p className="text-xs text-gray-400 mt-1">{pct.toFixed(1)}%</p>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardV3Tab;