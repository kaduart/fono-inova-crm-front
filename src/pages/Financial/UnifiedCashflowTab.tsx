// UnifiedCashflowTab.tsx - Caixa e Fluxo de Caixa unificados (refatorado com Tailwind)
import { 
    Alert, Chip, MenuItem, Skeleton, Tab, Tabs, Badge, Tooltip, IconButton,
    FormControl, InputLabel, Select, LinearProgress
} from '@mui/material';
import { format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useAppointmentsByType } from '../../hooks/useAppointmentsByType';
import { cashflowService, CashflowV2Response } from '../../services/cashflowService';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import InventoryIcon from '@mui/icons-material/Inventory';
import ReceiptIcon from '@mui/icons-material/Receipt';
import WarningIcon from '@mui/icons-material/Warning';
import PhoneIcon from '@mui/icons-material/Phone';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import PieChartIcon from '@mui/icons-material/PieChart';

interface DayData {
    date: string;
    caixa: number;
    producao: number;
    atendimentos: number;
}

const CashflowCardsSkeleton = () => (
    <div className="p-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="border rounded-xl p-3 border-gray-200 bg-gray-50">
                    <div className="flex items-center gap-2 mb-1">
                        <Skeleton variant="circular" width={20} height={20} />
                        <Skeleton variant="text" width="60%" height={16} />
                    </div>
                    <Skeleton variant="text" width="70%" height={40} className="mb-1" />
                    <div className="flex gap-1">
                        <Skeleton variant="rounded" width={70} height={20} className="rounded-full" />
                        <Skeleton variant="rounded" width={60} height={20} className="rounded-full" />
                    </div>
                </div>
            ))}
        </div>
        <div className="flex gap-1 border-b border-gray-200 pb-1 mb-2">
            {[70, 80, 90, 85, 95, 100].map((w, i) => (
                <Skeleton key={i} variant="rounded" width={w} height={28} className="rounded-md" />
            ))}
        </div>
        <Skeleton variant="rounded" width="100%" height={40} className="mb-0.5 rounded-md" />
        {[...Array(5)].map((_, i) => (
            <Skeleton key={i} variant="rounded" width="100%" height={52} className="mb-0.5 rounded-md" />
        ))}
    </div>
);

interface UnifiedCashflowTabProps {
    month: number;
    year: number;
}

const UnifiedCashflowTab = ({ month, year }: UnifiedCashflowTabProps) => {
    const [dailyCashflow, setDailyCashflow] = useState<CashflowV2Response | null>(null);
    const [previousDayCashflow, setPreviousDayCashflow] = useState<CashflowV2Response | null>(null);
    const [monthData, setMonthData] = useState<DayData[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(0);
    const [viewMode, setViewMode] = useState<'day' | 'month'>('day');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [dayAppointments, setDayAppointments] = useState<any[]>([]);
    const [appointmentFilter, setAppointmentFilter] = useState<string>('all');
    const [loadingAppointments, setLoadingAppointments] = useState(false);

    const isFirstRender = useRef(true);

    // PatientsSummaryCard data
    const { data: analyticsData, loading: analyticsLoading, fetch: fetchAnalytics } = useAppointmentsByType();
    const [newPatientsModalOpen, setNewPatientsModalOpen] = useState(false);

    const fetchAnalyticsForDate = useCallback(async (date: string) => {
        await fetchAnalytics({ startDate: date, endDate: date, mode: 'date' });
    }, [fetchAnalytics]);

    // Carrega dados do dia selecionado
    useEffect(() => {
        const guard = { active: true };
        loadDayData(guard);
        loadDayAppointments(guard);
        fetchAnalyticsForDate(selectedDate);
        return () => { guard.active = false; };
    }, [selectedDate, fetchAnalyticsForDate]);

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

    // Carrega dados do mês quando muda para visualização mensal ou quando o filtro global muda
    useEffect(() => {
        if (viewMode === 'month') {
            loadMonthData();
        }
    }, [viewMode, month, year]);

    const loadDayData = async (guard = { active: true }) => {
        setLoading(true);
        try {
            const prevDate = new Date(selectedDate + 'T12:00:00');
            prevDate.setDate(prevDate.getDate() - 1);
            const prevDateStr = prevDate.toISOString().split('T')[0];
            const [res, resPrev] = await Promise.all([
                cashflowService.getDailyCashflow(selectedDate),
                cashflowService.getDailyCashflow(prevDateStr).catch(() => null),
            ]);
            if (!guard.active) return;
            setDailyCashflow(res.data);
            setPreviousDayCashflow(resPrev?.data ?? null);
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
        } catch (error) {
            console.error('Erro ao carregar dados do mês:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadDayAppointments = async (guard = { active: true }) => {
        setLoadingAppointments(true);
        try {
            console.log('[UnifiedCashflowTab] Buscando agendamentos para:', selectedDate);
            const res = await cashflowService.getDayAppointments(selectedDate);
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
                            <option value="day">📅 Dia</option>
                            <option value="month">📊 Mês</option>
                        </select>

                        {viewMode === 'day' ? (
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
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
                                ? format(parseISO(selectedDate), "dd 'de' MMMM", { locale: ptBR })
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
                    {/* Cards Principais - Caixa e Produção */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                        {/* Caixa Total */}
                        <div className="border border-emerald-200 rounded-xl bg-emerald-50 p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <AttachMoneyIcon className="text-emerald-600 w-5 h-5" />
                                <span className="text-xs text-gray-600">Caixa (Dinheiro Recebido)</span>
                            </div>
                            <div className="text-2xl font-bold text-emerald-700">{formatCurrency(data.caixa.total)}</div>
                            {/* Barra receita real vs diferida */}
                            {data.receitaReal != null && data.receitaDiferida != null && data.caixa.total > 0 && (
                                <div className="mt-2">
                                    <div className="flex rounded-md overflow-hidden h-1.5 mb-1">
                                        <div className="bg-emerald-500" style={{ width: `${(data.receitaReal / data.caixa.total) * 100}%` }}></div>
                                        <div className="flex-1 bg-amber-200"></div>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-emerald-700">✓ {formatCurrency(data.receitaReal)}</span>
                                        <span className="text-amber-600">⏳ {formatCurrency(data.receitaDiferida)}</span>
                                    </div>
                                </div>
                            )}
                            <div className="flex flex-wrap gap-1 mt-2">
                                {data.caixa.pix > 0 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-800">Pix: {formatCurrency(data.caixa.pix)}</span>
                                )}
                                {data.caixa.cartao > 0 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">Card: {formatCurrency(data.caixa.cartao)}</span>
                                )}
                                {data.caixa.dinheiro > 0 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800">Din: {formatCurrency(data.caixa.dinheiro)}</span>
                                )}
                            </div>
                            {/* 💰 Origem do faturamento */}
                            <div className="flex flex-wrap gap-1 mt-1.5">
                                {data.porTipo?.particular > 0 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-cyan-100 text-cyan-800">Particular: {formatCurrency(data.porTipo.particular)}</span>
                                )}
                                {data.porTipo?.pacote > 0 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-800">Pacote: {formatCurrency(data.porTipo.pacote)}</span>
                                )}
                                {data.porTipo?.convenio > 0 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-800">Convênio: {formatCurrency(data.porTipo.convenio)}</span>
                                )}
                                {data.porTipo?.liminar > 0 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-rose-100 text-rose-800">Liminar: {formatCurrency(data.porTipo.liminar)}</span>
                                )}
                            </div>
                            {/* 💸 Saldo líquido (só se houver despesas) */}
                            {data.despesas?.total > 0 && (
                                <div className="mt-2 pt-2 border-t border-emerald-200/60">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-gray-500">Despesas: <span className="text-red-600 font-medium">-{formatCurrency(data.despesas.total)}</span></span>
                                        <span className="text-gray-700 font-semibold">Líquido: {formatCurrency(data.saldo?.liquido ?? data.caixa.total - data.despesas.total)}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Produção */}
                        <div className="border border-blue-200 rounded-xl bg-blue-50 p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <ShowChartIcon className="text-blue-600 w-5 h-5" />
                                <span className="text-xs text-gray-600">Produção Total</span>
                            </div>
                            <div className="text-2xl font-bold text-blue-700">{formatCurrency(data.producao.total)}</div>
                            <div className="text-xs text-gray-500">
                                {data.producao.quantidadeAtendimentos} atendimentos • Ticket: {formatCurrency(data.producao.ticketMedio)}
                            </div>
                        </div>

                        {/* A Receber */}
                        {(() => {
                            const particular = data.producao.aReceber;
                            const convenioTotal = (data.conveniosAtendidos || []).reduce((s: number, c: any) => s + (c.valor || 0), 0);
                            const total = particular + convenioTotal;
                            const nParticular = data.pendentesCobranca?.length || 0;
                            const nConvenio = (data.conveniosAtendidos || []).length;
                            return (
                                <div className="border border-amber-200 rounded-xl bg-amber-50 p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <WarningIcon className="text-amber-600 w-5 h-5" />
                                        <span className="text-xs text-gray-600">A Receber</span>
                                    </div>
                                    <div className="text-2xl font-bold text-amber-700">{formatCurrency(total)}</div>
                                    <div className="flex flex-col gap-0.5 mt-2">
                                        {particular > 0 ? (
                                            <div>
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-blue-600 font-semibold">👤 Particular</span>
                                                    <span className="font-bold text-blue-700">{formatCurrency(particular)}</span>
                                                </div>
                                                <div className="text-[10px] text-gray-400 pl-1">{nParticular} paciente{nParticular !== 1 ? 's' : ''} em débito</div>
                                            </div>
                                        ) : (
                                            <div className="text-[10px] text-gray-400">👤 Particular: sem débitos</div>
                                        )}
                                        {convenioTotal > 0 ? (
                                            <div className="mt-1">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-purple-600 font-semibold">🏥 Convênio</span>
                                                    <span className="font-bold text-purple-700">{formatCurrency(convenioTotal)}</span>
                                                </div>
                                                <div className="text-[10px] text-gray-400 pl-1">{nConvenio} atendimento{nConvenio !== 1 ? 's' : ''} a faturar</div>
                                            </div>
                                        ) : (
                                            <div className="text-[10px] text-gray-400 mt-1">🏥 Convênio: nenhum</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* 4th card: vs Ontem mini chart */}
                        {(() => {
                            const prevData = previousDayCashflow?.data;
                            const todayTx = (data.transacoes || []) as any[];
                            const yesterdayTx = (prevData?.transacoes || []) as any[];
                            const HOURS = [7,8,9,10,11,12,13,14,15,16,17,18,19];
                            const buildCum = (tx: any[]) => { let c=0; return HOURS.map(h=>{c+=tx.filter(t=>parseInt((t.hora||'0:0').split(':')[0])===h).reduce((s:number,t:any)=>s+(t.valor||0),0);return c;}); };
                            const tV=buildCum(todayTx), yV=buildCum(yesterdayTx);
                            const mx=Math.max(...tV,...yV,1);
                            const W=200,H=52,PL=3,PR=3,PT=5,PB=13,cW=W-PL-PR,cH=H-PT-PB;
                            const px=(i:number)=>PL+(i/(HOURS.length-1))*cW;
                            const py=(v:number)=>PT+cH-(v/mx)*cH;
                            const mkP=(vals:number[])=>{const pts=vals.map((v,i)=>[px(i),py(v)]as[number,number]);let d=`M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;for(let i=1;i<pts.length;i++){const[ax,ay]=pts[i-1],[bx,by]=pts[i],m=((ax+bx)/2).toFixed(1);d+=` C${m},${ay.toFixed(1)} ${m},${by.toFixed(1)} ${bx.toFixed(1)},${by.toFixed(1)}`;}return d;};
                            const mkA=(vals:number[])=>{const pts=vals.map((v,i)=>[px(i),py(v)]as[number,number]);return`${mkP(vals)} L${pts[pts.length-1][0].toFixed(1)},${PT+cH} L${PL},${PT+cH} Z`;};
                            const variacao=data.comparativos.variacaoVsOntem,pos=variacao>=0,lc=pos?'#10b981':'#ef4444';
                            return (
                                <div className={`border rounded-xl p-3 ${pos?'border-emerald-200 bg-emerald-50':'border-red-200 bg-red-50'}`}>
                                    <div className="flex items-center justify-between mb-0.5">
                                        <div className="flex items-center gap-1.5">
                                            <TrendingUpIcon className="w-4 h-4 text-gray-400"/>
                                            <span className="text-xs text-gray-600">vs Ontem</span>
                                        </div>
                                        <span className={`text-xs font-bold ${pos?'text-emerald-600':'text-red-500'}`}>{pos?'▲':'▼'} {Math.abs(variacao)}%</span>
                                    </div>
                                    <div className={`text-2xl font-bold mb-1 ${pos?'text-emerald-700':'text-red-700'}`}>{formatCurrency(data.caixa.total)}</div>
                                    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{height:'52px'}} preserveAspectRatio="none">
                                        <defs>
                                            <linearGradient id="cg2T" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={lc} stopOpacity="0.2"/><stop offset="100%" stopColor={lc} stopOpacity="0"/></linearGradient>
                                            <linearGradient id="cg2Y" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60a5fa" stopOpacity="0.15"/><stop offset="100%" stopColor="#60a5fa" stopOpacity="0"/></linearGradient>
                                        </defs>
                                        <path d={mkA(yV)} fill="url(#cg2Y)"/>
                                        <path d={mkA(tV)} fill="url(#cg2T)"/>
                                        <path d={mkP(yV)} fill="none" stroke="#60a5fa" strokeWidth="1.2" strokeDasharray="3,2" strokeLinecap="round"/>
                                        <path d={mkP(tV)} fill="none" stroke={lc} strokeWidth="1.8" strokeLinecap="round"/>
                                        <circle cx={px(HOURS.length-1)} cy={py(tV[HOURS.length-1])} r="3" fill={lc} fillOpacity="0.25"/>
                                        <circle cx={px(HOURS.length-1)} cy={py(tV[HOURS.length-1])} r="1.8" fill={lc}/>
                                        {[0,6,12].map(i=>(<text key={i} x={px(i)} y={H-1} textAnchor="middle" fontSize="6" fill="#d1d5db">{HOURS[i]}h</text>))}
                                    </svg>
                                    <div className="text-xs text-gray-500 mt-1">Ontem: {formatCurrency(data.comparativos.ontem)}</div>
                                </div>
                            );
                        })()}
                    </div>

                    {/* Card de Pacientes Novos do Dia */}
                    {(() => {
                        const leads = analyticsData?.leads || [];
                        const allAppointments = analyticsData?.all || [];
                        const atendidosHoje = allAppointments.filter((a: any) => a.operationalStatus === 'completed' || a.clinicalStatus === 'completed');
                        const newPatients = [...leads, ...atendidosHoje];
                        const svcLabel: Record<string, string> = {
                            'evaluation': 'Avaliação', 'session': 'Sessão', 'package_session': 'Sessão Pacote',
                            'tongue_tie_test': 'Teste Linguinha', 'neuropsych_evaluation': 'Aval. Neuropsic.',
                            'individual_session': 'Sessão Avulsa', 'package': 'Pacote'
                        };
                        return (
                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-2 px-0.5">
                                    <h3 className="text-sm font-semibold text-gray-700">Pacientes Novos</h3>
                                    <span className="text-xs text-gray-400">{format(parseISO(selectedDate), "dd 'de' MMMM", { locale: ptBR })}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => leads.length > 0 && setNewPatientsModalOpen(true)}
                                    className={`text-left p-4 rounded-xl border transition-all ${leads.length > 0 ? 'bg-pink-50 border-pink-200 hover:border-pink-400 cursor-pointer' : 'bg-gray-50 border-gray-200 cursor-default'}`}
                                >
                                    <div className="text-[10px] font-semibold text-pink-500 uppercase tracking-wide mb-1">Pré-agendados novos</div>
                                    <div className="text-3xl font-bold text-pink-600">{leads.length}</div>
                                    <div className="text-xs text-gray-400 mt-0.5">1ª vez na clínica</div>
                                </button>
                                {(() => {
                                    const all = analyticsData?.all || [];
                                    const agendados = all.filter((a: any) => !['converted', 'pre_agendado'].includes(a.operationalStatus));
                                    const atendidos = all.filter((a: any) => a.operationalStatus === 'completed');
                                    const faltas = all.filter((a: any) => ['missed', 'canceled'].includes(a.operationalStatus));
                                    const restantes = agendados.length - atendidos.length - faltas.length;
                                    const pct = agendados.length > 0 ? Math.round((atendidos.length / agendados.length) * 100) : 0;
                                    return (
                                        <button
                                            onClick={() => agendados.length > 0 && setNewPatientsModalOpen(true)}
                                            className={`text-left p-4 rounded-xl border transition-all ${atendidos.length > 0 ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-400 cursor-pointer' : 'bg-gray-50 border-gray-200 cursor-default'}`}
                                        >
                                            <div className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide mb-1">Comparecimento</div>
                                            <div className="flex items-baseline gap-1.5">
                                                <div className="text-3xl font-bold text-emerald-600">{atendidos.length}</div>
                                                <div className="text-sm text-gray-400">/ {agendados.length}</div>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-0.5">{pct}% presença</div>
                                            <div className="flex gap-2 mt-1.5">
                                                {faltas.length > 0 && <span className="text-[10px] text-red-500">{faltas.length} falta{faltas.length !== 1 ? 's' : ''}</span>}
                                                {restantes > 0 && <span className="text-[10px] text-amber-500">{restantes} restante{restantes !== 1 ? 's' : ''}</span>}
                                            </div>
                                        </button>
                                    );
                                })()}
                                </div>

                                {newPatientsModalOpen && (
                                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setNewPatientsModalOpen(false)}>
                                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center justify-between p-6 border-b border-gray-100">
                                                <div>
                                                    <h3 className="text-xl font-bold text-gray-900">Pacientes Novos</h3>
                                                    <p className="text-sm text-gray-500 mt-1">{format(parseISO(selectedDate), "dd 'de' MMMM", { locale: ptBR })}</p>
                                                </div>
                                                <button onClick={() => setNewPatientsModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
                                            </div>
                                            <div className="overflow-y-auto p-6">
                                                {newPatients.length === 0 ? (
                                                    <p className="text-center text-gray-500 py-8">Nenhum paciente novo encontrado.</p>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {newPatients.map((apt: any) => {
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
                                                <strong>{newPatients.length}</strong> paciente{newPatients.length !== 1 ? 's' : ''} novo{newPatients.length !== 1 ? 's' : ''} hoje
                                            </div>
                                        </div>
                                    </div>
                                )}
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
                            <h3 className="text-base font-semibold mb-3">💳 Transações do Dia</h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="px-3 py-2 text-left">Hora</th>
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
                                                <td className="px-3 py-2">{t.hora}</td>
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
                                            <tr><td colSpan={8} className="text-center py-4 text-gray-500">Nenhuma transação hoje</td></tr>
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
                                <Alert severity="success" className="rounded-lg">🎉 Nenhum pagamento pendente hoje!</Alert>
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
                                <Alert severity="info">Nenhum pacote atendido hoje</Alert>
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
                                <Alert severity="info">Nenhum convênio atendido hoje</Alert>
                            )}
                        </div>
                    )}

                    {/* Tab 4: Agendamentos do Dia */}
                    {activeTab === 4 && (
                        <div className="bg-white rounded-lg border border-gray-200 p-3">
                            <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                                <h3 className="text-base font-semibold">📅 Agendamentos do Dia ({dayAppointments.length})</h3>
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
                                <Alert severity="info">Nenhum agendamento encontrado para este dia.</Alert>
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
            ) : viewMode === 'month' ? (
                // ===== VISUALIZAÇÃO MENSAL =====
                <div>
                    {/* Cards Resumo do Mês */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                        <div className="border border-emerald-200 rounded-xl bg-emerald-50 p-3">
                            <div className="text-xs text-gray-600">Total em Caixa</div>
                            <div className="text-2xl font-bold text-emerald-700">{formatCurrency(monthTotals.totalCaixa)}</div>
                            <div className="text-xs text-gray-500">{monthTotals.diasComMovimento} dias com movimento</div>
                        </div>
                        <div className="border border-blue-200 rounded-xl bg-blue-50 p-3">
                            <div className="text-xs text-gray-600">Produção Total</div>
                            <div className="text-2xl font-bold text-blue-700">{formatCurrency(monthTotals.totalProducao)}</div>
                            <div className="text-xs text-gray-500">{monthTotals.totalAtendimentos} atendimentos</div>
                        </div>
                        <div className="border border-amber-200 rounded-xl bg-amber-50 p-3">
                            <div className="text-xs text-gray-600">Média Diária</div>
                            <div className="text-2xl font-bold text-amber-700">{formatCurrency(monthTotals.mediaDiaria)}</div>
                            <div className="text-xs text-gray-500">Projeção: {formatCurrency(monthTotals.mediaDiaria * 30)}</div>
                        </div>
                        <div className="border border-purple-200 rounded-xl bg-purple-50 p-3">
                            <div className="text-xs text-gray-600">Ticket Médio</div>
                            <div className="text-2xl font-bold text-purple-700">
                                {formatCurrency(monthTotals.totalAtendimentos > 0 ? monthTotals.totalProducao / monthTotals.totalAtendimentos : 0)}
                            </div>
                            <div className="text-xs text-gray-500">por atendimento</div>
                        </div>
                    </div>

                    {/* Tabela de Dias */}
                    <div className="bg-white rounded-lg border border-gray-200 p-3">
                        <h3 className="text-base font-semibold mb-3">📅 Fluxo Diário do Mês</h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-3 py-2 text-left">Data</th>
                                        <th className="px-3 py-2 text-right">Caixa</th>
                                        <th className="px-3 py-2 text-right">Produção</th>
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
                                    {!monthData.some(d => d.caixa > 0 || d.producao > 0) && (
                                        <tr><td colSpan={5} className="text-center py-4 text-gray-500">Nenhum movimento neste mês</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <CashflowCardsSkeleton />
            )}
        </div>
    );
};

export default UnifiedCashflowTab;