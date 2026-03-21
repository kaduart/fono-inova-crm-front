import React, { useEffect, useState } from 'react';
import {
    ResponsiveContainer, LineChart, Line, XAxis, YAxis,
    CartesianGrid, Tooltip as ChartTooltip, Legend, ReferenceLine
} from 'recharts';
import api from '../../../services/api';
import {
    Box, Card, CardContent, Typography, Grid, LinearProgress,
    Paper, Chip, FormControl, Select, MenuItem,
    Stack, IconButton, Table, TableBody, TableCell, TableHead, TableRow, Divider,
    Tab, Tabs
} from '@mui/material';
import { NavigateBefore, NavigateNext } from '@mui/icons-material';
import { TrendingUp, Target, Calendar, RefreshCcw } from 'lucide-react';
import { BarChart2, Trophy, Crown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFinancialDashboard } from '../../../hooks/useFinancialDashboard';
import { DashboardEspecialidades } from '../components/DashboardEspecialidades';
import { RankingProfissionais } from '../components/RankingProfissionais';
import { ListaPacientesVIP } from '../components/ListaPacientesVIP';
import { FinancialLoading } from '../components/FinancialLoading';

const PAGE_SIZE = 10;

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

function Pagination({ total, page, onPage }: { total: number; page: number; onPage: (p: number) => void }) {
    const pages = Math.ceil(total / PAGE_SIZE);
    if (pages <= 1) return null;
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1, px: 1, pb: 1 }}>
            <Typography variant="caption" color="text.secondary">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} de {total}
            </Typography>
            <IconButton size="small" onClick={() => onPage(page - 1)} disabled={page === 0}>
                <NavigateBefore fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => onPage(page + 1)} disabled={page >= pages - 1}>
                <NavigateNext fontSize="small" />
            </IconButton>
        </Box>
    );
}

const MetricCard = ({ title, value, subtitle, icon, color }: any) => (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: 2.5 }}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${color}20`, color }}>{icon}</Box>
            </Box>
            <Typography variant="body2" color="text.secondary">{title}</Typography>
            <Typography variant="h5" fontWeight="bold" sx={{ my: 0.5 }}>{value}</Typography>
            {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
        </CardContent>
    </Card>
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
        <Paper sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', minWidth: 170 }}>
            <Typography variant="caption" fontWeight="bold" display="block" mb={0.5}>
                Dia {point?.dayOfMonth}{point?.isToday ? ' — hoje' : ''}
            </Typography>
            {payload.map((entry: any) => entry.value != null && (
                <Box key={entry.dataKey} display="flex" alignItems="center" gap={0.5} mb={0.25}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: entry.color }} />
                    <Typography variant="caption">{entry.name}: {formatCurrency(entry.value)}</Typography>
                </Box>
            ))}
            {vsMetaPct != null && (
                <Typography
                    variant="caption"
                    color={vsMetaPct >= 0 ? 'success.main' : 'error.main'}
                    display="block"
                    mt={0.5}
                    fontWeight="bold"
                >
                    {vsMetaPct >= 0 ? `+${vsMetaPct.toFixed(1)}%` : `${vsMetaPct.toFixed(1)}%`} vs meta ideal
                </Typography>
            )}
        </Paper>
    );
};

// ─── Sub-aba: Projeção & Cenários ──────────────────────────────────────────
const ProjecaoCenarios: React.FC = () => {
    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [ano, setAno] = useState(new Date().getFullYear());
    const [pageRealizados, setPageRealizados] = useState(0);
    const [pageAgendados, setPageAgendados] = useState(0);
    const [pagePendentes, setPagePendentes] = useState(0);
    const [projectionData, setProjectionData] = useState<any[]>([]);
    const [projectionMeta, setProjectionMeta] = useState<any>(null);

    const { data: dashData, loading, fetchDashboard } = useFinancialDashboard();

    useEffect(() => {
        fetchDashboard(mes, ano);
        setPageRealizados(0);
        setPageAgendados(0);
        setPagePendentes(0);
        setProjectionData([]);
        setProjectionMeta(null);
    }, [mes, ano]);

    // Busca projeção diária assim que o dashboard carrega (usa cenário esperado como alvo)
    useEffect(() => {
        if (!dashData) return;
        api.get('/financial/dashboard/projection-daily', {
            params: {
                month: mes,
                year: ano,
                projecaoFinal: dashData.cenarios?.realista?.valor || 0
            }
        }).then(res => {
            if (res.data?.success) {
                setProjectionData(res.data.data);
                setProjectionMeta(res.data.meta);
            }
        }).catch(() => {}); // gráfico é complementar — falha silenciosa
    }, [dashData]);

    const realizados = dashData?.detalhes?.realizados || [];
    const agendados  = dashData?.detalhes?.agendados  || [];
    const pendentes  = dashData?.detalhes?.pendentes  || [];

    const realizadosPage = realizados.slice(pageRealizados * PAGE_SIZE, (pageRealizados + 1) * PAGE_SIZE);
    const agendadosPage  = agendados.slice(pageAgendados  * PAGE_SIZE, (pageAgendados  + 1) * PAGE_SIZE);
    const pendentesPage  = pendentes.slice(pagePendentes  * PAGE_SIZE, (pagePendentes  + 1) * PAGE_SIZE);

    if (loading) return <FinancialLoading cardCount={3} />;

    // ── Cálculos estratégicos ──
    const caixa = dashData?.resumo?.caixa || 0;
    const metaValor = dashData?.meta?.valor || 0;
    const percentualAtual = dashData?.meta?.percentualAtual || 0;
    const cenarioEsperado = dashData?.cenarios?.realista?.valor || 0;

    const hoje = new Date();
    const diasNoMes = new Date(ano, mes, 0).getDate();
    const ehMesAtual = mes === hoje.getMonth() + 1 && ano === hoje.getFullYear();
    const ehPassado = ano < hoje.getFullYear() || (ano === hoje.getFullYear() && mes < hoje.getMonth() + 1);
    const diasDecorridos = ehMesAtual ? hoje.getDate() : ehPassado ? diasNoMes : 0;
    const diasRestantes = Math.max(diasNoMes - diasDecorridos, 0);

    const ritmoAtual = diasDecorridos > 0 ? caixa / diasDecorridos : 0;
    const ritmoNecessario = diasRestantes > 0 ? Math.max(0, metaValor - caixa) / diasRestantes : 0;
    const ritmoOk = ritmoNecessario === 0 || ritmoAtual >= ritmoNecessario;

    const percentualMesDecorrido = diasNoMes > 0 ? (diasDecorridos / diasNoMes) * 100 : 0;
    const atrasadoPct = percentualMesDecorrido - percentualAtual;

    let statusPhrase = '';
    let statusColor = '#38a169';
    if (metaValor > 0 && ehMesAtual) {
        if (percentualAtual >= 100) {
            statusPhrase = `Meta atingida! Você realizou ${formatCurrency(caixa)} de ${formatCurrency(metaValor)}.`;
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
    <Box>
        {/* Filtros */}
        <Box display="flex" justifyContent="flex-end" mb={2}>
            <Stack direction="row" spacing={1} alignItems="center">
                <FormControl size="small" sx={{ minWidth: 120 }}>
                    <Select value={mes} onChange={(e) => setMes(Number(e.target.value))}>
                        {Array.from({ length: 12 }, (_, i) => (
                            <MenuItem key={i + 1} value={i + 1}>
                                {format(new Date(2024, i), 'MMMM', { locale: ptBR })}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 90 }}>
                    <Select value={ano} onChange={(e) => setAno(Number(e.target.value))}>
                        <MenuItem value={2025}>2025</MenuItem>
                        <MenuItem value={2026}>2026</MenuItem>
                    </Select>
                </FormControl>
                <IconButton size="small" onClick={() => fetchDashboard(mes, ano)}>
                    <RefreshCcw size={16} />
                </IconButton>
            </Stack>
        </Box>

        {/* Status do mês (se houver) */}
        {statusPhrase && (
            <Paper
                sx={{
                    p: 1.5,
                    mb: 2.5,
                    bgcolor: `${statusColor}08`,
                    borderLeft: `3px solid ${statusColor}`,
                }}
            >
                <Typography variant="body2" fontWeight="medium">
                    {statusPhrase}
                </Typography>
            </Paper>
        )}

        {/* Cards principais - 3 colunas */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={4}>
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ p: 2 }}>
                        <Typography variant="overline" color="text.secondary" fontWeight="bold">
                            META DO MÊS
                        </Typography>
                        <Box display="flex" justifyContent="space-between" alignItems="baseline" mt={0.5}>
                            <Typography variant="h5" fontWeight="bold">
                                {metaValor > 0 ? formatCurrency(metaValor) : '—'}
                            </Typography>
                            {metaValor > 0 && (
                                <Chip
                                    label={`${Math.min(percentualAtual, 100).toFixed(0)}%`}
                                    size="small"
                                    color={percentualAtual >= 100 ? 'success' : percentualAtual >= 60 ? 'warning' : 'error'}
                                />
                            )}
                        </Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                            Realizado: {formatCurrency(caixa)}
                            {metaValor > 0 && caixa < metaValor && ` (faltam ${formatCurrency(metaValor - caixa)})`}
                        </Typography>
                        {metaValor > 0 && (
                            <LinearProgress
                                variant="determinate"
                                value={Math.min(percentualAtual, 100)}
                                sx={{ mt: 1, height: 6, borderRadius: 3 }}
                                color={percentualAtual >= 100 ? 'success' : percentualAtual >= 60 ? 'warning' : 'error'}
                            />
                        )}
                    </CardContent>
                </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ p: 2 }}>
                        <Typography variant="overline" color="text.secondary" fontWeight="bold">
                            RITMO NECESSÁRIO
                        </Typography>
                        <Typography variant="h5" fontWeight="bold" mt={0.5}>
                            {diasRestantes > 0 ? `${formatCurrency(ritmoNecessario)}/dia` : '—'}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={0.5}>
                            <Typography variant="caption" color={ritmoOk ? 'success.main' : 'warning.main'}>
                                Atual: {formatCurrency(ritmoAtual)}/dia
                            </Typography>
                            {ritmoOk ? '✅' : '⚠️'}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                            {diasRestantes > 0
                                ? `${diasRestantes} ${diasRestantes === 1 ? 'dia restante' : 'dias restantes'}`
                                : ehPassado ? 'Mês encerrado' : 'Mês não iniciado'}
                        </Typography>
                    </CardContent>
                </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ p: 2 }}>
                        <Typography variant="overline" color="text.secondary" fontWeight="bold">
                            PROJEÇÃO ESPERADA
                        </Typography>
                        <Typography variant="h5" fontWeight="bold" color="primary.main" mt={0.5}>
                            {formatCurrency(cenarioEsperado)}
                        </Typography>
                        {metaValor > 0 && (
                            <Typography variant="caption" color={cenarioEsperado >= metaValor ? 'success.main' : 'error.main'}>
                                {cenarioEsperado >= metaValor
                                    ? `✅ +${formatCurrency(cenarioEsperado - metaValor)}`
                                    : `⚠️ ${formatCurrency(metaValor - cenarioEsperado)} abaixo`}
                            </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary" display="block">
                            Cenário esperado (taxa histórica)
                        </Typography>
                    </CardContent>
                </Card>
            </Grid>
        </Grid>

        {/* Projeção de Fechamento + Insights */}
        <Grid container  spacing={3} sx={{ mb: 3 }}>
            <Grid  item xs={12} md={8}>
                <Paper sx={{ p: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="h6" fontWeight="bold">
                            Projeção de Fechamento
                        </Typography>
                        <Typography variant="h5" fontWeight="bold" color="primary.main">
                            {formatCurrency(dashData?.cenarios?.realista?.valor)}
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={Math.min(dashData?.meta?.percentualAtual || 0, 100)}
                        sx={{ height: 8, borderRadius: 4, mb: 1 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                        {(dashData?.meta?.percentualAtual || 0).toFixed(1)}% atingido
                        {dashData?.meta?.gap > 0 && ` — faltam ${formatCurrency(dashData.meta?.gap)}`}
                    </Typography>
                </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2, height: '100%' }}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        Insights
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1.5, flexWrap: 'wrap' }}>
                        {(dashData?.insights || []).length === 0 ? (
                            <Typography variant="caption" color="text.secondary">
                                {metaValor === 0
                                    ? 'Configure uma meta para ver insights estratégicos.'
                                    : ritmoOk
                                    ? 'No ritmo da meta. Continue assim!'
                                    : 'Nenhuma ação urgente identificada.'}
                            </Typography>
                        ) : (
                            dashData.insights.map((insight: any, idx: number) => (
                                <Box
                                    key={idx}
                                    sx={{
                                        flex: 1,
                                        minWidth: 140,
                                        p: 1.5,
                                        borderRadius: 2,
                                        bgcolor: insight.tipo === 'error' ? '#ffebee' : insight.tipo === 'warning' ? '#fff3e0' : '#e8f5e9',
                                        borderLeft: `3px solid ${insight.tipo === 'error' ? '#f44336' : insight.tipo === 'warning' ? '#ff9800' : '#4caf50'}`
                                    }}
                                >
                                    <Typography variant="body2" fontWeight="bold" color="text.primary">
                                        {insight.titulo}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                        {insight.mensagem}
                                    </Typography>
                                    {insight.acao && (
                                        <Typography variant="caption" display="block" mt={0.5} color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.7rem' }}>
                                            → {insight.acao}
                                        </Typography>
                                    )}
                                </Box>
                            ))
                        )}
                    </Box>
                </Paper>
            </Grid>
        </Grid>

        {/* Cenários de Fechamento */}
        <Typography variant="h6" fontWeight="bold" gutterBottom>
            Cenários de Fechamento
        </Typography>
        <Grid container spacing={2} sx={{ mb: 4 }}>
            {[
                { label: 'PESSIMISTA', value: dashData?.cenarios?.pessimista?.valor, desc: '70% agendados + 20% pendentes', color: '#E53E3E' },
                { label: 'ESPERADO', value: dashData?.cenarios?.realista?.valor, desc: 'Taxa histórica de conversão', color: '#3182CE' },
                { label: 'OTIMISTA', value: dashData?.cenarios?.otimista?.valor, desc: '95% agendados + 70% pendentes', color: '#38A169' }
            ].map((c, i) => (
                <Grid item xs={12} sm={6} md={4} key={c.label}>
                    <Card variant="outlined" sx={{ borderLeft: `4px solid ${c.color}`, borderRadius: 2 }}>
                        <CardContent sx={{ p: 2 }}>
                            <Typography variant="overline" fontWeight="bold" color="text.secondary">
                                {c.label}
                            </Typography>
                            <Typography variant="h5" fontWeight="bold" sx={{ color: c.color }}>
                                {formatCurrency(c.value)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {c.desc}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            ))}
        </Grid>

        {/* Gráfico de evolução diária */}
        {projectionData.length > 0 && (
            <Paper sx={{ p: 2, mb: 3 }}>
                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                    <Typography variant="subtitle1" fontWeight="bold">
                        Evolução do mês
                    </Typography>
                    {projectionMeta?.isBehind && (
                        <Chip
                            label={`${(projectionMeta.gapPercent * 100).toFixed(1)}% abaixo do ideal`}
                            size="small"
                            color="warning"
                            variant="outlined"
                        />
                    )}
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                    Acumulado real · Meta ideal (linear) · Projeção de fechamento
                </Typography>
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
                        <Line
                            type="monotone"
                            dataKey="realAcumulado"
                            name="Real"
                            stroke="#3182CE"
                            strokeWidth={2.5}
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
            </Paper>
        )}

        <Divider sx={{ my: 3 }} />

        {/* Tabelas de detalhamento */}
        <Grid container spacing={3}>
            {[
                { title: 'Realizados', data: realizados, page: pageRealizados, setPage: setPageRealizados, getValor: (apt: any) => apt.valor, getPaciente: (apt: any) => apt.paciente },
                { title: 'Agendados confirmados', data: agendados, page: pageAgendados, setPage: setPageAgendados, getValor: (apt: any) => apt.sessionValue || apt.valor, getPaciente: (apt: any) => apt.paciente || apt.patientName },
                { title: 'Pendentes de confirmação', data: pendentes, page: pagePendentes, setPage: setPagePendentes, getValor: (apt: any) => apt.sessionValue || apt.valor, getPaciente: (apt: any) => apt.paciente || apt.patientName }
            ].map((tab, idx) => (
                <Grid item xs={12} md={4} key={idx}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                            {tab.title} ({tab.data.length})
                        </Typography>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Data</TableCell>
                                    <TableCell>Paciente</TableCell>
                                    <TableCell align="right">Valor</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {tab.data.slice(tab.page * PAGE_SIZE, (tab.page + 1) * PAGE_SIZE).map((apt: any) => (
                                    <TableRow key={apt._id}>
                                        <TableCell>{format(new Date(apt.data + 'T12:00'), 'dd/MM')}</TableCell>
                                        <TableCell sx={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {tab.getPaciente(apt) || '—'}
                                        </TableCell>
                                        <TableCell align="right">{formatCurrency(tab.getValor(apt) || 0)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <Pagination total={tab.data.length} page={tab.page} onPage={tab.setPage} />
                    </Paper>
                </Grid>
            ))}
        </Grid>
    </Box>
);
};

// ─── Tab principal: Análise & Projeção ────────────────────────────────────
const subTabs = [
    { label: 'Projeção & Cenários', icon: '📈' },
    { label: 'Por Especialidade',   icon: '🏷️' },
    { label: 'Ranking Profissionais', icon: '🏆' },
    { label: 'Pacientes VIP',       icon: '👑' },
];

const AnaliseProjecaoTab: React.FC = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [mountKey, setMountKey] = useState(0);

    const handleTabChange = (_: any, newTab: number) => {
        setActiveTab(newTab);
        setMountKey(prev => prev + 1);
    };

    return (
        <Box>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" fontWeight="bold">📊 Análise & Projeção</Typography>
                <Typography variant="body2" color="text.secondary" mt={0.5}>
                    Provisão, projeções e análise detalhada
                </Typography>
            </Box>

            <Tabs
                value={activeTab}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
            >
                {subTabs.map((t, i) => (
                    <Tab key={i} label={`${t.icon} ${t.label}`} sx={{ textTransform: 'none', fontWeight: 600 }} />
                ))}
            </Tabs>

            {activeTab === 0 && <ProjecaoCenarios key={`proj-${mountKey}`} />}
            {activeTab === 1 && <DashboardEspecialidades key={`esp-${mountKey}`} />}
            {activeTab === 2 && <RankingProfissionais key={`rank-${mountKey}`} />}
            {activeTab === 3 && <ListaPacientesVIP key={`vip-${mountKey}`} />}
        </Box>
    );
};

export default AnaliseProjecaoTab;
