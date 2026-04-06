import { Card, CardContent, Typography, Box, LinearProgress, Chip, Divider, Grid } from '@mui/material';
import { TrendingUp, Target, Schedule, TrendingDown, TrendingFlat } from '@mui/icons-material';
import { useProjections, useProjectionStatus, useProjectionChartData } from '../hooks/useProjections';
import { FinancialLoading } from './FinancialLoading';
import { formatCurrency } from '../../../utils/format';
import { useState } from 'react';

interface ProjecaoTabProps {
    month?: number;
    year?: number;
}

export const ProjecaoTab = ({ month, year }: ProjecaoTabProps) => {
    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState(month || now.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(year || now.getFullYear());
    
    const { data, isLoading, error } = useProjections({ month: selectedMonth, year: selectedYear });
    const status = useProjectionStatus(data);
    const chartData = useProjectionChartData(data);

    if (isLoading) return <FinancialLoading cardCount={4} />;
    if (error) return <Typography color="error">Erro ao carregar projeções</Typography>;
    if (!data || !status || !chartData) return <Typography>Nenhum dado encontrado</Typography>;

    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    return (
        <Box sx={{ p: { xs: 1, sm: 2 } }}>
            {/* Header */}
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <TrendingUp sx={{ color: 'primary.main', fontSize: 28 }} />
                    <Box>
                        <Typography variant="h5" fontWeight="bold">
                            Projeção
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {monthNames[selectedMonth - 1]} de {selectedYear}
                        </Typography>
                    </Box>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    >
                        {monthNames.map((name, idx) => (
                            <option key={idx + 1} value={idx + 1}>{name}</option>
                        ))}
                    </select>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    >
                        <option value={2025}>2025</option>
                        <option value={2026}>2026</option>
                    </select>
                </Box>
            </Box>

            {/* Status Principal */}
            <Card 
                sx={{ 
                    mb: 3, 
                    borderLeft: `4px solid ${status.color}`,
                    bgcolor: `${status.color}10`
                }}
            >
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <span style={{ fontSize: 24 }}>{status.icon}</span>
                                <Typography variant="h6" fontWeight="bold" sx={{ color: status.color }}>
                                    {status.label}
                                </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                                {data.meta.mensagem}
                            </Typography>
                        </Box>
                        
                        {data.meta.value > 0 && (
                            <Box sx={{ textAlign: 'right' }}>
                                <Typography variant="body2" color="text.secondary">Meta</Typography>
                                <Typography variant="h5" fontWeight="bold">
                                    {formatCurrency(data.meta.value)}
                                </Typography>
                            </Box>
                        )}
                    </Box>

                    {/* Barra de progresso */}
                    {data.meta.value > 0 && (
                        <Box sx={{ mt: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="caption" color="text.secondary">
                                    {formatCurrency(data.atual.received)} recebido
                                </Typography>
                                <Typography variant="caption" fontWeight="bold" sx={{ color: status.color }}>
                                    {data.meta.percentualAtingido.toFixed(1)}%
                                </Typography>
                            </Box>
                            <LinearProgress 
                                variant="determinate" 
                                value={Math.min(data.meta.percentualAtingido, 100)}
                                sx={{ 
                                    height: 10, 
                                    borderRadius: 5, 
                                    bgcolor: '#e5e7eb',
                                    '& .MuiLinearProgress-bar': {
                                        bgcolor: status.color,
                                        borderRadius: 5
                                    }
                                }}
                            />
                            {data.meta.gap > 0 && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                    Faltam {formatCurrency(data.meta.gap)}
                                </Typography>
                            )}
                        </Box>
                    )}
                </CardContent>
            </Card>

            {/* Cards de Ritmo */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {/* Ritmo Atual */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Ritmo Atual
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="primary.main">
                                {formatCurrency(data.ritmo.atual)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                /dia
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Ritmo Necessário */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Ritmo Necessário
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" sx={{ color: data.ritmo.isOnTrack ? '#10b981' : '#ef4444' }}>
                                {data.meta.value > 0 ? formatCurrency(data.ritmo.necessario) : '—'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {data.meta.value > 0 ? '/dia para bater meta' : 'Sem meta definida'}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Dias Restantes */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Dias Restantes
                            </Typography>
                            <Typography variant="h4" fontWeight="bold">
                                {data.period.daysRemaining}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                de {data.period.daysInMonth} no mês
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Projeção */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ border: `2px solid ${data.projecao.vsMeta >= 100 ? '#10b981' : '#f59e0b'}` }}>
                        <CardContent>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Projeção
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" sx={{ color: data.projecao.vsMeta >= 100 ? '#10b981' : '#f59e0b' }}>
                                {formatCurrency(data.projecao.realista)}
                            </Typography>
                            <Chip 
                                label={data.projecao.vsMeta >= 100 ? 'Meta Atingível' : `${(100 - data.projecao.vsMeta).toFixed(0)}% abaixo`}
                                size="small"
                                sx={{ 
                                    mt: 0.5,
                                    bgcolor: data.projecao.vsMeta >= 100 ? '#10b98120' : '#f59e0b20',
                                    color: data.projecao.vsMeta >= 100 ? '#10b981' : '#f59e0b',
                                    fontWeight: 'bold'
                                }}
                            />
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Composição Atual */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                        Composição Atual
                    </Typography>
                    
                    <Grid container spacing={3} sx={{ mt: 1 }}>
                        <Grid item xs={6} sm={3}>
                            <Box>
                                <Typography variant="body2" color="text.secondary">Recebido</Typography>
                                <Typography variant="h6" fontWeight="bold" color="primary.main">
                                    {formatCurrency(data.atual.received)}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <Box>
                                <Typography variant="body2" color="text.secondary">A Receber</Typography>
                                <Typography variant="h6" fontWeight="bold" sx={{ color: '#f59e0b' }}>
                                    {formatCurrency(data.atual.aReceber)}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <Box>
                                <Typography variant="body2" color="text.secondary">Agendados</Typography>
                                <Typography variant="h6" fontWeight="bold" sx={{ color: '#8b5cf6' }}>
                                    {formatCurrency(data.atual.agendadosConfirmados)}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <Box>
                                <Typography variant="body2" color="text.secondary">Produção</Typography>
                                <Typography variant="h6" fontWeight="bold" sx={{ color: '#10b981' }}>
                                    {formatCurrency(data.atual.production)}
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Cenários */}
            {data.meta.value > 0 && (
                <Card>
                    <CardContent>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                            Cenários de Fechamento
                        </Typography>
                        
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={12} sm={4}>
                                <Box sx={{ p: 2, bgcolor: '#fef2f2', borderRadius: 2, borderLeft: '4px solid #ef4444' }}>
                                    <Typography variant="body2" color="text.secondary">Pessimista</Typography>
                                    <Typography variant="h5" fontWeight="bold" sx={{ color: '#ef4444' }}>
                                        {formatCurrency(data.projecao.pessimista)}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        70% confirmados + 20% pendentes
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <Box sx={{ p: 2, bgcolor: '#eff6ff', borderRadius: 2, borderLeft: '4px solid #3b82f6' }}>
                                    <Typography variant="body2" color="text.secondary">Realista</Typography>
                                    <Typography variant="h5" fontWeight="bold" sx={{ color: '#3b82f6' }}>
                                        {formatCurrency(data.projecao.realista)}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Taxa histórica de conversão
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <Box sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 2, borderLeft: '4px solid #10b981' }}>
                                    <Typography variant="body2" color="text.secondary">Otimista</Typography>
                                    <Typography variant="h5" fontWeight="bold" sx={{ color: '#10b981' }}>
                                        {formatCurrency(data.projecao.otimista)}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        95% confirmados + 70% pendentes
                                    </Typography>
                                </Box>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>
            )}
        </Box>
    );
};

export default ProjecaoTab;
