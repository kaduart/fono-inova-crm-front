import {
  Add,
  CalendarToday,
  CheckCircle,
  Delete,
  Edit,
  Refresh,
  Schedule,
  TrendingUp,
  Warning,
  Timeline,
} from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  Collapse,
} from '@mui/material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useRef, useState, useMemo } from 'react';
import { usePlanning } from '../../../hooks/usePlanning';
import { useFinancialDashboard } from '../../../hooks/useFinancialDashboard';
import { planningService } from '../../../services/planningService';
import AnnualGoals from './AnnualGoals';
import { Chip as FinChip, KpiStrip, Pill } from '../components/finUi';
import { toast } from '../../../utils/toast';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { CurrencyInput } from '../../../components/ui/MaskedInput';
import { SPECIALTY_OPTIONS, getSpecialtyLabel } from '../../../constants/specialties';

interface PlanningFormData {
  type: 'daily' | 'weekly' | 'monthly';
  month: number;
  year: number;
  targets: {
    expectedRevenue: number;
    totalSessions: number;
    workHours: number;
    averageTicket: number;
    commercialTicket: number;
  };
  bySpecialty: Array<{
    specialty: string;
    sessions: number;
    revenue: number;
  }>;
  notes: string;
}

// Configuração de status
//
// 🐛 FIX (2026-09-17): const de nível de módulo referenciando ícones do
// lucide-react no carregamento do módulo — mesmo bug real de TDZ entre
// chunks confirmado via sourcemap em appointmentDetailModal.tsx (build de
// produção). Corrigido: construção preguiçosa, só no primeiro uso em função.
let _planningStatusConfigCache: Record<string, { color: string; bgColor: string; label: string; icon: any }> | null = null;
function getPlanningStatusConfigMap() {
  if (!_planningStatusConfigCache) {
    _planningStatusConfigCache = {
      achieved: { color: '#10B981', bgColor: '#10B98110', label: 'Atingido', icon: CheckCircle },
      on_track: { color: '#3B82F6', bgColor: '#3B82F610', label: 'No caminho', icon: TrendingUp },
      at_risk: { color: '#F59E0B', bgColor: '#F59E0B10', label: 'Em risco', icon: Warning },
      behind: { color: '#EF4444', bgColor: '#EF444410', label: 'Atrasado', icon: Warning }
    };
  }
  return _planningStatusConfigCache;
}

interface PlanningTabProps {
  month: number;
  year: number;
}

const PlanningTab = ({ month, year }: PlanningTabProps) => {
  const { plannings, projection, fetchPlannings, createPlanning, updatePlanning, deletePlanning, refreshAllPlannings, autoGeneratePlanning, recalculateFutureTargets, loading } = usePlanning();
  const { data: dashData, fetchDashboard } = useFinancialDashboard();
  const dashFetched = useRef('');

  const [openModal, setOpenModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  
  const [selectedTab, setSelectedTab] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  
  const getMonthKey = (m: number, y: number) => `${y}-${m}`;
  const getCurrentMonthKey = () => getMonthKey(new Date().getMonth() + 1, new Date().getFullYear());
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(getMonthKey(month, year));

  useEffect(() => {
    setSelectedMonthKey(getMonthKey(month, year));
  }, [month, year]);
  
  const [formData, setFormData] = useState<PlanningFormData>({
    type: 'monthly',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    targets: {
      expectedRevenue: 0,
      totalSessions: 0,
      workHours: 0,
      averageTicket: 0,
      commercialTicket: 0
    },
    bySpecialty: [],
    notes: ''
  });

  const [newSpecialty, setNewSpecialty] = useState({ specialty: '', sessions: 0, revenue: 0 });
  const [selectedPlanning, setSelectedPlanning] = useState<any>(null);
  const [openDetailsModal, setOpenDetailsModal] = useState(false);
  const [editingPlanning, setEditingPlanning] = useState<any>(null);
  const [deletingPlanning, setDeletingPlanning] = useState<any>(null);

  // Gerar meses para navegação (mês selecionado + 2 anteriores)
  const monthPeriod = (y: number, m: number) => {
    const mm = String(m).padStart(2, '0');
    const lastDay = new Date(y, m, 0).getDate();
    return { start: `${y}-${mm}-01`, end: `${y}-${mm}-${String(lastDay).padStart(2, '0')}` };
  };

  const getPlanningMonthYear = (planning: any) => {
    const startStr = planning.period.start;
    if (typeof startStr === 'string' && startStr.includes('-')) {
      const parts = startStr.split('-');
      if (parts.length >= 2) {
        return { 
          year: parseInt(parts[0], 10), 
          month: parseInt(parts[1], 10) 
        };
      }
    }
    const startDate = new Date(startStr);
    return { month: startDate.getMonth() + 1, year: startDate.getFullYear() };
  };

  const selectedMonthData = useMemo(() => {
    const [year, month] = selectedMonthKey.split('-').map(Number);
    return { year, month };
  }, [selectedMonthKey]);

  const planningsOfSelectedMonth = useMemo(() => {
    return plannings.filter(p => {
      const { month, year } = getPlanningMonthYear(p);
      return month === selectedMonthData.month && year === selectedMonthData.year;
    });
  }, [plannings, selectedMonthData]);

  const monthlyOfMonth = planningsOfSelectedMonth.find(p => p.type === 'monthly');
  const weeklyOfMonth = planningsOfSelectedMonth
    .filter(p => p.type === 'weekly')
    .sort((a, b) => new Date(a.period.start).getTime() - new Date(b.period.start).getTime());
  const dailyOfMonth = planningsOfSelectedMonth
    .filter(p => p.type === 'daily')
    .sort((a, b) => new Date(a.period.start).getTime() - new Date(b.period.start).getTime());

  // 📊 PAINEL COMERCIAL ESTRATÉGICO
  const strategic = useMemo(() => {
    const revenueGoal = monthlyOfMonth?.targets?.expectedRevenue || 0;
    const committedRevenue = projection?.projectedRevenue || 0;
    const recurringRevenue = projection?.recurringRevenue || 0;
    const newRevenue = projection?.newRevenue || 0;
    const gap = Math.max(0, revenueGoal - committedRevenue);
    const averageTicket = monthlyOfMonth?.targets?.averageTicket || 0;
    const commercialTicket = monthlyOfMonth?.targets?.commercialTicket || 0;
    // 🎯 Usa ticket comercial (pacote/fechamento) para calcular pacientes necessários
    // Se não definido, fallback para ticket por sessão (compatibilidade com dados antigos)
    const ticketForPatients = commercialTicket > 0 ? commercialTicket : averageTicket;
    const patientsNeeded = (gap > 0 && ticketForPatients > 0) ? Math.ceil(gap / ticketForPatients) : 0;

    // Meta semanal necessária
    const today = new Date();
    const lastDayOfMonth = new Date(selectedMonthData.year, selectedMonthData.month, 0);
    const isPastMonth = lastDayOfMonth < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const isCurrentOrFuture = !isPastMonth;
    const daysRemaining = isCurrentOrFuture
      ? Math.max(0, Math.ceil((lastDayOfMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;
    const weeksRemaining = isCurrentOrFuture ? Math.max(1, Math.ceil(daysRemaining / 7)) : 0;
    const weeklyTarget = (patientsNeeded > 0 && weeksRemaining > 0) ? Math.ceil(patientsNeeded / weeksRemaining) : 0;
    const coveragePct = revenueGoal > 0 ? Math.min(100, (committedRevenue / revenueGoal) * 100) : 0;
    const recurringPct = revenueGoal > 0 ? Math.min(100, (recurringRevenue / revenueGoal) * 100) : 0;
    const newPct = revenueGoal > 0 ? Math.min(100, (newRevenue / revenueGoal) * 100) : 0;

    return { revenueGoal, committedRevenue, recurringRevenue, newRevenue, gap, averageTicket, commercialTicket, ticketForPatients, patientsNeeded, weeksRemaining, weeklyTarget, coveragePct, recurringPct, newPct };
  }, [monthlyOfMonth, projection, selectedMonthData]);

  // Recarrega só o mês aberto (metas + projeção). Antes recarregava todo o histórico sem projeção
  // e o painel ficava zerado até trocar de mês.
  // Recarrega a visão de 12 meses depois de criar, editar ou excluir meta.
  const [annualReload, setAnnualReload] = useState(0);
  const reloadSelectedMonth = () => {
    setAnnualReload(n => n + 1);
    const { year, month } = selectedMonthData;
    fetchPlannings({ month, year });
    fetchDashboard(month, year);
  };

  // O modal lê /planning/:id/details (pagamentos, pacientes e pacotes do período).
  // Antes mostrava o painel do mês inteiro e ficava sem pacientes e pacotes.
  const handleViewDetails = async (planning: any) => {
    setSelectedPlanning(planning);
    setOpenDetailsModal(true);
    try {
      const res = await planningService.getDetails(planning._id);
      if (res?.data) setSelectedPlanning((cur: any) => (cur?._id === planning._id ? { ...cur, ...res.data, actual: { ...cur.actual, ...res.data.actual } } : cur));
    } catch {
      toast.error('Não foi possível carregar os detalhes do período');
    }
  };

  const handleEdit = (planning: any) => {
    setEditingPlanning(planning);
    setFormData({
      type: planning.type,
      // period.start vem como 'YYYY-MM-DD'; new Date() leria em UTC e abriria o mês anterior.
      ...getPlanningMonthYear(planning),
      targets: {
        expectedRevenue: planning.targets?.expectedRevenue || 0,
        totalSessions: planning.targets?.totalSessions || 0,
        workHours: planning.targets?.workHours || 0,
        averageTicket: planning.targets?.averageTicket || 0,
        commercialTicket: planning.targets?.commercialTicket || 0
      },
      // O back guarda targetSessions/targetRevenue (e devolve sessions/revenue como atalho).
      bySpecialty: (planning.bySpecialty || []).map((s: { specialty: string; sessions?: number; revenue?: number; targetSessions?: number; targetRevenue?: number }) => ({
        specialty: s.specialty,
        sessions: s.sessions ?? s.targetSessions ?? 0,
        revenue: s.revenue ?? s.targetRevenue ?? 0,
      })),
      notes: planning.notes || ''
    });
    setOpenEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingPlanning) return;
    
    const updateData = {
      type: formData.type,
      period: monthPeriod(formData.year, formData.month),
      targets: formData.targets,
      bySpecialty: formData.bySpecialty,
      notes: formData.notes
    };

    await updatePlanning(editingPlanning._id, updateData);
    setOpenEditModal(false);
    setEditingPlanning(null);
    reloadSelectedMonth();
  };

  const handleDeleteClick = (planning: any) => {
    setDeletingPlanning(planning);
    setOpenDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingPlanning) return;
    await deletePlanning(deletingPlanning._id);
    setOpenDeleteModal(false);
    setDeletingPlanning(null);
    reloadSelectedMonth();
  };

  useEffect(() => {
    const { year, month } = selectedMonthData;
    const key = `${month}-${year}`;
    if (dashFetched.current === key) return;
    dashFetched.current = key;
    fetchPlannings({ month, year });
    fetchDashboard(month, year);
  }, [selectedMonthData, fetchPlannings, fetchDashboard]);

  const handleOpenModal = () => {
    setFormData({
      type: 'monthly',
      month: selectedMonthData.month,
      year: selectedMonthData.year,
      targets: {
        expectedRevenue: 0,
        totalSessions: 0,
        workHours: 0,
        averageTicket: 0,
        commercialTicket: 0
      },
      bySpecialty: [],
      notes: ''
    });
    setOpenModal(true);
  };

  const handleAddSpecialty = () => {
    if (newSpecialty.specialty && newSpecialty.sessions > 0) {
      setFormData(prev => ({
        ...prev,
        bySpecialty: [...prev.bySpecialty, newSpecialty]
      }));
      setNewSpecialty({ specialty: '', sessions: 0, revenue: 0 });
    }
  };

  const handleSave = async () => {
    if (formData.type === 'weekly') {
      await planningService.generateWeeklyForMonth({
        month: formData.month,
        year: formData.year,
        monthlyRevenue: formData.targets.expectedRevenue,
        totalSessions: formData.targets.totalSessions,
        workHours: formData.targets.workHours,
        averageTicket: formData.targets.averageTicket
      });
      toast.success('Semanas do mês geradas com sucesso!');
    } else if (formData.type === 'monthly') {
      await autoGeneratePlanning({
        month: formData.month,
        year: formData.year,
        targets: {
          expectedRevenue: formData.targets.expectedRevenue,
          totalSessions: formData.targets.totalSessions,
          workHours: formData.targets.workHours,
          averageTicket: formData.targets.averageTicket,
          commercialTicket: formData.targets.commercialTicket
        },
        bySpecialty: formData.bySpecialty,
        notes: formData.notes
      });
    } else {
      await createPlanning(formData);
    }
    setOpenModal(false);
    reloadSelectedMonth();
  };

  // Number(): valores podem chegar como texto do back/inputs ("2200.00"); sempre formata em pt-BR.
  const formatCurrency = (value: number | string | null | undefined) =>
    (Number(value) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const getStatusConfig = (status: string) => {
    const map = getPlanningStatusConfigMap();
    return map[status] || map.behind;
  };

  const toggleCard = (id: string) => {
    setExpandedCards(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const totalSpecialtySessions = formData.bySpecialty.reduce((sum, s) => sum + (Number(s.sessions) || 0), 0);
  const totalSpecialtyRevenue = formData.bySpecialty.reduce((sum, s) => sum + (Number(s.revenue) || 0), 0);

  const isCurrentMonth = selectedMonthKey === getCurrentMonthKey();
  const selectedMonthLabel = format(new Date(selectedMonthData.year, selectedMonthData.month - 1, 1), 'MMMM/yyyy', { locale: ptBR }).toUpperCase();

  if (loading && plannings.length === 0) {
    return (
      <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
        <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'grey.200', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Skeleton variant="circular" width={44} height={44} sx={{ bgcolor: '#05966915' }} />
            <Box>
              <Skeleton variant="text" width={180} height={28} />
              <Skeleton variant="text" width={260} height={20} />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Skeleton variant="circular" width={32} height={32} />
            <Skeleton variant="rounded" width={110} height={36} />
          </Box>
        </Paper>
        <Paper elevation={0} sx={{ p: 1.5, mb: 3, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
          <Skeleton variant="text" width={120} height={20} sx={{ mb: 1 }} />
          <Box sx={{ display: 'flex', gap: 1 }}>
            {[1, 2, 3].map(i => <Skeleton key={i} variant="rounded" width={120} height={40} />)}
          </Box>
        </Paper>
        <Grid container spacing={2}>
          {['#059669', '#10B981', '#34D399', '#F59E0B', '#3B82F6'].map((color, i) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Skeleton variant="circular" width={36} height={36} sx={{ bgcolor: `color-mix(in srgb, ${color} 8%, transparent)` }} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" width="60%" />
                      <Skeleton variant="text" width="75%" height={30} />
                      <Skeleton variant="text" width="45%" />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
      {/* Ações (o título já está no cartão do topo do Financeiro) */}
      <div className="mb-3 flex items-center justify-end gap-2">
        <button
          onClick={async () => { await refreshAllPlannings(); setAnnualReload(n => n + 1); }}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
          title="Atualizar dados reais"
          aria-label="Atualizar dados reais"
        >
          <Refresh fontSize="small" />
        </button>
        <button
          onClick={handleOpenModal}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
        >
          <Add fontSize="small" /> Nova meta
        </button>
      </div>

      {/* Metas do ano: 12 meses lado a lado; clicar num mês abre o detalhe dele abaixo */}
      <AnnualGoals
        year={selectedMonthData.year}
        selectedMonth={selectedMonthData.month}
        onSelect={(m) => setSelectedMonthKey(getMonthKey(m, selectedMonthData.year))}
        reloadKey={annualReload}
      />

      {/* Mês selecionado: mesmo padrão de Indicadores (KpiStrip + painéis). Nada foi retirado:
          meta, produção, caixa, sessões, horas, cobertura, base × nova, gap, pacientes,
          meta semanal e composição da agenda seguem aqui, só reorganizados. */}
      {monthlyOfMonth && (() => {
        const meta = monthlyOfMonth?.targets?.expectedRevenue || 0;
        const producao = dashData?.resumo?.novaReceitaMes?.total ?? dashData?.novaReceitaMes?.total ?? dashData?.data?.resultadoEconomico ?? dashData?.resumo?.producao ?? monthlyOfMonth?.actual?.actualRevenue ?? 0;
        const pct = (v: number, t: number) => (t > 0 ? Math.min(100, (v / t) * 100) : 0);
        const fmtPct = (v: number) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`;
        const coberto = strategic.gap <= 0;
        const comp = [
          { label: 'Pacotes', value: projection?.composition?.pacotes || 0, cls: 'bg-emerald-600 dark:bg-emerald-500' },
          { label: 'Convênios', value: projection?.composition?.convenios || 0, cls: 'bg-sky-500' },
          { label: 'Sessões avulsas', value: projection?.composition?.perSession || 0, cls: 'bg-amber-500' },
          { label: 'Recorrentes', value: projection?.composition?.recorrentes || 0, cls: 'bg-teal-400' },
        ];
        return (
          <div className="mb-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-gray-900 first-letter:uppercase dark:text-gray-50">{selectedMonthLabel.toLowerCase()}</h3>
              {isCurrentMonth && <Pill tone="green">Em andamento</Pill>}
            </div>

            <KpiStrip cols={5} items={[
              { label: 'Meta do mês', value: formatCurrency(meta), sub: 'objetivo do mês', hero: true },
              { label: 'Produção', value: formatCurrency(producao), sub: `${fmtPct(pct(producao, meta))} da meta` },
              { label: 'Caixa recebido', value: formatCurrency(dashData?.resumo?.caixa || 0), sub: `${fmtPct(pct(dashData?.resumo?.caixa || 0, meta))} da meta, dinheiro que entrou` },
              { label: 'Sessões', value: `${monthlyOfMonth?.actual?.completedSessions || 0} de ${monthlyOfMonth?.targets?.totalSessions || 0}`, sub: `${fmtPct(monthlyOfMonth?.progress?.sessionsPercentage || 0)} realizadas` },
              { label: 'Horas', value: `${Number(monthlyOfMonth?.actual?.workedHours || 0).toFixed(0)}h de ${monthlyOfMonth?.targets?.workHours || 0}h`, sub: 'trabalhadas' },
            ]} />

            {/* Agenda × meta: quanto já está garantido e quanto falta vender */}
            <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#161d1b] sm:p-5">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">Agenda × meta</h3>
                  <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Quanto já está na agenda e quanto ainda precisa vender.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className={`text-2xl font-bold tabular-nums ${coberto ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-900 dark:text-gray-50'}`}>{fmtPct(strategic.coveragePct)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">da meta coberta</div>
                  </div>
                  {isCurrentMonth && strategic.gap > 0 && (
                    <button type="button" onClick={async () => { const { month, year } = selectedMonthData; await recalculateFutureTargets(month, year); }}
                      className="inline-flex min-h-8 items-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200">
                      Recalcular metas dos próximos dias
                    </button>
                  )}
                </div>
              </div>

              <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/5" role="img"
                aria-label={`Base ${fmtPct(strategic.recurringPct)}, nova ${fmtPct(strategic.newPct)}, falta ${fmtPct(Math.max(0, 100 - strategic.coveragePct))}`}>
                <div className="h-full bg-emerald-600 dark:bg-emerald-500" style={{ width: `${Math.min(100, strategic.recurringPct)}%` }} />
                <div className="h-full bg-amber-400" style={{ width: `${Math.min(100 - strategic.recurringPct, strategic.newPct)}%` }} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-300">
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-600" aria-hidden />Base recorrente {fmtPct(strategic.recurringPct)}</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-400" aria-hidden />Nova captação {fmtPct(strategic.newPct)}</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-gray-200 dark:bg-white/10" aria-hidden />Falta {fmtPct(Math.max(0, 100 - strategic.coveragePct))}</span>
                <span className="ml-auto font-semibold tabular-nums text-gray-900 dark:text-gray-50">{formatCurrency(strategic.committedRevenue)} de {formatCurrency(strategic.revenueGoal)}</span>
              </div>

              <div className="mt-4">
                <KpiStrip cols={5} items={[
                  { label: 'Base recorrente', value: formatCurrency(strategic.recurringRevenue), sub: `pacotes e recorrentes, ${fmtPct(strategic.recurringPct)}` },
                  { label: 'Nova captação', value: formatCurrency(strategic.newRevenue), sub: `avulsos e convênios, ${fmtPct(strategic.newPct)}` },
                  { label: 'Total na agenda', value: formatCurrency(strategic.committedRevenue), sub: `base + nova, ${fmtPct(strategic.coveragePct)} da meta`, hero: coberto },
                  { label: coberto ? 'Sobra sobre a meta' : 'Falta vender', value: formatCurrency(Math.abs(strategic.gap)), sub: coberto ? 'meta coberta pela agenda' : 'ainda precisa captar', danger: !coberto },
                  { label: 'Pacientes necessários', value: String(strategic.patientsNeeded), danger: !coberto && strategic.patientsNeeded > 0, sub: strategic.ticketForPatients > 0 ? `ticket ${formatCurrency(strategic.ticketForPatients)}` : 'defina o ticket comercial na meta' },
                ]} />
              </div>

              {strategic.gap > 0 && strategic.weeksRemaining > 0 && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-500/40 dark:bg-amber-500/10">
                  <span className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                    Meta semanal: fechar {strategic.weeklyTarget} pacientes por semana nas próximas {strategic.weeksRemaining} semanas.
                  </span>
                  <span className="text-xs text-amber-800 dark:text-amber-200">{strategic.patientsNeeded} pacientes ÷ {strategic.weeksRemaining} semanas</span>
                </div>
              )}
            </section>

            {projection?.composition && (
              <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#161d1b] sm:p-5">
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">Composição da receita na agenda</h3>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{projection.totalAppointments || 0} agendamentos no mês.</p>
                <ul className="mt-3 space-y-2.5">
                  {comp.map((row) => {
                    const p = strategic.committedRevenue > 0 ? (row.value / strategic.committedRevenue) * 100 : 0;
                    return (
                      <li key={row.label} className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[9rem_1fr_3.5rem_7rem]">
                        <span className="text-gray-700 dark:text-gray-200">{row.label}</span>
                        <span className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/5"><span className={`block h-full rounded-full ${row.cls}`} style={{ width: `${Math.min(100, p)}%` }} /></span>
                        <span className="hidden text-right text-xs tabular-nums text-gray-500 dark:text-gray-400 sm:block">{p.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</span>
                        <span className="text-right font-semibold tabular-nums text-gray-900 dark:text-gray-50">{formatCurrency(row.value)}</span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>
        );
      })()}

      {/* Metas do mês por período: chips com contagem (mesmo padrão das outras abas) */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#161d1b]">
        <div role="tablist" aria-label="Período das metas" className="flex flex-wrap gap-1.5 border-b border-gray-200 px-4 py-3 dark:border-white/10">
          <FinChip on={selectedTab === 'monthly'} onClick={() => setSelectedTab('monthly')} label="Mensal" count={monthlyOfMonth ? 1 : 0} />
          <FinChip on={selectedTab === 'weekly'} onClick={() => setSelectedTab('weekly')} label="Semanal" count={weeklyOfMonth.length} />
          <FinChip on={selectedTab === 'daily'} onClick={() => setSelectedTab('daily')} label="Diário" count={dailyOfMonth.length} />
        </div>
        <Box sx={{ p: 2.5 }}>
          {/* TAB: MENSAL */}
          {selectedTab === 'monthly' && (
            <Box>
              {loading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 4 }}>
                  <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2 }} />
                  <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2 }} />
                  <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2 }} />
                </Box>
              ) : monthlyOfMonth ? (
                <PlanningCard
                  planning={monthlyOfMonth}
                  formatCurrency={formatCurrency}
                  getStatusConfig={getStatusConfig}
                  onViewDetails={handleViewDetails}
                  onEdit={handleEdit}
                  onDelete={handleDeleteClick}
                  expanded={expandedCards[monthlyOfMonth._id]}
                  onToggle={() => toggleCard(monthlyOfMonth._id)}
                  isMonthly
                  dashData={dashData}
                />
              ) : (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Timeline sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Nenhuma meta mensal
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {selectedMonthLabel} não possui uma meta mensal definida
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, type: 'monthly' }));
                      setOpenModal(true);
                    }}
                    sx={{ borderRadius: 1.5, bgcolor: '#059669' }}
                  >
                    Criar Meta Mensal
                  </Button>
                </Box>
              )}
            </Box>
          )}

          {/* TAB: SEMANAL */}
          {selectedTab === 'weekly' && (
            <Box>
              {loading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 4 }}>
                  <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2 }} />
                  <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2 }} />
                  <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2 }} />
                </Box>
              ) : weeklyOfMonth.length > 0 ? (
                <Grid container spacing={2}>
                  {weeklyOfMonth.map((p, idx) => (
                    <PlanningCard
                      key={p._id}
                      planning={p}
                      formatCurrency={formatCurrency}
                      getStatusConfig={getStatusConfig}
                      onViewDetails={handleViewDetails}
                      onEdit={handleEdit}
                      onDelete={handleDeleteClick}
                      expanded={expandedCards[p._id]}
                      onToggle={() => toggleCard(p._id)}
                      weekNumber={idx + 1}
                      dashData={dashData}
                    />
                  ))}
                </Grid>
              ) : (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Schedule sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Nenhuma meta semanal
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {selectedMonthLabel} não possui metas semanais definidas
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, type: 'weekly' }));
                      setOpenModal(true);
                    }}
                    sx={{ borderRadius: 1.5, bgcolor: '#F59E0B' }}
                  >
                    Criar Metas Semanais
                  </Button>
                </Box>
              )}
            </Box>
          )}

          {/* TAB: DIÁRIA */}
          {selectedTab === 'daily' && (
            <Box>
              {loading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 4 }}>
                  <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2 }} />
                  <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2 }} />
                  <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2 }} />
                </Box>
              ) : dailyOfMonth.length > 0 ? (
                <Grid container spacing={2}>
                  {dailyOfMonth.map((p) => (
                    <PlanningCard
                      key={p._id}
                      planning={p}
                      formatCurrency={formatCurrency}
                      getStatusConfig={getStatusConfig}
                      onViewDetails={handleViewDetails}
                      onEdit={handleEdit}
                      onDelete={handleDeleteClick}
                      expanded={expandedCards[p._id]}
                      onToggle={() => toggleCard(p._id)}
                      isDaily
                      dashData={dashData}
                    />
                  ))}
                </Grid>
              ) : (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <CalendarToday sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Nenhuma meta diária
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {selectedMonthLabel} não possui metas diárias definidas
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, type: 'daily' }));
                      setOpenModal(true);
                    }}
                    sx={{ borderRadius: 1.5, bgcolor: '#3B82F6' }}
                  >
                    Criar Meta Diária
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </section>


      {/* MODAL DE CRIAÇÃO — padrão do app: Tailwind, verde, tema claro/escuro, R$ com máscara */}
      {(openModal || openEditModal) && (() => {
        const isEdit = openEditModal;
        const lbl = 'mb-1.5 block text-xs font-bold text-gray-700 dark:text-gray-300';
        const inp = 'h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-900 outline-none transition placeholder:font-normal placeholder:text-gray-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 dark:border-white/15 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-emerald-900/40 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:disabled:bg-white/5';
        const help = 'mt-1 text-xs text-gray-500 dark:text-gray-400';
        const h3 = 'text-sm font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400';
        const onlyInt = (v: string) => Number(v.replace(/\D/g, '') || 0);
        const setT = (k: keyof PlanningFormData['targets'], v: number) => setFormData(prev => ({ ...prev, targets: { ...prev.targets, [k]: v } }));
        const close = () => { setOpenModal(false); setOpenEditModal(false); setEditingPlanning(null); };
        return (
          <div className="fixed inset-0 z-[1500] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
            <section role="dialog" aria-modal="true" aria-labelledby="planning-create-title" className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-gray-100 bg-white shadow-2xl dark:border-white/10 dark:bg-gray-900 sm:rounded-2xl">
              <header className="flex items-start justify-between border-b border-gray-100 px-5 py-4 dark:border-white/10">
                <div className="flex gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">{isEdit ? <Edit fontSize="small" /> : <Add fontSize="small" />}</div>
                  <div>
                    <h2 id="planning-create-title" className="text-base font-black text-gray-900 dark:text-gray-100">{isEdit ? 'Editar meta' : 'Nova meta'}</h2>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Defina o alvo do período; o sistema faz as contas do ritmo.</p>
                  </div>
                </div>
                <button type="button" onClick={close} aria-label="Fechar" className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10"><X size={18} /></button>
              </header>

              <div className="space-y-5 overflow-y-auto px-5 py-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label htmlFor="pl-type" className={lbl}>Tipo de meta</label>
                    <select id="pl-type" disabled={isEdit} className={inp} value={formData.type} onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as PlanningFormData['type'] }))}>
                      <option value="monthly">Mensal</option>
                      <option value="weekly">Semanal</option>
                      <option value="daily">Diária</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="pl-month" className={lbl}>Mês</label>
                    <select id="pl-month" disabled={isEdit} className={`${inp} capitalize`} value={formData.month} onChange={(e) => setFormData(prev => ({ ...prev, month: Number(e.target.value) }))}>
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>{format(new Date(2024, i), 'MMMM', { locale: ptBR })}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="pl-year" className={lbl}>Ano</label>
                    <select id="pl-year" disabled={isEdit} className={inp} value={formData.year} onChange={(e) => setFormData(prev => ({ ...prev, year: Number(e.target.value) }))}>
                      {Array.from(new Set([2025, 2026, 2027, new Date().getFullYear() + 1, formData.year])).sort().map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>

                {!isEdit && formData.type !== 'daily' && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-xs leading-5 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                    {formData.type === 'weekly'
                      ? <><strong>Semanas automáticas.</strong> Informe a meta mensal total; o sistema cria as 4 semanas.</>
                      : <><strong>Mensal → semanal → diário.</strong> Ao salvar, o sistema cria as metas semanais e diárias proporcionais aos dias úteis (seg–sex, exceto feriados).</>}
                  </div>
                )}

                <div className="space-y-3">
                  <h3 className={h3}>{formData.type === 'weekly' ? 'Meta mensal total' : 'Metas principais'}</h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label htmlFor="pl-rev" className={lbl}>{formData.type === 'weekly' ? 'Meta mensal total' : 'Meta de receita'}</label>
                      <CurrencyInput id="pl-rev" className={inp} placeholder="R$ 0,00" value={formData.targets.expectedRevenue || null} onValue={(v) => setT('expectedRevenue', v ?? 0)} />
                    </div>
                    <div>
                      <label htmlFor="pl-sess" className={lbl}>Total de sessões</label>
                      <input id="pl-sess" type="text" inputMode="numeric" className={inp} placeholder="0" value={formData.targets.totalSessions || ''} onChange={(e) => setT('totalSessions', onlyInt(e.target.value))} />
                    </div>
                    <div>
                      <label htmlFor="pl-hours" className={lbl}>Horas de trabalho</label>
                      <input id="pl-hours" type="text" inputMode="numeric" className={inp} placeholder="0" value={formData.targets.workHours || ''} onChange={(e) => setT('workHours', onlyInt(e.target.value))} />
                    </div>
                    <div>
                      <label htmlFor="pl-ticket" className={lbl}>Ticket médio por sessão</label>
                      <CurrencyInput id="pl-ticket" className={inp} placeholder="R$ 0,00" value={formData.targets.averageTicket || null} onValue={(v) => setT('averageTicket', v ?? 0)} />
                      <p className={help}>Valor de cada sessão realizada</p>
                    </div>
                    <div>
                      <label htmlFor="pl-cticket" className={lbl}>Ticket médio por fechamento</label>
                      <CurrencyInput id="pl-cticket" className={inp} placeholder="R$ 0,00" value={formData.targets.commercialTicket || null} onValue={(v) => setT('commercialTicket', v ?? 0)} />
                      <p className={help}>Valor médio por paciente convertido</p>
                    </div>
                  </div>
                </div>

                {formData.type !== 'weekly' && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className={h3}>Por especialidade <span className="font-normal normal-case text-gray-500 dark:text-gray-400">(opcional)</span></h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Total: {totalSpecialtySessions} sessões · {formatCurrency(totalSpecialtyRevenue)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-[2fr_1fr_1.4fr_auto] sm:items-end">
                      <div className="col-span-2 sm:col-span-1">
                        <label htmlFor="pl-spec" className={lbl}>Especialidade</label>
                        <select id="pl-spec" className={inp} value={newSpecialty.specialty} onChange={(e) => setNewSpecialty(prev => ({ ...prev, specialty: e.target.value }))}>
                          <option value="">Escolha…</option>
                          {SPECIALTY_OPTIONS.filter(o => !formData.bySpecialty.some(b => b.specialty === o.value || b.specialty === o.label)).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="pl-spec-sess" className={lbl}>Sessões</label>
                        <input id="pl-spec-sess" type="text" inputMode="numeric" className={inp} placeholder="0" value={newSpecialty.sessions || ''} onChange={(e) => setNewSpecialty(prev => ({ ...prev, sessions: onlyInt(e.target.value) }))} />
                      </div>
                      <div>
                        <label htmlFor="pl-spec-rev" className={lbl}>Receita esperada</label>
                        <CurrencyInput id="pl-spec-rev" className={inp} placeholder="R$ 0,00" value={newSpecialty.revenue || null} onValue={(v) => setNewSpecialty(prev => ({ ...prev, revenue: v ?? 0 }))} />
                      </div>
                      <button type="button" onClick={handleAddSpecialty} disabled={!newSpecialty.specialty.trim()} className="col-span-2 h-11 rounded-xl border border-emerald-600 px-4 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-emerald-300 dark:hover:bg-emerald-900/30 sm:col-span-1">Adicionar</button>
                    </div>
                    {formData.bySpecialty.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.bySpecialty.map((spec, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 py-1 pl-3 pr-1.5 text-xs font-semibold text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                            {getSpecialtyLabel(spec.specialty)}: {spec.sessions} sessões · {formatCurrency(spec.revenue)}
                            <button type="button" aria-label={`Remover ${getSpecialtyLabel(spec.specialty)}`} onClick={() => setFormData(prev => ({ ...prev, bySpecialty: prev.bySpecialty.filter((_, i) => i !== idx) }))} className="rounded-full p-0.5 hover:bg-emerald-200/60 dark:hover:bg-emerald-800/50"><X size={12} /></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label htmlFor="pl-notes" className={lbl}>Observações</label>
                  <textarea id="pl-notes" rows={3} className={`${inp} h-auto py-2.5 font-normal`} placeholder="Detalhes sobre o planejamento..." value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} />
                </div>
              </div>

              <footer className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3.5 dark:border-white/10 dark:bg-white/5 sm:flex-row sm:justify-end">
                <button type="button" onClick={close} className="min-h-10 rounded-xl px-4 text-sm font-bold text-gray-600 transition hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-white/10">Cancelar</button>
                <button type="button" onClick={isEdit ? handleSaveEdit : handleSave} disabled={!formData.targets.expectedRevenue || !formData.targets.totalSessions}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-white/10 dark:disabled:text-gray-500">
                  <CheckCircle fontSize="small" /> {isEdit ? 'Salvar alterações' : 'Criar meta'}
                </button>
              </footer>
            </section>
          </div>
        );
      })()}

      {/* MODAL DE DETALHES */}
      <Dialog open={openDetailsModal} onClose={() => setOpenDetailsModal(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Detalhes do Período: {selectedPlanning?.period?.start} a {selectedPlanning?.period?.end}
            </Typography>
            <Chip
              label={`${selectedPlanning?.details?.totalPacientes || 0} pacientes atendidos`}
              color="primary"
            />
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ width: '100%', bgcolor: '#10B98110', border: '1px solid #10B98130' }}>
                <CardContent>
                  <Typography variant="h4" fontWeight="bold" color="#10B981">
                    {formatCurrency(selectedPlanning?.actual?.actualRevenue ?? 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Arrecadado no período
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ width: '100%', bgcolor: '#3B82F610', border: '1px solid #3B82F630' }}>
                <CardContent>
                  <Typography variant="h4" fontWeight="bold" color="#3B82F6">
                    {selectedPlanning?.details?.totalPacientes || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pacientes atendidos
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ width: '100%', bgcolor: '#F59E0B10', border: '1px solid #F59E0B30' }}>
                <CardContent>
                  <Typography variant="h4" fontWeight="bold" color="#F59E0B">
                    {selectedPlanning?.details?.totalPacotes || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pacotes fechados
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2, color: '#10B981', fontWeight: 600 }}>
                💰 Receita por Paciente
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'var(--fx-gray-50)' }}>
                    <TableRow>
                      <TableCell><strong>Paciente</strong></TableCell>
                      <TableCell align="right"><strong>Total Pago</strong></TableCell>
                      <TableCell align="center"><strong>Pagamentos</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedPlanning?.details?.porPaciente?.map((item: any, idx: number) => (
                      <TableRow key={idx} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="500">
                            {item.paciente}
                          </Typography>
                          {item.telefone && (
                            <Typography variant="caption" color="text.secondary">
                              {item.telefone}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: '#10B981' }}>
                          {formatCurrency(item.totalPago)}
                        </TableCell>
                        <TableCell align="center">
                          <Chip size="small" label={item.pagamentos.length} sx={{ bgcolor: 'var(--fx-gray-100)' }} />
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!selectedPlanning?.details?.porPaciente || selectedPlanning.details.porPaciente.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            Nenhum pagamento registrado neste período
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2, color: '#F59E0B', fontWeight: 600 }}>
                📦 Pacotes Fechados
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'var(--fx-gray-50)' }}>
                    <TableRow>
                      <TableCell><strong>Paciente</strong></TableCell>
                      <TableCell><strong>Sessões</strong></TableCell>
                      <TableCell align="right"><strong>Valor</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedPlanning?.details?.pacotesFechados?.map((pkg: any, idx: number) => (
                      <TableRow key={idx} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="500">
                            {pkg.paciente}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {pkg.profissional} • {pkg.especialidade}
                          </Typography>
                        </TableCell>
                        <TableCell>{pkg.sessoes}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {formatCurrency(pkg.valorTotal)}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={pkg.status === 'paid' ? 'Pago' : pkg.status === 'partially_paid' ? 'Parcial' : 'Pendente'}
                            color={pkg.status === 'paid' ? 'success' : pkg.status === 'partially_paid' ? 'warning' : 'default'}
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!selectedPlanning?.details?.pacotesFechados || selectedPlanning.details.pacotesFechados.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            Nenhum pacote fechado neste período
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDetailsModal(false)} variant="outlined">
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <Dialog open={openDeleteModal} onClose={() => setOpenDeleteModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#EF4444', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ bgcolor: 'var(--fx-white)', color: '#EF4444', width: 32, height: 32 }}>
              <Delete />
            </Avatar>
            <Typography variant="h6">Confirmar Exclusão</Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="body1" gutterBottom>
            Tem certeza que deseja excluir o planejamento de <strong>{format(new Date(deletingPlanning?.period?.start || new Date()), 'MMMM/yyyy', { locale: ptBR })}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Tipo: {deletingPlanning?.type === 'monthly' ? 'Mensal' : deletingPlanning?.type === 'weekly' ? 'Semanal' : 'Diário'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Meta de Receita: {formatCurrency(deletingPlanning?.targets?.expectedRevenue || 0)}
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Esta ação não pode ser desfeita.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDeleteModal(false)} variant="outlined">
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmDelete}
            startIcon={<Delete />}
            sx={{ bgcolor: '#EF4444', '&:hover': { bgcolor: '#DC2626' } }}
          >
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Componente de Card de Planejamento
interface PlanningCardProps {
  planning: any;
  formatCurrency: (value: number) => string;
  getStatusConfig: (status: string) => any;
  onViewDetails: (planning: any) => void;
  onEdit: (planning: any) => void;
  onDelete: (planning: any) => void;
  expanded: boolean;
  onToggle: () => void;
  isMonthly?: boolean;
  isDaily?: boolean;
  weekNumber?: number;
  dashData?: any;
}

type SpecialtyRow = { specialty: string; targetSessions?: number; targetRevenue?: number; sessions?: number; revenue?: number; completedSessions?: number; actualRevenue?: number };

// Meta × realizado por especialidade. Realizado = atendimentos concluídos (produção), calculado no back.
const SpecialtyProgress = ({ items, formatCurrency }: { items: SpecialtyRow[]; formatCurrency: (v: number) => string }) => {
  const rows = items.map(s => {
    const meta = s.targetSessions ?? s.sessions ?? 0;
    const metaR = s.targetRevenue ?? s.revenue ?? 0;
    const real = s.completedSessions ?? 0;
    const realR = s.actualRevenue ?? 0;
    const pct = meta > 0 ? Math.round((real / meta) * 100) : 0;
    return { ...s, meta, metaR, real, realR, pct };
  }).sort((a, b) => a.pct - b.pct);
  const bar = (pct: number) => pct >= 100 ? 'bg-emerald-600' : pct >= 70 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="mt-3 rounded-xl border border-gray-200 p-3 dark:border-white/10">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Por especialidade · meta × realizado</p>
      <ul className="space-y-2">
        {rows.map(r => (
          <li key={r.specialty}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
              <span className="font-semibold text-gray-800 dark:text-gray-100">{getSpecialtyLabel(r.specialty)}</span>
              <span className="text-xs text-gray-600 dark:text-gray-300">
                {r.real}/{r.meta} sessões{r.metaR > 0 ? ` · ${formatCurrency(r.realR)} de ${formatCurrency(r.metaR)}` : r.realR > 0 ? ` · ${formatCurrency(r.realR)}` : ''} · <strong>{r.pct}%</strong>
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
              <div className={`h-full rounded-full ${bar(r.pct)}`} style={{ width: `${Math.min(100, r.pct)}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

const PlanningCard = ({
  planning,
  formatCurrency,
  getStatusConfig,
  onViewDetails,
  onEdit,
  onDelete,
  expanded,
  onToggle,
  isMonthly,
  isDaily,
  weekNumber,
  dashData,
}: PlanningCardProps) => {
  const statusConfig = getStatusConfig(planning.progress?.overallStatus);
  const StatusIcon = statusConfig.icon;

  const typeColors = isMonthly
    ? { main: '#059669', bg: '#05966910', border: '#05966950' }
    : weekNumber
      ? { main: '#F59E0B', bg: '#F59E0B10', border: '#F59E0B50' }
      : isDaily
        ? { main: '#3B82F6', bg: '#3B82F610', border: '#3B82F650' }
        : { main: 'var(--fx-gray-500)', bg: 'var(--fx-gray-100)', border: 'var(--fx-gray-200)' };

  return (
    <Grid size={{ xs: 12, md: isMonthly ? 12 : 6, lg: isMonthly ? 12 : 4 }}>
      <Card
        elevation={0}
        sx={{
          border: '2px solid',
          borderColor: typeColors.border,
          borderRadius: 2,
          bgcolor: isMonthly ? 'var(--fx-white)' : typeColors.bg,
          transition: 'all 0.2s',
          '&:hover': {
            boxShadow: `0 4px 12px color-mix(in srgb, ${typeColors.main} 13%, transparent)`,
            borderColor: typeColors.main,
          },
        }}
      >
        <CardContent sx={{ p: isMonthly ? 2.5 : 2 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ bgcolor: typeColors.main, width: isMonthly ? 40 : 32, height: isMonthly ? 40 : 32 }}>
                {isMonthly ? <Timeline sx={{ fontSize: 20 }} /> : weekNumber ? <Schedule sx={{ fontSize: 16 }} /> : <CalendarToday sx={{ fontSize: 16 }} />}
              </Avatar>
              <Box>
                <Typography variant={isMonthly ? 'subtitle1' : 'body2'} fontWeight="bold">
                  {isMonthly ? 'Meta Mensal' : weekNumber ? `Semana ${weekNumber}` : 'Meta Diária'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {format(new Date(planning.period.start), 'dd/MM')} - {format(new Date(planning.period.end), 'dd/MM/yyyy')}
                </Typography>
              </Box>
            </Box>
            <Chip
              size="small"
              icon={<StatusIcon sx={{ fontSize: 14 }} />}
              label={statusConfig.label}
              sx={{ bgcolor: statusConfig.bgColor, color: statusConfig.color, fontWeight: 500 }}
              variant="outlined"
            />
          </Box>

          <Divider sx={{ my: 1.5 }} />

          {/* Métricas */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="rounded-xl border-2 p-3" style={{ borderColor: typeColors.border, backgroundColor: typeColors.bg }}>
              <div className="text-3xs font-black uppercase tracking-widest text-gray-400 mb-1">Meta Receita</div>
              <div className="text-base font-black text-gray-900 tracking-tight leading-none">
                {formatCurrency(planning.targets?.expectedRevenue || 0)}
              </div>
            </div>
            <div className="rounded-xl border-2 p-3" style={{ borderColor: '#10B981', backgroundColor: 'var(--fx-green-50)' }}>
              <div className="text-3xs font-black uppercase tracking-widest text-emerald-600 mb-1">Resultado</div>
              <div className="text-base font-black text-gray-900 tracking-tight leading-none">
                {formatCurrency(dashData?.resumo?.novaReceitaMes?.total ?? dashData?.novaReceitaMes?.total ?? dashData?.data?.resultadoEconomico ?? planning.actual?.actualRevenue ?? 0)}
              </div>
            </div>
            <div className="rounded-xl border-2 p-3" style={{ borderColor: '#3B82F6', backgroundColor: 'var(--fx-blue-50)' }}>
              <div className="text-3xs font-black uppercase tracking-widest text-blue-600 mb-1">Caixa</div>
              <div className="text-base font-black text-gray-900 tracking-tight leading-none">
                {formatCurrency(dashData?.resumo?.caixa || 0)}
              </div>
            </div>
          </div>

          {/* Progresso */}
          <div className="mb-3">
            <p className="text-xs text-gray-400 mb-1">Receita</p>
            {(() => {
              const realizado = dashData?.resumo?.novaReceitaMes?.total ?? dashData?.novaReceitaMes?.total ?? dashData?.data?.resultadoEconomico ?? dashData?.resumo?.producao ?? planning.actual?.actualRevenue ?? 0;
              const meta = planning.targets?.expectedRevenue || 0;
              const pct = meta > 0 ? Math.min((realizado / meta) * 100, 100) : 0;
              const barColor = realizado >= meta ? '#10B981' : typeColors.main;
              return (
                <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full flex items-center transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: barColor, minWidth: pct > 0 ? '2.5rem' : 0 }}>
                    {pct >= 8 && <span className="text-3xs font-black text-white pl-2 leading-none">{pct.toFixed(0)}%</span>}
                  </div>
                </div>
              );
            })()}
          </div>
          <div className="mb-3">
            <p className="text-xs text-gray-400 mb-1">Sessões</p>
            {(() => {
              const pct = Math.min(planning.progress?.sessionsPercentage || 0, 100);
              const barColor = pct >= 100 ? '#10B981' : '#3B82F6';
              return (
                <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full flex items-center transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: barColor, minWidth: pct > 0 ? '2.5rem' : 0 }}>
                    {pct >= 8 && <span className="text-3xs font-black text-white pl-2 leading-none">{pct.toFixed(0)}%</span>}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Meta × realizado por especialidade (só quando a meta tem distribuição) */}
          {Array.isArray(planning.bySpecialty) && planning.bySpecialty.length > 0 && (
            <SpecialtyProgress items={planning.bySpecialty} formatCurrency={formatCurrency} />
          )}

          {/* Expandir detalhes */}
          <Collapse in={expanded}>
            <Box sx={{ mt: 2, p: 1.5, bgcolor: 'var(--fx-gray-50)', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom fontWeight="600">
                Detalhes
              </Typography>
              <Grid container spacing={1}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Horas Previstas
                  </Typography>
                  <Typography variant="body2" fontWeight="500">
                    {planning.targets?.workHours || 0}h
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Horas Trabalhadas
                  </Typography>
                  <Typography variant="body2" fontWeight="500">
                    {planning.actual?.workedHours?.toFixed(1) || 0}h
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Sessões Previstas
                  </Typography>
                  <Typography variant="body2" fontWeight="500">
                    {planning.targets?.totalSessions || 0}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Sessões Realizadas
                  </Typography>
                  <Typography variant="body2" fontWeight="500">
                    {planning.actual?.completedSessions || 0}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Ticket médio (meta)
                  </Typography>
                  <Typography variant="body2" fontWeight="500">
                    {formatCurrency(planning.targets?.averageTicket || 0)}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Ticket médio (realizado)
                  </Typography>
                  <Typography variant="body2" fontWeight="500">
                    {planning.actual?.completedSessions ? formatCurrency((planning.actual?.actualRevenue || 0) / planning.actual.completedSessions) : '—'}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </Collapse>

          {/* Gap de meta */}
          {planning.progress?.gapRevenue > 0 && (
            <Alert severity="warning" sx={{ mt: 2, py: 0, borderRadius: 1 }}>
              <Typography variant="caption">
                Falta {formatCurrency(planning.progress.gapRevenue)} para atingir a meta
              </Typography>
            </Alert>
          )}

          {/* Ações */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
            <Button size="small" onClick={onToggle} startIcon={expanded ? <ChevronUp /> : <ChevronDown />} sx={{ color: 'text.secondary' }}>
              {expanded ? 'Menos' : 'Mais'}
            </Button>
            <Box>
              <Tooltip title="Ver pagamentos, pacientes e pacotes do período">
                <Button size="small" onClick={() => onViewDetails(planning)} sx={{ textTransform: 'none', color: 'var(--fx-emerald-700)', minWidth: 0, mr: 0.5 }}>
                  Detalhes
                </Button>
              </Tooltip>
              <Tooltip title="Editar">
                <IconButton size="small" sx={{ color: '#059669' }} onClick={() => onEdit(planning)}>
                  <Edit fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Excluir">
                <IconButton size="small" sx={{ color: '#EF4444' }} onClick={() => onDelete(planning)}>
                  <Delete fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );
};

export default PlanningTab;
