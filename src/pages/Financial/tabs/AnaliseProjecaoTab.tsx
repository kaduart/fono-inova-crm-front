import React, { useEffect, useState } from 'react';
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
import { useProvisionamento } from '../../../hooks/useProvisionamento';
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

// ─── Sub-aba: Projeção & Cenários ──────────────────────────────────────────
const ProjecaoCenarios: React.FC = () => {
    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [ano, setAno] = useState(new Date().getFullYear());
    const [pageRealizados, setPageRealizados] = useState(0);
    const [pageAgendados, setPageAgendados] = useState(0);
    const [pagePendentes, setPagePendentes] = useState(0);

    const { projecaoMes, fetchProjecaoMes, loading } = useProvisionamento();

    useEffect(() => {
        fetchProjecaoMes(mes, ano);
        setPageRealizados(0);
        setPageAgendados(0);
        setPagePendentes(0);
    }, [mes, ano]);

    const realizados = projecaoMes?.detalhes?.realizados || [];
    const agendados  = projecaoMes?.detalhes?.agendados  || [];
    const pendentes  = projecaoMes?.detalhes?.pendentes  || [];

    const realizadosPage = realizados.slice(pageRealizados * PAGE_SIZE, (pageRealizados + 1) * PAGE_SIZE);
    const agendadosPage  = agendados.slice(pageAgendados  * PAGE_SIZE, (pageAgendados  + 1) * PAGE_SIZE);
    const pendentesPage  = pendentes.slice(pagePendentes  * PAGE_SIZE, (pagePendentes  + 1) * PAGE_SIZE);

    if (loading) return <FinancialLoading cardCount={3} />;

    return (
        <Box>
            {/* Filtros */}
            <Box display="flex" justifyContent="flex-end" mb={3}>
                <Stack direction="row" spacing={2} alignItems="center">
                    <FormControl size="small" sx={{ minWidth: 130 }}>
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
                    <IconButton size="small" onClick={() => fetchProjecaoMes(mes, ano)}>
                        <RefreshCcw size={16} />
                    </IconButton>
                </Stack>
            </Box>

            {/* Métricas principais */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={4}>
                    <MetricCard
                        title="Recebido no mês (caixa)"
                        value={formatCurrency(projecaoMes?.resumo?.jaRecebido)}
                        icon={<TrendingUp size={18} />}
                        color="#2d3748"
                    />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <MetricCard
                        title="Agendado confirmado"
                        value={formatCurrency(projecaoMes?.resumo?.agendadoConfirmado)}
                        icon={<Calendar size={18} />}
                        color="#3182ce"
                    />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <MetricCard
                        title="Crédito em pacotes"
                        value={formatCurrency(projecaoMes?.resumo?.creditoPacotes)}
                        subtitle="Sessões pagas não utilizadas"
                        icon={<Target size={18} />}
                        color="#38a169"
                    />
                </Grid>
            </Grid>

            {/* Projeção de Fechamento */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} lg={8}>
                    <Paper sx={{ p: 3 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Box>
                                <Typography variant="h6" fontWeight="bold">Projeção de Fechamento</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Expectativa realista para {format(new Date(ano, mes - 1), 'MMMM/yyyy', { locale: ptBR })}
                                </Typography>
                            </Box>
                            <Box textAlign="right">
                                <Typography variant="h4" fontWeight="bold" color="primary.main">
                                    {formatCurrency(projecaoMes?.cenarios?.realista?.valor)}
                                </Typography>
                                {projecaoMes?.metas?.sugerida > 0 && (
                                    <Typography variant="caption" color="text.secondary">
                                        Meta: {formatCurrency(projecaoMes.metas.sugerida)}
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                        <LinearProgress
                            variant="determinate"
                            value={Math.min(projecaoMes?.metas?.percentualAtual || 0, 100)}
                            sx={{ height: 10, borderRadius: 5, bgcolor: 'rgba(255,255,255,0.08)', '& .MuiLinearProgress-bar': { borderRadius: 5 } }}
                        />
                        <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
                            {(projecaoMes?.metas?.percentualAtual || 0).toFixed(1)}% atingido
                            {projecaoMes?.metas?.gapParaMeta > 0 && ` — faltam ${formatCurrency(projecaoMes.metas.gapParaMeta)}`}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} lg={4}>
                    <Paper sx={{ p: 2, height: '100%' }}>
                        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Insights</Typography>
                        {(projecaoMes?.insights || []).length === 0 ? (
                            <Typography variant="caption" color="text.secondary">Tudo em dia! Nenhuma ação urgente necessária.</Typography>
                        ) : projecaoMes.insights.map((insight: any, idx: number) => (
                            <Box key={idx} sx={{ p: 1.5, mb: 1, borderRadius: 2, bgcolor: insight.tipo === 'error' ? 'error.main' : insight.tipo === 'warning' ? 'warning.main' : 'info.main', opacity: 0.85 }}>
                                <Typography variant="body2" fontWeight="bold" color="white">{insight.titulo}</Typography>
                                <Typography variant="caption" color="white">{insight.mensagem}</Typography>
                            </Box>
                        ))}
                    </Paper>
                </Grid>
            </Grid>

            {/* Cenários */}
            <Typography variant="h6" fontWeight="bold" gutterBottom>Cenários de Fechamento</Typography>
            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={12} md={4}>
                    <Card sx={{ borderLeft: '4px solid #E53E3E' }}>
                        <CardContent>
                            <Typography color="error.main" fontWeight="bold" variant="overline">PESSIMISTA</Typography>
                            <Typography variant="h4" fontWeight="bold">{formatCurrency(projecaoMes?.cenarios?.pessimista?.valor)}</Typography>
                            <Typography variant="caption" color="text.secondary">70% dos agendados + 20% dos pendentes</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card sx={{ borderLeft: '4px solid #3182CE', bgcolor: 'primary.main', color: 'white' }}>
                        <CardContent>
                            <Typography fontWeight="bold" variant="overline" sx={{ color: 'rgba(255,255,255,0.8)' }}>ESPERADO ⭐</Typography>
                            <Typography variant="h4" fontWeight="bold">{formatCurrency(projecaoMes?.cenarios?.realista?.valor)}</Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>Taxa histórica de conversão</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card sx={{ borderLeft: '4px solid #38A169' }}>
                        <CardContent>
                            <Typography color="success.main" fontWeight="bold" variant="overline">OTIMISTA</Typography>
                            <Typography variant="h4" fontWeight="bold">{formatCurrency(projecaoMes?.cenarios?.otimista?.valor)}</Typography>
                            <Typography variant="caption" color="text.secondary">95% dos agendados + 70% dos pendentes</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Tabelas de detalhamento */}
            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                            Realizados ({realizados.length})
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
                                {realizadosPage.map((apt: any) => (
                                    <TableRow key={apt._id}>
                                        <TableCell>{format(new Date(apt.data + 'T12:00'), 'dd/MM')}</TableCell>
                                        <TableCell sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{apt.paciente}</TableCell>
                                        <TableCell align="right">{formatCurrency(apt.valor)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <Pagination total={realizados.length} page={pageRealizados} onPage={setPageRealizados} />
                    </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                            Agendados confirmados ({agendados.length})
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
                                {agendadosPage.map((apt: any) => (
                                    <TableRow key={apt._id}>
                                        <TableCell>{format(new Date(apt.data + 'T12:00'), 'dd/MM')}</TableCell>
                                        <TableCell sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{apt.paciente || apt.patientName || '—'}</TableCell>
                                        <TableCell align="right">{formatCurrency(apt.sessionValue || apt.valor || 0)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <Pagination total={agendados.length} page={pageAgendados} onPage={setPageAgendados} />
                    </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                            Pendentes de confirmação ({pendentes.length})
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
                                {pendentesPage.map((apt: any) => (
                                    <TableRow key={apt._id}>
                                        <TableCell>{format(new Date(apt.data + 'T12:00'), 'dd/MM')}</TableCell>
                                        <TableCell sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{apt.paciente || apt.patientName || '—'}</TableCell>
                                        <TableCell align="right">{formatCurrency(apt.sessionValue || apt.valor || 0)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <Pagination total={pendentes.length} page={pagePendentes} onPage={setPagePendentes} />
                    </Paper>
                </Grid>
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
