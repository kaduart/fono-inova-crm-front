/**
 * 🎯 GoalsTab - Visão de Metas (Simplificado)
 * 
 * Apenas metas semanais e mensais.
 * Para dashboard completo, ver aba "Dashboard".
 */

import { useMemo, useEffect, useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Paper,
    Chip,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    Avatar,
    LinearProgress,
} from '@mui/material';
import {
    TrendingUp,
    CalendarToday,
    Schedule,
} from '@mui/icons-material';
import { usePlanning } from '../../../hooks/usePlanning';
import { useFinancialDashboard } from '../../../hooks/useFinancialDashboard';
import { useDashboardSSE } from '../../../hooks/useDashboardSSE';
import { FinancialLoading } from '../components/FinancialLoading';
import moment from 'moment-timezone';

const TIMEZONE = 'America/Sao_Paulo';

const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const formatCurrency = (val: number) =>
    `R$ ${(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const ProgressBar = ({ value, color }: { value: number; color?: any }) => (
    <LinearProgress
        variant="determinate"
        value={Math.min(value, 100)}
        color={color}
        sx={{
            height: 8,
            borderRadius: 4,
            bgcolor: 'grey.100',
            '& .MuiLinearProgress-bar': { borderRadius: 4 }
        }}
    />
);

const GoalsTab: React.FC = () => {
    const [selectedMonth, setSelectedMonth] = useState<number>(moment().tz(TIMEZONE).month());
    const [selectedYear, setSelectedYear] = useState<number>(moment().tz(TIMEZONE).year());

    const years = Array.from({ length: 3 }, (_, i) => moment().tz(TIMEZONE).year() - i);

    const { plannings, fetchPlannings, loading: planningLoading } = usePlanning();
    const { data: dashboardData, loading: dashboardLoading, fetchDashboard } = useFinancialDashboard();

    // 🔄 SSE - Atualiza quando pipeline muda
    useDashboardSSE({
        onInsurancePipelineChanged: () => {
            fetchDashboard(selectedMonth + 1, selectedYear);
        },
    });

    useEffect(() => {
        fetchPlannings({});
    }, [fetchPlannings]);

    useEffect(() => {
        fetchDashboard(selectedMonth + 1, selectedYear);
    }, [selectedMonth, selectedYear, fetchDashboard]);

    // 🎯 DADOS SIMPLIFICADOS
    const resumo = dashboardData?.resumo;
    const producao = resumo?.producao || 0;
    const caixa = resumo?.caixa || 0;  // 💰 CAIXA = Recebido no mês
    
    // Meta
    const planningDoMes = plannings.find(p => {
        if (p.type !== 'monthly') return false;
        const planStart = new Date(p.period.start);
        const planEnd = new Date(p.period.end);
        const monthStart = new Date(selectedYear, selectedMonth, 1);
        const monthEnd = new Date(selectedYear, selectedMonth + 1, 0);
        return planStart <= monthEnd && planEnd >= monthStart;
    });
    
    const metaMensal = planningDoMes?.targets?.expectedRevenue || 0;
    // ✅ CORREÇÃO: Usar CAIXA (recebido) como "Real" - SEM fallback para produção
    const realizado = caixa;  // Se caixa for 0, mostra 0 (não confunde com produção)
    const pctMensal = metaMensal > 0 ? Math.min((realizado / metaMensal) * 100, 100) : 0;
    
    // Planning semanais
    const today = moment().tz(TIMEZONE).format('YYYY-MM-DD');
    const planningSemanais = plannings.filter(p => {
        if (p.type !== 'weekly') return false;
        return p.period.start <= today && p.period.end >= today;
    });

    const loading = planningLoading || dashboardLoading;

    if (loading) return <FinancialLoading />;

    return (
        <Box sx={{ p: { xs: 1, md: 2 } }}>
            {/* Header */}
            <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2, border: '1px solid #E2E8F0' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: '#8B5CF615', width: 48, height: 48 }}>
                            <TrendingUp sx={{ color: '#8B5CF6' }} />
                        </Avatar>
                        <Box>
                            <Typography variant="h6" fontWeight="bold">Metas & Provisão</Typography>
                            <Typography variant="body2" sx={{ color: 'grey.600' }}>
                                Acompanhamento de metas semanais e mensais
                            </Typography>
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <FormControl size="small" sx={{ minWidth: 140 }}>
                            <InputLabel>Mês</InputLabel>
                            <Select value={selectedMonth} label="Mês" onChange={(e) => setSelectedMonth(Number(e.target.value))}>
                                {monthNames.map((name, idx) => <MenuItem key={idx} value={idx}>{name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 100 }}>
                            <InputLabel>Ano</InputLabel>
                            <Select value={selectedYear} label="Ano" onChange={(e) => setSelectedYear(Number(e.target.value))}>
                                {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Box>
                </Box>
            </Paper>

            {/* Meta Mensal em destaque */}
            {planningDoMes && (
                <Card elevation={0} sx={{ border: '2px solid #8B5CF640', borderRadius: 3, mb: 3, bgcolor: '#8B5CF608' }}>
                    <CardContent sx={{ py: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Schedule sx={{ color: '#8B5CF6' }} />
                                <Typography variant="h6" fontWeight="bold" color="#8B5CF6">Meta Mensal</Typography>
                            </Box>
                            <Chip
                                size="small"
                                label={pctMensal >= 100 ? 'Atingido' : pctMensal >= 80 ? 'No caminho' : 'Em risco'}
                                color={pctMensal >= 100 ? 'success' : pctMensal >= 80 ? 'primary' : 'warning'}
                            />
                        </Box>
                        <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                            {moment(planningDoMes.period.start).format('DD/MM')} – {moment(planningDoMes.period.end).format('DD/MM/YYYY')}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body1">
                                Meta: <strong>{formatCurrency(metaMensal)}</strong>
                            </Typography>
                            <Typography variant="body1">
                                Real: <strong>{formatCurrency(realizado)}</strong>
                            </Typography>
                        </Box>
                        <ProgressBar value={pctMensal} color={pctMensal >= 100 ? 'success' : 'primary'} />
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            {pctMensal.toFixed(0)}% da meta mensal
                        </Typography>
                        {pctMensal < 100 && metaMensal > 0 && (
                            <Typography variant="caption" color="warning.main" sx={{ mt: 0.5, display: 'block', fontWeight: 600 }}>
                                Falta {formatCurrency(metaMensal - realizado)} para atingir a meta
                            </Typography>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Metas Semanais */}
            {planningSemanais.length > 0 && (
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CalendarToday fontSize="small" sx={{ color: '#F59E0B' }} />
                        Metas Semanais
                    </Typography>
                    <Grid container spacing={2}>
                        {planningSemanais.map((pw: any) => {
                            const pct = pw.progress?.revenuePercentage || 0;
                            return (
                                <Grid item xs={12} sm={6} key={pw._id}>
                                    <Card variant="outlined" sx={{ borderRadius: 2, borderColor: '#F59E0B80', bgcolor: '#F59E0B05' }}>
                                        <CardContent sx={{ py: 2 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                                <Typography variant="body2" fontWeight="600" color="#F59E0B">
                                                    <CalendarToday fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                                                    Meta Semanal
                                                </Typography>
                                                <Chip
                                                    size="small"
                                                    label={pw.progress?.overallStatus === 'achieved' ? 'Atingido' : pct >= 80 ? 'No caminho' : 'Em risco'}
                                                    color={pw.progress?.overallStatus === 'achieved' ? 'success' : pct >= 80 ? 'primary' : 'warning'}
                                                    sx={{ height: 20, fontSize: '0.65rem' }}
                                                />
                                            </Box>
                                            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                                                {moment(pw.period.start).format('DD/MM')} – {moment(pw.period.end).format('DD/MM/YYYY')}
                                            </Typography>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                <Typography variant="body2">
                                                    Meta: <strong>{formatCurrency(pw.targets?.expectedRevenue || 0)}</strong>
                                                </Typography>
                                                <Typography variant="body2">
                                                    Real: <strong>{formatCurrency(pw.actual?.actualRevenue || 0)}</strong>
                                                </Typography>
                                            </Box>
                                            <ProgressBar value={pct} color={pct >= 100 ? 'success' : 'primary'} />
                                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                                {pct.toFixed(0)}% da meta semanal
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            );
                        })}
                    </Grid>
                </Box>
            )}

            {/* Sem metas cadastradas */}
            {!planningDoMes && planningSemanais.length === 0 && (
                <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        Nenhuma meta cadastrada
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Cadastre metas em <strong>Planejamento Anual</strong> para acompanhar o desempenho.
                    </Typography>
                </Paper>
            )}

            {/* Dica */}
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block', textAlign: 'center' }}>
                💡 Para dashboard completo com produção, caixa e projeções, acesse a aba <strong>Dashboard</strong>
            </Typography>
        </Box>
    );
};

export default GoalsTab;
