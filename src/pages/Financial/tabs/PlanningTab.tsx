import {
  Add,
  AttachMoney,
  CalendarToday,
  CheckCircle,
  Delete,
  Edit,
  Refresh,
  Schedule,
  TrendingUp,
  Warning,
  Timeline,
  EventSeat,
  AccessTime,
  Assessment,
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
  MenuItem,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Collapse,
  LinearProgress,
  ToggleButton,
  ToggleButtonGroup,
  Tabs,
  Tab,
} from '@mui/material';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useRef, useState, useMemo } from 'react';
import { usePlanning } from '../../../hooks/usePlanning';
import { useFinancialDashboard } from '../../../hooks/useFinancialDashboard';
import { planningService } from '../../../services/planningService';
import { toast } from 'react-toastify';
import { ChevronDown, ChevronUp } from 'lucide-react';

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

interface MonthData {
  month: number;
  year: number;
  label: string;
  fullLabel: string;
}

// Configuração de status
const STATUS_CONFIG = {
  achieved: { color: '#10B981', bgColor: '#10B98110', label: 'Atingido', icon: CheckCircle },
  on_track: { color: '#3B82F6', bgColor: '#3B82F610', label: 'No caminho', icon: TrendingUp },
  at_risk: { color: '#F59E0B', bgColor: '#F59E0B10', label: 'Em risco', icon: Warning },
  behind: { color: '#EF4444', bgColor: '#EF444410', label: 'Atrasado', icon: Warning }
};

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
      averageTicket: 0
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
  const last3Months: MonthData[] = useMemo(() => {
    const months: MonthData[] = [];
    const base = new Date(year, month - 1, 1);
    for (let i = 0; i < 3; i++) {
      const d = subMonths(base, i);
      months.push({
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        label: format(d, 'MMM', { locale: ptBR }).toUpperCase(),
        fullLabel: format(d, 'MMMM/yyyy', { locale: ptBR }).toUpperCase()
      });
    }
    return months;
  }, [month, year]);

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

  const handleViewDetails = async (planning: any) => {
    setSelectedPlanning(planning);
    setOpenDetailsModal(true);
  };

  const handleEdit = (planning: any) => {
    setEditingPlanning(planning);
    setFormData({
      type: planning.type,
      month: new Date(planning.period.start).getMonth() + 1,
      year: new Date(planning.period.start).getFullYear(),
      targets: {
        expectedRevenue: planning.targets?.expectedRevenue || 0,
        totalSessions: planning.targets?.totalSessions || 0,
        workHours: planning.targets?.workHours || 0,
        averageTicket: planning.targets?.averageTicket || 0,
        commercialTicket: planning.targets?.commercialTicket || 0
      },
      bySpecialty: planning.bySpecialty || [],
      notes: planning.notes || ''
    });
    setOpenEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingPlanning) return;
    
    const startDate = new Date(formData.year, formData.month - 1, 1);
    const endDate = new Date(formData.year, formData.month, 0);

    const updateData = {
      type: formData.type,
      period: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      },
      targets: formData.targets,
      bySpecialty: formData.bySpecialty,
      notes: formData.notes
    };

    await updatePlanning(editingPlanning._id, updateData);
    setOpenEditModal(false);
    setEditingPlanning(null);
    fetchPlannings({});
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
    fetchPlannings({});
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
    fetchPlannings({});
  };

  const formatCurrency = (value: number) =>
    `R$ ${value?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.behind;
  };

  const toggleCard = (id: string) => {
    setExpandedCards(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const totalSpecialtySessions = formData.bySpecialty.reduce((sum, s) => sum + s.sessions, 0);
  const totalSpecialtyRevenue = formData.bySpecialty.reduce((sum, s) => sum + s.revenue, 0);

  const isCurrentMonth = selectedMonthKey === getCurrentMonthKey();
  const selectedMonthLabel = last3Months.find(m => `${m.year}-${m.month}` === selectedMonthKey)?.fullLabel || '';

  if (loading && plannings.length === 0) {
    return (
      <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
        <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'grey.200', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Skeleton variant="circular" width={44} height={44} sx={{ bgcolor: '#8B5CF615' }} />
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
          {['#8B5CF6', '#10B981', '#059669', '#F59E0B', '#3B82F6'].map((color, i) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Skeleton variant="circular" width={36} height={36} sx={{ bgcolor: `${color}15` }} />
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
      {/* Header */}
      <div className="mb-4 rounded-2xl border border-gray-100 shadow-sm bg-white p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#8B5CF6' }}>
            <Assessment sx={{ fontSize: 22, color: 'white' }} />
          </div>
          <div>
            <p className="text-sm font-black text-gray-900">Planejamento Anual</p>
            <p className="text-[11px] text-gray-500">Defina metas de receita, sessões e acompanhe o progresso</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => await refreshAllPlannings()}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50 transition-colors"
            title="Atualizar dados reais"
          >
            <Refresh fontSize="small" />
          </button>
          <button
            onClick={handleOpenModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' }}
          >
            <Add fontSize="small" /> Nova Meta
          </button>
        </div>
      </div>

      {/* NAVEGAÇÃO: Seletor de Meses */}
      <div className="mb-4 rounded-2xl border border-gray-100 shadow-sm bg-white p-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Período</p>
        <div className="flex gap-2">
          {last3Months.map((m) => {
            const isSelected = selectedMonthKey === `${m.year}-${m.month}`;
            const isCurrent = `${m.year}-${m.month}` === getCurrentMonthKey();
            return (
              <button
                key={`${m.year}-${m.month}`}
                onClick={() => setSelectedMonthKey(`${m.year}-${m.month}`)}
                className={`flex-1 py-2.5 rounded-xl text-center transition-all ${
                  isSelected ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={isSelected ? { backgroundColor: '#8B5CF6' } : {}}
              >
                <div className="text-sm font-bold leading-tight">{m.label}</div>
                <div className="text-[10px] opacity-70">{m.year}</div>
                {isCurrent && (
                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-white bg-opacity-20 text-white' : 'bg-violet-100 text-violet-700'}`}>
                    atual
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* KPIs do MÊS SELECIONADO */}
      {monthlyOfMonth && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-violet-600">{selectedMonthLabel}</span>
            {isCurrentMonth && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700">Em andamento</span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {/* Meta do Mês */}
            <div className="rounded-2xl border border-gray-100 shadow-sm p-4 bg-white" style={{ borderTop: '3px solid #8B5CF6' }}>
              <span className="text-[10px] font-black uppercase tracking-widest text-violet-600">Meta do Mês</span>
              <div className="text-2xl font-black text-gray-900 tracking-tight my-2">
                {formatCurrency(monthlyOfMonth?.targets?.expectedRevenue || 0)}
              </div>
              <div className="text-[10px] text-gray-400">objetivo do mês</div>
            </div>

            {/* Produção Realizada */}
            <div className="rounded-2xl border border-gray-100 shadow-sm p-4 bg-white" style={{ borderTop: '3px solid #10B981' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Produção</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  {(() => {
                    const real = dashData?.resumo?.novaReceitaMes?.total ?? dashData?.novaReceitaMes?.total ?? dashData?.data?.resultadoEconomico ?? dashData?.resumo?.producao ?? monthlyOfMonth?.actual?.actualRevenue ?? 0;
                    const meta = monthlyOfMonth?.targets?.expectedRevenue || 0;
                    return meta > 0 ? Math.min(100, (real / meta) * 100).toFixed(0) : 0;
                  })()}%
                </span>
              </div>
              <div className="text-2xl font-black text-gray-900 tracking-tight my-2">
                {formatCurrency(dashData?.resumo?.novaReceitaMes?.total ?? dashData?.novaReceitaMes?.total ?? dashData?.data?.resultadoEconomico ?? dashData?.resumo?.producao ?? monthlyOfMonth?.actual?.actualRevenue ?? 0)}
              </div>
              <div className="text-[10px] text-gray-400">da meta</div>
            </div>

            {/* Caixa Recebido */}
            <div className="rounded-2xl border border-gray-100 shadow-sm p-4 bg-white" style={{ borderTop: '3px solid #059669' }}>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Caixa Recebido</span>
              <div className="text-2xl font-black text-gray-900 tracking-tight my-2">
                {formatCurrency(dashData?.resumo?.caixa || 0)}
              </div>
              <div className="text-[10px] text-gray-400">dinheiro recebido</div>
            </div>

            {/* Sessões */}
            <div className="rounded-2xl border border-gray-100 shadow-sm p-4 bg-white" style={{ borderTop: '3px solid #F59E0B' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Sessões</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  {(monthlyOfMonth?.progress?.sessionsPercentage || 0).toFixed(0)}%
                </span>
              </div>
              <div className="text-2xl font-black text-gray-900 tracking-tight my-2">
                {monthlyOfMonth?.actual?.completedSessions || 0} / {monthlyOfMonth?.targets?.totalSessions || 0}
              </div>
              <div className="text-[10px] text-gray-400">realizadas</div>
            </div>

            {/* Horas */}
            <div className="rounded-2xl border border-gray-100 shadow-sm p-4 bg-white col-span-2 md:col-span-1" style={{ borderTop: '3px solid #3B82F6' }}>
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Horas</span>
              <div className="text-2xl font-black text-gray-900 tracking-tight my-2">
                {monthlyOfMonth?.actual?.workedHours?.toFixed(0) || 0}h / {monthlyOfMonth?.targets?.workHours || 0}h
              </div>
              <div className="text-[10px] text-gray-400">trabalhadas</div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          📊 PAINEL COMERCIAL ESTRATÉGICO
          "Quanto já temos na mão? E quanto ainda precisamos vender?"
          ═══════════════════════════════════════════════════════ */}
      {monthlyOfMonth && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Painel Comercial Estratégico</span>
            <span className="text-[10px] text-gray-300">· Agenda vs. Meta</span>
            {isCurrentMonth && strategic.gap > 0 && (
              <button
                onClick={async () => { const { month, year } = selectedMonthData; await recalculateFutureTargets(month, year); }}
                className="ml-auto text-[11px] font-bold text-pink-600 border border-pink-200 bg-pink-50 hover:bg-pink-100 px-2 py-0.5 rounded-lg transition-colors"
              >
                ↻ Recalcular
              </button>
            )}
          </div>

          {/* Barra segmentada thin */}
          <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm mb-4">
            <div style={{ height: 3, backgroundColor: '#8B5CF6' }} />
            <div className="p-4 bg-white">
              <div className="flex items-end justify-between mb-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Cobertura da Meta</p>
                <span className="text-3xl font-black leading-none" style={{ color: strategic.coveragePct >= 100 ? '#10B981' : '#1F2937' }}>
                  {strategic.coveragePct.toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-[5px] overflow-hidden flex mb-3">
                <div className="h-full rounded-l-full transition-all duration-700"
                  style={{ width: `${Math.min(100, strategic.recurringPct)}%`, backgroundColor: '#8B5CF6' }} />
                <div className="h-full transition-all duration-700"
                  style={{ width: `${Math.min(100 - strategic.recurringPct, strategic.newPct)}%`, backgroundColor: '#F59E0B' }} />
              </div>
              <div className="flex items-center gap-4 text-[11px] text-gray-500 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-violet-500" />
                  Base {strategic.recurringPct.toFixed(0)}%
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-amber-400" />
                  Nova {strategic.newPct.toFixed(0)}%
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-gray-300" />
                  Falta {Math.max(0, 100 - strategic.coveragePct).toFixed(0)}%
                </span>
                <span className="ml-auto font-semibold text-gray-600 text-[11px]">
                  {formatCurrency(strategic.committedRevenue)} / {formatCurrency(strategic.revenueGoal)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
            {/* Card 1: Meta */}
            <div className="rounded-2xl border border-gray-100 shadow-sm p-4 bg-white" style={{ borderTop: '3px solid #6B7280' }}>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Meta</span>
              <div className="text-2xl font-black text-gray-900 tracking-tight my-2">{formatCurrency(strategic.revenueGoal)}</div>
              <div className="text-[10px] text-gray-400">objetivo do mês</div>
            </div>

            {/* Card 2: Base Recorrente */}
            <div className="rounded-2xl border border-gray-100 shadow-sm p-4 bg-white" style={{ borderTop: '3px solid #8B5CF6' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-violet-600">Base Recorrente</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700">{strategic.recurringPct.toFixed(0)}%</span>
              </div>
              <div className="text-2xl font-black text-gray-900 tracking-tight my-2">{formatCurrency(strategic.recurringRevenue)}</div>
              <div className="text-[10px] text-gray-400">pacotes + recorrentes</div>
            </div>

            {/* Card 3: Nova Captação */}
            <div className="rounded-2xl border border-gray-100 shadow-sm p-4 bg-white" style={{ borderTop: '3px solid #F59E0B' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Nova Captação</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">{strategic.newPct.toFixed(0)}%</span>
              </div>
              <div className="text-2xl font-black text-gray-900 tracking-tight my-2">{formatCurrency(strategic.newRevenue)}</div>
              <div className="text-[10px] text-gray-400">avulsos + convênios</div>
            </div>

            {/* Card 4: Total Agenda */}
            <div className="rounded-2xl border border-gray-100 shadow-sm p-4 bg-white" style={{ borderTop: '3px solid #10B981' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Total Agenda</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{strategic.coveragePct.toFixed(0)}%</span>
              </div>
              <div className="text-2xl font-black text-gray-900 tracking-tight my-2">{formatCurrency(strategic.committedRevenue)}</div>
              <div className="text-[10px] text-gray-400">base + nova</div>
            </div>

            {/* Card 5: GAP — danger/success */}
            <div className={`rounded-2xl shadow-sm p-4 ${strategic.gap <= 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}
              style={{ borderTop: `3px solid ${strategic.gap <= 0 ? '#10B981' : '#EF4444'}` }}>
              <span className={`text-[10px] font-black uppercase tracking-widest ${strategic.gap <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {strategic.gap <= 0 ? 'Superávit' : 'Gap'}
              </span>
              <div className={`text-2xl font-black tracking-tight my-2 ${strategic.gap <= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {formatCurrency(Math.abs(strategic.gap))}
              </div>
              <div className={`text-[10px] font-semibold ${strategic.gap <= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                {strategic.gap <= 0 ? 'meta coberta 🎉' : 'ainda precisa captar'}
              </div>
            </div>

            {/* Card 6: Pacientes Necessários — danger se gap > 0 */}
            <div className={`rounded-2xl shadow-sm p-4 ${strategic.gap > 0 && strategic.patientsNeeded > 0 ? 'bg-rose-50 border border-rose-200' : 'bg-white border border-gray-100'}`}
              style={{ borderTop: `3px solid ${strategic.gap > 0 && strategic.patientsNeeded > 0 ? '#EF4444' : '#3B82F6'}` }}>
              <span className={`text-[10px] font-black uppercase tracking-widest ${strategic.gap > 0 && strategic.patientsNeeded > 0 ? 'text-rose-600' : 'text-blue-600'}`}>
                Pacientes Nec.
              </span>
              <div className={`text-2xl font-black tracking-tight my-2 ${strategic.gap > 0 && strategic.patientsNeeded > 0 ? 'text-rose-700' : 'text-gray-900'}`}>
                {strategic.patientsNeeded}
              </div>
              <div className="text-[10px] text-gray-400">
                {strategic.ticketForPatients > 0 ? `ticket ${formatCurrency(strategic.ticketForPatients)}` : 'defina ticket comercial'}
              </div>
            </div>
          </div>

          {/* Meta Semanal */}
          {strategic.gap > 0 && strategic.weeksRemaining > 0 && (
            <div className="border border-dashed border-amber-300 bg-amber-50 rounded-xl px-4 py-3 mb-4 flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm font-bold text-amber-800">
                🎯 Meta semanal: fechar <strong>{strategic.weeklyTarget} pacientes/semana</strong> nas próximas {strategic.weeksRemaining} sem.
              </span>
              <span className="text-[11px] text-gray-500">{strategic.patientsNeeded} pac. ÷ {strategic.weeksRemaining} sem.</span>
            </div>
          )}

          {/* Tabela Composição da Receita */}
          {projection?.composition && (
            <div className="rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-1">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Composição da Receita em Agenda · {projection.totalAppointments || 0} agendamentos
                </p>
              </div>
              <div className="bg-white divide-y divide-gray-50">
                {[
                  { label: 'Pacotes', value: projection.composition?.pacotes || 0, color: '#8B5CF6' },
                  { label: 'Convênios', value: projection.composition?.convenios || 0, color: '#F59E0B' },
                  { label: 'Sessões Avulsas', value: projection.composition?.perSession || 0, color: '#3B82F6' },
                  { label: 'Recorrentes', value: projection.composition?.recorrentes || 0, color: '#10B981' },
                ].map((row) => {
                  const pct = strategic.committedRevenue > 0 ? (row.value / strategic.committedRevenue) * 100 : 0;
                  return (
                    <div key={row.label} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                      <span className="text-sm text-gray-700 w-28 shrink-0">{row.label}</span>
                      <div className="flex-1 h-[4px] bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: row.color }} />
                      </div>
                      <span className="text-[11px] text-gray-400 w-10 text-right shrink-0">{pct.toFixed(1)}%</span>
                      <span className="text-sm font-bold text-gray-900 w-20 text-right shrink-0">{formatCurrency(row.value)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TABS: DIA | SEMANA | MENSAL */}
      <Paper
        elevation={0}
        sx={{ border: '1px solid', borderColor: isCurrentMonth ? '#8B5CF630' : 'grey.200', borderRadius: 2, overflow: 'hidden' }}
      >
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#FAFAFF' }}>
          <Tabs
            value={selectedTab}
            onChange={(e, v) => setSelectedTab(v)}
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': {
                py: 1.5,
                fontWeight: 600,
                textTransform: 'none',
                fontSize: '0.875rem',
                color: '#6B7280',
                '&.Mui-selected': {
                  color: selectedTab === 'daily' ? '#3B82F6' : selectedTab === 'weekly' ? '#F59E0B' : '#8B5CF6',
                  bgcolor: 'white',
                },
              },
              '& .MuiTabs-indicator': {
                height: 3,
                bgcolor: selectedTab === 'daily' ? '#3B82F6' : selectedTab === 'weekly' ? '#F59E0B' : '#8B5CF6',
              },
            }}
          >
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CalendarToday sx={{ fontSize: 16 }} />
                  <span>Diário</span>
                  {dailyOfMonth.length > 0 && (
                    <Chip size="small" label={dailyOfMonth.length} sx={{ height: 18, fontSize: '0.6rem', bgcolor: '#3B82F620' }} />
                  )}
                </Box>
              }
              value="daily"
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Schedule sx={{ fontSize: 16 }} />
                  <span>Semanal</span>
                  {weeklyOfMonth.length > 0 && (
                    <Chip size="small" label={weeklyOfMonth.length} sx={{ height: 18, fontSize: '0.6rem', bgcolor: '#F59E0B20' }} />
                  )}
                </Box>
              }
              value="weekly"
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Timeline sx={{ fontSize: 16 }} />
                  <span>Mensal</span>
                  {monthlyOfMonth && (
                    <Chip size="small" label="1" sx={{ height: 18, fontSize: '0.6rem', bgcolor: '#8B5CF620' }} />
                  )}
                </Box>
              }
              value="monthly"
            />
          </Tabs>
        </Box>

        <Box sx={{ p: 2.5, bgcolor: 'white' }}>
          {/* TAB: MENSAL */}
          {selectedTab === 'monthly' && (
            <Box>
              {monthlyOfMonth ? (
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
                    sx={{ borderRadius: 1.5, bgcolor: '#8B5CF6' }}
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
              {weeklyOfMonth.length > 0 ? (
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
              {dailyOfMonth.length > 0 ? (
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
      </Paper>


      {/* MODAL DE CRIAÇÃO */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#8B5CF6', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ bgcolor: 'white', color: '#8B5CF6', width: 32, height: 32 }}>
              <Add />
            </Avatar>
            <Typography variant="h6">Criar Novo Planejamento</Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                select
                label="Tipo de Meta"
                fullWidth
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
              >
                <MenuItem value="daily">Diária</MenuItem>
                <MenuItem value="weekly">Semanal</MenuItem>
                <MenuItem value="monthly">Mensal</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                select
                label="Mês"
                fullWidth
                value={formData.month}
                onChange={(e) => setFormData(prev => ({ ...prev, month: Number(e.target.value) }))}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <MenuItem key={i + 1} value={i + 1}>
                    {format(new Date(2024, i), 'MMMM', { locale: ptBR })}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                select
                label="Ano"
                fullWidth
                value={formData.year}
                onChange={(e) => setFormData(prev => ({ ...prev, year: Number(e.target.value) }))}
              >
                {[2025, 2026, 2027].map(y => (
                  <MenuItem key={y} value={y}>{y}</MenuItem>
                ))}
              </TextField>
            </Grid>

            {formData.type === 'weekly' && (
              <Grid size={{ xs: 12 }}>
                <Alert severity="info" sx={{ mt: 1 }}>
                  <strong>Geração automática de semanas</strong><br />
                  Informe a <strong>meta mensal total</strong>. O sistema cria <strong>4 semanas</strong> automaticamente.
                </Alert>
              </Grid>
            )}

            {formData.type === 'monthly' && (
              <Grid size={{ xs: 12 }}>
                <Alert severity="info" sx={{ mt: 1 }}>
                  <strong>Automação mensal → semanal → diário</strong><br />
                  Ao salvar, o sistema criará automaticamente as metas semanais e diárias proporcionais aos dias úteis (seg–sex, exceto feriados).
                </Alert>
              </Grid>
            )}

            <Grid size={{ xs: 12 }}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2, color: '#8B5CF6', fontWeight: 600 }}>
                {formData.type === 'weekly' ? 'Meta Mensal Total (dividida automaticamente)' : 'Metas Principais'}
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label={formData.type === 'weekly' ? 'Meta Mensal Total (R$)' : 'Meta de Receita (R$)'}
                type="number"
                fullWidth
                value={formData.targets.expectedRevenue}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  targets: { ...prev.targets, expectedRevenue: Number(e.target.value) }
                }))}
                InputProps={{ startAdornment: 'R$' }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="Total de Sessões"
                type="number"
                fullWidth
                value={formData.targets.totalSessions}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  targets: { ...prev.targets, totalSessions: Number(e.target.value) }
                }))}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="Horas de Trabalho"
                type="number"
                fullWidth
                value={formData.targets.workHours}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  targets: { ...prev.targets, workHours: Number(e.target.value) }
                }))}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="Ticket Médio por Sessão (R$)"
                type="number"
                fullWidth
                value={formData.targets.averageTicket}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  targets: { ...prev.targets, averageTicket: Number(e.target.value) }
                }))}
                helperText="Valor operacional de cada sessão realizada"
                InputProps={{ startAdornment: 'R$' }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="Ticket Médio por Fechamento (R$)"
                type="number"
                fullWidth
                value={formData.targets.commercialTicket}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  targets: { ...prev.targets, commercialTicket: Number(e.target.value) }
                }))}
                helperText="Valor médio por paciente convertido (usado no cálculo comercial)"
                InputProps={{ startAdornment: 'R$' }}
              />
            </Grid>

            {formData.type !== 'weekly' && (<>
              <Grid size={{ xs: 12 }}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2, color: '#8B5CF6', fontWeight: 600 }}>
                  Distribuição por Especialidade
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                  Total: {totalSpecialtySessions} sessões / {formatCurrency(totalSpecialtyRevenue)}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField label="Especialidade" value={newSpecialty.specialty} onChange={(e) => setNewSpecialty(prev => ({ ...prev, specialty: e.target.value }))} placeholder="Ex: Fonoaudiologia" />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField label="Sessões" type="number" value={newSpecialty.sessions} onChange={(e) => setNewSpecialty(prev => ({ ...prev, sessions: Number(e.target.value) }))} />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField label="Receita Esperada" type="number" value={newSpecialty.revenue} onChange={(e) => setNewSpecialty(prev => ({ ...prev, revenue: Number(e.target.value) }))} InputProps={{ startAdornment: 'R$' }} />
              </Grid>
              <Grid size={{ xs: 12, md: 2 }}>
                <Button variant="outlined" onClick={handleAddSpecialty} fullWidth sx={{ height: '100%', borderColor: '#8B5CF6', color: '#8B5CF6' }}>Adicionar</Button>
              </Grid>
              {formData.bySpecialty.length > 0 && (
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {formData.bySpecialty.map((spec, idx) => (
                      <Chip key={idx} label={`${spec.specialty}: ${spec.sessions} sessões (${formatCurrency(spec.revenue)})`}
                        onDelete={() => setFormData(prev => ({ ...prev, bySpecialty: prev.bySpecialty.filter((_, i) => i !== idx) }))}
                        sx={{ bgcolor: '#8B5CF610', color: '#8B5CF6', borderColor: '#8B5CF6' }} variant="outlined" />
                    ))}
                  </Box>
                </Grid>
              )}
            </>)}

            <Grid size={{ xs: 12 }}>
              <TextField
                label="Observações"
                multiline
                rows={3}
                fullWidth
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Detalhes adicionais sobre o planejamento..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenModal(false)} variant="outlined">
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!formData.targets.expectedRevenue || !formData.targets.totalSessions}
            startIcon={<CheckCircle />}
            sx={{ bgcolor: '#8B5CF6', '&:hover': { bgcolor: '#7C3AED' } }}
          >
            Criar Meta
          </Button>
        </DialogActions>
      </Dialog>

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
                    {formatCurrency(dashData?.resumo?.novaReceitaMes?.total ?? dashData?.novaReceitaMes?.total ?? dashData?.data?.resultadoEconomico ?? dashData?.resumo?.producao ?? selectedPlanning?.actual?.actualRevenue ?? 0)}
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
                  <TableHead sx={{ bgcolor: '#F9FAFB' }}>
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
                          <Chip size="small" label={item.pagamentos.length} sx={{ bgcolor: '#F3F4F6' }} />
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
                  <TableHead sx={{ bgcolor: '#F9FAFB' }}>
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

      {/* MODAL DE EDIÇÃO */}
      <Dialog open={openEditModal} onClose={() => setOpenEditModal(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#8B5CF6', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ bgcolor: 'white', color: '#8B5CF6', width: 32, height: 32 }}>
              <Edit />
            </Avatar>
            <Typography variant="h6">Editar Planejamento</Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField select label="Tipo de Meta" fullWidth value={formData.type} disabled>
                <MenuItem value="daily">Diária</MenuItem>
                <MenuItem value="weekly">Semanal</MenuItem>
                <MenuItem value="monthly">Mensal</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField select label="Mês" fullWidth value={formData.month} disabled>
                {Array.from({ length: 12 }, (_, i) => (
                  <MenuItem key={i + 1} value={i + 1}>
                    {format(new Date(2024, i), 'MMMM', { locale: ptBR })}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField select label="Ano" fullWidth value={formData.year} disabled>
                {[2025, 2026, 2027].map(y => (
                  <MenuItem key={y} value={y}>{y}</MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2, color: '#8B5CF6', fontWeight: 600 }}>
                Metas Principais
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="Meta de Receita (R$)"
                type="number"
                fullWidth
                value={formData.targets.expectedRevenue}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  targets: { ...prev.targets, expectedRevenue: Number(e.target.value) }
                }))}
                InputProps={{ startAdornment: 'R$' }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="Total de Sessões"
                type="number"
                fullWidth
                value={formData.targets.totalSessions}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  targets: { ...prev.targets, totalSessions: Number(e.target.value) }
                }))}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="Horas de Trabalho"
                type="number"
                fullWidth
                value={formData.targets.workHours}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  targets: { ...prev.targets, workHours: Number(e.target.value) }
                }))}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                label="Observações"
                multiline
                rows={3}
                fullWidth
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenEditModal(false)} variant="outlined">
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveEdit}
            disabled={!formData.targets.expectedRevenue || !formData.targets.totalSessions}
            startIcon={<CheckCircle />}
            sx={{ bgcolor: '#8B5CF6', '&:hover': { bgcolor: '#7C3AED' } }}
          >
            Salvar Alterações
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <Dialog open={openDeleteModal} onClose={() => setOpenDeleteModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#EF4444', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ bgcolor: 'white', color: '#EF4444', width: 32, height: 32 }}>
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
    ? { main: '#8B5CF6', bg: '#8B5CF610', border: '#8B5CF650' }
    : weekNumber
      ? { main: '#F59E0B', bg: '#F59E0B10', border: '#F59E0B50' }
      : isDaily
        ? { main: '#3B82F6', bg: '#3B82F610', border: '#3B82F650' }
        : { main: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' };

  return (
    <Grid size={{ xs: 12, md: isMonthly ? 12 : 6, lg: isMonthly ? 12 : 4 }}>
      <Card
        elevation={0}
        sx={{
          border: '2px solid',
          borderColor: typeColors.border,
          borderRadius: 2,
          bgcolor: isMonthly ? 'white' : typeColors.bg,
          transition: 'all 0.2s',
          '&:hover': {
            boxShadow: `0 4px 12px ${typeColors.main}20`,
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
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Meta Receita</div>
              <div className="text-base font-black text-gray-900 tracking-tight leading-none">
                {formatCurrency(planning.targets?.expectedRevenue || 0)}
              </div>
            </div>
            <div className="rounded-xl border-2 p-3" style={{ borderColor: '#10B981', backgroundColor: '#F0FDF4' }}>
              <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Resultado</div>
              <div className="text-base font-black text-gray-900 tracking-tight leading-none">
                {formatCurrency(dashData?.resumo?.novaReceitaMes?.total ?? dashData?.novaReceitaMes?.total ?? dashData?.data?.resultadoEconomico ?? planning.actual?.actualRevenue ?? 0)}
              </div>
            </div>
            <div className="rounded-xl border-2 p-3" style={{ borderColor: '#3B82F6', backgroundColor: '#EFF6FF' }}>
              <div className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Caixa</div>
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
                    {pct >= 8 && <span className="text-[10px] font-black text-white pl-2 leading-none">{pct.toFixed(0)}%</span>}
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
                    {pct >= 8 && <span className="text-[10px] font-black text-white pl-2 leading-none">{pct.toFixed(0)}%</span>}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Expandir detalhes */}
          <Collapse in={expanded}>
            <Box sx={{ mt: 2, p: 1.5, bgcolor: '#F9FAFB', borderRadius: 1 }}>
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
              <Tooltip title="Editar">
                <IconButton size="small" sx={{ color: '#8B5CF6' }} onClick={() => onEdit(planning)}>
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
