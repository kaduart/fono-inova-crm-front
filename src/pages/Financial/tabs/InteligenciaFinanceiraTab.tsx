import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import React, { useEffect, useState } from 'react';
import {
    Box, Card, CardContent, Typography, Grid, LinearProgress,
    Paper, Chip, Button, FormControl, Select, MenuItem,
    Stack, IconButton, Table, TableBody, TableCell, TableHead, TableRow, Divider
} from '@mui/material';
import { FinancialLoading } from '../components/FinancialLoading';
import { CheckCircle, NavigateBefore, NavigateNext } from '@mui/icons-material';
import { TrendingUp, Target, Zap, Calendar, ChevronRight, RefreshCcw, AlertCircle } from 'lucide-react';
import { useProvisionamento } from '../../../hooks/useProvisionamento';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

const PAGE_SIZE = 10;

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

const MetricCard = ({ title, value, subtitle, icon, color, trend }: any) => (
    <Card variant="outlined" sx={{ width: '100%', borderRadius: 3, border: '1px solid #edf2f7' }}>
        <CardContent sx={{ p: 2.5 }}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${color}15`, color: color }}>{icon}</Box>
                {trend && <Chip label={trend} size="small" sx={{ height: 20, fontSize: '0.7rem', bgcolor: '#e6fffa', color: '#285e61' }} />}
            </Box>
            <Typography variant="body2" color="text.secondary">{title}</Typography>
            <Typography variant="h5" fontWeight="bold" sx={{ my: 0.5 }}>{value}</Typography>
            {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
        </CardContent>
    </Card>
);

const InteligenciaFinanceiraTab = () => {
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

    const metaAlcancada = (projecaoMes?.metas?.percentualAtual || 0) >= 100;

    const realizados = projecaoMes?.detalhes?.realizados || [];
    const agendados = projecaoMes?.detalhes?.agendados || [];
    const pendentes = projecaoMes?.detalhes?.pendentes || [];

    const realizadosPage = realizados.slice(pageRealizados * PAGE_SIZE, (pageRealizados + 1) * PAGE_SIZE);
    const agendadosPage = agendados.slice(pageAgendados * PAGE_SIZE, (pageAgendados + 1) * PAGE_SIZE);
    const pendentesPage = pendentes.slice(pagePendentes * PAGE_SIZE, (pagePendentes + 1) * PAGE_SIZE);

    if (loading) return <LoadingSpinner centered size="large" color="border-emerald-600" className="min-h-[400px]" />;

    return (
        <Box sx={{ width: '100%' }}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-end" mb={4} flexWrap="wrap" gap={2}>
                <Box>
                    <Typography variant="h4" fontWeight="bold">🧠 Inteligência Financeira</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                        Provisão e projeções de {format(new Date(ano, mes - 1), 'MMMM/yyyy', { locale: ptBR })}
                    </Typography>
                </Box>
                <Stack direction="row" spacing={2}>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <Select value={mes} onChange={(e) => setMes(Number(e.target.value))}>
                            {Array.from({ length: 12 }, (_, i) => (
                                <MenuItem key={i + 1} value={i + 1}>
                                    {format(new Date(2024, i), 'MMMM', { locale: ptBR })}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                        <Select value={ano} onChange={(e) => setAno(Number(e.target.value))}>
                            <MenuItem value={2025}>2025</MenuItem>
                            <MenuItem value={2026}>2026</MenuItem>
                        </Select>
                    </FormControl>
                    <IconButton onClick={() => fetchProjecaoMes(mes, ano)}>
                        <RefreshCcw size={18} />
                    </IconButton>
                </Stack>
            </Box>

            <Grid container spacing={3}>
                <Grid size={{ xs: 12, lg: 8 }}>
                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <MetricCard title="Recebido" value={formatCurrency(projecaoMes?.resumo?.jaRecebido)} icon={<TrendingUp size={20} />} color="#2d3748" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <MetricCard title="Agendado" value={formatCurrency(projecaoMes?.resumo?.agendadoConfirmado)} icon={<Calendar size={20} />} color="#3182ce" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <MetricCard title="Crédito Pacotes" value={formatCurrency(projecaoMes?.resumo?.creditoPacotes)} icon={<Target size={20} />} color="#38a169" />
                        </Grid>
                    </Grid>

                    <Paper sx={{ p: 4, mt: 3 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                            <Box>
                                <Typography variant="h6">Projeção de Fechamento</Typography>
                            </Box>
                            <Box textAlign="right">
                                <Typography variant="h4" fontWeight="bold" color="primary.main">
                                    {formatCurrency(projecaoMes?.cenarios?.realista?.valor)}
                                </Typography>
                            </Box>
                        </Box>
                        <LinearProgress variant="determinate" value={Math.min(projecaoMes?.metas?.percentualAtual || 0, 100)} sx={{ height: 12, borderRadius: 6 }} />
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, lg: 4 }}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>Insights</Typography>
                        {projecaoMes?.insights?.map((insight: any, idx: number) => (
                            <Box key={idx} sx={{ p: 2, mb: 1, bgcolor: insight.tipo === 'error' ? '#fff5f5' : '#ebf8ff', borderRadius: 2 }}>
                                <Typography variant="body2" fontWeight="bold">{insight.titulo}</Typography>
                                <Typography variant="caption">{insight.mensagem}</Typography>
                            </Box>
                        ))}
                    </Paper>
                </Grid>
            </Grid>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h6" gutterBottom>Cenários</Typography>
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card><CardContent>
                        <Typography color="error" fontWeight="bold">PESSIMISTA</Typography>
                        <Typography variant="h4">{formatCurrency(projecaoMes?.cenarios?.pessimista?.valor)}</Typography>
                    </CardContent></Card>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card sx={{ bgcolor: 'primary.main', color: 'white' }}><CardContent>
                        <Typography fontWeight="bold">ESPERADO ⭐</Typography>
                        <Typography variant="h4">{formatCurrency(projecaoMes?.cenarios?.realista?.valor)}</Typography>
                    </CardContent></Card>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card><CardContent>
                        <Typography color="success" fontWeight="bold">OTIMISTA</Typography>
                        <Typography variant="h4">{formatCurrency(projecaoMes?.cenarios?.otimista?.valor)}</Typography>
                    </CardContent></Card>
                </Grid>
            </Grid>

            <Paper sx={{ p: 3, mb: 4 }}>
                <Typography variant="h6" gutterBottom>Realizados ({realizados.length})</Typography>
                <Table size="small">
                    <TableHead>
                        <TableRow><TableCell>Data</TableCell><TableCell>Paciente</TableCell><TableCell>Tipo</TableCell><TableCell align="right">Valor</TableCell></TableRow>
                    </TableHead>
                    <TableBody>
                        {realizadosPage.map((apt: any) => (
                            <TableRow key={apt._id}>
                                <TableCell>{format(new Date(apt.data), 'dd/MM')}</TableCell>
                                <TableCell>{apt.paciente}</TableCell>
                                <TableCell>{apt.tipo}</TableCell>
                                <TableCell align="right">{formatCurrency(apt.valor)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <Pagination total={realizados.length} page={pageRealizados} onPage={setPageRealizados} />
            </Paper>
        </Box>
    );
};

export default InteligenciaFinanceiraTab;
