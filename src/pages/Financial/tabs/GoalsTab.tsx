import { useMemo, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    LinearProgress,
    Paper,
    Alert,
} from '@mui/material';
import { TrackChanges, TrendingUp } from '@mui/icons-material';
import { useFinancialMetrics } from '../../../hooks/useFinancialMetrics';
import { usePlanning } from '../../../hooks/usePlanning';
import { FinancialLoading } from '../components/FinancialLoading';
import moment from 'moment-timezone';

const TIMEZONE = 'America/Sao_Paulo';

const GoalsTab: React.FC = () => {
    const startDate = moment().tz(TIMEZONE).startOf('month').toISOString();
    const endDate = moment().tz(TIMEZONE).endOf('month').toISOString();

    const { data, isLoading } = useFinancialMetrics(startDate, endDate);
    const { plannings, fetchPlannings, loading: planningLoading } = usePlanning();

    useEffect(() => {
        fetchPlannings({});
    }, [fetchPlannings]);

    // Encontra o planning do mês atual
    const currentMonth = moment().tz(TIMEZONE).month() + 1;
    const currentYear = moment().tz(TIMEZONE).year();
    const planningDoMes = plannings.find(p => {
        if (p.type !== 'monthly') return false;
        const planStart = new Date(p.period.start);
        return (
            planStart.getMonth() + 1 === currentMonth &&
            planStart.getFullYear() === currentYear
        );
    });
    const metaMensal = planningDoMes?.targets?.expectedRevenue || 0;

    const metrics = useMemo(() => {
        if (!data || metaMensal === 0) {
            return {
                producao: data?.production?.total || 0,
                faturado: data?.billing?.total || 0,
                recebido: data?.cash?.total || 0,
                percentualProducao: 0,
                percentualFaturado: 0,
                percentualRecebido: 0,
            };
        }

        const producao = data.production?.total || 0;
        const faturado = data.billing?.total || 0;
        const recebido = data.cash?.total || 0;

        return {
            producao,
            faturado,
            recebido,
            percentualProducao: Math.min((producao / metaMensal) * 100, 100),
            percentualFaturado: Math.min((faturado / metaMensal) * 100, 100),
            percentualRecebido: Math.min((recebido / metaMensal) * 100, 100),
        };
    }, [data, metaMensal]);

    if (isLoading || planningLoading) return <FinancialLoading />;

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" mb={3}>
                🎯 Metas & Provisão
            </Typography>

            {metaMensal === 0 ? (
                <Alert severity="info" sx={{ mb: 3 }}>
                    Nenhuma meta cadastrada para {moment().tz(TIMEZONE).format('MMMM/YYYY')}.
                    Cadastre em <strong>Planejamento Anual</strong>.
                </Alert>
            ) : (
                <Typography variant="body1" color="text.secondary" mb={3}>
                    Meta do mês ({moment().tz(TIMEZONE).format('MMMM/YYYY')}):
                    {' '}R$ {metaMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Typography>
            )}

            {/* Produção */}
            <Card sx={{ mb: 2 }}>
                <CardContent>
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                        <TrendingUp color="success" />
                        <Box flex={1}>
                            <Typography variant="h6">
                                Produção Clínica
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                R$ {metrics.producao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                {metaMensal > 0 && ` de R$ ${metaMensal.toLocaleString('pt-BR')}`}
                            </Typography>
                        </Box>
                        <Typography variant="h5" fontWeight="bold">
                            {metaMensal > 0 ? `${metrics.percentualProducao.toFixed(1)}%` : '—'}
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={metrics.percentualProducao}
                        sx={{ height: 10, borderRadius: 5 }}
                    />
                </CardContent>
            </Card>

            {/* Faturamento */}
            <Card sx={{ mb: 2 }}>
                <CardContent>
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                        <TrackChanges color="primary" />
                        <Box flex={1}>
                            <Typography variant="h6">
                                Faturamento
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                R$ {metrics.faturado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                {metaMensal > 0 && ` de R$ ${metaMensal.toLocaleString('pt-BR')}`}
                            </Typography>
                        </Box>
                        <Typography variant="h5" fontWeight="bold">
                            {metaMensal > 0 ? `${metrics.percentualFaturado.toFixed(1)}%` : '—'}
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={metrics.percentualFaturado}
                        color="secondary"
                        sx={{ height: 10, borderRadius: 5 }}
                    />
                </CardContent>
            </Card>

            {/* Recebido */}
            <Card>
                <CardContent>
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                        <TrackChanges color="info" />
                        <Box flex={1}>
                            <Typography variant="h6">
                                Recebido (Caixa)
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                R$ {metrics.recebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                {metaMensal > 0 && ` de R$ ${metaMensal.toLocaleString('pt-BR')}`}
                            </Typography>
                        </Box>
                        <Typography variant="h5" fontWeight="bold">
                            {metaMensal > 0 ? `${metrics.percentualRecebido.toFixed(1)}%` : '—'}
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={metrics.percentualRecebido}
                        color="info"
                        sx={{ height: 10, borderRadius: 5 }}
                    />
                </CardContent>
            </Card>

            <Paper sx={{ mt: 3, p: 2 }}>
                <Typography variant="body2" color="text.secondary">
                    💡 <strong>Diferenças:</strong> Produção = sessões realizadas |
                    Faturamento = guias enviadas |
                    Recebido = dinheiro na conta
                </Typography>
            </Paper>
        </Box>
    );
};

export default GoalsTab;
