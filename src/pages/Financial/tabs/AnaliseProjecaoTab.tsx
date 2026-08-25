// AnaliseProjecaoTab.tsx - Refatorado com Tailwind (mantendo lógica)

import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ResponsiveContainer, LineChart, Line, XAxis, YAxis,
    CartesianGrid, Tooltip as ChartTooltip, Legend, ReferenceLine
} from 'recharts';
import api from '../../../services/api';
import {
    Chip, IconButton, FormControl, Select, MenuItem,
    Table, TableBody, TableCell, TableHead, TableRow,
    Tab, Tabs, LinearProgress
} from '@mui/material';
import { NavigateBefore, NavigateNext } from '@mui/icons-material';
import { TrendingUp, TrendingDown, Target, Calendar, RefreshCcw, Info, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFinancialDashboardV3, DashboardV3Data } from '../../../hooks/useFinancialDashboardV3';
import { IAppointment } from '../../../utils/types/types';
import { DashboardEspecialidades } from '../components/DashboardEspecialidades';
import { RankingProfissionais } from '../components/RankingProfissionais';
import { ListaPacientesVIP } from '../components/ListaPacientesVIP';
import { trackUsage } from '../../../services/usageMetrics';

const PAGE_SIZE = 10;

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

const formatCurrencyShort = (val: number) =>
    val >= 1000 ? `R$${(val / 1000).toFixed(0)}k` : `R$${Math.round(val)}`;

const safeFormatDate = (dateStr: string | undefined, fmt: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T12:00');
    if (isNaN(d.getTime())) return '—';
    return format(d, fmt);
};

function Pagination({ total, page, onPage }: { total: number; page: number; onPage: (p: number) => void }) {
    const pages = Math.ceil(total / PAGE_SIZE);
    if (pages <= 1) return null;
    return (
        <div className="flex items-center justify-end gap-1 px-1 pb-1">
            <span className="text-xs text-gray-500">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} de {total}
            </span>
            <IconButton size="small" onClick={() => onPage(page - 1)} disabled={page === 0}>
                <NavigateBefore fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => onPage(page + 1)} disabled={page >= pages - 1}>
                <NavigateNext fontSize="small" />
            </IconButton>
        </div>
    );
}

const MetricCard = ({ title, value, subtitle, icon, color }: any) => (
    <div className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-1">
            <div className="p-1 rounded-md" style={{ backgroundColor: `${color}20`, color }}>{icon}</div>
        </div>
        <p className="text-xs text-gray-500">{title}</p>
        <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
    </div>
);

const ProjectionTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const point = payload[0]?.payload;
    const realVal = point?.realAcumulado;
    const metaVal = point?.metaIdeal;
    const vsMetaPct = realVal != null && metaVal != null && metaVal > 0
        ? ((realVal / metaVal) - 1) * 100
        : null;
    return (
        <div className="bg-white p-2 border border-gray-200 rounded shadow-lg min-w-[170px]">
            <p className="text-xs font-bold mb-0.5">Dia {point?.dayOfMonth}{point?.isToday ? ' — hoje' : ''}</p>
            {payload.map((entry: any) => entry.value != null && (
                <div key={entry.dataKey} className="flex items-center gap-1 mb-0.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-xs">{entry.name}: {formatCurrency(entry.value)}</span>
                </div>
            ))}
            {vsMetaPct != null && (
                <p className={`text-xs font-bold mt-1 ${vsMetaPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {vsMetaPct >= 0 ? `+${vsMetaPct.toFixed(1)}%` : `${vsMetaPct.toFixed(1)}%`} vs meta ideal
                </p>
            )}
        </div>
    );
};

// ─── Sub-aba: Projeção & Cenários ──────────────────────────────────────────
interface ProjecaoCenariosProps {
    month: number;
    year: number;
    data?: DashboardV3Data | null;
}

export const ProjecaoCenarios: React.FC<ProjecaoCenariosProps> = ({ month: mes, year: ano, data: propData }) => {
    const [pageRealizados, setPageRealizados] = useState(0);
    const [pageAgendados, setPageAgendados] = useState(0);
    const [pagePendentes, setPagePendentes] = useState(0);
    const [projectionData, setProjectionData] = useState<any[]>([]);
    const [projectionMeta, setProjectionMeta] = useState<any>(null);
    const [appointments, setAppointments] = useState<IAppointment[]>([]);
    const [appointmentsLoading, setAppointmentsLoading] = useState(false);

    // 🆕 Modal de explicação da projeção
    interface BaseRecorrenteData {
        agendaFirme: Record<string, { count: number; valor: number }>;
        totais: { agendado: { sessoes: number; valor: number }; realizado: { sessoes: number; valor: number }; pendenteAgenda: { sessoes: number; valor: number } };
        pacotes: { ativos: number; sessoesRestantes: number; agendadasNoMes: number; semAgendamentoNoMes: number };
        convenios: { guiasAtivas: number; sessoesAutorizadas: number; porPlano: Array<{ plano: string; guias: number; sessoesRestantes: number }> };
    }
    const [projecaoModalOpen, setProjecaoModalOpen] = useState(false);
    const [baseRecorrente, setBaseRecorrente] = useState<BaseRecorrenteData | null>(null);
    const [loadingBaseRecorrente, setLoadingBaseRecorrente] = useState(false);

    const fetchBaseRecorrente = async () => {
        setLoadingBaseRecorrente(true);
        try {
            const res = await api.get(`/v2/financial/dashboard/base-recorrente?month=${mes}&year=${ano}`);
            setBaseRecorrente(res.data);
        } catch (err) {
            console.error('Erro ao buscar base recorrente:', err);
        } finally {
            setLoadingBaseRecorrente(false);
        }
    };

    const openProjecaoModal = () => {
        setProjecaoModalOpen(true);
        fetchBaseRecorrente();
    };

    const hook = useFinancialDashboardV3();
    const dashData = propData ?? hook.data;
    const dashLoading = propData ? false : hook.loading;
    const fetchDashboard = hook.fetchDashboard;

    useEffect(() => {
        setPageRealizados(0);
        setPageAgendados(0);
        setPagePendentes(0);
        setProjectionData([]);
        setProjectionMeta(null);

        // 🎯 Observabilidade: registra abertura da aba Projeção & Cenários
        trackUsage('ProjectionTab', 'opened', { month: mes, year: ano });

        // Só busca dashboard se não recebeu via props
        if (!propData) {
            fetchDashboard(mes, ano);
        }

        setAppointmentsLoading(true);
        const startDate = `${ano}-${String(mes).padStart(2, '0')}-01`;
        const endDate = `${ano}-${String(mes).padStart(2, '0')}-${new Date(ano, mes, 0).getDate()}`;
        api.get('/v2/appointments', {
            params: { startDate, endDate, limit: 500, light: true }
        }).then(res => {
            const responseData = res.data?.data || res.data || {};
            const appts = responseData.appointments || responseData;
            setAppointments(Array.isArray(appts) ? appts : []);
        }).catch(err => {
            console.error('[ProjecaoCenarios] Erro ao buscar appointments:', err);
            setAppointments([]);
        }).finally(() => {
            setAppointmentsLoading(false);
        });
    }, [mes, ano, propData, fetchDashboard]);

    // 🔄 Escuta evento global de refresh de caixa (disparado após completeSession)
    useEffect(() => {
        if (propData) return; // não refetch se dados vieram do pai
        const handleCashRefresh = () => {
            console.log('[AnaliseProjecaoTab] cash:refresh recebido — refetching dashboard');
            fetchDashboard(mes, ano);
        };
        window.addEventListener('cash:refresh', handleCashRefresh);
        return () => window.removeEventListener('cash:refresh', handleCashRefresh);
    }, [mes, ano, fetchDashboard, propData]);

    const projectionFetched = useRef('');

    useEffect(() => {
        if (!dashData) return;

        const key = `${ano}-${String(mes).padStart(2, '0')}`;
        if (projectionFetched.current === key) return;
        projectionFetched.current = key;

        const projecaoFinal = dashData?.metas?.projecao?.final || 0;
        api.get('/financial/dashboard/projection-daily', {
            params: {
                month: mes,
                year: ano,
                projecaoFinal,
                realAtual: dashData?.revenue?.total || 0
            }
        }).then(res => {
            if (res.data?.success) {
                setProjectionData(res.data.data);
                setProjectionMeta(res.data.meta);
            }
        }).catch(() => {});
    }, [dashData, mes, ano]);

    const realizados = useMemo(() =>
        appointments.filter((a: IAppointment) => a.operationalStatus === 'completed'),
    [appointments]);
    const confirmados = useMemo(() =>
        appointments.filter((a: IAppointment) => a.operationalStatus === 'confirmed'),
    [appointments]);
    const pendentes = useMemo(() =>
        appointments.filter((a: IAppointment) => a.operationalStatus === 'scheduled'),
    [appointments]);

    const loading = dashLoading || appointmentsLoading;
    if (loading) return <LoadingSpinner centered size="large" color="border-emerald-600" className="min-h-[400px]" />;
    if (!dashData || !dashData.metas) return <div className="p-4 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">Dados de metas e projeções indisponíveis para este período.</div>;

    // ── Cálculos estratégicos ──
    //
    // TRÊS DIMENSÕES FINANCEIRAS (separadas, nunca somadas diretamente):
    //   1. CAIXA    = dinheiro que ENTROU (fato)
    //   2. PRODUÇÃO = sessões executadas (fato operacional)
    //   3. BACKLOG  = sessões futuras contratadas (projeção)
    //
    // SEPARAÇÃO CRÍTICA DE BACKLOG:
    //   - OPERACIONAL (prepaid/full): sessões pagas mas NÃO realizadas.
    //     NÃO gera caixa futuro. Mostra quanto a clínica ainda precisa EXECUTAR.
    //   - FINANCEIRO (per_session): sessões NÃO pagas e NÃO realizadas.
    //     VAI gerar caixa futuro. Mostra quanto a clínica ainda vai RECEBER.
    //
    // PREVISÃO REALISTA = caixa + aReceber + backlogFinanceiroComFator
    // NUNCA somar backlogOperacional — o caixa já capturou esse valor.
    //
    // ⚠️ NÃO somar caixa + produção + backlog sem filtros — duplica.
    const caixa = dashData?.cash?.total || 0;
    const producao = dashData?.revenue?.total || 0;
    const aReceber = dashData?.aReceberProducao || 0;
    const receitaRealizavel = dashData?.receitaRealizavel || 0;   // projeção (caixa + aReceber + backlogFinanceiro)
    const backlogOperacional = dashData?.backlogOperacional || 0;
    const backlogFinanceiro = dashData?.backlogFinanceiro || 0;
    const backlogFinanceiroComFator = dashData?.backlogFinanceiroComFator || 0;
    const backlogContratado = dashData?.backlogContratado || 0;
    const resultadoEconomico = dashData?.metas?.realizado?.mes || 0; // = receita reconhecida (caixa + convenio a receber)
    const metaValor = dashData?.metas?.configuracao?.metaMensal || 0;
    const percentualAtual = dashData?.metas?.ritmo?.percentualRealizado || 0;
    const cenarioEsperado = dashData?.metas?.projecao?.final || 0;

    const hoje = new Date();
    const diasNoMes = new Date(ano, mes, 0).getDate();
    const ehMesAtual = mes === hoje.getMonth() + 1 && ano === hoje.getFullYear();
    const ehPassado = ano < hoje.getFullYear() || (ano === hoje.getFullYear() && mes < hoje.getMonth() + 1);
    const diasDecorridos = ehMesAtual ? hoje.getDate() : ehPassado ? diasNoMes : 0;
    const diasRestantes = Math.max(diasNoMes - diasDecorridos, 0);

    const ritmoAtual = diasDecorridos > 0 ? resultadoEconomico / diasDecorridos : 0;
    const ritmoNecessario = diasRestantes > 0 ? Math.max(0, metaValor - resultadoEconomico) / diasRestantes : 0;
    const ritmoOk = ritmoNecessario === 0 || ritmoAtual >= ritmoNecessario;

    const percentualMesDecorrido = diasNoMes > 0 ? (diasDecorridos / diasNoMes) * 100 : 0;
    const atrasadoPct = percentualMesDecorrido - percentualAtual;

    let statusPhrase = '';
    let statusColor = '#38a169';
    if (metaValor > 0 && ehMesAtual) {
        if (percentualAtual >= 100) {
            statusPhrase = `Meta atingida! Resultado econômico de ${formatCurrency(resultadoEconomico)}.`;
        } else if (atrasadoPct > 15) {
            statusPhrase = `Você está ${atrasadoPct.toFixed(0)}% abaixo do esperado com ${diasDecorridos} dias decorridos — precisa de ${formatCurrency(ritmoNecessario)}/dia para recuperar.`;
            statusColor = '#E53E3E';
        } else if (atrasadoPct > 5) {
            statusPhrase = `Levemente abaixo do ritmo. Você atingiu ${percentualAtual.toFixed(0)}% da meta com ${percentualMesDecorrido.toFixed(0)}% do mês decorrido.`;
            statusColor = '#D69E2E';
        } else {
            statusPhrase = `No ritmo! Com ${diasDecorridos} dias decorridos, você realizou ${percentualAtual.toFixed(0)}% da meta.`;
        }
    }

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-gray-700 capitalize">
                    {format(new Date(ano, mes - 1), 'MMMM yyyy', { locale: ptBR })}
                    {ehMesAtual && <span className="font-normal text-gray-400"> · {diasDecorridos} dias decorridos</span>}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        💵 Caixa {formatCurrencyShort(caixa)}
                    </span>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        ⏳ A receber {formatCurrencyShort(aReceber)}
                    </span>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        🏥 Produção {formatCurrencyShort(producao)}
                    </span>
                    <IconButton size="small" onClick={() => fetchDashboard(mes, ano)}>
                        <RefreshCcw size={16} />
                    </IconButton>
                </div>
            </div>

            {/* RESUMO EXECUTIVO */}
            {statusPhrase && (
                <div className="p-3 rounded-xl flex items-start gap-3" style={{ backgroundColor: `${statusColor}10`, borderLeft: `4px solid ${statusColor}` }}>
                    <div className="flex-1">
                        <p className="text-3xs font-black uppercase tracking-widest mb-0.5" style={{ color: statusColor }}>Resumo do mês</p>
                        <p className="text-sm font-medium text-gray-800">{statusPhrase}</p>
                        {metaValor > 0 && (
                            <div className="flex flex-wrap gap-4 mt-2">
                                <span className="text-xs text-gray-600">💵 Caixa realizado: <strong className="text-emerald-700">{formatCurrency(caixa)}</strong></span>
                                <span className="text-xs text-gray-600">🧾 A receber: <strong className="text-amber-600">{formatCurrency(aReceber)}</strong></span>
                                <span className="text-xs text-gray-600">🏥 Produção: <strong className="text-blue-600">{formatCurrency(producao)}</strong></span>
                                {backlogOperacional > 0 && (
                                    <span className="text-xs text-gray-600">📦 Backlog operacional: <strong className="text-purple-600">{formatCurrency(backlogOperacional)}</strong> <span className="text-gray-400">(sessões pagas a executar)</span></span>
                                )}
                                {backlogFinanceiro > 0 && (
                                    <span className="text-xs text-gray-600">💰 Backlog financeiro: <strong className="text-emerald-600">{formatCurrency(backlogFinanceiro)}</strong> <span className="text-gray-400">(sessões a pagar no futuro)</span></span>
                                )}
                                {receitaRealizavel > caixa && (
                                    <span className="text-xs text-gray-600">🔮 Previsão: <strong className="text-sky-600">{formatCurrency(receitaRealizavel)}</strong> <span className="text-gray-400">(caixa + aReceber + backlogFinanceiro)</span></span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 3 CARDS PRINCIPAIS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* HERO: META DO MÊS */}
                <div className="border-2 rounded-2xl p-4 shadow-sm" style={{ borderColor: '#10B981', backgroundColor: '#F0FDF4' }}>
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-3xs font-black uppercase tracking-widest text-emerald-700">Meta do Mês</p>
                        {metaValor > 0 && (
                            <span className={`text-3xl font-black leading-none ${percentualAtual >= 100 ? 'text-emerald-600' : percentualAtual >= 60 ? 'text-amber-500' : 'text-red-600'}`}>
                                {Math.min(percentualAtual, 100).toFixed(0)}%
                            </span>
                        )}
                    </div>

                    {metaValor > 0 && (
                        <div className="relative h-[5px] rounded-full bg-gray-200 mb-3 overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                    width: `${Math.min(percentualAtual, 100)}%`,
                                    backgroundColor: percentualAtual >= 100 ? '#10B981' : percentualAtual >= 60 ? '#F59E0B' : '#EF4444',
                                }}
                            />
                        </div>
                    )}

                    {/* Valores principais */}
                    <p className="text-2xl font-black text-gray-900 leading-tight">{formatCurrency(resultadoEconomico)}</p>
                    <p className="text-xs text-gray-500 mb-3">
                        de {formatCurrency(metaValor)}
                        {resultadoEconomico < metaValor && (
                            <span className="text-rose-600 font-semibold ml-1">· faltam {formatCurrency(metaValor - resultadoEconomico)}</span>
                        )}
                    </p>

                    {/* Mini badges — FATO vs PROJEÇÃO */}
                    <div className="space-y-1.5 border-t border-emerald-100 pt-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-700 font-semibold">💰 Receita Reconhecida</span>
                            <span className="font-bold text-emerald-700">{formatCurrency(resultadoEconomico)}</span>
                        </div>
                        {aReceber > 0 && (
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-500">⏳ A receber (conv. + part.)</span>
                                <span className="font-semibold text-amber-600">{formatCurrency(aReceber)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500">🏥 Produção clínica</span>
                            <span className="font-semibold text-blue-500">{formatCurrency(producao)}</span>
                        </div>
                        {backlogOperacional > 0 && (
                            <div className="flex justify-between text-xs bg-purple-50 rounded px-2 py-1">
                                <span className="text-gray-500">📦 Backlog operacional</span>
                                <span className="font-semibold text-purple-600">
                                    {formatCurrency(backlogOperacional)}
                                    <span className="text-gray-400 font-normal ml-1">(prepaid — já recebeu)</span>
                                </span>
                            </div>
                        )}
                        {backlogFinanceiro > 0 && (
                            <div className="flex justify-between text-xs bg-emerald-50 rounded px-2 py-1">
                                <span className="text-gray-500">💰 Backlog financeiro</span>
                                <span className="font-semibold text-emerald-600">
                                    {formatCurrency(backlogFinanceiro)}
                                    <span className="text-gray-400 font-normal ml-1">(per_session — vai receber)</span>
                                </span>
                            </div>
                        )}
                        {receitaRealizavel > caixa && (
                            <div className="flex justify-between text-xs bg-sky-50 rounded px-2 py-1 border border-sky-100">
                                <span className="text-gray-500">🔮 Previsão realista</span>
                                <span className="font-semibold text-sky-700">
                                    {formatCurrency(receitaRealizavel)}
                                    <span className="text-gray-400 font-normal ml-1">(caixa + aReceber + backlogFin)</span>
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* RITMO NECESSÁRIO */}
                <div className="border-2 rounded-2xl p-4 shadow-sm" style={{ borderColor: '#3B82F6', backgroundColor: '#EFF6FF' }}>
                    <p className="text-3xs font-black uppercase tracking-widest text-blue-700 mb-2">Ritmo Necessário</p>
                    <p className="text-3xl font-black text-gray-900 leading-tight mb-2">
                        {diasRestantes > 0 ? `${formatCurrency(ritmoNecessario)}/dia` : '—'}
                    </p>

                    {/* Badge de status proeminente */}
                    {diasRestantes > 0 && ritmoNecessario > 0 && (
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold mb-3 ${ritmoOk ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                            <span>{ritmoOk ? '✅' : '⚠️'}</span>
                            <span>
                                {`${ritmoOk ? '+' : ''}${(((ritmoAtual / ritmoNecessario) - 1) * 100).toFixed(0)}% ${ritmoOk ? 'acima do necessário' : 'abaixo do necessário'}`}
                            </span>
                        </div>
                    )}
                    {(diasRestantes === 0 || ritmoNecessario === 0) && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold mb-3 bg-emerald-100 text-emerald-700">
                            ✅ Meta atingida
                        </div>
                    )}

                    <div className="space-y-1.5 border-t border-blue-100 pt-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Ritmo atual</span>
                            <span className={`text-sm font-black ${ritmoOk ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {formatCurrency(ritmoAtual)}/dia
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Dias restantes</span>
                            <span className="text-sm font-bold text-gray-700">
                                {diasRestantes > 0 ? `${diasRestantes} dias` : ehPassado ? 'Mês encerrado' : 'Não iniciado'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Realizados</span>
                            <span className="text-sm font-bold text-blue-700">
                                ✅ {(dashData?.appointmentCounts?.realizados || 0).toLocaleString('pt-BR')} atendimentos
                            </span>
                        </div>
                    </div>
                </div>

                {/* PROJEÇÃO DE FECHAMENTO */}
                <div
                    className="border-2 rounded-2xl p-4 shadow-sm cursor-pointer hover:shadow-md transition"
                    style={{ borderColor: '#8B5CF6', backgroundColor: '#F5F3FF' }}
                    onClick={openProjecaoModal}
                >
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-3xs font-black uppercase tracking-widest text-purple-700">Projeção de Fechamento</p>
                        <Info size={14} className="text-purple-400" />
                    </div>
                    <p className="text-3xl font-black leading-tight mb-2" style={{ color: '#7C3AED' }}>{formatCurrency(cenarioEsperado)}</p>

                    {metaValor > 0 && (
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3 ${cenarioEsperado >= metaValor ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {cenarioEsperado >= metaValor
                                ? `✅ +${formatCurrency(cenarioEsperado - metaValor)} acima da meta`
                                : `⚠️ ${formatCurrency(metaValor - cenarioEsperado)} abaixo da meta`}
                        </div>
                    )}

                    <div className="relative h-[5px] rounded-full bg-gray-200 mb-2 overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all"
                            style={{
                                width: `${Math.min(percentualAtual, 100)}%`,
                                backgroundColor: percentualAtual >= 100 ? '#10B981' : percentualAtual >= 60 ? '#F59E0B' : '#EF4444',
                            }}
                        />
                    </div>
                    <p className="text-xs text-gray-400">
                        {(dashData?.metas?.ritmo?.percentualRealizado || 0).toFixed(1)}% atingido · Cenário histórico
                    </p>
                    <p className="text-xs text-purple-600 mt-1.5 font-semibold">
                        📅 {(dashData?.appointmentCounts?.ativos || 0).toLocaleString('pt-BR')} agendamentos no mês
                    </p>
                </div>
            </div>

            {/* CENÁRIOS DE FECHAMENTO */}
            <div>
                <p className="text-3xs font-black uppercase tracking-widest text-gray-400 mb-2">Cenários de Fechamento</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {(() => {
                        const getValor = (a: IAppointment) => (a as any).sessionValue || a.paymentAmount || 0;
                        const valorConfirmados = confirmados.reduce((sum, a) => sum + getValor(a), 0);
                        const valorPendentes = pendentes.reduce((sum, a) => sum + getValor(a), 0);

                        const rawValues = [
                            { value: resultadoEconomico + (valorConfirmados * 0.7) + (valorPendentes * 0.2), desc: '70% confirmados + 20% pendentes' },
                            { value: cenarioEsperado || resultadoEconomico, desc: 'Taxa histórica de conversão' },
                            { value: resultadoEconomico + (valorConfirmados * 0.95) + (valorPendentes * 0.7), desc: '95% confirmados + 70% pendentes' }
                        ].sort((a, b) => a.value - b.value);

                        const configs = [
                            { label: 'PESSIMISTA', color: '#DC2626', IconEl: TrendingDown },
                            { label: 'ESPERADO', color: '#2563EB', IconEl: Target },
                            { label: 'OTIMISTA', color: '#16A34A', IconEl: TrendingUp }
                        ];

                        return configs.map((cfg, i) => ({ ...cfg, value: rawValues[i].value, desc: rawValues[i].desc }));
                    })().map((c) => {
                        const IconEl = c.IconEl;
                        const isEsperado = c.label === 'ESPERADO';
                        return (
                        <div key={c.label} className="rounded-2xl overflow-hidden shadow-sm"
                            style={{
                                border: isEsperado ? `2px solid ${c.color}` : `1px solid ${c.color}30`,
                                backgroundColor: '#FFFFFF'
                            }}>
                            <div style={{ height: 3, backgroundColor: c.color }} />
                            <div className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="rounded-xl p-1.5" style={{ backgroundColor: `${c.color}15` }}>
                                            <IconEl size={14} style={{ color: c.color }} />
                                        </div>
                                        <p className="text-xs font-black uppercase tracking-wide" style={{ color: c.color }}>{c.label}</p>
                                    </div>
                                    {isEsperado && (
                                        <span className="text-3xs font-black px-2 py-0.5 rounded-full"
                                            style={{ backgroundColor: `${c.color}15`, color: c.color }}>
                                            Mais provável
                                        </span>
                                    )}
                                </div>
                                <p className="text-2xl font-black mb-1 text-gray-900">{formatCurrency(c.value)}</p>
                                {metaValor > 0 && (
                                    <p className="text-xs font-semibold mb-3" style={{ color: c.value >= metaValor ? '#16A34A' : '#DC2626' }}>
                                        {c.value >= metaValor
                                            ? `+${formatCurrency(c.value - metaValor)} acima da meta`
                                            : `${formatCurrency(metaValor - c.value)} abaixo da meta`}
                                    </p>
                                )}
                                <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">{c.desc}</p>
                            </div>
                        </div>
                        );
                    })}
                </div>
            </div>

            {/* ATENÇÃO · PROFISSIONAIS ABAIXO DA MÉDIA */}
            {(dashData?.insights?.insights || []).length > 0 && (
            <div>
                <p className="text-3xs font-black uppercase tracking-widest text-gray-400 mb-2">Atenção · Profissionais abaixo da média</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {(dashData.insights.insights as string[]).slice(0, 3).map((insight: string, idx: number) => {
                        const match = insight.match(/Profissional (.+?) está (\d+)% abaixo/);
                        const name = match?.[1] || '';
                        const pct = match ? parseInt(match[2]) : 0;
                        const isCritical = pct > 60;
                        const accentColor = isCritical ? '#EF4444' : '#F59E0B';
                        const bgColor = isCritical ? '#FFF5F5' : '#FFFBEB';
                        const borderColor = isCritical ? '#FCA5A5' : '#FCD34D';
                        return (
                            <div key={idx} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${borderColor}` }}>
                                <div style={{ height: 3, backgroundColor: accentColor }} />
                                <div className="p-3" style={{ backgroundColor: bgColor }}>
                                    <div className="flex items-start gap-2 mb-2">
                                        <span className="text-base leading-none mt-0.5">{isCritical ? '🔴' : '⚠️'}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-900 leading-tight">{name || 'Profissional'}</p>
                                            <p className="text-xs text-gray-600 mt-0.5">
                                                {pct > 0 ? `${pct}% abaixo da média de produção` : insight}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mb-2.5">
                                        <div className="flex justify-between text-3xs mb-1" style={{ color: accentColor }}>
                                            <span>{100 - pct}% do esperado</span>
                                            <span>{isCritical ? 'crítico' : 'atenção'}</span>
                                        </div>
                                        <div className="h-[4px] rounded-full bg-gray-200 overflow-hidden">
                                            <div className="h-full rounded-full transition-all" style={{
                                                width: `${Math.max(100 - pct, 4)}%`,
                                                backgroundColor: accentColor
                                            }} />
                                        </div>
                                    </div>
                                    <button
                                        className="w-full text-xs font-semibold py-1.5 rounded-lg transition-colors border"
                                        style={{ backgroundColor: 'white', color: accentColor, borderColor }}>
                                        📅 Ver agenda ↗
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            )}
            {(dashData?.insights?.insights || []).length === 0 && ritmoOk && (
                <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200">
                    <p className="text-xs text-emerald-700 font-semibold">✅ Todos os profissionais no ritmo da meta.</p>
                </div>
            )}

            {/* Gráfico de evolução diária */}
            {projectionData.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-1 mb-1">
                        <h3 className="text-sm font-semibold">Evolução do mês</h3>
                        {projectionMeta?.isBehind && (
                            <Chip
                                label={`${(projectionMeta.gapPercent * 100).toFixed(1)}% abaixo do ideal`}
                                size="small"
                                color="warning"
                                variant="outlined"
                            />
                        )}
                    </div>
                    <p className="text-xs text-gray-500 mb-3">Acumulado real · Meta ideal (linear) · Projeção de fechamento</p>
                    <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={projectionData} margin={{ top: 5, right: 12, bottom: 5, left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
                            <XAxis dataKey="dayOfMonth" tick={{ fontSize: 11 }} interval={4} />
                            <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} width={52} />
                            <ChartTooltip content={<ProjectionTooltip />} />
                            <Legend iconType="line" wrapperStyle={{ fontSize: 12 }} />
                            {ehMesAtual && (
                                <ReferenceLine
                                    x={new Date().getDate()}
                                    stroke="#FC8181"
                                    strokeDasharray="4 2"
                                    label={{ value: 'hoje', position: 'insideTopLeft', fill: '#FC8181', fontSize: 11 }}
                                />
                            )}
                            <Line type="monotone" dataKey="realAcumulado" name="Real" stroke="#3182CE" strokeWidth={2.5}
                                dot={(props: any) => {
                                    if (!props.payload?.isToday) return <g key={props.key} />;
                                    return <circle cx={props.cx} cy={props.cy} r={6} fill="#3182CE" stroke="white" strokeWidth={2} />;
                                }}
                                activeDot={{ r: 5 }}
                            />
                            <Line type="monotone" dataKey="metaIdeal" name="Meta ideal" stroke="#718096" strokeWidth={1.5} strokeDasharray="6 3" dot={false} />
                            <Line type="monotone" dataKey="projecaoAcumulada" name="Projeção" stroke="#68D391" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Tabelas de detalhamento */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                    { title: 'Realizados', data: realizados, page: pageRealizados, setPage: setPageRealizados, getValor: (apt: any) => apt.valor || (apt as any).sessionValue || apt.paymentAmount || 0, getPaciente: (apt: any) => apt.paciente },
                    { title: 'Agendados confirmados', data: confirmados, page: pageAgendados, setPage: setPageAgendados, getValor: (apt: any) => (apt as any).sessionValue || apt.paymentAmount || 0, getPaciente: (apt: any) => apt.paciente || apt.patientName },
                    { title: 'Pendentes de confirmação', data: pendentes, page: pagePendentes, setPage: setPagePendentes, getValor: (apt: any) => (apt as any).sessionValue || apt.paymentAmount || 0, getPaciente: (apt: any) => apt.paciente || apt.patientName }
                ].map((tab, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-2">
                        <p className="text-sm font-bold mb-2">{tab.title} ({tab.data.length})</p>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell className="text-xs">Data</TableCell>
                                    <TableCell className="text-xs">Paciente</TableCell>
                                    <TableCell className="text-xs text-right">Valor</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {tab.data.slice(tab.page * PAGE_SIZE, (tab.page + 1) * PAGE_SIZE).map((apt: any) => (
                                    <TableRow key={apt._id}>
                                        <TableCell className="text-xs">{safeFormatDate(apt.data, 'dd/MM')}</TableCell>
                                        <TableCell className="text-xs truncate max-w-[120px]">{tab.getPaciente(apt) || '—'}</TableCell>
                                        <TableCell className="text-xs text-right">{formatCurrency(tab.getValor(apt) || 0)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <Pagination total={tab.data.length} page={tab.page} onPage={tab.setPage} />
                    </div>
                ))}
            </div>

            {/* ── Modal: Entendendo sua Projeção ── */}
            {projecaoModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setProjecaoModalOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col mx-4" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b">
                            <div className="flex items-center gap-2">
                                <TrendingUp size={20} className="text-purple-600" />
                                <h2 className="text-lg font-bold text-gray-900">Como calculamos sua Projeção de Fechamento</h2>
                            </div>
                            <button onClick={() => setProjecaoModalOpen(false)} className="p-1 rounded-lg hover:bg-gray-100">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="overflow-auto flex-1 p-5 space-y-6">
                            {loadingBaseRecorrente || !baseRecorrente ? (
                                <div className="p-8 text-center text-gray-500">Carregando base recorrente...</div>
                            ) : (
                                <>
                                    {/* 1. O que é esse número */}
                                    <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                                                <TrendingUp size={20} />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-purple-900">O que é esse número?</h3>
                                                <p className="text-sm text-purple-700 mt-1 leading-relaxed">
                                                    É uma estimativa do faturamento total do mês, considerando a produção já realizada,
                                                    a agenda já marcada e a conversão histórica de pendências.
                                                </p>
                                                <p className="text-2xl font-black text-purple-700 mt-3">
                                                    {formatCurrency(dashData?.metas?.projecao?.final || 0)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. Como ele é composto */}
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-800 mb-3">Como ele é composto</h3>
                                        <div className="rounded-xl border border-gray-100 overflow-x-auto">
                                            <table className="w-full min-w-[420px] text-sm">
                                                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left font-medium">Origem</th>
                                                        <th className="px-4 py-2 text-right font-medium">Sessões</th>
                                                        <th className="px-4 py-2 text-right font-medium">Valor</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    <tr>
                                                        <td className="px-4 py-2 text-gray-700">✅ Realizado</td>
                                                        <td className="px-4 py-2 text-right text-gray-700">{baseRecorrente.totais.realizado.sessoes}</td>
                                                        <td className="px-4 py-2 text-right font-semibold text-gray-900">{formatCurrency(baseRecorrente.totais.realizado.valor)}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="px-4 py-2 text-gray-700">📅 Agenda firme</td>
                                                        <td className="px-4 py-2 text-right text-gray-700">{baseRecorrente.totais.pendenteAgenda.sessoes}</td>
                                                        <td className="px-4 py-2 text-right font-semibold text-gray-900">{formatCurrency(baseRecorrente.totais.pendenteAgenda.valor)}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="px-4 py-2 text-gray-700">🔄 Potencial recorrente</td>
                                                        <td className="px-4 py-2 text-right text-gray-700">
                                                            {baseRecorrente.pacotes.semAgendamentoNoMes + baseRecorrente.convenios.sessoesAutorizadas}
                                                        </td>
                                                        <td className="px-4 py-2 text-right font-semibold text-gray-500">a estimar</td>
                                                    </tr>
                                                    <tr className="bg-gray-50 font-bold">
                                                        <td className="px-4 py-2 text-gray-900">Total garantido</td>
                                                        <td className="px-4 py-2 text-right text-gray-900">{baseRecorrente.totais.agendado.sessoes}</td>
                                                        <td className="px-4 py-2 text-right text-gray-900">{formatCurrency(baseRecorrente.totais.agendado.valor)}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* 3. Detalhe por tipo */}
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-800 mb-3">Agenda firme por tipo</h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            {[
                                                { key: 'pacote', label: 'Pacote', icon: '📦', color: 'bg-blue-50 border-blue-100 text-blue-700' },
                                                { key: 'convenio', label: 'Convênio', icon: '🏥', color: 'bg-amber-50 border-amber-100 text-amber-700' },
                                                { key: 'particular', label: 'Particular', icon: '💳', color: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
                                                { key: 'liminar', label: 'Liminar', icon: '⚖️', color: 'bg-purple-50 border-purple-100 text-purple-700' },
                                            ].map(({ key, label, icon, color }) => {
                                                const item = baseRecorrente.agendaFirme[key] || { count: 0, valor: 0 };
                                                return (
                                                    <div key={key} className={`rounded-xl border p-3 ${color}`}>
                                                        <p className="text-xs font-semibold opacity-80">{icon} {label}</p>
                                                        <p className="text-lg font-black mt-1">{formatCurrency(item.valor)}</p>
                                                        <p className="text-3xs opacity-70">{item.count} sessões</p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* 4. O que NÃO entra */}
                                    <div className="bg-rose-50 rounded-xl p-4 border border-rose-100">
                                        <h3 className="text-sm font-bold text-rose-900 mb-2">⚠️ O que esse número NÃO é</h3>
                                        <ul className="text-sm text-rose-800 space-y-1.5 list-disc list-inside">
                                            <li>Não é dinheiro já no caixa</li>
                                            <li>Não considera inadimplência ou cancelamentos futuros</li>
                                            <li>Não inclui novos pacientes que ainda não agendaram</li>
                                            <li>Não é uma promessa de recebimento — é uma projeção operacional</li>
                                        </ul>
                                    </div>

                                    {/* 5. Cenários */}
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-800 mb-3">Por que existem cenários?</h3>
                                        <div className="grid grid-cols-3 gap-3 text-sm">
                                            <div className="rounded-xl border border-gray-100 p-3 bg-white">
                                                <p className="text-xs font-semibold text-rose-600 mb-1">Pessimista</p>
                                                <p className="text-lg font-black text-gray-900">{formatCurrency((dashData?.metas?.projecao?.esperada || 0) * 0.7)}</p>
                                                <p className="text-3xs text-gray-400">baixa conversão de agenda</p>
                                            </div>
                                            <div className="rounded-xl border border-gray-100 p-3 bg-white">
                                                <p className="text-xs font-semibold text-blue-600 mb-1">Esperado</p>
                                                <p className="text-lg font-black text-gray-900">{formatCurrency(dashData?.metas?.projecao?.esperada || 0)}</p>
                                                <p className="text-3xs text-gray-400">comportamento histórico médio</p>
                                            </div>
                                            <div className="rounded-xl border border-gray-100 p-3 bg-white">
                                                <p className="text-xs font-semibold text-emerald-600 mb-1">Otimista</p>
                                                <p className="text-lg font-black text-gray-900">{formatCurrency(dashData?.metas?.projecao?.final || 0)}</p>
                                                <p className="text-3xs text-gray-400">conversão máxima observada</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 6. Interpretação prática */}
                                    <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                                        <h3 className="text-sm font-bold text-emerald-900 mb-2">💡 Interpretação prática</h3>
                                        <p className="text-sm text-emerald-800 leading-relaxed">
                                            Sua operação já garante <strong>{formatCurrency(baseRecorrente.totais.agendado.valor)}</strong>
                                            {' '}({(dashData?.metas?.projecao?.final || 0) > 0 ? ((baseRecorrente.totais.agendado.valor / (dashData?.metas?.projecao?.final || 1)) * 100).toFixed(0) : 0}% da projeção)
                                            {' '}via produção realizada + agenda confirmada.
                                        </p>
                                        <p className="text-sm text-emerald-800 leading-relaxed mt-2">
                                            O crescimento até os <strong>{formatCurrency(dashData?.metas?.projecao?.final || 0)}</strong> depende principalmente de
                                            converter a base recorrente não agendada: <strong>{baseRecorrente.pacotes.semAgendamentoNoMes} sessões de pacotes</strong>
                                            {' '}e <strong>{baseRecorrente.convenios.sessoesAutorizadas} sessões de convênio</strong> ainda sem horário marcado.
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t flex justify-end">
                            <button
                                onClick={() => setProjecaoModalOpen(false)}
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

// ─── Tab principal: Análise & Projeção ────────────────────────────────────
const subTabs = [
    { label: 'Projeção & Cenários', icon: '📈' },
    { label: 'Por Especialidade',   icon: '🏷️' },
    { label: 'Ranking Profissionais', icon: '🏆' },
    { label: 'Pacientes VIP',       icon: '👑' },
];

interface AnaliseProjecaoTabProps {
    month: number;
    year: number;
}

const AnaliseProjecaoTab: React.FC<AnaliseProjecaoTabProps> = ({ month, year }) => {
    const [activeTab, setActiveTab] = useState(0);

    const handleTabChange = (_: any, newTab: number) => {
        setActiveTab(newTab);
    };

    return (
        <div className="p-2">
            <Tabs
                value={activeTab}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
                className="mb-4 border-b border-gray-200"
                sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 } }}
            >
                {subTabs.map((t, i) => (
                    <Tab key={i} label={`${t.icon} ${t.label}`} />
                ))}
            </Tabs>

            {activeTab === 0 && <ProjecaoCenarios month={month} year={year} />}
            {activeTab === 1 && <DashboardEspecialidades />}
            {activeTab === 2 && <RankingProfissionais />}
            {activeTab === 3 && <ListaPacientesVIP />}
        </div>
    );
};

export default AnaliseProjecaoTab;