import { useMemo, useEffect, useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    LinearProgress,
    Paper,
    Alert,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    Divider,
    Grid,
} from '@mui/material';
import { TrackChanges, TrendingUp, CalendarToday, EventAvailable, Schedule } from '@mui/icons-material';
import { usePlanning } from '../../../hooks/usePlanning';
import { useFinancialDashboard } from '../../../hooks/useFinancialDashboard';
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
            height: 10,
            borderRadius: 5,
            bgcolor: 'rgba(255,255,255,0.08)',
            '& .MuiLinearProgress-bar': { borderRadius: 5 }
        }}
    />
);

const GoalsTab: React.FC = () => {
    const [selectedMonth, setSelectedMonth] = useState<number>(moment().tz(TIMEZONE).month());
    const [selectedYear, setSelectedYear] = useState<number>(moment().tz(TIMEZONE).year());

    const startDate = moment().tz(TIMEZONE).year(selectedYear).month(selectedMonth).startOf('month').toISOString();
    const endDate = moment().tz(TIMEZONE).year(selectedYear).month(selectedMonth).endOf('month').toISOString();
    const years = Array.from({ length: 3 }, (_, i) => moment().tz(TIMEZONE).year() - i);

    const { plannings, fetchPlannings, loading: planningLoading } = usePlanning();
    const { data: dashboardData, loading: dashboardLoading, fetchDashboard } = useFinancialDashboard();

    useEffect(() => {
        fetchPlannings({});
    }, [fetchPlannings]);

    useEffect(() => {
        const mes = selectedMonth + 1; // API usa 1-12
        fetchDashboard(mes, selectedYear);
    }, [selectedMonth, selectedYear, fetchDashboard]);

    // Encontra o planning do mês selecionado (suporta metas que cruzam meses)
    const planningDoMes = plannings.find(p => {
        if (p.type !== 'monthly') return false;
        const planStart = new Date(p.period.start);
        const planEnd = new Date(p.period.end);
        const monthStart = new Date(selectedYear, selectedMonth, 1);
        const monthEnd = new Date(selectedYear, selectedMonth + 1, 0);
        return planStart <= monthEnd && planEnd >= monthStart;
    });

    // Planning semanal corrente
    const today = moment().tz(TIMEZONE).format('YYYY-MM-DD');
    const planningSemanais = plannings.filter(p => {
        if (p.type !== 'weekly') return false;
        return p.period.start <= today && p.period.end >= today;
    });

    const metaMensal = planningDoMes?.targets?.expectedRevenue || 0;
    const periodoLabel = `${monthNames[selectedMonth]}/${selectedYear}`;

    // Valores do dashboard unificado
    const resumo = dashboardData?.resumo;
    const producao = resumo?.producao || 0;
    const recebido = resumo?.caixa || 0;
    const agendadoConfirmado = resumo?.agendadoConfirmado || 0;
    const agendadoPendente = resumo?.pendenteConfirmacao || 0;
    const creditoPacotes = resumo?.creditoPacotes || 0;
    const convenioAgendado = resumo?.convenioAgendado || 0;
    
    // Cenários da API
    const cenarioRealista = dashboardData?.cenarios?.realista?.valor || 0;

    const metrics = useMemo(() => {
        
        // Provisionamento completo = realizado + agendados confirmados + crédito pacotes + convênio agendado
        const totalAgendadoConfirmado = agendadoConfirmado + creditoPacotes + convenioAgendado;
        const totalComissionado = producao + totalAgendadoConfirmado;

        // Usa projeção realista da API ou calcula localmente
        const projecaoRealista = cenarioRealista > 0 ? cenarioRealista : 
            producao + (agendadoConfirmado * 0.85) + (creditoPacotes * 0.90) + 
            (convenioAgendado * 0.85) + (agendadoPendente * 0.40);

        if (metaMensal === 0) {
            return {
                producao,
                recebido,
                agendadoConfirmado,
                agendadoPendente,
                creditoPacotes,
                convenioAgendado,
                totalAgendadoConfirmado,
                projecaoRealista,
                percentualProducao: 0,
                percentualAgendado: 0,
                percentualRecebido: 0,
                percentualProjecao: 0,
                totalComissionado,
            };
        }

        return {
            producao,
            recebido,
            agendadoConfirmado,
            agendadoPendente,
            creditoPacotes,
            convenioAgendado,
            totalAgendadoConfirmado,
            projecaoRealista,
            percentualProducao: Math.min((producao / metaMensal) * 100, 100),
            percentualAgendado: Math.min((totalComissionado / metaMensal) * 100, 100),
            percentualRecebido: Math.min((recebido / metaMensal) * 100, 100),
            percentualProjecao: Math.min((projecaoRealista / metaMensal) * 100, 100),
            totalComissionado,
        };
    }, [producao, recebido, metaMensal, agendadoConfirmado, agendadoPendente, creditoPacotes, convenioAgendado, cenarioRealista]);

    if (dashboardLoading || planningLoading) return <FinancialLoading />;

    return (
        <Box>
            <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <Typography variant="h5" fontWeight="bold">
                    🎯 Metas & Provisão — {periodoLabel}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel>Mês</InputLabel>
                        <Select value={selectedMonth} label="Mês" onChange={(e) => setSelectedMonth(Number(e.target.value))}>
                            {monthNames.map((name, idx) => (
                                <MenuItem key={idx} value={idx}>{name}</MenuItem>
                            ))}
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

            {/* Legenda explicativa dos cards */}
            <Paper variant="outlined" sx={{ mb: 3, p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)' }}>
                <Typography variant="body2" fontWeight="bold" gutterBottom>Como ler este painel:</Typography>
                <Grid container spacing={1}>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="caption" display="block" color="text.secondary">
                            📈 <strong>Produção Clínica</strong> — sessões já realizadas no mês, independente de pagamento.
                        </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="caption" display="block" color="text.secondary">
                            📅 <strong>Provisionamento</strong> — produção + agendamentos confirmados (avulsos + crédito pacotes + convênios).
                        </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="caption" display="block" color="text.secondary">
                            💰 <strong>Recebido (Caixa)</strong> — dinheiro efetivamente recebido (pagamentos confirmados).
                        </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="caption" display="block" color="text.secondary">
                            🔮 <strong>Projeção de Fechamento</strong> — estimativa: realizado + 85% avulsos + 90% pacotes pagos + 85% convênios + 40% pendentes.
                        </Typography>
                    </Grid>
                </Grid>
            </Paper>

            {metaMensal === 0 ? (
                <Alert severity="info" sx={{ mb: 3 }}>
                    Nenhuma meta cadastrada para <strong>{periodoLabel}</strong>.
                    Cadastre em <strong>Planejamento Anual</strong>.
                </Alert>
            ) : (
                <Typography variant="body1" color="text.secondary" mb={3}>
                    Meta do mês ({periodoLabel}):
                    {' '}{formatCurrency(metaMensal)}
                </Typography>
            )}

            {/* Produção */}
            <Card sx={{ mb: 2 }}>
                <CardContent>
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                        <TrendingUp color="success" />
                        <Box flex={1}>
                            <Typography variant="h6">Produção Clínica</Typography>
                            <Typography variant="body2" color="text.secondary">
                                {formatCurrency(metrics.producao)}
                                {metaMensal > 0 && ` de ${formatCurrency(metaMensal)}`}
                            </Typography>
                        </Box>
                        <Typography variant="h5" fontWeight="bold">
                            {metaMensal > 0 ? `${metrics.percentualProducao.toFixed(1)}%` : '—'}
                        </Typography>
                    </Box>
                    <ProgressBar value={metrics.percentualProducao} color="success" />
                </CardContent>
            </Card>

            {/* Provisão: Produção + Agendados Confirmados */}
            <Card sx={{ mb: 2 }}>
                <CardContent>
                    <Box display="flex" alignItems="center" gap={2} mb={1}>
                        <EventAvailable color="primary" />
                        <Box flex={1}>
                            <Typography variant="h6">Provisionamento do Mês</Typography>
                            <Typography variant="body2" color="text.secondary">
                                {formatCurrency(metrics.totalComissionado)}
                                {metaMensal > 0 && ` de ${formatCurrency(metaMensal)}`}
                                <Chip label="Realizado + Confirmado" size="small" sx={{ ml: 1, height: 18, fontSize: '0.65rem' }} />
                            </Typography>
                        </Box>
                        <Typography variant="h5" fontWeight="bold" color="primary.main">
                            {metaMensal > 0 ? `${metrics.percentualAgendado.toFixed(1)}%` : '—'}
                        </Typography>
                    </Box>
                    <ProgressBar value={metrics.percentualAgendado} color="primary" />
                    {/* Detalhamento */}
                    <Box sx={{ mt: 1.5, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Typography variant="caption" color="text.secondary">
                            ✅ Realizado: <strong>{formatCurrency(metrics.producao)}</strong>
                        </Typography>
                        {agendadoConfirmado > 0 && (
                            <Typography variant="caption" color="text.secondary">
                                📅 Avulso confirmado: <strong>{formatCurrency(agendadoConfirmado)}</strong>
                            </Typography>
                        )}
                        {creditoPacotes > 0 && (
                            <Typography variant="caption" color="text.secondary">
                                💳 Crédito pacotes: <strong>{formatCurrency(creditoPacotes)}</strong>
                            </Typography>
                        )}
                        {convenioAgendado > 0 && (
                            <Typography variant="caption" color="text.secondary">
                                🏥 Convênio agendado: <strong>{formatCurrency(convenioAgendado)}</strong>
                            </Typography>
                        )}
                        {agendadoPendente > 0 && (
                            <Typography variant="caption" color="text.secondary">
                                ⏳ Pendente confirmação: <strong>{formatCurrency(agendadoPendente)}</strong>
                            </Typography>
                        )}
                    </Box>
                </CardContent>
            </Card>

            {/* Recebido */}
            <Card sx={{ mb: 2 }}>
                <CardContent>
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                        <TrackChanges color="info" />
                        <Box flex={1}>
                            <Typography variant="h6">Recebido (Caixa)</Typography>
                            <Typography variant="body2" color="text.secondary">
                                {formatCurrency(metrics.recebido)}
                                {metaMensal > 0 && ` de ${formatCurrency(metaMensal)}`}
                            </Typography>
                        </Box>
                        <Typography variant="h5" fontWeight="bold">
                            {metaMensal > 0 ? `${metrics.percentualRecebido.toFixed(1)}%` : '—'}
                        </Typography>
                    </Box>
                    <ProgressBar value={metrics.percentualRecebido} color="info" />
                </CardContent>
            </Card>

            {/* Projeção de Fechamento */}
            {metaMensal > 0 && (
                <Card sx={{ mb: 2, borderLeft: '4px solid #8B5CF6' }}>
                    <CardContent>
                        <Box display="flex" alignItems="center" gap={2} mb={1}>
                            <Schedule sx={{ color: '#8B5CF6' }} />
                            <Box flex={1}>
                                <Typography variant="h6">🔮 Projeção de Fechamento</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Estimativa do mês completo com base nos agendamentos atuais
                                </Typography>
                            </Box>
                            <Box textAlign="right">
                                <Typography variant="h5" fontWeight="bold" sx={{ color: '#8B5CF6' }}>
                                    {formatCurrency(metrics.projecaoRealista)}
                                </Typography>
                                <Typography variant="caption" color={metrics.projecaoRealista >= metaMensal ? 'success.main' : 'warning.main'}>
                                    {metrics.projecaoRealista >= metaMensal
                                        ? '✅ Meta atingida'
                                        : `Falta ${formatCurrency(metaMensal - metrics.projecaoRealista)}`}
                                </Typography>
                            </Box>
                        </Box>
                        <ProgressBar value={metrics.percentualProjecao} />
                        {/* Fórmula transparente */}
                        <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'rgba(139,92,246,0.07)', borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                <strong>Como é calculada:</strong> Realizado + 85% avulsos + 90% pacotes pagos + 85% convênios + 40% pendentes
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                <Typography variant="caption" color="text.secondary">
                                    ✅ Realizado: <strong>{formatCurrency(metrics.producao)}</strong>
                                </Typography>
                                {agendadoConfirmado > 0 && (
                                    <Typography variant="caption" color="text.secondary">
                                        📅 +85% avulsos = <strong>{formatCurrency(agendadoConfirmado * 0.85)}</strong>
                                    </Typography>
                                )}
                                {creditoPacotes > 0 && (
                                    <Typography variant="caption" color="text.secondary">
                                        💳 +90% pacotes pagos = <strong>{formatCurrency(creditoPacotes * 0.90)}</strong>
                                    </Typography>
                                )}
                                {convenioAgendado > 0 && (
                                    <Typography variant="caption" color="text.secondary">
                                        🏥 +85% convênios = <strong>{formatCurrency(convenioAgendado * 0.85)}</strong>
                                    </Typography>
                                )}
                                {agendadoPendente > 0 && (
                                    <Typography variant="caption" color="text.secondary">
                                        ⏳ +40% pendentes = <strong>{formatCurrency(agendadoPendente * 0.40)}</strong>
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
            )}

            <Divider sx={{ my: 3 }} />

            {/* Metas Semanais ativas */}
            {planningSemanais.length > 0 && (
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CalendarToday fontSize="small" /> Metas Semanais (semana atual)
                    </Typography>
                    <Grid container spacing={2}>
                        {planningSemanais.map((pw: any) => {
                            const pct = pw.progress?.revenuePercentage || 0;
                            return (
                                <Grid item xs={12} sm={6} key={pw._id}>
                                    <Card variant="outlined">
                                        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                                            <Box display="flex" justifyContent="space-between" mb={0.5}>
                                                <Typography variant="body2" fontWeight="bold">Meta Semanal</Typography>
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
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="body2">Meta: <strong>{formatCurrency(pw.targets?.expectedRevenue || 0)}</strong></Typography>
                                                <Typography variant="body2">Real: <strong>{formatCurrency(pw.actual?.actualRevenue || 0)}</strong></Typography>
                                            </Box>
                                            <ProgressBar value={pct} color={pct >= 100 ? 'success' : 'primary'} />
                                            <Typography variant="caption" color="text.secondary">{pct.toFixed(0)}% da meta semanal</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            );
                        })}
                    </Grid>
                </Box>
            )}

            <Paper sx={{ mt: 2, p: 2 }}>
                <Typography variant="body2" color="text.secondary">
                    💡 <strong>Produção</strong> = sessões realizadas | <strong>Provisionamento</strong> = realizado + avulsos + crédito pacotes + convênios | <strong>Recebido</strong> = dinheiro na conta
                </Typography>
            </Paper>
        </Box>
    );
};

export default GoalsTab;
