// UnifiedCashflowTab.tsx - Caixa e Fluxo de Caixa unificados (refatorado com Tailwind)
import { 
    Alert, Chip, MenuItem, Skeleton, Tab, Tabs, Badge, Tooltip, IconButton,
    FormControl, InputLabel, Select, LinearProgress
} from '@mui/material';
import { format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useAppointmentsByType } from '../../hooks/useAppointmentsByType';
import { useRetentionSlots } from '../../hooks/useRetentionSlots';
import { cashflowService, CashflowV2Response } from '../../services/cashflowService';
import { operationalService } from '../../services/operationalService';
import API from '../../services/api';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import InventoryIcon from '@mui/icons-material/Inventory';
import ReceiptIcon from '@mui/icons-material/Receipt';
import WarningIcon from '@mui/icons-material/Warning';
import PhoneIcon from '@mui/icons-material/Phone';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import PeopleIcon from '@mui/icons-material/People';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import PieChartIcon from '@mui/icons-material/PieChart';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

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

const UnifiedCashflowTab = ({ month, year, dateRange, defaultViewMode }: UnifiedCashflowTabProps) => {
    const [dailyCashflow, setDailyCashflow] = useState<CashflowV2Response | null>(null);

    const [monthData, setMonthData] = useState<DayData[]>([]);
    const [monthResumo, setMonthResumo] = useState<{
        caixaBruto: number; producaoTotal: number; convenioAReceber: number;
        porTipo: { particular: number; pacote: number; convenio: number; liminar: number };
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(0);
    const [viewMode, setViewMode] = useState<'day' | 'month'>('day');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [manualDateOverride, setManualDateOverride] = useState(false);
    const [dayAppointments, setDayAppointments] = useState<any[]>([]);
    const [appointmentFilter, setAppointmentFilter] = useState<string>('all');
    const [loadingAppointments, setLoadingAppointments] = useState(false);

    const isFirstRender = useRef(true);

    // PatientsSummaryCard data
    const { data: analyticsData, loading: analyticsLoading, fetch: fetchAnalytics } = useAppointmentsByType();
    const [newPatientsModalOpen, setNewPatientsModalOpen] = useState(false);
    const [newSpecialtyModalOpen, setNewSpecialtyModalOpen] = useState(false);
    const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);

    // 🏥 Dados operacionais: retenção + pacientes sem próxima sessão
    const { data: retentionData } = useRetentionSlots('', 30);
    const [patientsWithoutNext, setPatientsWithoutNext] = useState(0);
    const [patientsWithoutNextRecurrent, setPatientsWithoutNextRecurrent] = useState(0);
    const [patientsWithoutNextImpact, setPatientsWithoutNextImpact] = useState(0);
    const [patientsWithoutNextLoading, setPatientsWithoutNextLoading] = useState(false);

    const fetchAnalyticsForPeriod = useCallback(async () => {
        if (dateRange) {
            await fetchAnalytics({ startDate: dateRange.startDate, endDate: dateRange.endDate, mode: 'date' });
        } else {
            await fetchAnalytics({ startDate: selectedDate, endDate: selectedDate, mode: 'date' });
        }
    }, [fetchAnalytics, selectedDate, dateRange]);

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
    }, [selectedDate, dateRange, manualDateOverride, fetchAnalyticsForPeriod]);

    // Recarrega agendamentos quando o usuário NAVEGA para a aba (não no mount inicial)
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        if (activeTab === 4 && viewMode === 'day') {
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

    const loadDayData = async (guard = { active: true }) => {
        setLoading(true);
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
            setDayAppointments(res.data?.data?.appointments || []);
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
                    {/* ========== LINHA 1: Saúde Operacional do Dia ========== */}
                    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 ${isMultiDayRange ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>

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
                                const sessoesDoDia = transacoes.reduce((s: number, t: any) => s + (t.tipo !== 'Pacote' || !t.isPackageSale ? (t.valor || 0) : 0), 0);
                                const vendaPacotes = transacoes.reduce((s: number, t: any) => s + (t.isPackageSale ? (t.valor || 0) : 0), 0);
                                const sessoesPacote = transacoes.reduce((s: number, t: any) => s + (t.tipo === 'Pacote' && !t.isPackageSale ? (t.valor || 0) : 0), 0);
                                const outros = data.caixa.total - sessoesDoDia - vendaPacotes;
                                return (
                                    <div className="pt-3 border-t border-gray-100 space-y-2">
                                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Origem do Caixa</div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="flex items-center gap-2 text-gray-600"><span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />Sessões do dia</span>
                                            <span className="font-semibold text-gray-800">{formatCurrency(sessoesDoDia - sessoesPacote)}</span>
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

                        {/* ── Agenda Hoje ── */}
                        {!isMultiDayRange && (() => {
                            const all = analyticsData?.all || [];
                            const agendados = all.filter((a: any) => !['converted', 'pre_agendado'].includes(a.operationalStatus));
                            const atendidos = all.filter((a: any) => a.operationalStatus === 'completed');
                            const confirmados = all.filter((a: any) => a.operationalStatus === 'confirmed');
                            const aguardando = all.filter((a: any) => a.operationalStatus === 'scheduled');
                            const faltas = all.filter((a: any) => ['missed', 'canceled'].includes(a.operationalStatus));
                            const pct = agendados.length > 0 ? Math.round((atendidos.length / agendados.length) * 100) : 0;
                            return (
                                <div className="rounded-2xl border-2 p-5 shadow-sm" style={{ borderColor: '#0EA5E9', backgroundColor: '#F0F9FF' }}>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center flex-shrink-0">
                                            <CalendarTodayIcon style={{ fontSize: 20 }} className="text-sky-600" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-black text-sky-700 uppercase tracking-widest">Agenda Hoje</div>
                                            <div className="text-[11px] text-gray-400 leading-tight">Estado da Operação</div>
                                        </div>
                                    </div>
                                    <div className="flex items-baseline gap-2 mb-1">
                                        <span className="text-[26px] font-extrabold text-sky-700 leading-none tracking-tight">{atendidos.length}</span>
                                        <span className="text-sm text-gray-400">/ {agendados.length}</span>
                                    </div>
                                    <div className="text-xs text-gray-500 mb-3">{pct}% de presença</div>
                                    <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-x-3 gap-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Atendidos</span>
                                            <span className="text-sm font-bold text-emerald-600">{atendidos.length}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Confirmados</span>
                                            <span className="text-sm font-bold text-sky-600">{confirmados.length}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Aguardando</span>
                                            <span className="text-sm font-bold text-amber-600">{aguardando.length}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Faltas</span>
                                            <span className="text-sm font-bold text-red-500">{faltas.length}</span>
                                        </div>
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
                                onClick={() => setActiveTab(4)}
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
                                onClick={() => window.location.href = '/retention'}
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
                    {/* Card de Pacientes Novos {periodTitle} */}
                    {(() => {
                        const leads = analyticsData?.leads || [];
                        const svcLabel: Record<string, string> = {
                            'evaluation': 'Avaliação', 'session': 'Sessão', 'package_session': 'Sessão Pacote',
                            'tongue_tie_test': 'Teste Linguinha', 'neuropsych_evaluation': 'Aval. Neuropsic.',
                            'individual_session': 'Sessão Avulsa', 'package': 'Pacote'
                        };
                        return (
                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-2 px-0.5">
                                    <h3 className="text-sm font-semibold text-gray-700">Pacientes Novos</h3>
                                    <span className="text-xs text-gray-400">{isRangeActive && dateRange ? formatDateRange(dateRange) : format(parseISO(selectedDate), "dd 'de' MMMM", { locale: ptBR })}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                <button
                                    onClick={() => leads.length > 0 && setNewPatientsModalOpen(true)}
                                    className={`text-left p-3 rounded-xl border transition-all ${leads.length > 0 ? 'bg-pink-50 border-pink-200 hover:border-pink-400 cursor-pointer' : 'bg-gray-50 border-gray-200 cursor-default'}`}
                                >
                                    <div className="text-[9px] font-semibold text-pink-500 uppercase tracking-wide mb-0.5">Pré-agendados novos</div>
                                    <div className="text-2xl font-bold text-pink-600">{leads.length}</div>
                                    <div className="text-[11px] text-gray-400">1ª vez na clínica</div>
                                </button>
                                {(() => {
                                    const novosEsp = analyticsData?.novosEspecialidade || [];
                                    return (
                                        <button
                                            onClick={() => novosEsp.length > 0 && setNewSpecialtyModalOpen(true)}
                                            className={`text-left p-3 rounded-xl border transition-all ${novosEsp.length > 0 ? 'bg-amber-50 border-amber-200 hover:border-amber-400 cursor-pointer' : 'bg-gray-50 border-gray-200 cursor-default'}`}
                                        >
                                            <div className="text-[9px] font-semibold text-amber-600 uppercase tracking-wide mb-0.5">Nova especialidade</div>
                                            <div className="text-2xl font-bold text-amber-600">{novosEsp.length}</div>
                                            <div className="text-[11px] text-gray-400">Paciente existente</div>
                                        </button>
                                    );
                                })()}
                                {(() => {
                                    const all = analyticsData?.all || [];
                                    const agendados = all.filter((a: any) => !['converted', 'pre_agendado'].includes(a.operationalStatus));
                                    const atendidos = all.filter((a: any) => a.operationalStatus === 'completed');
                                    const faltas = all.filter((a: any) => ['missed', 'canceled'].includes(a.operationalStatus));
                                    const restantes = agendados.length - atendidos.length - faltas.length;
                                    const pct = agendados.length > 0 ? Math.round((atendidos.length / agendados.length) * 100) : 0;
                                    return (
                                        <button
                                            onClick={() => agendados.length > 0 && setAttendanceModalOpen(true)}
                                            className={`text-left p-3 rounded-xl border transition-all w-full ${atendidos.length > 0 ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-400 cursor-pointer' : 'bg-gray-50 border-gray-200 cursor-default'}`}
                                        >
                                            <div className="text-[9px] font-semibold text-emerald-600 uppercase tracking-wide mb-0.5">Comparecimento</div>
                                            <div className="flex items-baseline gap-1">
                                                <div className="text-2xl font-bold text-emerald-600">{atendidos.length}</div>
                                                <div className="text-xs text-gray-400">/ {agendados.length}</div>
                                            </div>
                                            <div className="text-[11px] text-gray-500">{pct}% presença</div>
                                            <div className="flex gap-2 mt-0.5">
                                                {faltas.length > 0 && <span className="text-[9px] text-red-500">{faltas.length}F</span>}
                                                {restantes > 0 && <span className="text-[9px] text-amber-500">{restantes}R</span>}
                                            </div>
                                        </button>
                                    );
                                })()}
                                </div>

                                {/* Modal: Pré-agendados Novos */}
                                {newPatientsModalOpen && (
                                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setNewPatientsModalOpen(false)}>
                                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center justify-between p-6 border-b border-gray-100">
                                                <div>
                                                    <h3 className="text-xl font-bold text-gray-900">Pré-agendados Novos</h3>
                                                    <p className="text-sm text-gray-500 mt-1">{isRangeActive && dateRange ? formatDateRange(dateRange) : format(parseISO(selectedDate), "dd 'de' MMMM", { locale: ptBR })}</p>
                                                </div>
                                                <button onClick={() => setNewPatientsModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
                                            </div>
                                            <div className="overflow-y-auto p-6">
                                                {leads.length === 0 ? (
                                                    <p className="text-center text-gray-500 py-8">Nenhum pré-agendado novo encontrado.</p>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {leads.map((apt: any) => {
                                                            const svcText = apt.serviceType ? (svcLabel[apt.serviceType] || apt.serviceType) : null;
                                                            const billingColor: Record<string, string> = { particular: 'bg-blue-100 text-blue-700', convenio: 'bg-purple-100 text-purple-700', liminar: 'bg-orange-100 text-orange-700', package: 'bg-indigo-100 text-indigo-700' };
                                                            return (
                                                                <div key={apt._id} className="bg-gray-50 rounded-lg p-4 border border-gray-100 hover:bg-gray-100 transition-colors">
                                                                    <div className="flex items-start justify-between gap-2">
                                                                        <div className="flex-1">
                                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                                <p className="font-semibold text-gray-900">{apt.patientInfo?.fullName || apt.patient?.fullName || 'Nome não informado'}</p>
                                                                                <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold">⭐ 1ª Visita</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
                                                                                <span>📞 {apt.patientInfo?.phone || apt.patient?.phone || 'Sem telefone'}</span>
                                                                                <span>📅 {apt.date ? new Date(apt.date).toLocaleDateString('pt-BR') : ''} {apt.time}</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                                                <span className="text-xs text-gray-500">👤 {apt.doctor?.fullName || apt.professionalName || 'Profissional não informado'}</span>
                                                                                {apt.specialty && <span className="bg-green-200 text-green-700 px-1.5 py-0.5 rounded-full text-[10px] uppercase font-medium">{apt.specialty}</span>}
                                                                                {svcText && <span className="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full text-[10px] font-medium">{svcText}</span>}
                                                                                {apt.billingType && <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${billingColor[apt.billingType] || 'bg-gray-100 text-gray-600'}`}>{apt.billingType === 'particular' ? 'Particular' : apt.billingType === 'convenio' ? 'Convênio' : apt.billingType}</span>}
                                                                            </div>
                                                                        </div>
                                                                        <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${apt.operationalStatus === 'pre_agendado' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                            {apt.operationalStatus === 'pre_agendado' ? 'Pré-agendado' : 'Agendado'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl text-sm text-gray-600 text-center">
                                                <strong>{leads.length}</strong> paciente{leads.length !== 1 ? 's' : ''} novo{leads.length !== 1 ? 's' : ''} {isRangeActive ? 'no período' : 'hoje'}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Modal: Novos na Especialidade */}
                                {newSpecialtyModalOpen && (() => {
                                    const novosEsp = analyticsData?.novosEspecialidade || [];
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
                                                            {novosEsp.map((apt: any) => {
                                                                const svcText = apt.serviceType ? ({
                                                                    'evaluation': 'Avaliação', 'session': 'Sessão', 'package_session': 'Sessão Pacote',
                                                                    'tongue_tie_test': 'Teste Linguinha', 'neuropsych_evaluation': 'Aval. Neuropsic.',
                                                                    'individual_session': 'Sessão Avulsa', 'package': 'Pacote'
                                                                }[apt.serviceType] || apt.serviceType) : null;
                                                                const billingColor: Record<string, string> = { particular: 'bg-blue-100 text-blue-700', convenio: 'bg-purple-100 text-purple-700', liminar: 'bg-orange-100 text-orange-700', package: 'bg-indigo-100 text-indigo-700' };
                                                                return (
                                                                    <div key={apt._id} className="bg-gray-50 rounded-lg p-4 border border-gray-100 hover:bg-gray-100 transition-colors">
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
                                                                                    {svcText && <span className="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full text-[10px] font-medium">{svcText}</span>}
                                                                                    {apt.billingType && <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${billingColor[apt.billingType] || 'bg-gray-100 text-gray-600'}`}>{apt.billingType === 'particular' ? 'Particular' : apt.billingType === 'convenio' ? 'Convênio' : apt.billingType}</span>}
                                                                                </div>
                                                                            </div>
                                                                            <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${apt.operationalStatus === 'pre_agendado' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                                {apt.operationalStatus === 'pre_agendado' ? 'Pré-agendado' : 'Agendado'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
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

                                {/* Modal: Atendidos {periodTitle} */}
                                {attendanceModalOpen && (() => {
                                    const all = analyticsData?.all || [];
                                    const atendidos = all.filter((a: any) => a.operationalStatus === 'completed');
                                    return (
                                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setAttendanceModalOpen(false)}>
                                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                                                    <div>
                                                        <h3 className="text-xl font-bold text-gray-900">Atendidos {periodTitle}</h3>
                                                        <p className="text-sm text-gray-500 mt-1">{isRangeActive && dateRange ? formatDateRange(dateRange) : format(parseISO(selectedDate), "dd 'de' MMMM", { locale: ptBR })}</p>
                                                    </div>
                                                    <button onClick={() => setAttendanceModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
                                                </div>
                                                <div className="overflow-y-auto p-6">
                                                    {atendidos.length === 0 ? (
                                                        <p className="text-center text-gray-500 py-8">Nenhum atendimento realizado {isRangeActive ? 'no período' : 'hoje'}.</p>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            {atendidos.map((apt: any) => {
                                                                const svcText = apt.serviceType ? ({
                                                                    'evaluation': 'Avaliação', 'session': 'Sessão', 'package_session': 'Sessão Pacote',
                                                                    'tongue_tie_test': 'Teste Linguinha', 'neuropsych_evaluation': 'Aval. Neuropsic.',
                                                                    'individual_session': 'Sessão Avulsa', 'package': 'Pacote'
                                                                }[apt.serviceType] || apt.serviceType) : null;
                                                                const billingColor: Record<string, string> = { particular: 'bg-blue-100 text-blue-700', convenio: 'bg-purple-100 text-purple-700', liminar: 'bg-orange-100 text-orange-700', package: 'bg-indigo-100 text-indigo-700' };
                                                                return (
                                                                    <div key={apt._id} className="bg-gray-50 rounded-lg p-4 border border-gray-100 hover:bg-gray-100 transition-colors">
                                                                        <div className="flex items-start justify-between gap-2">
                                                                            <div className="flex-1">
                                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                                    <p className="font-semibold text-gray-900">{apt.patientInfo?.fullName || apt.patient?.fullName || 'Nome não informado'}</p>
                                                                                    <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold">✓ Atendido</span>
                                                                                </div>
                                                                                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
                                                                                    <span>📅 {apt.date ? new Date(apt.date).toLocaleDateString('pt-BR') : ''} {apt.time}</span>
                                                                                </div>
                                                                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                                                    <span className="text-xs text-gray-500">👤 {apt.doctor?.fullName || apt.professionalName || 'Profissional não informado'}</span>
                                                                                    {apt.specialty && <span className="bg-green-200 text-green-700 px-1.5 py-0.5 rounded-full text-[10px] uppercase font-medium">{apt.specialty}</span>}
                                                                                    {svcText && <span className="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full text-[10px] font-medium">{svcText}</span>}
                                                                                    {apt.billingType && <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${billingColor[apt.billingType] || 'bg-gray-100 text-gray-600'}`}>{apt.billingType === 'particular' ? 'Particular' : apt.billingType === 'convenio' ? 'Convênio' : apt.billingType}</span>}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="p-4 border-t border-gray-100 text-center text-sm text-gray-500">
                                                    {atendidos.length} atendimento{atendidos.length !== 1 ? 's' : ''} realizado{atendidos.length !== 1 ? 's' : ''} {isRangeActive ? 'no período' : 'hoje'}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        );
                    })()}

                    {/* Tabs de Detalhes */}
                    <div className="mb-3 border-b border-gray-200 bg-white rounded-t-lg">
                        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable" className="px-2">
                            <Tab label={data.transacoes?.length > 0 ? `Transações (${data.transacoes.length})` : 'Transações'} icon={<ReceiptIcon fontSize="small" />} iconPosition="start" />
                            <Tab label={data.pendentesCobranca?.length > 0 ? `Pendentes (${data.pendentesCobranca.length})` : 'Pendentes'} icon={<WarningIcon fontSize="small" />} iconPosition="start" />
                            <Tab label={data.pacotesAtendidos?.length > 0 ? `Pacotes (${data.pacotesAtendidos.length})` : 'Pacotes'} icon={<InventoryIcon fontSize="small" />} iconPosition="start" />
                            <Tab label={data.conveniosAtendidos?.length > 0 ? `Convênios (${data.conveniosAtendidos.length})` : 'Convênios'} icon={<ShowChartIcon fontSize="small" />} iconPosition="start" />
                            <Tab label={dayAppointments.length > 0 ? `Agendamentos (${dayAppointments.length})` : 'Agendamentos'} icon={<CalendarTodayIcon fontSize="small" />} iconPosition="start" />
                            <Tab label={Object.keys(data.producao?.porEspecialidade || {}).length > 0 ? `Especialidades (${Object.keys(data.producao.porEspecialidade).length})` : 'Especialidades'} icon={<PieChartIcon fontSize="small" />} iconPosition="start" />
                        </Tabs>
                    </div>

                    {/* Tab 0: Transações */}
                    {activeTab === 0 && (
                        <div className="bg-white rounded-lg border border-gray-200 p-3">
                            <h3 className="text-base font-semibold mb-3">💳 Transações {periodTitle}</h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="px-3 py-2 text-left">Data / Hora</th>
                                            <th className="px-3 py-2 text-left">Paciente</th>
                                            <th className="px-3 py-2 text-left">Profissional</th>
                                            <th className="px-3 py-2 text-left">Serviço</th>
                                            <th className="px-3 py-2 text-left">Método</th>
                                            <th className="px-3 py-2 text-left">Tipo</th>
                                            <th className="px-3 py-2 text-left">Observação</th>
                                            <th className="px-3 py-2 text-right">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.transacoes?.map((t) => (
                                            <tr key={t.id} className="border-b hover:bg-gray-50">
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    <div className="text-xs text-gray-400">{t.data}</div>
                                                    <div className="font-medium">{t.hora}</div>
                                                </td>
                                                <td className="px-3 py-2">{t.paciente}</td>
                                                <td className="px-3 py-2">
                                                    <div>{t.profissional || '-'}</div>
                                                    <div className="text-xs text-gray-500">{t.especialidade || '-'}</div>
                                                </td>
                                                <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-full text-xs border border-gray-300">{t.servico}</span></td>
                                                <td className="px-3 py-2">{t.metodo}</td>
                                                <td className="px-3 py-2">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                                                        t.tipo === 'Pacote' ? 'bg-green-100 text-green-800' : 
                                                        t.tipo === 'Convênio' ? 'bg-amber-100 text-amber-800' : 
                                                        t.tipo === 'Liminar' ? 'bg-red-100 text-red-800' : 
                                                        'bg-blue-100 text-blue-800'
                                                    }`}>
                                                        {t.tipo}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 max-w-[150px] truncate" title={t.observacao || '-'}>{t.observacao || '-'}</td>
                                                <td className="px-3 py-2 text-right font-bold text-emerald-600">{formatCurrency(t.valor)}</td>
                                            </tr>
                                        ))}
                                        {!data.transacoes?.length && (
                                            <tr><td colSpan={8} className="text-center py-4 text-gray-500">Nenhuma transação {isRangeActive ? 'no período' : 'hoje'}</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

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
                                                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs bg-gray-100 cursor-pointer hover:bg-gray-200" onClick={() => window.open(`https://wa.me/55${p.telefone?.replace(/\D/g, '')}`, '_blank')}>
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
                            <h3 className="text-base font-semibold mb-3">📦 Pacotes Atendidos ({data.pacotesAtendidos?.length || 0})</h3>
                            {data.pacotesAtendidos?.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {data.pacotesAtendidos.map((p) => {
                                        const isPrepaid = p.paymentModel === 'prepaid';
                                        return (
                                            <div key={p.id} className={`border-l-4 ${isPrepaid ? 'border-l-blue-500' : 'border-l-emerald-500'} border border-gray-200 rounded-lg p-3`}>
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="font-semibold text-sm">{p.paciente}</span>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs ${isPrepaid ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                                        {isPrepaid ? 'Pré-pago' : 'Pago hoje'}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-500">{p.especialidade} • {p.horario}</div>
                                                <div className="text-xs text-gray-500 mb-1">{p.professional}</div>
                                                <div className="flex justify-between items-baseline">
                                                    <span className="text-lg font-bold text-emerald-700">{formatCurrency(p.valor)}</span>
                                                    <span className="text-xs text-gray-500">{isPrepaid ? 'crédito consumido' : 'recebido hoje'}</span>
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
                            <h3 className="text-base font-semibold mb-3">🏥 Convênios Atendidos ({data.conveniosAtendidos?.length || 0})</h3>
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

                    {/* Tab 4: Agendamentos {periodTitle} */}
                    {activeTab === 4 && (
                        <div className="bg-white rounded-lg border border-gray-200 p-3">
                            <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                                <h3 className="text-base font-semibold">📅 Agendamentos {periodTitle} ({dayAppointments.length})</h3>
                                <FormControl size="small" sx={{ minWidth: 140 }}>
                                    <InputLabel>Filtrar status</InputLabel>
                                    <Select
                                        value={appointmentFilter}
                                        label="Filtrar status"
                                        onChange={(e) => setAppointmentFilter(e.target.value)}
                                    >
                                        <MenuItem value="all">Todos</MenuItem>
                                        <MenuItem value="completed">✅ Atendidos</MenuItem>
                                        <MenuItem value="scheduled">📋 Agendados</MenuItem>
                                        <MenuItem value="confirmed">✔️ Confirmados</MenuItem>
                                        <MenuItem value="canceled">❌ Cancelados</MenuItem>
                                        <MenuItem value="pre_agendado">⏳ Pré-agendado</MenuItem>
                                    </Select>
                                </FormControl>
                            </div>

                            {loadingAppointments ? (
                                <Alert severity="info">Carregando agendamentos...</Alert>
                            ) : dayAppointments.length === 0 ? (
                                <Alert severity="info">Nenhum agendamento encontrado para {isRangeActive ? 'este período' : 'este dia'}.</Alert>
                            ) : (
                                <>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full text-sm">
                                            <thead className="bg-gray-50 border-b">
                                                <tr>
                                                    <th className="px-3 py-2 text-left">Data e Hora</th>
                                                    <th className="px-3 py-2 text-left">Paciente</th>
                                                    <th className="px-3 py-2 text-left">Profissional</th>
                                                    <th className="px-3 py-2 text-left">Especialidade</th>
                                                    <th className="px-3 py-2 text-left">Status</th>
                                                    <th className="px-3 py-2 text-left">Tipo</th>
                                                    <th className="px-3 py-2 text-right">Valor</th>
                                                    <th className="px-3 py-2 text-left">Situação Financeira</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {[...dayAppointments]
                                                    .filter((a: any) => appointmentFilter === 'all' || a.operationalStatus === appointmentFilter)
                                                    .sort((a: any, b: any) => {
                                                        const toMinutes = (item: any) => {
                                                            const t = item.time || (item.date ? format(parseISO(item.date), 'HH:mm') : '00:00');
                                                            const [h, m] = t.split(':').map(Number);
                                                            return (h || 0) * 60 + (m || 0);
                                                        };
                                                        return toMinutes(a) - toMinutes(b);
                                                    })
                                                    .map((a: any) => {
                                                        const statusCls: Record<string, { cls: string; label: string }> = {
                                                            completed:   { cls: 'bg-green-100 text-green-800',  label: 'Atendido' },
                                                            scheduled:   { cls: 'bg-blue-100 text-blue-800',    label: 'Agendado' },
                                                            confirmed:   { cls: 'bg-sky-100 text-sky-800',      label: 'Confirmado' },
                                                            canceled:    { cls: 'bg-red-100 text-red-800',      label: 'Cancelado' },
                                                            pre_agendado:{ cls: 'bg-amber-100 text-amber-800',  label: 'Pré-agendado' },
                                                        };
                                                        const sfCls: Record<string, { cls: string; label: string }> = {
                                                            'Pré-pago':        { cls: 'bg-green-100 text-green-800',   label: 'Pré-pago' },
                                                            'Pago na Sessão':  { cls: 'bg-green-100 text-green-800',   label: 'Pago na Sessão' },
                                                            'Avaliação Paga':  { cls: 'bg-green-100 text-green-800',   label: 'Avaliação Paga' },
                                                            'Pago Parcial':    { cls: 'bg-amber-100 text-amber-800',   label: 'Pago Parcial' },
                                                            'Pendente':        { cls: 'bg-amber-100 text-amber-800',   label: 'Pendente' },
                                                            'Pacote Pendente': { cls: 'bg-gray-100 text-gray-700',     label: 'Pacote Pendente' },
                                                            'Convênio':        { cls: 'bg-blue-100 text-blue-800',     label: 'Convênio' },
                                                            'Liminar':         { cls: 'bg-purple-100 text-purple-800', label: 'Liminar' },
                                                            'Cancelado':       { cls: 'bg-red-100 text-red-800',       label: 'Cancelado' },
                                                        };
                                                        const serviceMap: Record<string, string> = {
                                                            consultation: 'Consulta', evaluation: 'Avaliação',
                                                            session: 'Sessão', individual_session: 'Sessão Individual',
                                                            package_session: 'Sessão de Pacote', tongue_tie_test: 'Teste da Linguinha',
                                                            neuropsych_evaluation: 'Avaliação Neuropsicológica',
                                                            return: 'Retorno', meet: 'Meet', alignment: 'Alinhamento'
                                                        };
                                                        const sc = statusCls[a.operationalStatus] || { cls: 'bg-gray-100 text-gray-700', label: a.operationalStatus };
                                                        const sf = sfCls[a.statusFinanceiro]     || { cls: 'bg-gray-100 text-gray-700', label: a.statusFinanceiro || '-' };
                                                        const tipoServico = serviceMap[a.serviceType] || a.serviceType || 'Sessão';
                                                        const tipoCls = a.billingType === 'convenio' ? 'border-blue-300 text-blue-700' : a.package ? 'border-green-300 text-green-700' : 'border-gray-300 text-gray-600';
                                                        return (
                                                            <tr key={a._id} className={`border-b hover:bg-gray-50 ${a.operationalStatus === 'canceled' ? 'opacity-60' : ''}`}>
                                                                <td className="px-3 py-2">{a.date ? format(parseISO(a.date), 'dd/MM') : '--/--'} {a.time || (a.date ? format(parseISO(a.date), 'HH:mm') : '--:--')}</td>
                                                                <td className="px-3 py-2">{a.patientInfo?.fullName || a.patient?.fullName || '-'}</td>
                                                                <td className="px-3 py-2">{a.professionalName || '-'}</td>
                                                                <td className="px-3 py-2">{a.specialty || '-'}</td>
                                                                <td className="px-3 py-2">
                                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.cls}`}>{sc.label}</span>
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    <span className={`px-2 py-0.5 rounded-full text-xs border ${tipoCls}`}>{tipoServico}</span>
                                                                </td>
                                                                <td className="px-3 py-2 text-right font-bold">{formatCurrency(a.sessionValue || a.package?.sessionValue || 0)}</td>
                                                                <td className="px-3 py-2">
                                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sf.cls}`}>{sf.label}</span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Resumo por status */}
                                    {dayAppointments.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-3">
                                            {['completed', 'scheduled', 'confirmed', 'canceled', 'pre_agendado'].map((status) => {
                                                const count = dayAppointments.filter((a: any) => a.operationalStatus === status).length;
                                                if (count === 0) return null;
                                                const labels: Record<string, string> = {
                                                    completed: 'Atendidos',
                                                    scheduled: 'Agendados',
                                                    confirmed: 'Confirmados',
                                                    canceled: 'Cancelados',
                                                    pre_agendado: 'Pré-agendados'
                                                };
                                                return (
                                                    <span key={status} className={`px-2 py-0.5 rounded-full text-xs border border-gray-300 ${
                                                        status === 'completed' ? 'bg-green-100 text-green-800' : 
                                                        status === 'canceled' ? 'bg-red-100 text-red-800' : 
                                                        status === 'confirmed' ? 'bg-blue-100 text-blue-800' : 
                                                        'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        {labels[status]}: {count}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Tab 5: Por Especialidade */}
                    {activeTab === 5 && (
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
                                    <div className="text-[11px] text-gray-500 mb-0.5">Resultado Econômico</div>
                                    <div className="text-xl font-bold text-violet-700">{formatCurrency(monthResumo.producaoTotal)}</div>
                                    <div className="text-[10px] text-gray-400 mt-1">produção clínica do mês</div>
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
                                        <th className="px-3 py-2 text-right">Eficiência</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {monthData.filter(d => d.caixa > 0 || d.producao > 0).map((day) => (
                                        <tr key={day.date} className="border-b hover:bg-gray-50">
                                            <td className="px-3 py-2">{format(parseISO(day.date), 'dd/MM/yyyy')}</td>
                                            <td className="px-3 py-2 text-right font-bold text-emerald-600">{formatCurrency(day.caixa)}</td>
                                            <td className="px-3 py-2 text-right text-blue-600">{formatCurrency(day.producao)}</td>
                                            <td className="px-3 py-2 text-right">{day.atendimentos}</td>
                                            <td className="px-3 py-2 text-right">
                                                {day.producao > 0 ? ((day.caixa / day.producao) * 100).toFixed(1) : 0}%
                                            </td>
                                        </tr>
                                    ))}
                                    {monthData.some(d => d.caixa > 0 || d.producao > 0) && (
                                        <tr className="border-t-2 border-gray-300 bg-gray-100 font-bold">
                                            <td className="px-3 py-2">Total</td>
                                            <td className="px-3 py-2 text-right text-emerald-700">{formatCurrency(monthResumo?.caixaBruto ?? monthTotals.totalCaixa)}</td>
                                            <td className="px-3 py-2 text-right text-blue-700">{formatCurrency(monthResumo?.producaoTotal ?? monthTotals.totalProducao)}</td>
                                            <td className="px-3 py-2 text-right text-gray-800">{monthTotals.totalAtendimentos}</td>
                                            <td className="px-3 py-2 text-right text-gray-800">
                                                {(monthResumo?.producaoTotal ?? monthTotals.totalProducao) > 0 ? (((monthResumo?.caixaBruto ?? monthTotals.totalCaixa) / (monthResumo?.producaoTotal ?? monthTotals.totalProducao)) * 100).toFixed(1) : 0}%
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
        </div>
    );
};

export default UnifiedCashflowTab;