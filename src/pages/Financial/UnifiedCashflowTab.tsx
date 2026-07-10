// UnifiedCashflowTab.tsx - Caixa e Fluxo de Caixa unificados (refatorado com Tailwind)
import { 
    Alert, Chip, MenuItem, Skeleton, Tab, Tabs, Badge, Tooltip, IconButton,
    FormControl, InputLabel, Select, LinearProgress
} from '@mui/material';
import { format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatNavigation } from '../../contexts/ChatNavigationContext';
import { useAppointmentsByType } from '../../hooks/useAppointmentsByType';
import { useRetentionSlots } from '../../hooks/useRetentionSlots';
import { cashflowService, CashflowV2Response } from '../../services/cashflowService';
import { operationalService } from '../../services/operationalService';
import API from '../../services/api';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import InventoryIcon from '@mui/icons-material/Inventory';
import ReceiptIcon from '@mui/icons-material/Receipt';
import WarningIcon from '@mui/icons-material/Warning';
import PhoneIcon from '@mui/icons-material/Phone';
import PersonIcon from '@mui/icons-material/Person';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import PeopleIcon from '@mui/icons-material/People';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import PieChartIcon from '@mui/icons-material/PieChart';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { AdminEditPaymentModal } from '../../components/financial/AdminEditPaymentModal';
import AppointmentPackageProgress from '../../components/appointments/AppointmentPackageProgress';

interface DayData {
    date: string;
    caixa: number;
    producao: number;
    atendimentos: number;
}

const CashflowCardsSkeleton = () => {
    const s = { bgcolor: 'rgba(255,255,255,0.10)' };
    const cardColors = ['#10B981', '#3B82F6', '#F59E0B', '#10B981'];
    return (
        <div className="p-2">
            {/* 4 cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                {cardColors.map((color, i) => (
                    <div key={i} className="border rounded-2xl p-5 shadow-sm" style={{ borderColor: `${color}40`, backgroundColor: `${color}12` }}>
                        <div className="flex items-center gap-3 mb-4">
                            <Skeleton variant="rounded" width={36} height={36} sx={{ borderRadius: 10, ...s }} />
                            <div className="flex-1">
                                <Skeleton variant="text" width="55%" height={13} sx={s} />
                                <Skeleton variant="text" width="70%" height={11} sx={s} />
                            </div>
                        </div>
                        <Skeleton variant="text" width="80%" height={40} sx={s} />
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-2.5">
                            {[0, 1, 2].map(j => (
                                <div key={j} className="flex items-center justify-between">
                                    <Skeleton variant="text" width="48%" height={13} sx={s} />
                                    <Skeleton variant="text" width="30%" height={13} sx={s} />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            {/* Tabs */}
            <div className="flex gap-1 border-b border-white/10 pb-1 mb-3">
                {[90, 90, 80, 90, 110, 110].map((w, i) => (
                    <Skeleton key={i} variant="rounded" width={w} height={36} sx={{ borderRadius: 6, ...s }} />
                ))}
            </div>
            {/* Tabela */}
            <Skeleton variant="rounded" width="100%" height={40} sx={{ borderRadius: 6, mb: 0.5, ...s }} />
            {[...Array(5)].map((_, i) => (
                <Skeleton key={i} variant="rounded" width="100%" height={52} sx={{ borderRadius: 6, mb: 0.5, ...s }} />
            ))}
        </div>
    );
};

interface DateRange {
    startDate: string;
    endDate: string;
    label: string;
}

interface UnifiedCashflowTabProps {
    month: number;
    year: number;
    dateRange?: DateRange;
    defaultViewMode?: 'day' | 'month';
}

// 🩹 Recria o status financeiro legado a partir dos dados atuais do agendamento
// (o campo statusFinanceiro deixou de ser enviado pela API, mas a UI ainda o espera)
const isPerSessionPackage = (a: any): boolean => {
    const pt = a.package?.paymentType || a.package?.model;
    return pt === 'per-session' || pt === 'per_session';
};

// 🩹 Recria o status financeiro legado a partir dos dados atuais do agendamento
// (o campo statusFinanceiro deixou de ser enviado pela API, mas a UI ainda o espera)
const resolveStatusFinanceiro = (a: any): string => {
    if (a.operationalStatus === 'canceled') return 'Cancelado';
    if (a.billingType === 'convenio' || a.insuranceProvider) return 'Convênio';
    if (a.billingType === 'liminar') return 'Liminar';
    if (a.package) {
        // Per-session: pagamento real na data da sessão → NÃO é pré-pago
        if (isPerSessionPackage(a)) {
            if (a.paymentStatus === 'package_paid' || a.paymentStatus === 'paid' || a.visualFlag === 'ok') return 'Pago na Sessão';
            if (a.paymentStatus === 'pending' || a.visualFlag === 'pending' || a.visualFlag === 'blocked') return 'Pacote Pendente';
            return 'Pendente';
        }
        // Pré-pago/full: dinheiro entrou na compra do pacote
        if (a.paymentStatus === 'package_paid' || a.visualFlag === 'ok') return 'Pré-pago';
        if (a.paymentStatus === 'pending' || a.visualFlag === 'pending' || a.visualFlag === 'blocked') return 'Pacote Pendente';
    }
    if (a.paymentStatus === 'paid' || a.visualFlag === 'ok') return 'Pago na Sessão';
    if (a.paymentStatus === 'partial' || a.visualFlag === 'partial') return 'Pago Parcial';
    if ((a.serviceType === 'evaluation' || a.serviceType === 'neuropsych_evaluation') && a.paymentStatus === 'paid') return 'Avaliação Paga';
    return 'Pendente';
};

const UnifiedCashflowTab = ({ month, year, dateRange, defaultViewMode }: UnifiedCashflowTabProps) => {
    const [dailyCashflow, setDailyCashflow] = useState<CashflowV2Response | null>(null);

    const [monthData, setMonthData] = useState<DayData[]>([]);
    const [monthResumo, setMonthResumo] = useState<{
        caixaBruto: number; producaoTotal: number; convenioAReceber: number;
        porTipo: { particular: number; pacote: number; convenio: number; liminar: number };
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(0);
    const [dashboardOpen, setDashboardOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'day' | 'month'>('day');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [manualDateOverride, setManualDateOverride] = useState(false);
    const [dayAppointments, setDayAppointments] = useState<any[]>([]);
    const [appointmentFilter, setAppointmentFilter] = useState<string>('all');
    const [appointmentProfFilter, setAppointmentProfFilter] = useState<string>('all');
    const [txMetodoFilter, setTxMetodoFilter] = useState<string>('all');
    const [txTipoFilter, setTxTipoFilter] = useState<string>('all');
    const [txMultiFilter, setTxMultiFilter] = useState<boolean>(false);
    const [txPage, setTxPage] = useState(0);
    const [txPerPage, setTxPerPage] = useState(10);
    const [loadingAppointments, setLoadingAppointments] = useState(false);
    const [selectedApt, setSelectedApt] = useState<any | null>(null);
    const [editPayment, setEditPayment]   = useState<any | null>(null);
    const [groupDetailItems, setGroupDetailItems] = useState<any[] | null>(null);

    const navigate = useNavigate();
    const { user } = useAuth();
    const { setPendingContactPhone, setShouldOpenMessagesTab } = useChatNavigation();

    const handleOpenWhatsApp = (phone: string) => {
        const clean = phone.replace(/\D/g, '');
        setPendingContactPhone(clean);
        setShouldOpenMessagesTab(true);
        navigate('/admin/messages');
    };

    const handleDeletePayment = async (paymentId: string, label: string) => {
        if (!window.confirm(`Remover pagamento de ${label}?\n\nO vínculo com agendamento/sessão será limpo automaticamente.`)) return;
        try {
            await API.delete(`/v2/payments/${paymentId}`);
            toast.success('Pagamento removido');
            setGroupDetailItems(null);
            loadDayData();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Erro ao remover pagamento');
        }
    };

    const isFirstRender = useRef(true);

    // PatientsSummaryCard data
    const { data: analyticsData, loading: analyticsLoading, fetch: fetchAnalytics } = useAppointmentsByType();
    const { data: analyticsCreatedData, fetch: fetchAnalyticsCreated } = useAppointmentsByType();

    // 🏥 Dados operacionais: retenção + pacientes sem próxima sessão
    const { data: retentionData } = useRetentionSlots('', 30);
    const [patientsWithoutNext, setPatientsWithoutNext] = useState(0);
    const [patientsWithoutNextRecurrent, setPatientsWithoutNextRecurrent] = useState(0);
    const [patientsWithoutNextImpact, setPatientsWithoutNextImpact] = useState(0);
    const [patientsWithoutNextLoading, setPatientsWithoutNextLoading] = useState(false);
    const [patientsWithoutNextList, setPatientsWithoutNextList] = useState<any[]>([]);
    const [semProximaModalOpen, setSemProximaModalOpen] = useState(false);
    const [newPatientsModalOpen, setNewPatientsModalOpen] = useState(false);
    const [newSpecialtyModalOpen, setNewSpecialtyModalOpen] = useState(false);

    const fetchAnalyticsForPeriod = useCallback(async () => {
        const period = dateRange || { startDate: selectedDate, endDate: selectedDate };
        await Promise.all([
            fetchAnalytics({ startDate: period.startDate, endDate: period.endDate, mode: 'date' }),
            fetchAnalyticsCreated({ startDate: period.startDate, endDate: period.endDate, mode: 'createdAt' })
        ]);
    }, [fetchAnalytics, fetchAnalyticsCreated, selectedDate, dateRange]);

    // Reset manual override e sincroniza viewMode quando o filtro externo muda
    useEffect(() => {
        setManualDateOverride(false);
        if (dateRange) {
            setSelectedDate(dateRange.startDate);
        }
        if (defaultViewMode) {
            setViewMode(defaultViewMode);
        }
    }, [dateRange, defaultViewMode]);

    // Carrega dados do dia selecionado (ou range)
    useEffect(() => {
        const guard = { active: true };
        loadDayData(guard);
        loadDayAppointments(guard);
        fetchAnalyticsForPeriod();
        return () => { guard.active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDate, dateRange, manualDateOverride]);

    // Recarrega agendamentos quando o usuário NAVEGA para a aba (não no mount inicial)
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        if (activeTab === 5 && viewMode === 'day') {
            loadDayAppointments();
        }
    }, [activeTab]);

    // Busca pacientes sem próxima sessão (somente em modo dia)
    useEffect(() => {
        if (viewMode !== 'day') return;
        setPatientsWithoutNextLoading(true);
        operationalService.getPatientsWithoutNextSession()
            .then(res => {
                setPatientsWithoutNext(res.total);
                setPatientsWithoutNextRecurrent(res.recurrent);
                setPatientsWithoutNextImpact(res.impactMonthly);
                setPatientsWithoutNextList(res.patients || []);
            })
            .catch(err => console.error('[UnifiedCashflowTab] Erro ao buscar pacientes sem próxima sessão:', err))
            .finally(() => setPatientsWithoutNextLoading(false));
    }, [viewMode, selectedDate]);

    // Carrega dados do mês quando muda para visualização mensal ou quando o filtro global muda
    useEffect(() => {
        if (viewMode === 'month') {
            loadMonthData();
        }
    }, [viewMode, month, year]);

    useEffect(() => { setTxPage(0); }, [txMetodoFilter, txTipoFilter, txMultiFilter, txPerPage, selectedDate]);

    const loadDayData = async (guard = { active: true }) => {
        if (!dailyCashflow) setLoading(true); // skeleton apenas no primeiro carregamento
        try {
            let res;
            if (dateRange && !manualDateOverride) {
                res = await cashflowService.getCashflowRange(dateRange.startDate, dateRange.endDate);
            } else {
                res = await cashflowService.getDailyCashflow(selectedDate);
            }
            if (!guard.active) return;
            setDailyCashflow(res.data);
        } catch (error) {
            if (!guard.active) return;
            console.error('Erro ao carregar dados do dia:', error);
        } finally {
            if (guard.active) setLoading(false);
        }
    };

    const loadMonthData = async () => {
        setLoading(true);
        try {
            const monthStr = `${year}-${String(month).padStart(2, '0')}`;
            const res = await cashflowService.getMonthlyCashflow(monthStr);
            setMonthData(res.data.data);
            if (res.data.resumo) setMonthResumo(res.data.resumo);
        } catch (error) {
            console.error('Erro ao carregar dados do mês:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadDayAppointments = async (guard = { active: true }) => {
        setLoadingAppointments(true);
        try {
            const start = dateRange ? dateRange.startDate : selectedDate;
            const end = dateRange ? dateRange.endDate : selectedDate;
            console.log('[UnifiedCashflowTab] Buscando agendamentos para:', start, 'a', end);
            const res = await API.get<{ success: boolean; data: { appointments: any[]; pagination: any } }>('/v2/appointments', {
                params: { startDate: start, endDate: end, limit: 500 }
            });
            if (!guard.active) return;
            console.log('[UnifiedCashflowTab] Resposta:', res.data);
            // Legacy GET /appointments retorna array puro; v2 pode retornar { data: { appointments: [] } }
            const raw = res.data as any;
            setDayAppointments(Array.isArray(raw) ? raw : raw?.data?.appointments || raw?.appointments || []);
        } catch (error: any) {
            if (!guard.active) return;
            console.error('[UnifiedCashflowTab] Erro ao carregar agendamentos:', error?.response?.data || error.message);
        } finally {
            if (guard.active) setLoadingAppointments(false);
        }
    };

    const formatCurrency = (value: number) =>
        `R$ ${value?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const formatDateRange = (range: DateRange) => {
        const start = parseISO(range.startDate);
        const end = parseISO(range.endDate);
        if (range.startDate === range.endDate) {
            return format(start, "dd 'de' MMMM", { locale: ptBR });
        }
        const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
        if (sameMonth) {
            return `${format(start, 'dd')} a ${format(end, "dd 'de' MMMM", { locale: ptBR })}`;
        }
        return `${format(start, 'dd/MM')} a ${format(end, 'dd/MM/yyyy')}`;
    };

    const isRangeActive = !!dateRange;
    const isMultiDayRange = isRangeActive && dateRange!.startDate !== dateRange!.endDate;
    const periodLabel = isMultiDayRange ? 'Período' : 'Dia';
    const periodTitle = isMultiDayRange ? 'do Período' : 'do Dia';

    const data = dailyCashflow?.data;

    // Cálculos para o mês
    const monthTotals = useMemo(() => {
        const totalCaixa = monthData.reduce((sum, d) => sum + d.caixa, 0);
        const totalProducao = monthData.reduce((sum, d) => sum + d.producao, 0);
        const totalAtendimentos = monthData.reduce((sum, d) => sum + d.atendimentos, 0);
        const diasComMovimento = monthData.filter(d => d.caixa > 0).length;
        const mediaDiaria = diasComMovimento > 0 ? totalCaixa / diasComMovimento : 0;
        return { totalCaixa, totalProducao, totalAtendimentos, diasComMovimento, mediaDiaria };
    }, [monthData]);

    // 🏥 Dados de retenção para o card "Grade em risco"
    const retentionCritical = retentionData?.summary?.criticalSlots || 0;
    const retentionLoss = retentionData?.summary?.potentialLossMonthly || 0;

    // Agrupar dados do mês por semana para visualização
    const weeksData = useMemo(() => {
        const weeks: { week: number; caixa: number; producao: number; dias: number }[] = [];
        let currentWeek = 1;
        let weekCaixa = 0;
        let weekProducao = 0;
        let weekDays = 0;
        
        monthData.forEach((day, index) => {
            weekCaixa += day.caixa;
            weekProducao += day.producao;
            weekDays++;
            
            if ((index + 1) % 7 === 0 || index === monthData.length - 1) {
                weeks.push({
                    week: currentWeek,
                    caixa: weekCaixa,
                    producao: weekProducao,
                    dias: weekDays
                });
                currentWeek++;
                weekCaixa = 0;
                weekProducao = 0;
                weekDays = 0;
            }
        });
        return weeks;
    }, [monthData]);

    return (
        <div>
            {/* Header com Filtros */}
            <div className="p-3 mb-4 border border-gray-200 rounded-lg bg-white">
                <div className="flex flex-wrap justify-between items-center gap-3">
                    <div className="flex flex-wrap gap-3 items-center">
                        {/* Toggle Dia/Mês */}
                        <select
                            value={viewMode}
                            onChange={(e) => setViewMode(e.target.value as 'day' | 'month')}
                            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                            <option value="day">📅 {isMultiDayRange ? 'Período' : 'Dia'}</option>
                            <option value="month">📊 Mês</option>
                        </select>

                        {viewMode === 'day' ? (
                            isMultiDayRange ? (
                                <span className="px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md">
                                    {formatDateRange(dateRange!)}
                                </span>
                            ) : (
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => {
                                        setSelectedDate(e.target.value);
                                        setManualDateOverride(true);
                                    }}
                                    className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                            )
                        ) : (
                            <span className="text-sm font-medium text-gray-700">
                                {format(new Date(year, month - 1), 'MMMM/yyyy', { locale: ptBR })}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-200">
                        <CalendarTodayIcon className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700">
                            {viewMode === 'day' 
                                ? (isRangeActive && dateRange ? formatDateRange(dateRange) : format(parseISO(selectedDate), "dd 'de' MMMM", { locale: ptBR }))
                                : format(new Date(year, month - 1), 'MMMM/yyyy', { locale: ptBR })}
                        </span>
                    </div>
                </div>
            </div>

            {loading ? (
                <CashflowCardsSkeleton />
            ) : viewMode === 'day' && data ? (
                // ===== VISUALIZAÇÃO DIÁRIA =====
                <div>
                <div>
                    {/* Accordion: Resumo do Dia */}
                    <button
                        onClick={() => setDashboardOpen(open => !open)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl mb-3 transition-all shadow-sm border border-emerald-200 hover:brightness-95"
                        style={{ background: 'linear-gradient(90deg, #ecfdf5 0%, #eff6ff 100%)' }}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-black text-emerald-700 uppercase tracking-widest">Resumo do Dia</span>
                            {!dashboardOpen && data && (
                                <span className="text-xs text-gray-500 ml-1">
                                    <span className="font-semibold text-emerald-600">{formatCurrency(data.caixa.total)}</span>
                                    <span className="text-gray-400"> recebido · </span>
                                    <span className="font-semibold text-blue-600">{formatCurrency(data.producao.total)}</span>
                                    <span className="text-gray-400"> produção</span>
                                </span>
                            )}
                        </div>
                        <ExpandMoreIcon
                            className={`text-emerald-600 transition-transform duration-200 ${dashboardOpen ? 'rotate-180' : ''}`}
                            style={{ fontSize: 20 }}
                        />
                    </button>
                    {dashboardOpen && <>
                    {/* ========== RECEITA PREVISTA vs REALIZADA ========== */}
                    {(() => {
                        const sessaoApts = dayAppointments.filter((a: any) => !['canceled', 'pre_agendado', 'converted'].includes(a.operationalStatus));
                        const previsto = sessaoApts.reduce((s: number, a: any) => s + (a.sessionValue || a.package?.sessionValue || 0), 0);
                        const recebido = data.caixa.total;
                        const gap = previsto - recebido;
                        const pct = previsto > 0 ? Math.min(100, Math.round((recebido / previsto) * 100)) : 100;
                        const isLoadingApts = loadingAppointments && dayAppointments.length === 0;
                        if (!isLoadingApts && previsto === 0) return null;
                        return (
                            <div className="mb-4 rounded-2xl border-2 p-5 shadow-sm" style={{ borderColor: '#6366F1', backgroundColor: '#F5F3FF' }}>
                                <div className="text-[10px] font-black text-violet-700 uppercase tracking-widest mb-4">Receita Prevista × Realizada</div>
                                <div className="grid grid-cols-3 gap-4 mb-4">
                                    <div>
                                        <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Previsto</div>
                                        <div className="text-xl font-bold text-violet-700">
                                            {isLoadingApts ? <Skeleton width={80} height={28} sx={{ bgcolor: 'rgba(0,0,0,0.08)' }} /> : formatCurrency(previsto)}
                                        </div>
                                        <div className="text-[10px] text-gray-400 mt-0.5">{sessaoApts.length} sessões agendadas</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Realizado</div>
                                        <div className="text-xl font-bold text-emerald-700">{formatCurrency(recebido)}</div>
                                        <div className="text-[10px] text-gray-400 mt-0.5">{data.transacoes?.length || 0} transações</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">{gap > 0 ? 'Não realizado' : 'Saldo'}</div>
                                        <div className={`text-xl font-bold ${gap > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                            {isLoadingApts ? <Skeleton width={80} height={28} sx={{ bgcolor: 'rgba(0,0,0,0.08)' }} /> : formatCurrency(Math.abs(gap))}
                                        </div>
                                        <div className={`text-[10px] mt-0.5 font-semibold ${gap > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                            {isLoadingApts ? '...' : gap > 0 ? `${100 - pct}% pendente/a receber` : 'acima do previsto'}
                                        </div>
                                    </div>
                                </div>
                                <div className="w-full bg-violet-100 rounded-full h-2.5 overflow-hidden">
                                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: isLoadingApts ? '0%' : `${pct}%` }} />
                                </div>
                                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                                    <span>{isLoadingApts ? '...' : `${pct}% realizado`}</span>
                                    <span>{!isLoadingApts && pct < 100 ? `${100 - pct}% ainda por entrar` : ''}</span>
                                </div>
                            </div>
                        );
                    })()}

                    {/* ========== LINHA 1: Saúde Operacional do Dia ========== */}
                    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 ${isMultiDayRange ? 'lg:grid-cols-3' : 'lg:grid-cols-5'}`}>

                        {/* ── Caixa Hoje ── */}
                        <div className="rounded-2xl border-2 p-5 shadow-sm" style={{ borderColor: '#10B981', backgroundColor: '#F0FDF4' }}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                    <AttachMoneyIcon style={{ fontSize: 20 }} className="text-emerald-600" />
                                </div>
                                <div>
                                    <div className="text-xs font-black text-emerald-700 uppercase tracking-widest">Caixa Hoje</div>
                                    <div className="text-[11px] text-gray-400 leading-tight">Dinheiro Recebido</div>
                                </div>
                            </div>
                            <div className="text-[26px] font-extrabold text-emerald-700 leading-none tracking-tight mb-2">
                                {formatCurrency(data.caixa.total)}
                            </div>
                            {(() => {
                                const variacao = data.comparativos?.variacaoVsOntem ?? 0;
                                const pos = variacao >= 0;
                                return (
                                    <div className={`flex items-center gap-1 text-xs mb-3 ${pos ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {pos ? <ArrowUpwardIcon style={{ fontSize: 14 }} /> : <ArrowDownwardIcon style={{ fontSize: 14 }} />}
                                        <span className="font-semibold">{pos ? '+' : ''}{variacao}%</span>
                                        <span className="text-gray-400">vs ontem ({formatCurrency(data.comparativos?.ontem ?? 0)})</span>
                                    </div>
                                );
                            })()}
                            {/* Entrada Real vs Antecipação */}
                            {(() => {
                                const transacoes = data.transacoes || [];
                                const vendaPacotes = transacoes.reduce((s: number, t: any) => s + (t.isPackageSale ? (t.valor || 0) : 0), 0);
                                const sessoesPacote = transacoes.reduce((s: number, t: any) => s + (t.tipo === 'Pacote' && !t.isPackageSale ? (t.valor || 0) : 0), 0);
                                const avaliacoesDoDia = transacoes.reduce((s: number, t: any) => s + (t.tipo !== 'Pacote' && !t.isPackageSale && (t.servico === 'Avaliação' || t.servico === 'Avaliação Neuropsicológica') ? (t.valor || 0) : 0), 0);
                                const sessoesDoDia = transacoes.reduce((s: number, t: any) => s + (t.tipo !== 'Pacote' && !t.isPackageSale && t.servico !== 'Avaliação' && t.servico !== 'Avaliação Neuropsicológica' ? (t.valor || 0) : 0), 0);
                                const outros = data.caixa.total - sessoesDoDia - avaliacoesDoDia - sessoesPacote - vendaPacotes;
                                return (
                                    <div className="pt-3 border-t border-gray-100 space-y-2">
                                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Origem do Caixa</div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="flex items-center gap-2 text-gray-600"><span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />Sessões do dia</span>
                                            <span className="font-semibold text-gray-800">{formatCurrency(sessoesDoDia)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="flex items-center gap-2 text-gray-600"><span className="w-2 h-2 rounded-full bg-pink-400 flex-shrink-0" />Avaliações do dia</span>
                                            <span className="font-semibold text-gray-800">{formatCurrency(avaliacoesDoDia)}</span>
                                        </div>
                                        {sessoesPacote > 0 && (
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="flex items-center gap-2 text-gray-600"><span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />Sessões de pacote</span>
                                                <span className="font-semibold text-gray-800">{formatCurrency(sessoesPacote)}</span>
                                            </div>
                                        )}
                                        {vendaPacotes > 0 && (
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="flex items-center gap-2 text-gray-600"><span className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />Venda de pacotes</span>
                                                <span className="font-semibold text-gray-800">{formatCurrency(vendaPacotes)}</span>
                                            </div>
                                        )}
                                        {outros > 10 && (
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="flex items-center gap-2 text-gray-600"><span className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" />Outros</span>
                                                <span className="font-semibold text-gray-800">{formatCurrency(outros)}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* ── Produção Hoje ── */}
                        <div className="rounded-2xl border-2 p-5 shadow-sm" style={{ borderColor: '#3B82F6', backgroundColor: '#EFF6FF' }}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                                    <ShowChartIcon style={{ fontSize: 20 }} className="text-blue-600" />
                                </div>
                                <div>
                                    <div className="text-xs font-black text-blue-700 uppercase tracking-widest">Produção Hoje</div>
                                    <div className="text-[11px] text-gray-400 leading-tight">Sessões Realizadas</div>
                                </div>
                            </div>
                            <div className="text-[26px] font-extrabold text-blue-700 leading-none tracking-tight mb-2">
                                {formatCurrency(data.producao.total)}
                            </div>
                            <div className="text-xs text-gray-500 mb-3">
                                <span className="font-semibold text-gray-700">{data.producao.quantidadeAtendimentos}</span> atendimentos
                                <span className="mx-1.5 text-gray-300">·</span>
                                Ticket: <span className="font-semibold text-gray-700">{formatCurrency(data.producao.ticketMedio)}</span>
                            </div>
                            {(() => {
                                const pros = new Set((data.transacoes || []).map((t: any) => t.profissional).filter(Boolean));
                                if (pros.size === 0) return null;
                                return (
                                    <div className="flex items-center gap-1.5 text-xs text-blue-600 mb-3">
                                        <PeopleIcon style={{ fontSize: 14 }} />
                                        <span className="font-medium">{pros.size} profissional{pros.size !== 1 ? 'es' : ''} ativo{pros.size !== 1 ? 's' : ''}</span>
                                    </div>
                                );
                            })()}
                            {/* Risco: % não recebido + convênio dominante */}
                            {(() => {
                                const total = data.producao.total || 1;
                                const naoRecebido = (data.producao.aReceber || 0) + ((data.conveniosAtendidos || []).reduce((s: number, c: any) => s + (c.valor || 0), 0));
                                const pctNaoRecebido = Math.round((naoRecebido / total) * 100);
                                const porTipo = data.producao.porTipo || {};
                                const convenioDominante = (porTipo.convenio || 0) > total * 0.5;
                                return (
                                    <div className="pt-3 border-t border-gray-100 space-y-2">
                                        {pctNaoRecebido > 0 && (
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-semibold ${pctNaoRecebido > 50 ? 'text-red-600' : pctNaoRecebido > 25 ? 'text-amber-600' : 'text-blue-600'}`}>
                                                    ⚠️ {pctNaoRecebido}% ainda não recebidos
                                                </span>
                                            </div>
                                        )}
                                        {convenioDominante && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-purple-600">💳 Convênio dominante hoje</span>
                                            </div>
                                        )}
                                        {(() => {
                                            const tipos = data.producao.porTipo || {};
                                            const items = [
                                                { label: 'Particular', value: tipos.particular || 0, color: 'bg-blue-100 text-blue-700' },
                                                { label: 'Pacote', value: tipos.pacote || 0, color: 'bg-indigo-100 text-indigo-700' },
                                                { label: 'Convênio', value: tipos.convenio || 0, color: 'bg-purple-100 text-purple-700' },
                                                { label: 'Liminar', value: tipos.liminar || 0, color: 'bg-orange-100 text-orange-700' },
                                            ].filter(i => i.value > 0);
                                            if (items.length === 0) return null;
                                            return (
                                                <div className="flex flex-wrap gap-1.5 pt-1">
                                                    {items.map(i => (
                                                        <span key={i.label} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${i.color}`}>
                                                            {i.label} {formatCurrency(i.value)}
                                                        </span>
                                                    ))}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* ── Agenda Hoje (Operacional) ── */}
                        {!isMultiDayRange && (() => {
                            const all = analyticsData?.all || [];
                            const agendados = all.filter((a: any) => !['converted', 'pre_agendado'].includes(a.operationalStatus));
                            const atendidos = all.filter((a: any) => a.operationalStatus === 'completed');
                            const aguardando = all.filter((a: any) => a.operationalStatus === 'scheduled');
                            return (
                                <div className="rounded-2xl border-2 p-5 shadow-sm" style={{ borderColor: '#0EA5E9', backgroundColor: '#F0F9FF' }}>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center flex-shrink-0">
                                            <CalendarTodayIcon style={{ fontSize: 20 }} className="text-sky-600" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-black text-sky-700 uppercase tracking-widest">Agenda Hoje</div>
                                            <div className="text-[11px] text-gray-400 leading-tight">Consultas do dia</div>
                                        </div>
                                    </div>
                                    <div className="flex items-baseline gap-2 mb-1">
                                        <span className="text-[26px] font-extrabold text-sky-700 leading-none tracking-tight">{atendidos.length}</span>
                                        <span className="text-sm text-gray-400">/ {agendados.length}</span>
                                    </div>
                                    <div className="pt-3 border-t border-gray-100 flex flex-col gap-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Atendidos</span>
                                            <span className="text-sm font-bold text-emerald-600">{atendidos.length}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Aguardando</span>
                                            <span className="text-sm font-bold text-amber-600">{aguardando.length}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* ── Novos Agendamentos (Comercial) ── */}
                        {!isMultiDayRange && (() => {
                            const todosNoDia = analyticsData?.all || [];
                            const totalNoDia = todosNoDia.length;
                            const preAgendados = (analyticsCreatedData?.leads || []).length;
                            const novosPacientes = (analyticsCreatedData?.novos || []).length;
                            const novosEspCount = (analyticsData?.novosEspecialidade || []).length;
                            const liminarCount = (analyticsData?.continuousTreatment || []).length;
                            const acquisitionPool = totalNoDia - liminarCount;
                            const retornos = Math.max(0, acquisitionPool - preAgendados - novosPacientes - novosEspCount);
                            return (
                                <div className="rounded-2xl border-2 p-5 shadow-sm" style={{ borderColor: '#EC4899', backgroundColor: '#FDF2F8' }}>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-9 h-9 rounded-xl bg-pink-100 flex items-center justify-center flex-shrink-0">
                                            <AddCircleIcon style={{ fontSize: 20 }} className="text-pink-600" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-black text-pink-700 uppercase tracking-widest">Perfil do Dia</div>
                                            <div className="text-[11px] text-gray-400 leading-tight">Agendados para o dia</div>
                                        </div>
                                    </div>
                                    <div className="flex items-baseline gap-2 mb-1">
                                        <span className="text-[26px] font-extrabold text-pink-700 leading-none tracking-tight">{totalNoDia}</span>
                                    </div>
                                    <div className="pt-3 border-t border-pink-100 flex flex-col gap-y-2">
                                        <button onClick={() => (preAgendados + novosPacientes) > 0 && setNewPatientsModalOpen(true)} className={`flex items-center justify-between w-full text-left rounded px-1 -mx-1 transition-colors ${(preAgendados + novosPacientes) > 0 ? 'hover:bg-pink-50 cursor-pointer' : 'cursor-default'}`}>
                                            <span className="text-[10px] text-gray-500 uppercase tracking-wide">🟢 Novo Paciente</span>
                                            <span className="text-sm font-bold text-emerald-600">{preAgendados + novosPacientes}</span>
                                        </button>
                                        <button onClick={() => novosEspCount > 0 && setNewSpecialtyModalOpen(true)} className={`flex items-center justify-between w-full text-left rounded px-1 -mx-1 transition-colors ${novosEspCount > 0 ? 'hover:bg-pink-50 cursor-pointer' : 'cursor-default'}`}>
                                            <span className="text-[10px] text-gray-500 uppercase tracking-wide">🟣 Nova Especialidade</span>
                                            <span className="text-sm font-bold text-violet-600">{novosEspCount}</span>
                                        </button>
                                        <div className="flex items-center justify-between border-t border-pink-100 pt-1">
                                            <span className="text-[10px] text-gray-500 uppercase tracking-wide">↩ Retornos / regulares</span>
                                            <span className="text-sm font-bold text-gray-700">{retornos}</span>
                                        </div>
                                        {liminarCount > 0 && (
                                            <div className="flex items-center justify-between border-t border-pink-100 pt-1">
                                                <span className="text-[10px] text-orange-500 uppercase tracking-wide">⚖️ Trat. Liminares</span>
                                                <span className="text-sm font-bold text-orange-600">{liminarCount}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* ── Pendências Hoje ── */}
                        <div className="rounded-2xl border-2 p-5 shadow-sm" style={{ borderColor: '#F59E0B', backgroundColor: '#FFFBEB' }}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                                    <WarningIcon style={{ fontSize: 20 }} className="text-amber-600" />
                                </div>
                                <div>
                                    <div className="text-xs font-black text-amber-700 uppercase tracking-widest">Pendências Hoje</div>
                                    <div className="text-[11px] text-gray-400 leading-tight">Ações Necessárias</div>
                                </div>
                            </div>
                            {(() => {
                                const nPendentes = data.pendentesCobranca?.length || 0;
                                const nConvenios = data.conveniosAtendidos?.length || 0;
                                const particular = data.producao.aReceber || 0;
                                const convenioTotal = (data.conveniosAtendidos || []).reduce((s: number, c: any) => s + (c.valor || 0), 0);
                                const totalAberto = particular + convenioTotal;
                                return (
                                    <>
                                        <div className="text-[26px] font-extrabold text-amber-700 leading-none tracking-tight mb-1">
                                            {formatCurrency(totalAberto)}
                                        </div>
                                        <div className="text-xs text-gray-500 mb-3">Total em aberto</div>
                                        <div className="pt-3 border-t border-gray-100 space-y-2.5">
                                            {nPendentes > 0 && (
                                                <div className="flex items-start gap-2">
                                                    <span className="text-lg leading-none">⚠️</span>
                                                    <div className="flex-1">
                                                        <div className="text-sm font-bold text-gray-800">{nPendentes} cobrança{nPendentes !== 1 ? 's' : ''} pendente{nPendentes !== 1 ? 's' : ''}</div>
                                                        <div className="text-xs text-amber-700 font-semibold">{formatCurrency(particular)} aguardando</div>
                                                    </div>
                                                </div>
                                            )}
                                            {nConvenios > 0 && (
                                                <div className="flex items-start gap-2">
                                                    <span className="text-lg leading-none">🏥</span>
                                                    <div className="flex-1">
                                                        <div className="text-sm font-bold text-gray-800">{nConvenios} convênio{nConvenios !== 1 ? 's' : ''} sem faturamento</div>
                                                        <div className="text-xs text-purple-700 font-semibold">{formatCurrency(convenioTotal)} a faturar</div>
                                                    </div>
                                                </div>
                                            )}
                                            {totalAberto === 0 && (
                                                <div className="text-sm text-emerald-600 font-medium">🎉 Nenhuma pendência hoje!</div>
                                            )}
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>

                    {/* ========== LINHA 2: Riscos Operacionais ========== */}
                    {!isMultiDayRange && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                            {/* Sem próxima sessão */}
                            <button
                                onClick={() => patientsWithoutNext > 0 && setSemProximaModalOpen(true)}
                                className={`text-left rounded-xl border p-4 transition-all group ${patientsWithoutNext > 0 ? 'bg-red-50 border-red-200 hover:border-red-400 hover:shadow-md cursor-pointer' : 'bg-gray-50 border-gray-200 cursor-default'}`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">🚨</span>
                                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Sem próxima sessão</span>
                                    </div>
                                    {patientsWithoutNext > 0 && (
                                        <ArrowForwardIcon style={{ fontSize: 16 }} className="text-red-400 group-hover:text-red-600 transition-colors" />
                                    )}
                                </div>
                                <div className={`text-2xl font-bold ${patientsWithoutNext > 0 ? 'text-red-700' : 'text-gray-400'}`}>{patientsWithoutNext}</div>
                                <div className="text-[11px] text-gray-500">pacientes</div>
                                {patientsWithoutNextRecurrent > 0 && (
                                    <div className="mt-2 text-xs text-red-600 font-semibold">
                                        {patientsWithoutNextRecurrent} recorrentes · {formatCurrency(patientsWithoutNextImpact)}/mês
                                    </div>
                                )}
                            </button>

                            {/* Grade em risco */}
                            <button
                                onClick={() => navigate('/retention')}
                                className={`text-left rounded-xl border p-4 transition-all group ${retentionCritical > 0 ? 'bg-orange-50 border-orange-200 hover:border-orange-400 hover:shadow-md cursor-pointer' : 'bg-gray-50 border-gray-200 cursor-default'}`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">⚠️</span>
                                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Grade em risco</span>
                                    </div>
                                    {retentionCritical > 0 && (
                                        <ArrowForwardIcon style={{ fontSize: 16 }} className="text-orange-400 group-hover:text-orange-600 transition-colors" />
                                    )}
                                </div>
                                <div className={`text-2xl font-bold ${retentionCritical > 0 ? 'text-orange-700' : 'text-gray-400'}`}>{retentionCritical}</div>
                                <div className="text-[11px] text-gray-500">horários críticos</div>
                                {retentionLoss > 0 && (
                                    <div className="mt-2 text-xs text-orange-600 font-semibold">
                                        Perda potencial: {formatCurrency(retentionLoss)}/mês
                                    </div>
                                )}
                            </button>

                            {/* Cobranças */}
                            <button
                                onClick={() => setActiveTab(1)}
                                className={`text-left rounded-xl border p-4 transition-all group ${(data.pendentesCobranca?.length || 0) > 0 ? 'bg-amber-50 border-amber-200 hover:border-amber-400 hover:shadow-md cursor-pointer' : 'bg-gray-50 border-gray-200 cursor-default'}`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <WarningIcon style={{ fontSize: 18 }} className={(data.pendentesCobranca?.length || 0) > 0 ? 'text-amber-600' : 'text-gray-400'} />
                                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Cobrança</span>
                                    </div>
                                    {(data.pendentesCobranca?.length || 0) > 0 && (
                                        <ArrowForwardIcon style={{ fontSize: 16 }} className="text-amber-400 group-hover:text-amber-600 transition-colors" />
                                    )}
                                </div>
                                <div className={`text-2xl font-bold ${(data.pendentesCobranca?.length || 0) > 0 ? 'text-amber-700' : 'text-gray-400'}`}>{data.pendentesCobranca?.length || 0}</div>
                                <div className="text-[11px] text-gray-500">pendências</div>
                            </button>

                            {/* Convênios */}
                            <button
                                onClick={() => setActiveTab(3)}
                                className={`text-left rounded-xl border p-4 transition-all group ${(data.conveniosAtendidos?.length || 0) > 0 ? 'bg-purple-50 border-purple-200 hover:border-purple-400 hover:shadow-md cursor-pointer' : 'bg-gray-50 border-gray-200 cursor-default'}`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <ShowChartIcon style={{ fontSize: 18 }} className={(data.conveniosAtendidos?.length || 0) > 0 ? 'text-purple-600' : 'text-gray-400'} />
                                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Convênios</span>
                                    </div>
                                    {(data.conveniosAtendidos?.length || 0) > 0 && (
                                        <ArrowForwardIcon style={{ fontSize: 16 }} className="text-purple-400 group-hover:text-purple-600 transition-colors" />
                                    )}
                                </div>
                                <div className={`text-2xl font-bold ${(data.conveniosAtendidos?.length || 0) > 0 ? 'text-purple-700' : 'text-gray-400'}`}>{data.conveniosAtendidos?.length || 0}</div>
                                <div className="text-[11px] text-gray-500">para faturar</div>
                            </button>
                        </div>
                    )}

                    {/* Modal: Pré-agendados Novos */}
                    {newPatientsModalOpen && (() => {
                        const leads = [
                            ...(analyticsCreatedData?.leads || []),
                            ...(analyticsCreatedData?.novos || [])
                        ];
                        const svcLabel: Record<string, string> = { evaluation: 'Avaliação', session: 'Sessão', package_session: 'Sessão Pacote', tongue_tie_test: 'Teste Linguinha', neuropsych_evaluation: 'Aval. Neuropsic.', individual_session: 'Sessão Avulsa', package: 'Pacote' };
                        const billingColor: Record<string, string> = { particular: 'bg-blue-100 text-blue-700', convenio: 'bg-purple-100 text-purple-700', liminar: 'bg-orange-100 text-orange-700', package: 'bg-indigo-100 text-indigo-700' };
                        return (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setNewPatientsModalOpen(false)}>
                                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                                    <div className="flex items-center justify-between p-6 border-b border-gray-100">
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900">⭐ Primeiras Consultas</h3>
                                            <p className="text-sm text-gray-500 mt-1">{isRangeActive && dateRange ? formatDateRange(dateRange) : format(parseISO(selectedDate), "dd 'de' MMMM", { locale: ptBR })}</p>
                                        </div>
                                        <button onClick={() => setNewPatientsModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
                                    </div>
                                    <div className="overflow-y-auto p-6">
                                        {leads.length === 0 ? (
                                            <p className="text-center text-gray-500 py-8">Nenhum pré-agendado novo encontrado.</p>
                                        ) : (
                                            <div className="space-y-3">
                                                {leads.map((apt: any) => (
                                                    <div key={apt._id} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <p className="font-semibold text-gray-900">{apt.patientInfo?.fullName || apt.patient?.fullName || 'Nome não informado'}</p>
                                                                    <span className="bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full text-[10px] font-bold">⭐ 1ª Visita</span>
                                                                </div>
                                                                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
                                                                    <span>📞 {apt.patientInfo?.phone || apt.patient?.phone || 'Sem telefone'}</span>
                                                                    <span>📅 {apt.date ? new Date(apt.date).toLocaleDateString('pt-BR') : ''} {apt.time}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                                    <span className="text-xs text-gray-500">👤 {apt.doctor?.fullName || apt.professionalName || 'Profissional não informado'}</span>
                                                                    {apt.specialty && <span className="bg-green-200 text-green-700 px-1.5 py-0.5 rounded-full text-[10px] uppercase font-medium">{apt.specialty}</span>}
                                                                    {apt.serviceType && <span className="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full text-[10px] font-medium">{svcLabel[apt.serviceType] || apt.serviceType}</span>}
                                                                    {apt.billingType && <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${billingColor[apt.billingType] || 'bg-gray-100 text-gray-600'}`}>{apt.billingType === 'particular' ? 'Particular' : apt.billingType === 'convenio' ? 'Convênio' : apt.billingType}</span>}
                                                                </div>
                                                            </div>
                                                            <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${apt.operationalStatus === 'pre_agendado' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                {apt.operationalStatus === 'pre_agendado' ? 'Pré-agendado' : 'Agendado'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl text-sm text-gray-600 text-center">
                                        <strong>{leads.length}</strong> paciente{leads.length !== 1 ? 's' : ''} novo{leads.length !== 1 ? 's' : ''} {isRangeActive ? 'no período' : 'hoje'}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Modal: Novos na Especialidade */}
                    {newSpecialtyModalOpen && (() => {
                        const novosEsp = (analyticsCreatedData?.novosEspecialidade || []).length > 0
                            ? (analyticsCreatedData?.novosEspecialidade || [])
                            : (analyticsData?.novosEspecialidade || []);
                        const svcLabel: Record<string, string> = { evaluation: 'Avaliação', session: 'Sessão', package_session: 'Sessão Pacote', tongue_tie_test: 'Teste Linguinha', neuropsych_evaluation: 'Aval. Neuropsic.', individual_session: 'Sessão Avulsa', package: 'Pacote' };
                        const billingColor: Record<string, string> = { particular: 'bg-blue-100 text-blue-700', convenio: 'bg-purple-100 text-purple-700', liminar: 'bg-orange-100 text-orange-700', package: 'bg-indigo-100 text-indigo-700' };
                        return (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setNewSpecialtyModalOpen(false)}>
                                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                                    <div className="flex items-center justify-between p-6 border-b border-gray-100">
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900">Novos na Especialidade</h3>
                                            <p className="text-sm text-gray-500 mt-1">{isRangeActive && dateRange ? formatDateRange(dateRange) : format(parseISO(selectedDate), "dd 'de' MMMM", { locale: ptBR })}</p>
                                        </div>
                                        <button onClick={() => setNewSpecialtyModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
                                    </div>
                                    <div className="overflow-y-auto p-6">
                                        {novosEsp.length === 0 ? (
                                            <p className="text-center text-gray-500 py-8">Nenhum paciente com nova especialidade {isRangeActive ? 'no período' : 'hoje'}.</p>
                                        ) : (
                                            <div className="space-y-3">
                                                {novosEsp.map((apt: any) => (
                                                    <div key={apt._id} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <p className="font-semibold text-gray-900">{apt.patientInfo?.fullName || apt.patient?.fullName || 'Nome não informado'}</p>
                                                                    <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold">✨ Nova Especialidade</span>
                                                                </div>
                                                                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
                                                                    <span>📞 {apt.patientInfo?.phone || apt.patient?.phone || 'Sem telefone'}</span>
                                                                    <span>📅 {apt.date ? new Date(apt.date).toLocaleDateString('pt-BR') : ''} {apt.time}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                                    <span className="text-xs text-gray-500">👤 {apt.doctor?.fullName || apt.professionalName || 'Profissional não informado'}</span>
                                                                    {apt.specialty && <span className="bg-green-200 text-green-700 px-1.5 py-0.5 rounded-full text-[10px] uppercase font-medium">{apt.specialty}</span>}
                                                                    {apt.serviceType && <span className="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full text-[10px] font-medium">{svcLabel[apt.serviceType] || apt.serviceType}</span>}
                                                                    {apt.billingType && <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${billingColor[apt.billingType] || 'bg-gray-100 text-gray-600'}`}>{apt.billingType === 'particular' ? 'Particular' : apt.billingType === 'convenio' ? 'Convênio' : apt.billingType}</span>}
                                                                </div>
                                                            </div>
                                                            <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${apt.operationalStatus === 'pre_agendado' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                {apt.operationalStatus === 'pre_agendado' ? 'Pré-agendado' : 'Agendado'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl text-sm text-gray-600 text-center">
                                        <strong>{novosEsp.length}</strong> paciente{novosEsp.length !== 1 ? 's' : ''} com nova especialidade {isRangeActive ? 'no período' : 'hoje'}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* ========== Modal: Sem Próxima Sessão ========== */}
                    {semProximaModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSemProximaModalOpen(false)}>
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                                    <div>
                                        <h3 className="text-base font-bold text-red-700">🚨 Pacientes sem próxima sessão</h3>
                                        <p className="text-xs text-gray-500 mt-0.5">Atendidos hoje sem agendamento futuro</p>
                                    </div>
                                    <button onClick={() => setSemProximaModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
                                </div>
                                <div className="overflow-y-auto flex-1 p-4 space-y-3">
                                    {patientsWithoutNextList.length === 0 ? (
                                        <p className="text-sm text-gray-400 text-center py-6">Nenhum paciente encontrado.</p>
                                    ) : patientsWithoutNextList.map((p: any) => (
                                        <div key={p.patientId} className="p-3 rounded-xl bg-red-50 border border-red-100 space-y-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-gray-800 truncate">{p.name}</p>
                                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                                        {p.specialty && (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700">{p.specialty}</span>
                                                        )}
                                                        {p.lastSessionTime && (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">🕐 {p.lastSessionTime}</span>
                                                        )}
                                                        {p.count > 1 && (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-100 text-orange-700">{p.count} sessões hoje</span>
                                                        )}
                                                    </div>
                                                    {p.phone && (
                                                        <p className="text-xs text-gray-400 mt-1">{p.phone}</p>
                                                    )}
                                                </div>
                                                {p.phone && (
                                                    <button
                                                        onClick={() => handleOpenWhatsApp(p.phone)}
                                                        className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-medium"
                                                    >
                                                        💬 WhatsApp
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-4 border-t border-gray-100 text-center text-xs text-gray-400">
                                    {patientsWithoutNextRecurrent > 0 && (
                                        <span className="text-red-600 font-semibold">{patientsWithoutNextRecurrent} recorrentes · {formatCurrency(patientsWithoutNextImpact)}/mês em risco</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========== KPIs Executivos ========== */}
                    {dayAppointments.length > 0 && (() => {
                        const allApts = dayAppointments.filter((a: any) => !['converted', 'pre_agendado'].includes(a.operationalStatus));
                        const cancelados = dayAppointments.filter((a: any) => a.operationalStatus === 'canceled');
                        const receitaPerdida = cancelados.reduce((s: number, a: any) => s + (a.sessionValue || a.package?.sessionValue || 0), 0);
                        const cancelRate = allApts.length > 0 ? Math.round((cancelados.length / allApts.length) * 100) : 0;
                        const atendidos = dayAppointments.filter((a: any) => a.operationalStatus === 'completed').length;
                        const ticketCaixa = (data.transacoes?.length || 0) > 0 ? data.caixa.total / data.transacoes!.length : 0;
                        return (
                            <div className="flex flex-wrap gap-2 mb-3 px-1">
                                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2">
                                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Atendidos</span>
                                    <span className="text-base font-bold text-emerald-700">{atendidos}</span>
                                    <span className="text-[10px] text-gray-400">/ {allApts.length}</span>
                                </div>
                                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
                                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">Ticket Caixa</span>
                                    <span className="text-base font-bold text-blue-700">{formatCurrency(ticketCaixa)}</span>
                                </div>
                                <div className={`flex items-center gap-2 rounded-xl px-4 py-2 border ${cancelRate > 20 ? 'bg-red-50 border-red-300' : cancelRate > 10 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
                                    <span className={`text-[10px] font-bold uppercase tracking-wide ${cancelRate > 20 ? 'text-red-700' : cancelRate > 10 ? 'text-amber-700' : 'text-gray-500'}`}>Cancelamentos</span>
                                    <span className={`text-base font-bold ${cancelRate > 20 ? 'text-red-700' : cancelRate > 10 ? 'text-amber-700' : 'text-gray-500'}`}>{cancelRate}%</span>
                                    <span className="text-[10px] text-gray-400">{cancelados.length} sess.</span>
                                </div>
                                {receitaPerdida > 0 && (
                                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
                                        <span className="text-[10px] font-bold text-red-700 uppercase tracking-wide">Receita Perdida</span>
                                        <span className="text-base font-bold text-red-700">{formatCurrency(receitaPerdida)}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                    </>}

                    {/* Tabs de Detalhes */}
                    <div className="mb-3">
                        <div className="flex gap-1 overflow-x-auto bg-gray-100 rounded-xl p-1">
                            {[
                                { label: 'Recebimentos',       count: data.transacoes?.length || 0,                                      icon: <ReceiptIcon style={{ fontSize: 15 }} /> },
                                { label: 'Pendentes',          count: data.pendentesCobranca?.length || 0,                               icon: <WarningIcon style={{ fontSize: 15 }} /> },
                                { label: 'Pacotes Consumidos', count: data.pacotesAtendidos?.length || 0,                                icon: <InventoryIcon style={{ fontSize: 15 }} /> },
                                { label: 'Convênios a Faturar',count: data.conveniosAtendidos?.length || 0,                              icon: <ShowChartIcon style={{ fontSize: 15 }} /> },
                                { label: 'Liminares',          count: data.liminaresAtendidos?.length || 0,                              icon: <ShowChartIcon style={{ fontSize: 15 }} /> },
                                { label: 'Agenda do Dia',      count: dayAppointments.length || 0,                                       icon: <CalendarTodayIcon style={{ fontSize: 15 }} /> },
                                { label: 'Especialidades',     count: Object.keys(data.producao?.porEspecialidade || {}).length,          icon: <PieChartIcon style={{ fontSize: 15 }} /> },
                                { label: 'Profissionais',      count: 0,                                                                  icon: <PeopleIcon style={{ fontSize: 15 }} /> },
                            ].map((tab, i) => (
                                <button key={i} onClick={() => setActiveTab(i)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all shrink-0 ${
                                        activeTab === i
                                            ? 'bg-white text-gray-900 shadow-sm font-semibold'
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}>
                                    {tab.icon}
                                    <span>{tab.label}</span>
                                    {tab.count > 0 && (
                                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === i ? 'bg-gray-100 text-gray-700' : 'bg-gray-200 text-gray-500'}`}>
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tab 0: Transações */}
                    {activeTab === 0 && (() => {
                        const allTx = data.transacoes || [];
                        const metodos = [...new Set(allTx.map((t: any) => t.metodo))].filter(Boolean) as string[];
                        const tipos = [...new Set(allTx.map((t: any) => t.tipo))].filter(Boolean) as string[];

                        // Agrupar por splitGroupId ou por packageId (package_receipt do mesmo pacote)
                        const groups = new Map<string, any[]>();
                        const singles: any[] = [];
                        for (const t of allTx) {
                          const groupKey = t.splitGroupId || (t.isPackageSale && t.packageId ? `pkg_${t.packageId}` : null);
                          if (groupKey) {
                            if (!groups.has(groupKey)) groups.set(groupKey, []);
                            groups.get(groupKey)!.push(t);
                          } else {
                            singles.push(t);
                          }
                        }
                        // Grupos com apenas 1 item viram single
                        for (const [key, items] of groups) {
                          if (items.length === 1) {
                            singles.push(items[0]);
                            groups.delete(key);
                          }
                        }

                        // Agrupar recebimentos repetidos (mesmo paciente/serviço/valor, sessões distintas —
                        // ex: paciente quitando várias sessões atrasadas de uma vez). Diferente do agrupamento
                        // acima (splitGroupId/venda de pacote): aqui não é "1 pagamento em várias formas",
                        // é "N pagamentos distintos iguais" — por isso vira modal de detalhe, não breakdown inline.
                        const recebimentoGroups = new Map<string, any[]>();
                        const trulySingles: any[] = [];
                        for (const t of singles) {
                          const key = `${t.paciente}|${t.packageId || ''}|${t.tipo}|${t.valor}`;
                          if (!recebimentoGroups.has(key)) recebimentoGroups.set(key, []);
                          recebimentoGroups.get(key)!.push(t);
                        }
                        for (const [key, items] of recebimentoGroups) {
                          if (items.length === 1) {
                            trulySingles.push(items[0]);
                            recebimentoGroups.delete(key);
                          }
                        }

                        const groupedItems: any[] = [];
                        for (const [splitGroupId, items] of groups) {
                          groupedItems.push({ _isGroup: true, splitGroupId, items, _id: splitGroupId });
                        }
                        for (const [key, items] of recebimentoGroups) {
                          groupedItems.push({ _isRecebimentoGroup: true, items, _id: `receb_${key}` });
                        }
                        for (const t of trulySingles) {
                          groupedItems.push({ _isGroup: false, item: t, _id: t.id });
                        }

                        const txFiltradas = groupedItems.filter((g: any) => {
                          if (txMultiFilter) {
                            if (!g._isGroup) return false;
                          }
                          if (txMetodoFilter === 'all' && txTipoFilter === 'all') return true;
                          if (g._isGroup || g._isRecebimentoGroup) {
                            const passesTipo = txTipoFilter === 'all' || g.items[0].tipo === txTipoFilter;
                            const passesMetodo = txMetodoFilter === 'all' || g.items.some((t: any) => t.metodo === txMetodoFilter);
                            return passesTipo && passesMetodo;
                          }
                          const t = g.item;
                          return (txMetodoFilter === 'all' || t.metodo === txMetodoFilter) &&
                                 (txTipoFilter === 'all' || t.tipo === txTipoFilter);
                        });

                        const totalFiltrado = txFiltradas.reduce((s: number, g: any) => {
                          if (g._isGroup || g._isRecebimentoGroup) return s + g.items.reduce((sum: number, t: any) => sum + t.valor, 0);
                          return s + g.item.valor;
                        }, 0);

                        const methodLabel = (m: string) => {
                          const map: Record<string, string> = { pix: 'Pix', dinheiro: 'Dinheiro', cartao_credito: 'Cartão', credito: 'Cartão', cartao_debito: 'Débito', debito: 'Débito', transferencia_bancaria: 'Transf.', transferencia: 'Transf.', outro: 'Outro' };
                          return map[(m || '').toLowerCase()] || m;
                        };

                        const renderSingle = (t: any) => {
                          const subTipo = (t as any).isPackageSale ? 'Venda de Pacote' : (t.tipo === 'Pacote' ? 'Sessão de Pacote' : null);
                          const situacao = t.tipo === 'Convênio' ? 'A Faturar'
                              : t.tipo === 'Liminar' && t.kind === 'liminar_contract_receipt' ? 'Crédito'
                              : t.tipo === 'Liminar' ? 'Judicial'
                              : (t as any).isPackageSale ? 'Pré-antecipado'
                              : t.tipo === 'Pacote' && (t as any).paymentModel === 'prepaid' ? 'Pré-pago'
                              : (t as any).isPrepago ? 'Pré-pago'
                              : 'Pago na Sessão';
                          const situacaoCls = situacao === 'Pré-pago' || situacao === 'Pré-antecipado' ? 'bg-indigo-100 text-indigo-700'
                              : situacao === 'Pago na Sessão' ? 'bg-emerald-100 text-emerald-700'
                              : situacao === 'A Faturar' ? 'bg-purple-100 text-purple-700'
                              : situacao === 'Crédito' ? 'bg-amber-100 text-amber-700'
                              : situacao === 'Judicial' ? 'bg-orange-100 text-orange-700'
                              : 'bg-gray-100 text-gray-600';
                          const borderCls = t.tipo === 'Liminar' ? 'border-orange-400'
                              : t.tipo === 'Pacote' ? 'border-green-500'
                              : t.tipo === 'Convênio' ? 'border-amber-400'
                              : 'border-blue-400';
                          const isMultiPayment = (t as any).paymentForms?.length > 1;
                          const prazo = isMultiPayment ? null : t.metodo === 'Pix' || t.metodo === 'Dinheiro' ? 'Imediato'
                              : t.metodo === 'Cartão' ? 'D+30'
                              : t.metodo === 'Transferência Bancária' ? 'D+1'
                              : t.metodo === 'Convênio' ? 'D+60' : null;
                          const tipoCls = t.tipo === 'Pacote' ? 'bg-green-100 text-green-800'
                              : t.tipo === 'Convênio' ? 'bg-amber-100 text-amber-800'
                              : t.tipo === 'Liminar' ? 'bg-orange-100 text-orange-800'
                              : 'bg-blue-100 text-blue-800';
                          return (
                              <div key={t.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 border-l-[3px] ${borderCls}`}>
                                  <div className="w-20 shrink-0">
                                      <div className="text-[11px] text-gray-400">{t.data}</div>
                                      <div className="text-[15px] font-semibold text-gray-900 font-mono">{t.hora}</div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <div className="text-[15px] font-semibold text-gray-900 truncate">{t.paciente}</div>
                                      <div className="text-xs text-gray-500 truncate">
                                          {[t.profissional, t.especialidade].filter(Boolean).join(' / ')}
                                      </div>
                                  </div>
                                  <div className="w-28 shrink-0 text-center">
                                      <span className="px-2 py-0.5 rounded-full text-xs border border-gray-300 text-gray-600">{t.servico}{subTipo ? ` · ${subTipo === 'Venda de Pacote' ? 'Venda' : 'Sessão'}` : ''}</span>
                                  </div>
                                  <div className="w-28 shrink-0 text-center">
                                      {isMultiPayment ? (
                                          <>
                                              <div className="text-xs font-medium text-gray-700 truncate">{[...new Set((t as any).paymentForms.map((f: any) => methodLabel(f.method)))].join(' + ')}</div>
                                              <div className="text-[10px] text-gray-400">{(t as any).paymentForms.length} formas</div>
                                          </>
                                      ) : (
                                          <>
                                              <div className="text-xs font-medium text-gray-700">{t.metodo}</div>
                                              {prazo && <div className="text-[10px] text-gray-400">{prazo}</div>}
                                          </>
                                      )}
                                  </div>
                                  <div className="w-20 shrink-0 text-center">
                                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tipoCls}`}>{t.tipo}</span>
                                  </div>
                                  <div className="w-24 shrink-0 text-center">
                                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${situacaoCls}`}>{situacao}</span>
                                  </div>
                                  <div className="w-20 shrink-0 text-right font-bold text-emerald-600 text-sm">{formatCurrency(t.valor)}</div>
                                  {user?.role === 'admin' && (
                                      <div className="flex items-center gap-0.5 shrink-0 ml-1">
                                          <button
                                              onClick={(e) => { e.stopPropagation(); setEditPayment(t); }}
                                              title="Editar pagamento"
                                              className="p-1 rounded text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                                          >
                                              <Pencil size={12} />
                                          </button>
                                          <button
                                              onClick={(e) => { e.stopPropagation(); handleDeletePayment(t.id?.toString(), `${formatCurrency(t.valor)} — ${t.paciente}`); }}
                                              title="Excluir pagamento"
                                              className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                          >
                                              <Trash2 size={12} />
                                          </button>
                                      </div>
                                  )}
                              </div>
                          );
                        };

                        const renderGroup = (g: any) => {
                          const first = g.items[0];
                          const subTipo = (first as any).isPackageSale ? 'Venda de Pacote' : (first.tipo === 'Pacote' ? 'Sessão de Pacote' : null);
                          const situacao = first.tipo === 'Convênio' ? 'A Faturar'
                              : first.tipo === 'Liminar' && first.kind === 'liminar_contract_receipt' ? 'Crédito'
                              : first.tipo === 'Liminar' ? 'Judicial'
                              : (first as any).isPackageSale ? 'Pré-antecipado'
                              : first.tipo === 'Pacote' && (first as any).paymentModel === 'prepaid' ? 'Pré-pago'
                              : (first as any).isPrepago ? 'Pré-pago'
                              : 'Pago na Sessão';
                          const situacaoCls = situacao === 'Pré-pago' || situacao === 'Pré-antecipado' ? 'bg-indigo-100 text-indigo-700'
                              : situacao === 'Pago na Sessão' ? 'bg-emerald-100 text-emerald-700'
                              : situacao === 'A Faturar' ? 'bg-purple-100 text-purple-700'
                              : situacao === 'Crédito' ? 'bg-amber-100 text-amber-700'
                              : situacao === 'Judicial' ? 'bg-orange-100 text-orange-700'
                              : 'bg-gray-100 text-gray-600';
                          const borderCls = first.tipo === 'Liminar' ? 'border-orange-400'
                              : first.tipo === 'Pacote' ? 'border-green-500'
                              : first.tipo === 'Convênio' ? 'border-amber-400'
                              : 'border-blue-400';
                          const tipoCls = first.tipo === 'Pacote' ? 'bg-green-100 text-green-800'
                              : first.tipo === 'Convênio' ? 'bg-amber-100 text-amber-800'
                              : first.tipo === 'Liminar' ? 'bg-orange-100 text-orange-800'
                              : 'bg-blue-100 text-blue-800';
                          const totalGrupo = g.items.reduce((s: number, t: any) => s + t.valor, 0);
                          const metodosUnicos = [...new Set(g.items.map((t: any) => methodLabel(t.metodo)))].join(' + ');
                          return (
                              <div key={g._id} className={`flex items-start gap-3 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 border-l-[3px] ${borderCls}`}>
                                  <div className="w-20 shrink-0 pt-0.5">
                                      <div className="text-[11px] text-gray-400">{first.data}</div>
                                      <div className="text-[15px] font-semibold text-gray-900 font-mono">{first.hora}</div>
                                  </div>
                                  <div className="flex-1 min-w-0 pt-0.5">
                                      <div className="text-[15px] font-semibold text-gray-900 truncate">{first.paciente}</div>
                                      <div className="text-xs text-gray-500 truncate">
                                          {[first.profissional, first.especialidade].filter(Boolean).join(' / ')}
                                      </div>
                                  </div>
                                  <div className="w-28 shrink-0 text-center pt-1.5">
                                      <span className="px-2 py-0.5 rounded-full text-xs border border-gray-300 text-gray-600">{first.servico}{subTipo ? ` · ${subTipo === 'Venda de Pacote' ? 'Venda' : 'Sessão'}` : ''}</span>
                                  </div>
                                  <div className="w-28 shrink-0 text-center pt-1">
                                      <div className="text-xs font-medium text-gray-700 truncate">{metodosUnicos}</div>
                                      <div className="space-y-0.5 mt-1">
                                          {g.items.map((t: any) => (
                                              <div key={t.id} className="flex justify-between text-[11px] text-gray-500">
                                                  <span>{methodLabel(t.metodo)}</span>
                                                  <span className="font-medium text-gray-700">{formatCurrency(t.valor)}</span>
                                              </div>
                                          ))}
                                      </div>
                                      <div className="text-[10px] text-gray-400 mt-1">{g.items.length} formas</div>
                                  </div>
                                  <div className="w-20 shrink-0 text-center pt-1.5">
                                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tipoCls}`}>{first.tipo}</span>
                                  </div>
                                  <div className="w-24 shrink-0 text-center pt-1.5">
                                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${situacaoCls}`}>{situacao}</span>
                                  </div>
                                  <div className="w-20 shrink-0 text-right font-bold text-emerald-600 text-sm pt-2">{formatCurrency(totalGrupo)}</div>
                              </div>
                          );
                        };

                        const renderRecebimentoGroup = (g: any) => {
                          const first = g.items[0];
                          const subTipo = first.tipo === 'Pacote' ? 'Sessão de Pacote' : null;
                          const situacao = first.tipo === 'Convênio' ? 'A Faturar'
                              : first.tipo === 'Pacote' && (first as any).paymentModel === 'prepaid' ? 'Pré-pago'
                              : (first as any).isPrepago ? 'Pré-pago'
                              : 'Pago na Sessão';
                          const situacaoCls = situacao === 'Pré-pago' ? 'bg-indigo-100 text-indigo-700'
                              : situacao === 'Pago na Sessão' ? 'bg-emerald-100 text-emerald-700'
                              : situacao === 'A Faturar' ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 text-gray-600';
                          const borderCls = first.tipo === 'Pacote' ? 'border-green-500'
                              : first.tipo === 'Convênio' ? 'border-amber-400'
                              : 'border-blue-400';
                          const tipoCls = first.tipo === 'Pacote' ? 'bg-green-100 text-green-800'
                              : first.tipo === 'Convênio' ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800';
                          const totalGrupo = g.items.reduce((s: number, t: any) => s + t.valor, 0);
                          const metodosUnicos = [...new Set(g.items.map((t: any) => methodLabel(t.metodo)))].join(' + ');
                          return (
                              <button
                                  key={g._id}
                                  onClick={() => setGroupDetailItems(g.items)}
                                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 border-l-[3px] ${borderCls} hover:bg-gray-100 transition-colors text-left`}
                              >
                                  <div className="w-20 shrink-0">
                                      <div className="text-[11px] text-gray-400">{first.data}</div>
                                      <div className="text-[15px] font-semibold text-gray-900 font-mono">{first.hora}</div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <div className="text-[15px] font-semibold text-gray-900 truncate flex items-center gap-1.5">
                                          {first.paciente}
                                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-600">{g.items.length}x</span>
                                      </div>
                                      <div className="text-xs text-gray-500 truncate">
                                          {[first.profissional, first.especialidade].filter(Boolean).join(' / ')}
                                      </div>
                                  </div>
                                  <div className="w-28 shrink-0 text-center">
                                      <span className="px-2 py-0.5 rounded-full text-xs border border-gray-300 text-gray-600">{first.servico}{subTipo ? ' · Sessão' : ''}</span>
                                  </div>
                                  <div className="w-28 shrink-0 text-center">
                                      <div className="text-xs font-medium text-gray-700 truncate">{metodosUnicos}</div>
                                      <div className="text-[10px] text-gray-400">ver detalhes</div>
                                  </div>
                                  <div className="w-20 shrink-0 text-center">
                                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tipoCls}`}>{first.tipo}</span>
                                  </div>
                                  <div className="w-24 shrink-0 text-center">
                                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${situacaoCls}`}>{situacao}</span>
                                  </div>
                                  <div className="w-20 shrink-0 text-right font-bold text-emerald-600 text-sm">{formatCurrency(totalGrupo)}</div>
                              </button>
                          );
                        };

                        return (
                            <>
                            <div className="bg-white rounded-lg border border-gray-200 p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                    <h3 className="text-base font-semibold">💳 Recebimentos {periodTitle}</h3>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {metodos.map(m => (
                                            <button key={m} onClick={() => setTxMetodoFilter(txMetodoFilter === m ? 'all' : m)}
                                                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${txMetodoFilter === m ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}>
                                                {m}
                                            </button>
                                        ))}
                                        {metodos.length > 0 && tipos.length > 1 && <span className="text-gray-300 text-xs">|</span>}
                                        {tipos.length > 1 && tipos.map(tp => (
                                            <button key={tp} onClick={() => setTxTipoFilter(txTipoFilter === tp ? 'all' : tp)}
                                                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${txTipoFilter === tp ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}>
                                                {tp}
                                            </button>
                                        ))}
                                        {(metodos.length > 0 || tipos.length > 1) && <span className="text-gray-300 text-xs">|</span>}
                                        <button onClick={() => setTxMultiFilter(v => !v)}
                                            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${txMultiFilter ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}>
                                            🔄 Multi
                                        </button>
                                    </div>
                                </div>
                                {/* Header fixo explicando colunas da direita */}
                                <div className="flex items-center gap-3 px-3 py-1.5 mb-1 border-b border-gray-100">
                                    <span className="text-[11px] text-gray-400 w-20 shrink-0">Hora</span>
                                    <span className="flex-1 text-[11px] text-gray-400">Paciente / Profissional</span>
                                    <span className="text-[11px] text-gray-400 w-28 text-center shrink-0">Serviço</span>
                                    <span className="text-[11px] text-gray-400 w-28 text-center shrink-0">Método</span>
                                    <span className="text-[11px] text-gray-400 w-20 text-center shrink-0">Tipo</span>
                                    <span className="text-[11px] text-gray-400 w-24 text-center shrink-0">Situação</span>
                                    <span className="text-[11px] text-gray-400 w-20 text-right shrink-0">Valor</span>
                                </div>
                                <div className="space-y-1">
                                    {txFiltradas.length === 0 ? (
                                        <div className="text-center py-6 text-gray-400 text-sm">
                                            {txMetodoFilter !== 'all' || txTipoFilter !== 'all' || txMultiFilter ? 'Nenhuma transação com esse filtro' : `Nenhuma transação ${isRangeActive ? 'no período' : 'hoje'}`}
                                        </div>
                                    ) : txFiltradas.slice(txPage * txPerPage, (txPage + 1) * txPerPage).map((g: any) => (
                                        g._isGroup ? renderGroup(g) : g._isRecebimentoGroup ? renderRecebimentoGroup(g) : renderSingle(g.item)
                                    ))}
                                    {txFiltradas.length > 0 && (() => {
                                        const totalPages = Math.ceil(txFiltradas.length / txPerPage);
                                        const start = txPage * txPerPage + 1;
                                        const end = Math.min((txPage + 1) * txPerPage, txFiltradas.length);
                                        return (
                                            <>
                                                <div className="flex items-center justify-between px-2 pt-2 pb-1">
                                                    <span className="text-xs text-gray-400">{totalPages > 1 ? `${start}–${end} de ${txFiltradas.length}` : `${txFiltradas.length} itens`}</span>
                                                    {totalPages > 1 && (
                                                        <div className="flex items-center gap-1">
                                                            <button onClick={() => setTxPage(p => Math.max(0, p - 1))} disabled={txPage === 0}
                                                                className="px-2 py-0.5 text-xs rounded border border-gray-300 text-gray-600 disabled:opacity-30 hover:bg-gray-100">‹</button>
                                                            {Array.from({ length: totalPages }, (_, i) => (
                                                                <button key={i} onClick={() => setTxPage(i)}
                                                                    className={`px-2 py-0.5 text-xs rounded border transition-all ${i === txPage ? 'bg-emerald-600 text-white border-emerald-600' : 'border-gray-300 text-gray-600 hover:bg-gray-100'}`}>
                                                                    {i + 1}
                                                                </button>
                                                            ))}
                                                            <button onClick={() => setTxPage(p => Math.min(totalPages - 1, p + 1))} disabled={txPage === totalPages - 1}
                                                                className="px-2 py-0.5 text-xs rounded border border-gray-300 text-gray-600 disabled:opacity-30 hover:bg-gray-100">›</button>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-xs text-gray-400 mr-1">por pág:</span>
                                                        {[5, 10, 30].map(n => (
                                                            <button key={n} onClick={() => setTxPerPage(n)}
                                                                className={`px-2 py-0.5 text-xs rounded border transition-all ${txPerPage === n ? 'bg-gray-700 text-white border-gray-700' : 'border-gray-300 text-gray-500 hover:bg-gray-100'}`}>
                                                                {n}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center px-3 py-2 mt-1 rounded-lg bg-gray-100 border border-gray-200">
                                                    <span className="text-sm font-bold text-gray-700">Total ({txFiltradas.length}{txFiltradas.length !== allTx.length ? ` de ${allTx.length}` : ''})</span>
                                                    <span className="text-sm font-bold text-emerald-600">{formatCurrency(totalFiltrado)}</span>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                            {groupDetailItems && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                                    <div className="fixed inset-0 bg-black/50" onClick={() => setGroupDetailItems(null)} />
                                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl z-10 max-h-[85vh] overflow-y-auto p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-base font-semibold">
                                                {groupDetailItems[0]?.paciente} — {groupDetailItems.length} recebimentos
                                            </h3>
                                            <button onClick={() => setGroupDetailItems(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none px-1">×</button>
                                        </div>
                                        <div className="space-y-1">
                                            {groupDetailItems.map((t: any) => renderSingle(t))}
                                        </div>
                                        <div className="flex justify-between items-center px-3 py-2 mt-2 rounded-lg bg-gray-100 border border-gray-200">
                                            <span className="text-sm font-bold text-gray-700">Total</span>
                                            <span className="text-sm font-bold text-emerald-600">{formatCurrency(groupDetailItems.reduce((s: number, t: any) => s + t.valor, 0))}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            </>
                        );
                    })()}

                    {/* Tab 1: Pendentes */}
                    {activeTab === 1 && (
                        <div className="bg-white rounded-lg border border-gray-200 p-3">
                            <h3 className="text-base font-semibold mb-3">⚠️ Pendentes de Cobrança ({data.pendentesCobranca?.length || 0})</h3>
                            {data.pendentesCobranca?.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-gray-50 border-b">
                                            <tr>
                                                <th className="px-3 py-2 text-left">Horário</th>
                                                <th className="px-3 py-2 text-left">Paciente</th>
                                                <th className="px-3 py-2 text-left">Tipo</th>
                                                <th className="px-3 py-2 text-left">Profissional</th>
                                                <th className="px-3 py-2 text-right">Valor</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.pendentesCobranca.map((p) => (
                                                <tr key={p.id} className="border-b hover:bg-gray-50">
                                                    <td className="px-3 py-2">{p.horario}</td>
                                                    <td className="px-3 py-2">
                                                        <div className="flex items-center gap-1">
                                                            {p.paciente}
                                                            {p.telefone !== '-' && (
                                                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs bg-gray-100 cursor-pointer hover:bg-gray-200" onClick={() => handleOpenWhatsApp(p.telefone || '')}>
                                                                    <PhoneIcon className="w-3 h-3" /> {p.telefone}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                                                            p.tipo === 'Pacote' ? 'bg-green-100 text-green-800' : 
                                                            p.tipo === 'Convênio' ? 'bg-blue-100 text-blue-800' : 
                                                            'bg-amber-100 text-amber-800'
                                                        }`}>
                                                            {p.tipo}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2">{p.professional}</td>
                                                    <td className="px-3 py-2 text-right font-bold text-amber-600">{formatCurrency(p.valor)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <Alert severity="success" className="rounded-lg">🎉 Nenhum pagamento pendente {isRangeActive ? 'no período' : 'hoje'}!</Alert>
                            )}
                        </div>
                    )}

                    {/* Tab 2: Pacotes */}
                    {activeTab === 2 && (
                        <div className="bg-white rounded-lg border border-gray-200 p-3">
                            <h3 className="text-base font-semibold mb-3">📦 Pacotes Consumidos ({data.pacotesAtendidos?.length || 0})</h3>
                            {data.pacotesAtendidos?.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {data.pacotesAtendidos.map((p) => {
                                        const isPendente = p.statusPagamento === 'Pendente';
                                        const isPrepaid = !isPendente && p.paymentModel === 'prepaid';
                                        return (
                                            <div key={p.id} className={`border-l-4 ${isPendente ? 'border-l-red-500' : isPrepaid ? 'border-l-blue-500' : 'border-l-emerald-500'} border border-gray-200 rounded-lg p-3`}>
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="font-semibold text-sm">{p.paciente}</span>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs ${isPendente ? 'bg-red-100 text-red-800' : isPrepaid ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                                        {isPendente ? 'Pendente' : isPrepaid ? 'Pré-pago' : 'Pago hoje'}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-500">{p.especialidade} • {p.horario}</div>
                                                <div className="text-xs text-gray-500 mb-1">{p.professional}</div>
                                                <div className="flex justify-between items-baseline">
                                                    <span className={`text-lg font-bold ${isPendente ? 'text-red-600' : 'text-emerald-700'}`}>{formatCurrency(p.valor)}</span>
                                                    <span className="text-xs text-gray-500">{isPendente ? 'a receber' : isPrepaid ? 'crédito consumido' : 'recebido hoje'}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <Alert severity="info">Nenhum pacote atendido {isRangeActive ? 'no período' : 'hoje'}</Alert>
                            )}
                        </div>
                    )}

                    {/* Tab 3: Convênios */}
                    {activeTab === 3 && (
                        <div className="bg-white rounded-lg border border-gray-200 p-3">
                            <h3 className="text-base font-semibold mb-3">🏥 Convênios a Faturar ({data.conveniosAtendidos?.length || 0})</h3>
                            {data.conveniosAtendidos?.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {data.conveniosAtendidos.map((c) => (
                                        <div key={c.id} className="border border-gray-200 rounded-lg p-3">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-semibold text-sm">{c.paciente}</span>
                                                <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">{c.convenio}</span>
                                            </div>
                                            <div className="text-xs text-gray-500">{c.especialidade} • {c.professional}</div>
                                            <div className="text-xs text-gray-500">Horário: {c.horario}</div>
                                            <div className="text-lg font-bold text-blue-700 mt-1">{formatCurrency(c.valor)}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <Alert severity="info">Nenhum convênio atendido {isRangeActive ? 'no período' : 'hoje'}</Alert>
                            )}
                        </div>
                    )}

                    {/* Tab 4: Liminares */}
                    {activeTab === 4 && (
                        <div className="bg-white rounded-lg border border-gray-200 p-3">
                            <h3 className="text-base font-semibold mb-3">⚖️ Liminares Atendidas ({data.liminaresAtendidos?.length || 0})</h3>
                            {data.liminaresAtendidos?.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {data.liminaresAtendidos.map((l) => (
                                        <div key={l.id} className="border border-gray-200 rounded-lg p-3">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-semibold text-sm">{l.paciente}</span>
                                                <span className="px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-800">Liminar</span>
                                            </div>
                                            <div className="text-xs text-gray-500">{l.especialidade} • {l.professional}</div>
                                            <div className="text-xs text-gray-500">Horário: {l.horario}</div>
                                            <div className="text-lg font-bold text-orange-700 mt-1">{formatCurrency(l.valor)}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <Alert severity="info">Nenhuma liminar atendida {isRangeActive ? 'no período' : 'hoje'}</Alert>
                            )}
                        </div>
                    )}

                    {/* Tab 5: Agendamentos {periodTitle} */}
                    {activeTab === 5 && (
                        <div className="space-y-3">
                            {/* Título + contadores por status */}
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Agenda do Dia <span className="text-gray-400 font-normal text-base">({dayAppointments.length})</span></h3>
                                    <p className="text-xs text-gray-400 mt-0.5">{new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {[
                                        { key: 'completed',    label: 'atendidos',     cls: 'bg-emerald-100 text-emerald-800' },
                                        { key: 'canceled',     label: 'cancelados',    cls: 'bg-rose-100 text-rose-800' },
                                        { key: 'confirmed',    label: 'confirmados',   cls: 'bg-sky-100 text-sky-800' },
                                        { key: 'scheduled',    label: 'agendados',     cls: 'bg-blue-100 text-blue-800' },
                                        { key: 'pre_agendado', label: 'pré-agendados', cls: 'bg-amber-100 text-amber-800' },
                                    ].map(({ key, label, cls }) => {
                                        const count = dayAppointments.filter((a: any) => a.operationalStatus === key).length;
                                        if (count === 0) return null;
                                        return <span key={key} className={`px-2.5 py-1 rounded-full text-xs font-bold ${cls}`}>{count} {label}</span>;
                                    })}
                                </div>
                            </div>

                            {/* Legenda de tipos de atendimento */}
                            <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5">
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Tipos de Atendimento</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {[
                                        { icon: '📦', label: 'Pacote pré-pago',    cls: 'bg-violet-100 text-violet-700' },
                                        { icon: '📦', label: 'Pacote por sessão',   cls: 'bg-purple-100 text-purple-700' },
                                        { icon: '👤', label: 'Particular',          cls: 'bg-blue-100 text-blue-700' },
                                        { icon: '🏥', label: 'Convênio',            cls: 'bg-sky-100 text-sky-700' },
                                        { icon: '📋', label: 'Avaliação',           cls: 'bg-pink-100 text-pink-700' },
                                        { icon: '👅', label: 'Teste da Linguinha',  cls: 'bg-teal-100 text-teal-700' },
                                        { icon: '⚖️', label: 'Liminar',            cls: 'bg-orange-100 text-orange-700' },
                                    ].map(t => (
                                        <span key={t.label} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${t.cls}`}>
                                            {t.icon} {t.label}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Filtros */}
                            <div className="flex flex-wrap items-center gap-1.5">
                                {([
                                    { value: 'all',          label: 'Todos' },
                                    { value: 'completed',    label: 'Atendidos' },
                                    { value: 'scheduled',    label: 'Agendados' },
                                    { value: 'confirmed',    label: 'Confirmados' },
                                    { value: 'canceled',     label: 'Cancelados' },
                                    { value: 'pre_agendado', label: 'Pré-agendado' },
                                ] as const).map(opt => (
                                    <button key={opt.value} onClick={() => setAppointmentFilter(opt.value)}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${appointmentFilter === opt.value ? (opt.value === 'canceled' ? 'bg-rose-600 text-white border-rose-600' : 'bg-gray-900 text-white border-gray-900') : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}>
                                        {opt.label}
                                    </button>
                                ))}
                                {(() => {
                                    const profs = [...new Set(dayAppointments.map((a: any) => a.professionalName).filter(Boolean))].sort() as string[];
                                    if (profs.length <= 1) return null;
                                    return (
                                        <select value={appointmentProfFilter} onChange={(e) => setAppointmentProfFilter(e.target.value)}
                                            className="px-2.5 py-1.5 rounded-full text-sm font-medium border border-gray-300 bg-white text-gray-600 hover:border-gray-400 outline-none cursor-pointer">
                                            <option value="all">Todos profissionais</option>
                                            {profs.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    );
                                })()}
                            </div>

                            {/* Timeline card */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                {loadingAppointments ? (
                                    <div className="p-8 text-center text-sm text-gray-400">Carregando agendamentos...</div>
                                ) : dayAppointments.length === 0 ? (
                                    <div className="p-8 text-center text-sm text-gray-400">Nenhum agendamento encontrado para {isRangeActive ? 'este período' : 'este dia'}.</div>
                                ) : (
                                    <>
                                        {(() => {
                                            const toMin = (t: string) => { const [h, m] = (t || '00:00').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
                                            const getApptId = (item: any) => String(item?.id || item?._id || '');
                                            const attendedIds = new Set<string>([
                                                ...(data.pacotesAtendidos?.map(getApptId) || []),
                                                ...(data.conveniosAtendidos?.map(getApptId) || []),
                                                ...(data.liminaresAtendidos?.map(getApptId) || []),
                                                ...(data.transacoesProducao?.map(getApptId) || [])
                                            ].filter(Boolean));
                                            const getEffectiveStatus = (a: any) => {
                                                if (a.operationalStatus === 'canceled') return 'canceled';
                                                const isConvenioLiminarAtendido =
                                                    (a.billingType === 'convenio' || a.billingType === 'liminar' || a.insuranceProvider) &&
                                                    (a.paymentStatus === 'pending_receipt' || a.paymentStatus === 'not_applicable');
                                                if (a.operationalStatus === 'completed' || attendedIds.has(getApptId(a)) || isConvenioLiminarAtendido) return 'completed';
                                                return a.operationalStatus;
                                            };
                                            const filtered = [...dayAppointments]
                                                .filter((a: any) => (appointmentFilter === 'all' || getEffectiveStatus(a) === appointmentFilter) && (appointmentProfFilter === 'all' || a.professionalName === appointmentProfFilter))
                                                .sort((a: any, b: any) => toMin(a.time || '00:00') - toMin(b.time || '00:00'));
                                            // Numeração sequencial do dia (#1, #2...) — ajuda a secretária a referenciar
                                            // um atendimento específico ("o #5 é o Benjamin") sem depender do horário.
                                            const seqMap = new Map<string, number>();
                                            filtered.forEach((a: any, i: number) => seqMap.set(getApptId(a), i + 1));
                                            const hourGroups: Record<number, any[]> = {};
                                            filtered.forEach((a: any) => { const h = parseInt((a.time || '00:00').split(':')[0]) || 0; if (!hourGroups[h]) hourGroups[h] = []; hourGroups[h].push(a); });
                                            const sortedHours = Object.keys(hourGroups).map(Number).sort((a, b) => a - b);
                                            const now = new Date();
                                            const nowMin = now.getHours() * 60 + now.getMinutes();
                                            const nowStr = format(now, 'HH:mm');
                                            const todayStr = format(now, 'yyyy-MM-dd');
                                            const isToday = selectedDate === todayStr;
                                            const NowMarker = () => (
                                                <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border-y border-red-100">
                                                    <span className="text-[11px] text-red-500 font-bold whitespace-nowrap">⏰ agora · {nowStr}</span>
                                                    <div className="flex-1 border-t border-dashed border-red-300" />
                                                    <span className="text-[10px] text-red-400 whitespace-nowrap">próximos ↓</span>
                                                </div>
                                            );
                                            let nowRendered = false;
                                            return (
                                                <div className="divide-y divide-gray-50">
                                                    {sortedHours.map((hour, idx) => {
                                                        const apts = hourGroups[hour];
                                                        const prevHourEnd = idx > 0 ? sortedHours[idx - 1] * 60 + 59 : -1;
                                                        const showNowBefore = isToday && !nowRendered && prevHourEnd < nowMin && nowMin < hour * 60;
                                                        if (showNowBefore) nowRendered = true;
                                                        return (
                                                            <React.Fragment key={hour}>
                                                                {showNowBefore && <NowMarker />}
                                                                <div>
                                                                    {apts.map((a: any, aptIdx: number) => {
                                                                        const seqNumber = seqMap.get(getApptId(a));
                                                                        const effectiveStatus = getEffectiveStatus(a);
                                                                        const isCanceled = effectiveStatus === 'canceled';
                                                                        const isCompleted = effectiveStatus === 'completed';
                                                                        const isConvenio = a.billingType === 'convenio' || !!a.insuranceProvider;
                                                                        const isLiminar = a.billingType === 'liminar';
                                                                        const statusFinanceiro = resolveStatusFinanceiro(a);
                                                                        const isNew = (analyticsData?.novos || []).some((n: any) => n._id === a.id);
                                                                        const valor = a.sessionValue || a.package?.sessionValue || 0;
                                                                        const phone = a.patientInfo?.phone || a.patient?.phone;
                                                                        const patientName = a.patientInfo?.fullName || a.patient?.fullName || a.patientName || '-';
                                                                        const aptMin = toMin(a.time || '00:00');
                                                                        const nextApt = apts[aptIdx + 1] ?? (idx + 1 < sortedHours.length ? hourGroups[sortedHours[idx + 1]][0] : null);
                                                                        const nextMin = nextApt ? toMin(nextApt.time || '00:00') : Infinity;
                                                                        const showNowAfterThis = isToday && !nowRendered && aptMin <= nowMin && nowMin < nextMin;
                                                                        if (showNowAfterThis) nowRendered = true;

                                                                        const formatConvenioName = (name: string) => name ? name.replace(/-/g, ' ').split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Convênio';
                                                                        const isPrepaid = a.package && (a.package.paymentType === 'full' || a.package.paymentType === 'prepaid' || a.package.model === 'full' || a.package.model === 'prepaid');
                                                                        const isPerSession = a.package && (a.package.paymentType === 'per-session' || a.package.paymentType === 'per_session' || a.package.model === 'per-session' || a.package.model === 'per_session');
                                                                        const serviceType = a.serviceType || '';
                                                                        const isEvaluation = serviceType === 'evaluation' || serviceType === 'neuropsych_evaluation';
                                                                        const isFirstEval = isNew && isEvaluation;

                                                                        // Tipo de atendimento (badge esquerdo)
                                                                        const typeLabel =
                                                                            serviceType === 'tongue_tie_test' ? '👅 Teste da Linguinha' :
                                                                            serviceType === 'evaluation' || serviceType === 'neuropsych_evaluation' ? '📋 Avaliação' :
                                                                            isConvenio ? `🏥 ${formatConvenioName(a.insuranceProvider || '')}` :
                                                                            isLiminar ? '⚖️ Liminar' :
                                                                            isPrepaid ? '📦 Pré-pago' :
                                                                            isPerSession ? '📦 Por sessão' :
                                                                            a.package ? '📦 Pacote' :
                                                                            '👤 Particular';

                                                                        const typeCls =
                                                                            serviceType === 'tongue_tie_test' ? 'bg-teal-100 text-teal-700' :
                                                                            serviceType === 'evaluation' || serviceType === 'neuropsych_evaluation' ? 'bg-pink-500 text-white' :
                                                                            isConvenio ? 'bg-sky-100 text-sky-700' :
                                                                            isLiminar ? 'bg-orange-100 text-orange-700' :
                                                                            isPrepaid ? 'bg-violet-100 text-violet-700' :
                                                                            isPerSession ? 'bg-purple-100 text-purple-700' :
                                                                            a.package ? 'bg-purple-100 text-purple-700' :
                                                                            'bg-blue-100 text-blue-700';

                                                                        // Badge financeiro — eixo independente do "Atendimento".
                                                                        // Reflete só o dinheiro (categorias confiáveis, sem inferir tempo/ordem
                                                                        // de pagamento: isso exigiria paymentTiming no domínio Payment, não
                                                                        // existe ainda — ver DOMAIN_INVARIANTS.md #25).
                                                                        const isConvenioPendente = isConvenio && (a.paymentStatus === 'pending_receipt' || a.paymentStatus === 'not_applicable' || a.paymentStatus === 'pending' || !a.paymentStatus);
                                                                        const paymentBadge =
                                                                            isCanceled ? '× Cancelado' :
                                                                            isConvenioPendente ? '🟡 Convênio pendente' :
                                                                            isConvenio ? '✓ Convênio pago' :
                                                                            isLiminar ? null :
                                                                            statusFinanceiro === 'Pré-pago' ? '📦 Pacote quitado' :
                                                                            statusFinanceiro === 'Pago na Sessão' || statusFinanceiro === 'Avaliação Paga' ? '✓ Pago' :
                                                                            statusFinanceiro === 'Pacote Pendente' ? '⌛ Sessão pendente' :
                                                                            statusFinanceiro === 'Pendente' ? '⌛ Pendente' :
                                                                            statusFinanceiro === 'Pago Parcial' ? '◑ Parcial' :
                                                                            null;

                                                                        const paymentCls =
                                                                            isCanceled ? 'bg-red-100 text-red-600' :
                                                                            paymentBadge?.startsWith('🟡') ? 'bg-amber-100 text-amber-700' :
                                                                            paymentBadge === '📦 Pacote quitado' ? 'bg-violet-100 text-violet-700' :
                                                                            paymentBadge?.startsWith('✓') ? 'bg-emerald-100 text-emerald-700' :
                                                                            paymentBadge?.startsWith('⌛') ? 'bg-amber-100 text-amber-700' :
                                                                            paymentBadge?.startsWith('◑') ? 'bg-orange-100 text-orange-700' :
                                                                            'bg-sky-100 text-sky-700';

                                                                        // Badge de método de pagamento
                                                                        const methodLabel = (m: string) =>
                                                                            m === 'pix' ? 'Pix' :
                                                                            m === 'dinheiro' ? 'Dinheiro' :
                                                                            m === 'credit_card' || m === 'credito' || m === 'cartao_credito' ? 'Cartão' :
                                                                            m === 'debit_card' || m === 'debito' || m === 'cartao_debito' ? 'Débito' :
                                                                            m === 'transferencia' || m === 'transferencia_bancaria' ? 'Transf.' : m;
                                                                        const splits: { method: string; amount: number }[] = (a as any).payment?.splitMethods;
                                                                        const pm = a.paymentMethod;
                                                                        // Pacote pré-pago/full: dinheiro já entrou na compra do pacote, não nesta
                                                                        // sessão — mostrar método de pagamento aqui dá a falsa impressão de que
                                                                        // o valor entrou hoje. Ver caso Victor Gabriel, 2026-07-09.
                                                                        const methodBadge: string | null = (!isCanceled && !isConvenio && !isLiminar && !isPrepaid)
                                                                            ? (splits?.length >= 2
                                                                                ? splits.map(s => methodLabel(s.method)).join(' + ')
                                                                                : pm && pm !== 'pending'
                                                                                    ? (pm === 'pix' ? 'Pix · Imediato' :
                                                                                       pm === 'dinheiro' ? 'Dinheiro · Imediato' :
                                                                                       pm === 'credit_card' || pm === 'credito' || pm === 'cartao_credito' ? 'Cartão D+30' :
                                                                                       pm === 'debit_card' || pm === 'debito' || pm === 'cartao_debito' ? 'Débito · D+1' :
                                                                                       pm === 'transferencia' || pm === 'transferencia_bancaria' ? 'Transf. · D+1' :
                                                                                       pm)
                                                                                    : null)
                                                                            : null;
                                                                        const isCartaoD30 = methodBadge === 'Cartão D+30';

                                                                        // Rótulo de status (canto direito) — eixo puramente operacional
                                                                        // ("a sessão aconteceu?"). A situação do dinheiro (convênio aguardando
                                                                        // repasse, pago, pendente etc.) é o paymentBadge, eixo separado.
                                                                        const statusLabel =
                                                                            isCanceled ? 'Cancelado' :
                                                                            isCompleted ? 'Atendido' :
                                                                            // 'confirmed' = presença confirmada, NÃO é atendimento completado/pago.
                                                                            // Mostrar 'Atendido' aqui já causou confusão real (secretária achava
                                                                            // que só confirmar presença já lançava o pagamento). Ver isCompleted acima.
                                                                            effectiveStatus === 'confirmed' ? 'Confirmado' :
                                                                            effectiveStatus === 'pre_agendado' ? 'Pré-agendado' :
                                                                            'Agendado';

                                                                        const statusLabelCls =
                                                                            isCanceled ? 'bg-rose-100 text-rose-700' :
                                                                            isCompleted ? 'bg-emerald-100 text-emerald-800' :
                                                                            // Azul (não verde) de propósito: "Confirmado" é operacional, não financeiro.
                                                                            // Verde fica reservado pra Pago/Atendido, pra não parecer a mesma coisa.
                                                                            effectiveStatus === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                                                                            effectiveStatus === 'pre_agendado' ? 'bg-amber-100 text-amber-700' :
                                                                            'bg-gray-100 text-gray-600';

                                                                        const leftBorder =
                                                                            isCanceled ? 'border-l-red-400' :
                                                                            isFirstEval ? 'border-l-pink-500' :
                                                                            isCompleted ? 'border-l-emerald-500' :
                                                                            effectiveStatus === 'confirmed' ? 'border-l-blue-400' :
                                                                            effectiveStatus === 'pre_agendado' ? 'border-l-amber-400' :
                                                                            'border-l-blue-400';

                                                                        // Progresso do pacote inline
                                                                        let pkgProgress: React.ReactNode = null;
                                                                        const pkg = a.package;
                                                                        if (pkg) {
                                                                            const used = pkg.sessionsDone ?? pkg.usedSessions ?? pkg.sessionsUsed ?? 0;
                                                                            const total = pkg.totalSessions ?? pkg.sessoes ?? pkg.sessions ?? 0;
                                                                            const remaining = total > 0 ? total - used : 0;
                                                                            const pct = total > 0 ? Math.max(0, Math.min(100, (used / total) * 100)) : 0;
                                                                            const barColor = used < 0 ? '#EF4444' : used >= total && total > 0 ? '#EF4444' : remaining <= 1 ? '#F59E0B' : '#8B5CF6';
                                                                            const progressText = used < 0 ? `${used}/${total} · sessão negativa ⚠` :
                                                                                used >= total && total > 0 ? `${used}/${total} · encerrado 🔴` :
                                                                                remaining === 1 ? `${used}/${total} sessões · 1 restante ⚠` :
                                                                                `${used}/${total}${remaining > 0 ? ` · ${remaining} restantes` : ''}`;
                                                                            const badgeCls = used < 0 || (used >= total && total > 0)
                                                                                ? 'bg-red-100 text-red-700 border-red-200'
                                                                                : remaining <= 1
                                                                                ? 'bg-amber-100 text-amber-700 border-amber-200'
                                                                                : 'bg-violet-100 text-violet-700 border-violet-200';
                                                                            pkgProgress = (
                                                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeCls}`}>
                                                                                    <span>{used}/{total}</span>
                                                                                    {remaining > 0 && <span className="opacity-60">· {remaining} restante{remaining !== 1 ? 's' : ''}{remaining === 1 ? ' ⚠' : ''}</span>}
                                                                                    {used >= total && total > 0 && <span>· encerrado 🔴</span>}
                                                                                    {used < 0 && <span>· negativo ⚠</span>}
                                                                                </span>
                                                                            );
                                                                        }

                                                                        return (
                                                                            <React.Fragment key={a.id}>
                                                                                <div
                                                                                    onClick={() => setSelectedApt(a)}
                                                                                    className={`flex items-start gap-3 px-4 py-2.5 border-l-[3px] border-b border-b-gray-50 cursor-pointer transition-colors hover:bg-gray-50/70 ${leftBorder} ${isCanceled ? 'bg-rose-50/40' : isCompleted ? 'bg-emerald-100/70' : isFirstEval ? 'bg-pink-50/60' : ''}`}
                                                                                >
                                                                                    <div className="w-14 shrink-0 pt-0.5 text-right">
                                                                                        {aptIdx === 0 && <span className="text-[9px] font-bold text-gray-300 tracking-widest block leading-none mb-1">{String(hour).padStart(2,'0')}H</span>}
                                                                                        <div className="flex items-center justify-end gap-1">
                                                                                            {seqNumber != null && (
                                                                                                <span className="text-[9px] font-bold text-gray-400 bg-gray-100 rounded-full w-4 h-4 inline-flex items-center justify-center shrink-0" title="Ordem de atendimento do dia">{seqNumber}</span>
                                                                                            )}
                                                                                            <span className={`text-sm font-bold font-mono leading-none ${isCanceled ? 'text-gray-300' : 'text-gray-700'}`}>{a.time || '--:--'}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <div className="flex items-center gap-2 mb-1.5">
                                                                                            <span className={`text-sm font-bold truncate ${isCanceled ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{patientName}</span>
                                                                                            {isNew && <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap shrink-0 ${isEvaluation ? 'bg-pink-500 text-white' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>{isEvaluation ? '★ 1ª vez' : '1ª vez'}</span>}
                                                                                            {phone && (
                                                                                                <button className="inline-flex items-center gap-0.5 text-[10px] text-blue-400 hover:text-blue-600 whitespace-nowrap shrink-0"
                                                                                                    onClick={(e) => { e.stopPropagation(); handleOpenWhatsApp(phone); }}>
                                                                                                    <PhoneIcon style={{ fontSize: 10 }} />{phone}
                                                                                                </button>
                                                                                            )}
                                                                                        </div>
                                                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                                                            {pkgProgress}
                                                                                            {pkgProgress && <span className="text-gray-300 text-[10px] select-none">|</span>}
                                                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${typeCls}`}>{typeLabel}</span>
                                                                                            {methodBadge && <><span className="text-gray-300 text-[10px] select-none">|</span><span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">{methodBadge}</span></>}
                                                                                            {a.specialty && <><span className="text-gray-300 text-[10px] select-none">|</span><span className="text-[10px] text-gray-400">{a.specialty}</span></>}
                                                                                            {a.professionalName && (
                                                                                                <>
                                                                                                    <span className="text-gray-300 text-[10px] select-none">|</span>
                                                                                                    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${isCompleted ? 'text-emerald-700' : 'text-gray-500'}`}>
                                                                                                        <PersonIcon style={{ fontSize: 11 }} />
                                                                                                        {(a.professionalName as string).split(' ').slice(0, 2).join(' ')}
                                                                                                    </span>
                                                                                                </>
                                                                                            )}
                                                                                        </div>
                                                                                        {isCartaoD30 && !isCanceled && (
                                                                                            <p className="text-[10px] text-amber-600 mt-1">⚠ Cartão D+30 — entra no caixa em ~30 dias</p>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                                                                                        <span className={`text-sm font-black ${isCanceled ? 'text-gray-300 line-through' : valor > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                                                                                            {valor > 0 ? `R$ ${valor.toLocaleString('pt-BR')}` : '—'}
                                                                                        </span>
                                                                                        {/* Financeiro (Pago/Pendente/Convênio) logo abaixo do valor — sempre
                                                                                            visível, é um eixo independente do status operacional (Atendido)
                                                                                            abaixo dele. Ver DOMAIN_INVARIANTS.md #25: pago não implica
                                                                                            atendido, e vice-versa — os dois precisam aparecer sempre juntos
                                                                                            pra não deixar dúvida sobre se o dinheiro entrou ou não. */}
                                                                                        {paymentBadge && (
                                                                                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${paymentCls}`}>{paymentBadge}</span>
                                                                                        )}
                                                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusLabelCls}`}>{statusLabel}</span>
                                                                                    </div>
                                                                                </div>
                                                                                {showNowAfterThis && <NowMarker />}
                                                                            </React.Fragment>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                    {isToday && !nowRendered && sortedHours.length > 0 && sortedHours[sortedHours.length - 1] * 60 + 59 < nowMin && <NowMarker />}
                                                </div>
                                            );
                                        })()}
                                        {/* Rodapé · Caixa Real */}
                                        {data && (
                                            <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-3">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Resumo do Dia · Caixa Real</p>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                    <div>
                                                        <p className="text-[10px] text-gray-400">Caixa hoje</p>
                                                        <p className="text-base font-black text-gray-900">{formatCurrency(data.caixa?.total || 0)}</p>
                                                        <p className="text-[10px] text-gray-400">{data.estatisticas?.quantidade ?? 0} transaç{(data.estatisticas?.quantidade ?? 0) !== 1 ? 'ões' : 'ão'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-gray-400">Produção</p>
                                                        <p className="text-base font-black text-blue-600">{formatCurrency(data.producao?.total || 0)}</p>
                                                        <p className="text-[10px] text-gray-400">{data.estatisticas?.quantidadeAtendimentos ?? 0} atendimento{(data.estatisticas?.quantidadeAtendimentos ?? 0) !== 1 ? 's' : ''}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-gray-400">vs ontem</p>
                                                        <p className={`text-base font-black ${(data.comparativos?.variacaoVsOntem ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                            {(data.comparativos?.variacaoVsOntem ?? 0) > 0 ? '+' : ''}{((data.comparativos?.variacaoVsOntem) ?? 0).toFixed(1)}%
                                                        </p>
                                                        <p className="text-[10px] text-gray-400">ontem {formatCurrency(data.comparativos?.ontem || 0)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-gray-400">Acumulado mês</p>
                                                        <p className="text-base font-black text-gray-900">{formatCurrency(data.comparativos?.totalAcumuladoMes || 0)}</p>
                                                        <p className="text-[10px] text-gray-400">projeção {formatCurrency(data.comparativos?.projecaoMes || 0)}</p>
                                                    </div>
                                                </div>
                                                {(data.transacoes?.length ?? 0) > 0 && (
                                                    <div className="flex items-center gap-2 flex-wrap text-[10px] pt-2 mt-2 border-t border-gray-200">
                                                        <span className="text-gray-400 font-medium">Transação registrada:</span>
                                                        <span className="text-gray-700 font-semibold">{data.transacoes[0].paciente}</span>
                                                        <span className="bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full">{data.transacoes[0].servico}</span>
                                                        <span className="text-gray-500">· {(data.transacoes[0].profissional || '').split(' ').slice(0, 2).join(' ')}</span>
                                                        <span className="text-gray-500">· {data.transacoes[0].metodo}</span>
                                                        <span className="font-bold text-emerald-700">· {formatCurrency(data.transacoes[0].valor)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Tab 6: Por Especialidade */}
                    {activeTab === 6 && (
                        <div className="bg-white rounded-lg border border-gray-200 p-3">
                            <h3 className="text-base font-semibold mb-3">🏥 Produção por Especialidade</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {data.producao.porEspecialidade?.map((esp) => (
                                    <div key={esp.nome} className="border border-gray-200 rounded-lg p-3">
                                        <h4 className="font-semibold text-gray-800">{esp.nome}</h4>
                                        <div className="text-2xl font-bold text-blue-600">{formatCurrency(esp.total)}</div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            {esp.quantidade} atendimentos • Ticket: {formatCurrency(Number(esp.ticketMedio))}
                                        </div>
                                        <LinearProgress 
                                            variant="determinate" 
                                            value={(esp.recebido / esp.total) * 100} 
                                            className="mt-2 h-1.5 rounded-full"
                                        />
                                        <div className="flex justify-between text-xs mt-1">
                                            <span className="text-emerald-600">{formatCurrency(esp.recebido)} recebido</span>
                                            <span className="text-amber-600">{formatCurrency(esp.pendente)} pendente</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tab 7: Profissionais */}
                    {activeTab === 7 && (() => {
                        const byProf: Record<string, { receita: number; sessoes: number; cancelados: number; atendimentos: number }> = {};
                        const ensure = (k: string) => {
                            if (!byProf[k]) byProf[k] = { receita: 0, sessoes: 0, cancelados: 0, atendimentos: 0 };
                            return byProf[k];
                        };
                        for (const t of (data.transacoes || [])) {
                            const p = ensure(t.profissional || 'Não informado');
                            p.receita += t.valor;
                            p.sessoes += 1;
                        }
                        for (const a of dayAppointments) {
                            const prof = (a as any).professionalName || 'Não informado';
                            if (!['converted', 'pre_agendado'].includes((a as any).operationalStatus)) ensure(prof).atendimentos += 1;
                            if ((a as any).operationalStatus === 'canceled') ensure(prof).cancelados += 1;
                        }
                        const rows = Object.entries(byProf)
                            .map(([nome, v]) => ({ nome, ...v, ticket: v.sessoes > 0 ? v.receita / v.sessoes : 0 }))
                            .sort((a, b) => b.receita - a.receita);
                        const totalReceita = rows.reduce((s, r) => s + r.receita, 0);
                        const totalSessoes = rows.reduce((s, r) => s + r.sessoes, 0);
                        const totalCancel = rows.reduce((s, r) => s + r.cancelados, 0);
                        const totalApts = rows.reduce((s, r) => s + r.atendimentos, 0);
                        return (
                            <div className="bg-white rounded-lg border border-gray-200 p-3">
                                <h3 className="text-base font-semibold mb-3">👥 Breakdown por Profissional</h3>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-gray-50 border-b">
                                            <tr>
                                                <th className="px-3 py-2 text-left">Profissional</th>
                                                <th className="px-3 py-2 text-center">Agendados</th>
                                                <th className="px-3 py-2 text-center">Recebidos</th>
                                                <th className="px-3 py-2 text-center">Cancelados</th>
                                                <th className="px-3 py-2 text-right">Receita</th>
                                                <th className="px-3 py-2 text-right">Ticket Médio</th>
                                                <th className="px-3 py-2 text-right">% Receita</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.map(r => {
                                                const pct = totalReceita > 0 ? Math.round((r.receita / totalReceita) * 100) : 0;
                                                return (
                                                    <tr key={r.nome} className="border-b hover:bg-gray-50">
                                                        <td className="px-3 py-2 font-medium text-gray-800">{r.nome}</td>
                                                        <td className="px-3 py-2 text-center text-gray-600">{r.atendimentos}</td>
                                                        <td className="px-3 py-2 text-center font-semibold text-emerald-700">{r.sessoes}</td>
                                                        <td className="px-3 py-2 text-center">
                                                            {r.cancelados > 0 ? <span className="text-red-500 font-semibold">{r.cancelados}</span> : <span className="text-gray-300">—</span>}
                                                        </td>
                                                        <td className="px-3 py-2 text-right font-bold text-emerald-700">{formatCurrency(r.receita)}</td>
                                                        <td className="px-3 py-2 text-right text-gray-600">{formatCurrency(r.ticket)}</td>
                                                        <td className="px-3 py-2 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                                                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                                                                </div>
                                                                <span className="text-xs font-semibold text-gray-500 w-8 text-right">{pct}%</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {rows.length === 0 && (
                                                <tr><td colSpan={7} className="text-center py-4 text-gray-500">Nenhum dado disponível</td></tr>
                                            )}
                                        </tbody>
                                        {rows.length > 1 && (
                                            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                                                <tr>
                                                    <td className="px-3 py-2 font-bold text-gray-700">Total</td>
                                                    <td className="px-3 py-2 text-center font-semibold text-gray-700">{totalApts}</td>
                                                    <td className="px-3 py-2 text-center font-semibold text-emerald-700">{totalSessoes}</td>
                                                    <td className="px-3 py-2 text-center font-semibold text-red-500">{totalCancel > 0 ? totalCancel : '—'}</td>
                                                    <td className="px-3 py-2 text-right font-bold text-emerald-700">{formatCurrency(totalReceita)}</td>
                                                    <td className="px-3 py-2 text-right font-bold text-gray-600">{formatCurrency(totalSessoes > 0 ? totalReceita / totalSessoes : 0)}</td>
                                                    <td className="px-3 py-2 text-right font-bold text-gray-500">100%</td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            </div>
                        );
                    })()}
                </div>
                </div>
            ) : viewMode === 'month' ? (
                // ===== VISUALIZAÇÃO MENSAL =====
                <div>
                    {/* Painel Analítico — Visão Gerencial */}
                    {monthResumo && (
                        <div className="mb-4 border border-gray-200 rounded-xl bg-white p-4">
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Visão Gerencial</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                                    <div className="text-[11px] text-gray-500 mb-0.5">Caixa Real</div>
                                    <div className="text-xl font-bold text-emerald-700">{formatCurrency(monthResumo.caixaBruto)}</div>
                                    <div className="text-[10px] text-gray-400 mt-1">dinheiro efetivamente recebido</div>
                                </div>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <div className="text-[11px] text-gray-500 mb-0.5">Produção Clínica</div>
                                    <div className="text-xl font-bold text-blue-700">{formatCurrency(monthResumo.producaoTotal)}</div>
                                    {monthResumo.convenioAReceber > 0 && (
                                        <div className="text-[10px] text-purple-600 mt-1">
                                            inclui {formatCurrency(monthResumo.convenioAReceber)} convênio a receber
                                        </div>
                                    )}
                                </div>
                                <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
                                    <div className="text-[11px] text-gray-500 mb-0.5">Regime de Competência</div>
                                    <div className="text-xl font-bold text-violet-700">{formatCurrency(monthResumo.producaoTotal)}</div>
                                    <div className="text-[10px] text-gray-400 mt-1">serviços entregues · base da meta</div>
                                </div>
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                    <div className="text-[11px] text-gray-500 mb-0.5">Produção por tipo</div>
                                    <div className="space-y-1 mt-1">
                                        {[
                                            { label: 'Particular', v: monthResumo.porTipo.particular, color: 'text-blue-600' },
                                            { label: 'Pacote', v: monthResumo.porTipo.pacote, color: 'text-indigo-600' },
                                            { label: 'Convênio', v: monthResumo.porTipo.convenio, color: 'text-purple-600' },
                                            { label: 'Liminar', v: monthResumo.porTipo.liminar, color: 'text-orange-600' },
                                        ].filter(i => i.v > 0).map(i => (
                                            <div key={i.label} className="flex justify-between text-[11px]">
                                                <span className="text-gray-500">{i.label}</span>
                                                <span className={`font-semibold ${i.color}`}>{formatCurrency(i.v)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tabela de Dias */}
                    <div className="bg-white rounded-lg border border-gray-200 p-3">
                        <h3 className="text-base font-semibold mb-3">📅 Fluxo Diário do Mês</h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-3 py-2 text-left">Data</th>
                                        <th className="px-3 py-2 text-right">Caixa</th>
                                        <th className="px-3 py-2 text-right">Prod. Clínica</th>
                                        <th className="px-3 py-2 text-right">Atendimentos</th>
                                        <th className="px-3 py-2 text-right" title="Produção clínica ÷ Atendimentos realizados no dia">Ticket Médio</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {monthData
                                        .filter(d => (d.caixa > 0 || d.producao > 0) && d.date <= new Date().toISOString().slice(0, 10))
                                        .map((day) => {
                                            const ticket = day.atendimentos > 0 ? day.producao / day.atendimentos : 0;
                                            return (
                                                <tr key={day.date} className="border-b hover:bg-gray-50">
                                                    <td className="px-3 py-2">{format(parseISO(day.date), 'dd/MM/yyyy')}</td>
                                                    <td className="px-3 py-2 text-right font-bold text-emerald-600">{formatCurrency(day.caixa)}</td>
                                                    <td className="px-3 py-2 text-right text-blue-600">{formatCurrency(day.producao)}</td>
                                                    <td className="px-3 py-2 text-right">{day.atendimentos}</td>
                                                    <td className="px-3 py-2 text-right text-gray-700">
                                                        {ticket > 0 ? formatCurrency(ticket) : '—'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    {monthData.some(d => d.caixa > 0 || d.producao > 0) && (
                                        <tr className="border-t-2 border-gray-300 bg-gray-100 font-bold">
                                            <td className="px-3 py-2">Total</td>
                                            <td className="px-3 py-2 text-right text-emerald-700">{formatCurrency(monthResumo?.caixaBruto ?? monthTotals.totalCaixa)}</td>
                                            <td className="px-3 py-2 text-right text-blue-700">{formatCurrency(monthResumo?.producaoTotal ?? monthTotals.totalProducao)}</td>
                                            <td className="px-3 py-2 text-right text-gray-800">{monthTotals.totalAtendimentos}</td>
                                            <td className="px-3 py-2 text-right text-gray-800" title="% Recebido do mês = Caixa total ÷ Produção total. No acumulado, antecipações e retroativos se compensam.">
                                                {(monthResumo?.producaoTotal ?? monthTotals.totalProducao) > 0 ? (((monthResumo?.caixaBruto ?? monthTotals.totalCaixa) / (monthResumo?.producaoTotal ?? monthTotals.totalProducao)) * 100).toFixed(1) : 0}% recebido
                                            </td>
                                        </tr>
                                    )}
                                    {!monthData.some(d => d.caixa > 0 || d.producao > 0) && (
                                        <tr><td colSpan={5} className="text-center py-4 text-gray-500">Nenhum movimento neste mês</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <p className="text-gray-400 text-sm">Erro ao carregar dados. Verifique a conexão.</p>
                    <button
                        onClick={() => loadDayData()}
                        className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                    >
                        Tentar novamente
                    </button>
                </div>
            )}
            {/* ===== MODAL: DETALHE DO AGENDAMENTO ===== */}
        {selectedApt && (() => {
            const apt = selectedApt;
            const scMap: Record<string, { bg: string; label: string; checkmark: string }> = {
                completed:    { bg: 'bg-emerald-500', label: 'Atendido',     checkmark: '✓' },
                scheduled:    { bg: 'bg-blue-500',    label: 'Agendado',     checkmark: '○' },
                confirmed:    { bg: 'bg-sky-400',     label: 'Confirmado',   checkmark: '✓' },
                canceled:     { bg: 'bg-red-400',     label: 'Cancelado',    checkmark: '✗' },
                pre_agendado: { bg: 'bg-amber-400',   label: 'Pré-agendado', checkmark: '○' },
            };
            const sc = scMap[apt.operationalStatus] || { bg: 'bg-gray-400', label: apt.operationalStatus, checkmark: '○' };
            const valor = apt.sessionValue || apt.package?.sessionValue || 0;
            const phone = apt.patientInfo?.phone || apt.patient?.phone;
            const patientName = apt.patientInfo?.fullName || apt.patient?.fullName || '—';
            const isNew = (analyticsData?.novos || []).some((n: any) => n._id === apt._id);
            const isCanceled = apt.operationalStatus === 'canceled';
            const isCompleted = apt.operationalStatus === 'completed';
            const isConvenio = apt.billingType === 'convenio' || !!apt.insuranceProvider;
            const isLiminar = apt.billingType === 'liminar';
            const formatConvenioName = (name: string) => name ? name.replace(/-/g, ' ').split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Convênio';
            const aptDate = apt.date ? new Date(apt.date + 'T12:00:00').toLocaleDateString('pt-BR') : selectedDate ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR') : '';

            const tx = (data?.transacoes || []).find((t: any) =>
                t.hora === apt.time &&
                t.paciente === (apt.patientInfo?.fullName || apt.patient?.fullName)
            );

            const serviceLabel: Record<string, string> = { evaluation: 'Avaliação', session: 'Sessão', package_session: 'Sessão de Pacote', tongue_tie_test: 'Teste Linguinha', neuropsych_evaluation: 'Aval. Neuropsicológica', individual_session: 'Sessão Avulsa', return: 'Retorno' };
            const methodLabel: Record<string, string> = { pix: 'Pix', dinheiro: 'Dinheiro', cartao_credito: 'Cartão de Crédito', credito: 'Cartão de Crédito', cartao_debito: 'Débito', debito: 'Débito', transferencia_bancaria: 'Transferência Bancária', transferencia: 'Transferência Bancária', outro: 'Outro' };
            const prazoLabel: Record<string, string> = { pix: 'D+0 (imediato)', dinheiro: 'D+0 (imediato)', cartao_credito: 'D+30', credito: 'D+30', cartao_debito: 'D+1', debito: 'D+1', transferencia_bancaria: 'D+1', transferencia: 'D+1' };
            const aptStatusFinanceiro = resolveStatusFinanceiro(apt);

            const situacaoConfig: Record<string, { label: string; cls: string }> = {
                'Pré-pago':        { label: '📦 Crédito de pacote consumido', cls: 'bg-violet-100 text-violet-700' },
                'Pago na Sessão':  { label: '✓ Pago no atendimento',          cls: 'bg-emerald-100 text-emerald-700' },
                'Avaliação Paga':  { label: '✓ Pago no atendimento',          cls: 'bg-emerald-100 text-emerald-700' },
                'Pendente':        { label: '⌛ Aguardando pagamento',         cls: 'bg-amber-100 text-amber-700' },
                'Pacote Pendente': { label: '⌛ Sessão de pacote pendente',    cls: 'bg-amber-100 text-amber-700' },
                'Convênio':        { label: 'A faturar ao convênio',           cls: 'bg-amber-100 text-amber-700' },
                'Liminar':         { label: '⚖️ Via processo judicial',        cls: 'bg-orange-100 text-orange-700' },
                'Pago Parcial':    { label: '◑ Pago parcialmente',            cls: 'bg-orange-100 text-orange-700' },
            };
            const situacaoCfg = aptStatusFinanceiro && aptStatusFinanceiro !== 'Cancelado'
                ? (situacaoConfig[aptStatusFinanceiro] || { label: aptStatusFinanceiro, cls: 'bg-gray-100 text-gray-600' })
                : null;

            const showConvenioAlert = isCompleted && isConvenio && !tx;
            const showNoTxAlert = isCompleted && !isConvenio && !isLiminar && !tx;

            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedApt(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

                        {/* Header colorido */}
                        <div className={`px-5 py-4 ${sc.bg} flex items-start justify-between gap-3 rounded-t-2xl`}>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-white/90 font-bold text-sm">{sc.checkmark} {sc.label}</span>
                                    {isNew && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/20 text-white border border-white/30">1ª vez</span>}
                                    <span className="text-white/70 font-mono text-sm ml-auto">{apt.time || '--:--'}</span>
                                </div>
                                <h3 className="text-xl font-bold text-white truncate">{patientName}</h3>
                                <p className="text-sm text-white/70 mt-0.5">{apt.specialty || ''}</p>
                            </div>
                            <button onClick={() => setSelectedApt(null)} className="text-white/70 hover:text-white text-xl leading-none shrink-0">×</button>
                        </div>

                        {/* Badges de tipo */}
                        <div className="px-5 pt-4 flex flex-wrap gap-1.5">
                            {(isConvenio || apt.billingType) && (
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${isConvenio ? 'bg-purple-100 text-purple-700 border-purple-200' : isLiminar ? 'bg-orange-100 text-orange-700 border-orange-200' : apt.billingType === 'package' ? 'bg-violet-100 text-violet-700 border-violet-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                                    {isConvenio ? `🏥 Convênio${apt.insuranceProvider ? ' · ' + formatConvenioName(apt.insuranceProvider) : ''}` : apt.billingType === 'liminar' ? '⚖️ Liminar' : apt.billingType === 'package' ? '📦 Pacote' : 'Particular'}
                                </span>
                            )}
                            {apt.serviceType && (
                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold border bg-gray-100 text-gray-600 border-gray-200">
                                    {serviceLabel[apt.serviceType] || apt.serviceType}
                                </span>
                            )}
                            {apt.package?.name && (
                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold border bg-violet-100 text-violet-700 border-violet-200">📦 {apt.package.name}</span>
                            )}
                        </div>

                        <div className="px-5 pb-5 pt-3 space-y-3">
                            {/* Alerta convênio: atendido mas fora do caixa */}
                            {showConvenioAlert && (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex gap-3">
                                    <span className="text-amber-500 shrink-0 mt-0.5">⚠️</span>
                                    <div>
                                        <p className="text-sm font-bold text-amber-800">Atendimento sem caixa registrado</p>
                                        <p className="text-xs text-amber-600 mt-0.5">Convênio aguarda faturamento — não entrou no caixa do dia</p>
                                    </div>
                                </div>
                            )}
                            {showNoTxAlert && (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                                    <p className="text-sm text-amber-700 font-medium">⚠️ Atendimento concluído sem transação registrada no caixa do dia.</p>
                                </div>
                            )}
                            {/* Motivo do cancelamento */}
                            {isCanceled && (
                                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                                    <div className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1.5">✗ Cancelamento</div>
                                    {apt.cancelReason
                                        ? <p className="text-sm text-red-800 whitespace-pre-line">{apt.cancelReason}</p>
                                        : <p className="text-sm text-red-400 italic">Nenhum motivo registrado.</p>}
                                </div>
                            )}

                            {/* Bloco FINANCEIRO */}
                            {!isCanceled && (
                                <div className="rounded-xl border border-gray-100 overflow-hidden">
                                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">💰 Financeiro</span>
                                    </div>
                                    <div className="px-4 py-3 space-y-2.5">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-500">Valor da sessão</span>
                                            <span className="text-lg font-extrabold text-emerald-700">{formatCurrency(valor)}</span>
                                        </div>
                                        {situacaoCfg && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-500">Situação</span>
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${situacaoCfg.cls}`}>{situacaoCfg.label}</span>
                                            </div>
                                        )}
                                        {apt.insuranceProvider && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-500">Convênio</span>
                                                <span className="text-sm font-semibold text-purple-700">{apt.insuranceProvider}</span>
                                            </div>
                                        )}
                                        {(isConvenio || isLiminar) && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-500">Entra no caixa</span>
                                                <span className="text-sm text-gray-600">{isLiminar ? 'Via depósito judicial' : 'Após repasse do plano'}</span>
                                            </div>
                                        )}
                                        {apt.authorizationCode && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-500">Cód. Autorização</span>
                                                <span className="text-sm font-mono text-gray-800">{apt.authorizationCode}</span>
                                            </div>
                                        )}
                                        {apt.paymentMethod && apt.paymentMethod !== 'pending' && (
                                            <div className="flex justify-between items-start">
                                                <span className="text-sm text-gray-500">Método</span>
                                                <div className="text-right">
                                                    {(apt as any).payment?.splitMethods?.length >= 2 ? (
                                                        <div className="space-y-0.5">
                                                            {(apt as any).payment.splitMethods.map((s: any, i: number) => (
                                                                <div key={i} className="text-sm font-semibold text-gray-800">
                                                                    {methodLabel[s.method] || s.method}: {formatCurrency(s.amount)}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="text-sm font-semibold text-gray-800">{methodLabel[apt.paymentMethod] || apt.paymentMethod}</div>
                                                            {prazoLabel[apt.paymentMethod] && <div className="text-[11px] text-gray-400">{prazoLabel[apt.paymentMethod]}</div>}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Transação cruzada */}
                            {tx && (
                                <div className="rounded-xl border border-emerald-200 overflow-hidden">
                                    <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-200">
                                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">✅ Transação Registrada no Caixa</span>
                                    </div>
                                    <div className="px-4 py-3 space-y-2.5">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-500">Valor recebido</span>
                                            <span className="text-lg font-extrabold text-emerald-700">{formatCurrency(tx.valor)}</span>
                                        </div>
                                        {(tx as any).paymentForms?.length > 1 ? (
                                            <div className="flex justify-between items-start">
                                                <span className="text-sm text-gray-500">Formas de pagamento</span>
                                                <div className="text-right space-y-0.5">
                                                    {(tx as any).paymentForms.map((f: any, i: number) => (
                                                        <div key={i} className="text-xs font-semibold text-gray-700">{methodLabel[f.method] || f.method}: {formatCurrency(f.amount)}</div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : tx.metodo && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-500">Método</span>
                                                <span className="text-sm font-semibold text-gray-800">{tx.metodo}</span>
                                            </div>
                                        )}
                                        {tx.tipo && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-500">Tipo</span>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${tx.tipo === 'Pacote' ? 'bg-violet-100 text-violet-800' : tx.tipo === 'Convênio' ? 'bg-sky-100 text-sky-800' : tx.tipo === 'Liminar' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>{tx.tipo}</span>
                                            </div>
                                        )}
                                        {valor > 0 && tx.valor !== valor && (
                                            <div className="flex justify-between items-center border-t border-gray-100 pt-2.5">
                                                <span className="text-sm text-gray-500">Diferença previsto × recebido</span>
                                                <span className={`text-sm font-bold ${tx.valor < valor ? 'text-red-600' : 'text-emerald-600'}`}>
                                                    {tx.valor < valor ? '−' : '+'}{formatCurrency(Math.abs(tx.valor - valor))}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Bloco SESSÃO */}
                            <div className="rounded-xl border border-gray-100 overflow-hidden">
                                <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">📋 Sessão</span>
                                </div>
                                <div className="px-4 py-3 space-y-2.5">
                                    {apt.specialty && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-500">Especialidade</span>
                                            <span className="text-sm font-semibold text-gray-800">{apt.specialty}</span>
                                        </div>
                                    )}
                                    {apt.serviceType && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-500">Tipo</span>
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${isConvenio ? 'bg-sky-100 text-sky-700 border-sky-200' : isLiminar ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                                {isConvenio ? '🏥 Convênio' : isLiminar ? '⚖️ Liminar' : serviceLabel[apt.serviceType] || apt.serviceType}
                                            </span>
                                        </div>
                                    )}
                                    {apt.professionalName && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-500">Profissional</span>
                                            <span className="text-sm font-semibold text-gray-800">{apt.professionalName}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-500">Horário</span>
                                        <span className="text-sm font-semibold text-gray-800">{apt.time || '--:--'}{aptDate ? ` · ${aptDate}` : ''}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Observações */}
                            {apt.notes && (
                                <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">🗒 Observações</div>
                                    <p className="text-sm text-gray-700 whitespace-pre-line">{apt.notes}</p>
                                </div>
                            )}

                            {/* Ações */}
                            <div className="space-y-2 pt-1">
                                {phone && (
                                    <button
                                        onClick={() => { handleOpenWhatsApp(phone); setSelectedApt(null); }}
                                        className="w-full flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm transition-colors"
                                    >
                                        💬 Abrir WhatsApp — {phone}
                                    </button>
                                )}
                                {isConvenio && (
                                    <button
                                        onClick={() => setSelectedApt(null)}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:border-purple-300 hover:text-purple-700 hover:bg-purple-50 transition-colors"
                                    >
                                        📋 Faturar ao convênio ↗
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            );
        })()}

        {editPayment && (
            <AdminEditPaymentModal
                open={!!editPayment}
                payment={editPayment}
                onClose={() => setEditPayment(null)}
                onSuccess={() => { setEditPayment(null); setGroupDetailItems(null); loadDayData(); }}
            />
        )}
        </div>
    );
};

export default UnifiedCashflowTab;