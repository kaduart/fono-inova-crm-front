// AnaliseProjecaoTab.tsx - Refatorado com Tailwind (mantendo lógica)

import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import React, { useEffect, useMemo, useState } from 'react';
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
import { TrendingUp, TrendingDown, Target, Calendar, RefreshCcw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFinancialDashboardV3 } from '../../../hooks/useFinancialDashboardV3';
import { IAppointment } from '../../../utils/types/types';
import { DashboardEspecialidades } from '../components/DashboardEspecialidades';
import { RankingProfissionais } from '../components/RankingProfissionais';
import { ListaPacientesVIP } from '../components/ListaPacientesVIP';

const PAGE_SIZE = 10;

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

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
}

export const ProjecaoCenarios: React.FC<ProjecaoCenariosProps> = ({ month: mes, year: ano }) => {
    const [pageRealizados, setPageRealizados] = useState(0);
    const [pageAgendados, setPageAgendados] = useState(0);
    const [pagePendentes, setPagePendentes] = useState(0);
    const [projectionData, setProjectionData] = useState<any[]>([]);
    const [projectionMeta, setProjectionMeta] = useState<any>(null);
    const [appointments, setAppointments] = useState<IAppointment[]>([]);
    const [appointmentsLoading, setAppointmentsLoading] = useState(false);

    const { data: dashData, loading: dashLoading, fetchDashboard } = useFinancialDashboardV3();

    useEffect(() => {
        fetchDashboard(mes, ano);
        setPageRealizados(0);
        setPageAgendados(0);
        setPagePendentes(0);
        setProjectionData([]);
        setProjectionMeta(null);

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
    }, [mes, ano, fetchDashboard]);

    useEffect(() => {
        if (!dashData) return;
        const projecaoFinal = dashData?.metas?.projecao?.final || 0;
        api.get('/financial/dashboard/projection-daily', {
            params: {
                month: mes,
                year: ano,
                projecaoFinal
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

    // ── Cálculos estratégicos ──
    const resultadoEconomico = dashData?.metas?.realizado?.mes || 0;
    const producao = dashData?.revenue?.total || 0;
    const caixa = dashData?.cash?.total || 0;
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
        <div className="p-2">
            {/* Filtros superiores */}
            <div className="flex justify-end mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 font-medium">
                        {format(new Date(ano, mes - 1), 'MMMM yyyy', { locale: ptBR })}
                    </span>
                    <IconButton size="small" onClick={() => fetchDashboard(mes, ano)}>
                        <RefreshCcw size={16} />
                    </IconButton>
                </div>
            </div>

            {/* Status do mês */}
            {statusPhrase && (
                <div className="p-3 mb-4 rounded-md" style={{ backgroundColor: `${statusColor}10`, borderLeft: `3px solid ${statusColor}` }}>
                    <p className="text-sm font-medium text-gray-800">{statusPhrase}</p>
                </div>
            )}

            {/* Cards principais (3 colunas) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                {/* META DO MÊS */}
                <div className="border rounded-2xl p-5 shadow-sm" style={{ borderColor: '#10B98130', backgroundColor: '#10B98106' }}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="rounded-xl p-2.5" style={{ backgroundColor: '#10B98120' }}>
                            <Target size={18} style={{ color: '#10B981' }} />
                        </div>
                        <div className="flex-1 flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-500">META DO MÊS</p>
                            {metaValor > 0 && (
                                <Chip
                                    label={`${Math.min(percentualAtual, 100).toFixed(0)}%`}
                                    size="small"
                                    color={percentualAtual >= 100 ? 'success' : percentualAtual >= 60 ? 'warning' : 'error'}
                                />
                            )}
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mb-1">{metaValor > 0 ? formatCurrency(metaValor) : '—'}</p>
                    <p className="text-sm font-bold text-emerald-600 mb-3">
                        {formatCurrency(resultadoEconomico)}
                        {metaValor > 0 && resultadoEconomico < metaValor && (
                            <span className="text-xs text-gray-500 ml-1 font-normal">(faltam {formatCurrency(metaValor - resultadoEconomico)})</span>
                        )}
                    </p>
                    {metaValor > 0 && (
                        <LinearProgress
                            variant="determinate"
                            value={Math.min(percentualAtual, 100)}
                            className="mb-3 h-1.5 rounded-full"
                            color={percentualAtual >= 100 ? 'success' : percentualAtual >= 60 ? 'warning' : 'error'}
                        />
                    )}
                    <div className="space-y-1.5 pt-2 border-t border-gray-100">
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Produção Realizada</span>
                            <span className="font-medium">{formatCurrency(producao)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Caixa Recebido</span>
                            <span className="font-medium">{formatCurrency(caixa)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Convênio a Receber</span>
                            <span className="font-medium text-amber-600">{formatCurrency(Math.max(0, resultadoEconomico - caixa))}</span>
                        </div>
                    </div>
                </div>

                {/* RITMO NECESSÁRIO */}
                <div className="border rounded-2xl p-5 shadow-sm" style={{ borderColor: '#3B82F630', backgroundColor: '#3B82F606' }}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="rounded-xl p-2.5" style={{ backgroundColor: '#3B82F620' }}>
                            <TrendingUp size={18} style={{ color: '#3B82F6' }} />
                        </div>
                        <p className="text-sm font-semibold text-gray-500">RITMO NECESSÁRIO</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{diasRestantes > 0 ? `${formatCurrency(ritmoNecessario)}/dia` : '—'}</p>
                    <div className="space-y-1.5 mt-3 pt-2 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Ritmo atual</span>
                            <span className={`text-xs font-semibold ${ritmoOk ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {formatCurrency(ritmoAtual)}/dia {ritmoOk ? '✅' : '⚠️'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Dias restantes</span>
                            <span className="text-xs font-medium text-gray-700">
                                {diasRestantes > 0
                                    ? `${diasRestantes} ${diasRestantes === 1 ? 'dia' : 'dias'}`
                                    : ehPassado ? 'Mês encerrado' : 'Não iniciado'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* PROJEÇÃO ESPERADA + FECHAMENTO */}
                <div className="border rounded-2xl p-5 shadow-sm" style={{ borderColor: '#8B5CF630', backgroundColor: '#8B5CF606' }}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="rounded-xl p-2.5" style={{ backgroundColor: '#8B5CF620' }}>
                            <Calendar size={18} style={{ color: '#8B5CF6' }} />
                        </div>
                        <p className="text-sm font-semibold text-gray-500">PROJEÇÃO DE FECHAMENTO</p>
                    </div>
                    <p className="text-2xl font-bold mb-1" style={{ color: '#8B5CF6' }}>{formatCurrency(cenarioEsperado)}</p>
                    {metaValor > 0 && (
                        <p className={`text-xs font-semibold mb-2 ${cenarioEsperado >= metaValor ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {cenarioEsperado >= metaValor
                                ? `✅ +${formatCurrency(cenarioEsperado - metaValor)} acima da meta`
                                : `⚠️ ${formatCurrency(metaValor - cenarioEsperado)} abaixo da meta`}
                        </p>
                    )}
                    <LinearProgress
                        variant="determinate"
                        value={Math.min(dashData?.metas?.ritmo?.percentualRealizado || 0, 100)}
                        className="h-2 rounded-full mb-2"
                        color={percentualAtual >= 100 ? 'success' : percentualAtual >= 60 ? 'warning' : 'error'}
                    />
                    <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500">
                            {(dashData?.metas?.ritmo?.percentualRealizado || 0).toFixed(1)}% atingido
                            {dashData?.metas?.gap?.valor > 0 && ` — faltam ${formatCurrency(dashData.metas.gap.valor)}`}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">Cenário esperado (taxa histórica)</p>
                    </div>
                </div>
            </div>

            {/* Insights */}
            <div className="mb-5">
                <div className="border border-gray-200 rounded-lg p-3">
                    <p className="text-sm font-semibold mb-2">Insights</p>
                    <div className="flex flex-wrap gap-2">
                        {(dashData?.insights?.insights || []).length === 0 ? (
                            <p className="text-xs text-gray-500">
                                {metaValor === 0
                                    ? 'Configure uma meta para ver insights estratégicos.'
                                    : ritmoOk
                                    ? 'No ritmo da meta. Continue assim!'
                                    : 'Nenhuma ação urgente identificada.'}
                            </p>
                        ) : (
                            dashData.insights.insights.slice(0, 3).map((insight: string, idx: number) => (
                                <div
                                    key={idx}
                                    className={`flex-1 min-w-[140px] p-2 rounded border-l-3 ${
                                        idx === 0 ? 'bg-red-50 border-l-red-500' :
                                        idx === 1 ? 'bg-amber-50 border-l-amber-500' :
                                        'bg-green-50 border-l-green-500'
                                    }`}
                                    style={{ borderLeftWidth: '3px' }}
                                >
                                    <p className="text-sm font-medium text-gray-800">{insight}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Cenários de Fechamento */}
            <h3 className="text-base font-bold mb-2">Cenários de Fechamento</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                {(() => {
                    const getValor = (a: IAppointment) => (a as any).sessionValue || a.paymentAmount || 0;
                    const valorConfirmados = confirmados.reduce((sum, a) => sum + getValor(a), 0);
                    const valorPendentes = pendentes.reduce((sum, a) => sum + getValor(a), 0);
                    const cen = [
                        { label: 'PESSIMISTA', value: resultadoEconomico + (valorConfirmados * 0.7) + (valorPendentes * 0.2), desc: '70% confirmados + 20% pendentes', color: '#E53E3E' },
                        { label: 'ESPERADO', value: cenarioEsperado || resultadoEconomico, desc: 'Taxa histórica de conversão', color: '#3182CE' },
                        { label: 'OTIMISTA', value: resultadoEconomico + (valorConfirmados * 0.95) + (valorPendentes * 0.7), desc: '95% confirmados + 70% pendentes', color: '#38A169' }
                    ];
                    return cen;
                })().map((c, i) => (
                    <div key={c.label} className="border rounded-2xl p-5 shadow-sm" style={{ borderColor: `${c.color}30`, backgroundColor: `${c.color}06` }}>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="rounded-xl p-2" style={{ backgroundColor: `${c.color}20` }}>
                                {i === 0 ? <TrendingDown size={16} style={{ color: c.color }} /> : i === 1 ? <Target size={16} style={{ color: c.color }} /> : <TrendingUp size={16} style={{ color: c.color }} />}
                            </div>
                            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: c.color }}>{c.label}</p>
                        </div>
                        <p className="text-xl font-bold mb-2" style={{ color: c.color }}>{formatCurrency(c.value)}</p>
                        <p className="text-xs text-gray-500 pt-2 border-t border-gray-100">{c.desc}</p>
                    </div>
                ))}
            </div>

            {/* Gráfico de evolução diária */}
            {projectionData.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-3 mb-5">
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

            <hr className="my-5 border-gray-200" />

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
    const [mountKey, setMountKey] = useState(0);

    const handleTabChange = (_: any, newTab: number) => {
        setActiveTab(newTab);
        setMountKey(prev => prev + 1);
    };

    return (
        <div className="p-2">
            <div className="mb-4">
                <h2 className="text-2xl font-bold text-gray-800">📊 Análise & Projeção</h2>
                <p className="text-sm text-gray-500 mt-0.5">Provisão, projeções e análise detalhada</p>
            </div>

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

            {activeTab === 0 && <ProjecaoCenarios key={`proj-${mountKey}`} month={month} year={year} />}
            {activeTab === 1 && <DashboardEspecialidades key={`esp-${mountKey}`} />}
            {activeTab === 2 && <RankingProfissionais key={`rank-${mountKey}`} />}
            {activeTab === 3 && <ListaPacientesVIP key={`vip-${mountKey}`} />}
        </div>
    );
};

export default AnaliseProjecaoTab;